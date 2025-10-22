// gateway/src/middleware/auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dubaomatrung_secret_key_change_this_in_production';

// Authenticate JWT token
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
      roles: decoded.roles,
      permissions: decoded.permissions
    };

    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.roles ? decoded.roles.join(',') : '';
    req.headers['x-user-permission'] = decoded.permissions ? decoded.permissions.join(',') : '';

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

// Check if user has required role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role || req.user.permission_level;

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user has permission level
const requirePermission = (...permissionLevels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermission = req.user.permission_level || req.user.role;

    if (!permissionLevels.includes(userPermission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permission level'
      });
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
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
      role: decoded.role,
      permission_level: decoded.permission_level
    };

    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.role;
  } catch (error) {
    // Ignore errors for optional auth
    console.warn('Optional auth failed:', error.message);
  }

  next();
};

module.exports = {
  authenticate,
  requireRole,
  requirePermission,
  optionalAuth
};
