// gateway/src/middleware/auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dubaomatrung_secret_key_change_this_in_production';

// Authenticate JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Auth] No token provided:', { path: req.path, headers: req.headers });
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'No authentication token provided'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token || token.trim() === '') {
    console.error('[Auth] Empty token:', { path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'EMPTY_TOKEN',
        message: 'Authentication token is empty'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth] Token verified successfully:', { userId: decoded.id, username: decoded.username });

    req.user = {
      id: decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    // Forward user info to downstream services (must be strings)
    req.headers['x-user-id'] = String(decoded.id);
    req.headers['x-user-username'] = String(decoded.username);
    // Encode roles to avoid invalid characters in headers (Vietnamese text)
    const rolesArray = decoded.roles ? decoded.roles.map(r => typeof r === 'object' ? r.name || r.id : r) : [];
    req.headers['x-user-roles'] = encodeURIComponent(rolesArray.join(','));
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';
    // ✅ FIX: Forward location scope headers
    req.headers['x-user-xa'] = decoded.xa ? encodeURIComponent(decoded.xa) : '';
    req.headers['x-user-tieukhu'] = decoded.tieukhu ? encodeURIComponent(decoded.tieukhu) : '';
    req.headers['x-user-khoanh'] = decoded.khoanh ? encodeURIComponent(decoded.khoanh) : '';

    next();
  } catch (error) {
    console.log('❌❌❌ [Auth] JWT verification failed:', {
      error: error.message,
      name: error.name,
      path: req.path,
      tokenPreview: token.substring(0, 50) + '...',
      tokenLength: token.length,
      stack: error.stack
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
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

    const userRoles = req.user.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user has permission
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
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
      full_name: decoded.full_name,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-username'] = decoded.username;
    // Encode roles to avoid invalid characters in headers (Vietnamese text)
    const rolesArray = decoded.roles ? decoded.roles.map(r => typeof r === 'object' ? r.name || r.id : r) : [];
    req.headers['x-user-roles'] = encodeURIComponent(rolesArray.join(','));
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';
    // ✅ FIX: Forward location scope headers
    req.headers['x-user-xa'] = decoded.xa ? encodeURIComponent(decoded.xa) : '';
    req.headers['x-user-tieukhu'] = decoded.tieukhu ? encodeURIComponent(decoded.tieukhu) : '';
    req.headers['x-user-khoanh'] = decoded.khoanh ? encodeURIComponent(decoded.khoanh) : '';
  } catch (error) {
    // Ignore errors for optional auth
    console.warn('Optional auth failed:', error.message);
  }

  next();
};

// Authenticate with token from header or query parameter
const authenticateFlexible = (req, res, next) => {
  let token = null;

  // Try to get token from Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // If not in header, try query parameter
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.error('[Auth Flexible] No token provided:', { path: req.path });
    return res.status(401).json({
      success: false,
      error: {
        code: 'NO_TOKEN',
        message: 'No authentication token provided'
      }
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      username: decoded.username,
      full_name: decoded.full_name,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    // Forward user info to downstream services (must be strings)
    req.headers['x-user-id'] = String(decoded.id);
    req.headers['x-user-username'] = String(decoded.username);
    // Encode roles to avoid invalid characters in headers (Vietnamese text)
    const rolesArray = decoded.roles ? decoded.roles.map(r => typeof r === 'object' ? r.name || r.id : r) : [];
    req.headers['x-user-roles'] = encodeURIComponent(rolesArray.join(','));
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';
    // ✅ FIX: Forward location scope headers
    req.headers['x-user-xa'] = decoded.xa ? encodeURIComponent(decoded.xa) : '';
    req.headers['x-user-tieukhu'] = decoded.tieukhu ? encodeURIComponent(decoded.tieukhu) : '';
    req.headers['x-user-khoanh'] = decoded.khoanh ? encodeURIComponent(decoded.khoanh) : '';

    next();
  } catch (error) {
    console.error('[Auth Flexible] JWT verification failed:', {
      error: error.message,
      name: error.name,
      path: req.path
    });

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Authentication token has expired'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Authentication token is invalid'
      }
    });
  }
};

module.exports = {
  authenticate,
  authenticateFlexible,
  requireRole,
  requirePermission,
  optionalAuth
};
