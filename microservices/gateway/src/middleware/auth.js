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
      full_name: decoded.full_name,
      email: decoded.email,
      roles: decoded.roles || [],
      permissions: decoded.permissions || []
    };

    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-username'] = decoded.username;
    req.headers['x-user-roles'] = decoded.roles ? decoded.roles.join(',') : '';
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';

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
    req.headers['x-user-roles'] = decoded.roles ? decoded.roles.join(',') : '';
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';
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
    return res.status(401).json({
      success: false,
      message: 'No token provided'
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

    // Forward user info to downstream services
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-username'] = decoded.username;
    req.headers['x-user-roles'] = decoded.roles ? decoded.roles.join(',') : '';
    req.headers['x-user-permissions'] = decoded.permissions ? decoded.permissions.join(',') : '';

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

module.exports = {
  authenticate,
  authenticateFlexible,
  requireRole,
  requirePermission,
  optionalAuth
};
