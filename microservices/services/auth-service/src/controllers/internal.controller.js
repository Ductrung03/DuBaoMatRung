// auth-service/src/controllers/internal.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');
const rbacService = require('../services/rbac.service');

const logger = createLogger('internal-controller');

/**
 * Get user information for internal service-to-service communication
 * @route GET /api/auth/internal/user-info?ids=1,5,23
 */
exports.getUserInfo = async (req, res, next) => {
  try {
    const { ids } = req.query;

    if (!ids) {
      throw new ValidationError("Bad Request: The 'ids' query parameter is required.");
    }

    // Parse comma-separated IDs
    const userIds = ids.split(',').map(id => id.trim()).filter(id => id);

    if (userIds.length === 0) {
      throw new ValidationError("Bad Request: The 'ids' query parameter must contain valid user IDs.");
    }

    logger.info('Internal user info request', {
      requestedIds: userIds,
      requestedBy: req.headers['x-service-name'] || 'unknown'
    });

    // Query user information for all requested IDs using Prisma
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds.map(id => parseInt(id))
        }
      },
      select: {
        id: true,
        full_name: true
      }
    });

    // Build response map with all requested IDs
    const userMap = {};

    // Initialize all IDs to null
    userIds.forEach(id => {
      userMap[id] = null;
    });

    // Fill in found users
    users.forEach(user => {
      userMap[user.id.toString()] = {
        id: user.id,
        fullName: user.full_name
      };
    });

    logger.info('Internal user info response', {
      requestedCount: userIds.length,
      foundCount: users.length
    });

    res.json({
      success: true,
      data: userMap
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user permissions for RBAC checks (internal)
 * @route GET /api/auth/internal/users/:userId/permissions
 */
exports.getUserPermissions = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const permissions = await rbacService.getUserPermissions(parseInt(userId));

    logger.debug('User permissions fetched', {
      userId,
      count: permissions.length,
      requestedBy: req.headers['x-service-name'] || 'unknown'
    });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user roles (internal)
 * @route GET /api/auth/internal/users/:userId/roles
 */
exports.getUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const roles = await rbacService.getUserRoles(parseInt(userId));

    logger.debug('User roles fetched', {
      userId,
      count: roles.length,
      requestedBy: req.headers['x-service-name'] || 'unknown'
    });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};
