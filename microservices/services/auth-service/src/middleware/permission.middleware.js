// auth-service/src/middleware/permission.middleware.js
const rbacService = require('../services/rbac.service');
const createLogger = require('../../../../shared/logger');
const { ForbiddenError, UnauthorizedError } = require('../../../../shared/errors');

const logger = createLogger('permission-middleware');

/**
 * Middleware to check if user has required permission(s)
 * Supports multiple patterns:
 * - Single permission: requirePermission('user.user.view')
 * - Multiple permissions (ANY): requirePermission(['user.user.view', 'user.user.create'])
 * - Multiple permissions (ALL): requirePermission(['user.user.view', 'user.user.create'], 'all')
 * - Pattern matching: requirePermission('user.*')
 */
function requirePermission(permissions, mode = 'any') {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const userId = req.user.id;
      const permissionList = Array.isArray(permissions) ? permissions : [permissions];

      // Check permissions based on mode
      let hasAccess = false;

      if (mode === 'all') {
        // User must have ALL permissions
        hasAccess = await rbacService.hasAllPermissions(userId, permissionList);
      } else if (mode === 'pattern') {
        // User must match the pattern
        hasAccess = await rbacService.hasPermissionPattern(userId, permissionList[0]);
      } else {
        // Default: User must have ANY of the permissions
        hasAccess = await rbacService.hasAnyPermission(userId, permissionList);
      }

      if (!hasAccess) {
        logger.warn('Permission denied', {
          userId,
          username: req.user.username,
          required: permissionList,
          mode,
          path: req.path
        });

        throw new ForbiddenError('You do not have permission to access this resource');
      }

      // Permission granted
      logger.debug('Permission granted', {
        userId,
        username: req.user.username,
        permissions: permissionList
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user has any role
 * @param {Array<string>} roleNames - Array of role names
 */
function requireRole(roleNames) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const userId = req.user.id;
      const roles = await rbacService.getUserRoles(userId);
      const userRoleNames = roles.map(r => r.name);

      const hasRole = roleNames.some(roleName => userRoleNames.includes(roleName));

      if (!hasRole) {
        logger.warn('Role check failed', {
          userId,
          username: req.user.username,
          required: roleNames,
          userRoles: userRoleNames,
          path: req.path
        });

        throw new ForbiddenError('You do not have the required role');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to attach user permissions to request
 * Usage: app.use(attachPermissions)
 * Then access via: req.permissions
 */
async function attachPermissions(req, res, next) {
  try {
    if (req.user && req.user.id) {
      const permissions = await rbacService.getUserPermissions(req.user.id);
      const roles = await rbacService.getUserRoles(req.user.id);

      req.permissions = permissions;
      req.roles = roles;
      req.user.permissions = permissions.map(p => p.code);
      req.user.roles = roles.map(r => r.name);
    }

    next();
  } catch (error) {
    logger.error('Failed to attach permissions', { error: error.message });
    next(error);
  }
}

/**
 * Middleware to check data scope access
 * @param {string} scopeCode - Data scope code to check
 */
function requireDataScope(scopeCode) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const userId = req.user.id;
      const hasAccess = await rbacService.hasDataScope(userId, scopeCode);

      if (!hasAccess) {
        logger.warn('Data scope access denied', {
          userId,
          username: req.user.username,
          scopeCode,
          path: req.path
        });

        throw new ForbiddenError('You do not have access to this data scope');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Check if current user can perform action on resource
 * Utility function for inline permission checks
 */
async function can(req, permission) {
  if (!req.user || !req.user.id) {
    return false;
  }

  return await rbacService.hasPermission(req.user.id, permission);
}

/**
 * Check if current user has any of the permissions
 */
async function canAny(req, permissions) {
  if (!req.user || !req.user.id) {
    return false;
  }

  return await rbacService.hasAnyPermission(req.user.id, permissions);
}

/**
 * Get current user's permissions
 */
async function getPermissions(req) {
  if (!req.user || !req.user.id) {
    return [];
  }

  return await rbacService.getUserPermissions(req.user.id);
}

module.exports = {
  requirePermission,
  requireRole,
  requireDataScope,
  attachPermissions,
  can,
  canAny,
  getPermissions
};
