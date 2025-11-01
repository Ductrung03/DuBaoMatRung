// gateway/src/middleware/rbac.js - Dynamic RBAC Middleware for Gateway
const jwt = require('jsonwebtoken');
const axios = require('axios');

const JWT_SECRET = process.env.JWT_SECRET || 'dubaomatrung_secret_key_change_this_in_production';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// In-memory cache for permissions (TTL: 5 minutes)
const permissionCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Authenticate JWT token and attach user to request
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      email: decoded.email
    };

    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-username'] = decoded.username;

    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * Get user permissions from cache or auth service
 */
async function getUserPermissions(userId) {
  const cacheKey = `user_${userId}_permissions`;
  const now = Date.now();

  // Check cache
  const cached = permissionCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.permissions;
  }

  try {
    // Fetch from auth service
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/api/auth/internal/users/${userId}/permissions`,
      {
        timeout: 5000,
        headers: {
          'X-Internal-Request': 'true'
        }
      }
    );

    const permissions = response.data.data || [];

    // Cache the result
    permissionCache.set(cacheKey, {
      permissions,
      timestamp: now
    });

    return permissions;
  } catch (error) {
    console.error('Failed to fetch user permissions:', error.message);
    return [];
  }
}

/**
 * Middleware to check if user has required permission(s)
 * Usage:
 * - requirePermission('user.user.view')
 * - requirePermission(['user.user.view', 'user.user.create'])
 * - requirePermission('user.*', 'pattern')
 */
function requirePermission(permissions, mode = 'any') {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.id;
      const permissionList = Array.isArray(permissions) ? permissions : [permissions];

      // Get user permissions
      const userPermissions = await getUserPermissions(userId);
      const userPermissionCodes = userPermissions.map(p => p.code || p);

      let hasAccess = false;

      if (mode === 'pattern') {
        // Pattern matching
        const regex = new RegExp('^' + permissionList[0].replace(/\*/g, '.*') + '$');
        hasAccess = userPermissionCodes.some(code => regex.test(code));
      } else if (mode === 'all') {
        // User must have ALL permissions
        hasAccess = permissionList.every(perm => userPermissionCodes.includes(perm));
      } else {
        // User must have ANY permission
        hasAccess = permissionList.some(perm => userPermissionCodes.includes(perm));
      }

      if (!hasAccess) {
        console.warn('Permission denied:', {
          userId,
          username: req.user.username,
          required: permissionList,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource'
        });
      }

      // Add permissions to request headers for downstream services
      req.headers['x-user-permissions'] = userPermissionCodes.join(',');

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      email: decoded.email
    };

    req.headers['x-user-id'] = decoded.id;
    req.headers['x-username'] = decoded.username;
  } catch (error) {
    // Ignore errors for optional auth
    console.warn('Optional auth failed:', error.message);
  }

  next();
};

/**
 * Clear permission cache for a user
 */
function clearUserCache(userId) {
  const cacheKey = `user_${userId}_permissions`;
  permissionCache.delete(cacheKey);
  console.log(`Cleared permission cache for user ${userId}`);
}

/**
 * Clear all permission cache
 */
function clearAllCache() {
  permissionCache.clear();
  console.log('Cleared all permission cache');
}

module.exports = {
  authenticate,
  requirePermission,
  optionalAuth,
  getUserPermissions,
  clearUserCache,
  clearAllCache
};
