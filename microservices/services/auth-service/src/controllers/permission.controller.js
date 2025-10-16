// auth-service/src/controllers/permission.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('permission-controller');

/**
 * Get all permissions
 * @route GET /api/auth/permissions
 */
exports.getAllPermissions = async (req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({
      include: {
        _count: {
          select: { roles: true }
        }
      },
      orderBy: [
        { subject: 'asc' },
        { action: 'asc' }
      ]
    });

    logger.info('Retrieved all permissions', { count: permissions.length });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get permission by ID
 * @route GET /api/auth/permissions/:id
 */
exports.getPermissionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    res.json({
      success: true,
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new permission
 * @route POST /api/auth/permissions
 */
exports.createPermission = async (req, res, next) => {
  try {
    const { action, subject, description } = req.body;

    if (!action || !subject) {
      throw new ValidationError('Action and subject are required');
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: {
        action_subject: {
          action,
          subject
        }
      }
    });

    if (existingPermission) {
      throw new ValidationError(`Permission '${action}:${subject}' already exists`);
    }

    const permission = await prisma.permission.create({
      data: {
        action,
        subject,
        description
      }
    });

    logger.info('Permission created', {
      permissionId: permission.id,
      permission: `${action}:${subject}`
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a permission
 * @route PATCH /api/auth/permissions/:id
 */
exports.updatePermission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    const updatedPermission = await prisma.permission.update({
      where: { id: parseInt(id) },
      data: {
        ...(description !== undefined && { description })
      }
    });

    logger.info('Permission updated', { permissionId: updatedPermission.id });

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: updatedPermission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a permission
 * @route DELETE /api/auth/permissions/:id
 */
exports.deletePermission = async (req, res, next) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { roles: true }
        }
      }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Check if permission has roles
    if (permission._count.roles > 0) {
      throw new ValidationError(
        `Cannot delete permission '${permission.action}:${permission.subject}' because it is assigned to ${permission._count.roles} role(s)`
      );
    }

    await prisma.permission.delete({
      where: { id: parseInt(id) }
    });

    logger.info('Permission deleted', {
      permissionId: id,
      permission: `${permission.action}:${permission.subject}`
    });

    res.json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
