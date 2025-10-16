// auth-service/src/controllers/role.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('role-controller');

/**
 * Get all roles
 * @route GET /api/auth/roles
 */
exports.getAllRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    logger.info('Retrieved all roles', { count: roles.length });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get role by ID
 * @route GET /api/auth/roles/:id
 */
exports.getRoleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    res.json({
      success: true,
      data: role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new role
 * @route POST /api/auth/roles
 */
exports.createRole = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      throw new ValidationError('Role name is required');
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      throw new ValidationError(`Role '${name}' already exists`);
    }

    const role = await prisma.role.create({
      data: {
        name,
        description
      }
    });

    logger.info('Role created', { roleId: role.id, name: role.name });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a role
 * @route PATCH /api/auth/roles/:id
 */
exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    const updatedRole = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description })
      }
    });

    logger.info('Role updated', { roleId: updatedRole.id });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: updatedRole
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a role
 * @route DELETE /api/auth/roles/:id
 */
exports.deleteRole = async (req, res, next) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Check if role has users
    if (role._count.users > 0) {
      throw new ValidationError(`Cannot delete role '${role.name}' because it has ${role._count.users} user(s) assigned`);
    }

    await prisma.role.delete({
      where: { id: parseInt(id) }
    });

    logger.info('Role deleted', { roleId: id, name: role.name });

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign permission to role
 * @route POST /api/auth/roles/:roleId/permissions
 */
exports.assignPermission = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permissionId } = req.body;

    if (!permissionId) {
      throw new ValidationError('Permission ID is required');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Verify permission exists
    const permission = await prisma.permission.findUnique({
      where: { id: parseInt(permissionId) }
    });

    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Assign permission to role
    await prisma.role.update({
      where: { id: parseInt(roleId) },
      data: {
        permissions: {
          connect: { id: parseInt(permissionId) }
        }
      }
    });

    logger.info('Permission assigned to role', {
      roleId,
      permissionId,
      permission: `${permission.action}:${permission.subject}`
    });

    res.json({
      success: true,
      message: 'Permission assigned successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove permission from role
 * @route DELETE /api/auth/roles/:roleId/permissions/:permissionId
 */
exports.removePermission = async (req, res, next) => {
  try {
    const { roleId, permissionId } = req.params;

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Remove permission from role
    await prisma.role.update({
      where: { id: parseInt(roleId) },
      data: {
        permissions: {
          disconnect: { id: parseInt(permissionId) }
        }
      }
    });

    logger.info('Permission removed from role', { roleId, permissionId });

    res.json({
      success: true,
      message: 'Permission removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
