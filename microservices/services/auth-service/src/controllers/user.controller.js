// auth-service/src/controllers/user.controller.js
const bcrypt = require('bcryptjs');
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('user-controller');

/**
 * Get all users
 * @route GET /api/auth/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform data to match frontend expectations
    const transformedUsers = users.map(({ password_hash, userRoles, ...user }) => ({
      ...user,
      roles: userRoles.map(ur => ur.role)
    }));

    logger.info('Retrieved all users', { count: users.length });

    res.json({
      success: true,
      data: transformedUsers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /api/auth/users/:id
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Transform data to match frontend expectations
    const { password_hash, userRoles, ...userData } = user;
    const transformedUser = {
      ...userData,
      roles: userRoles.map(ur => ({
        ...ur.role,
        permissions: ur.role.rolePermissions.map(rp => rp.permission)
      }))
    };

    res.json({
      success: true,
      data: transformedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user
 * @route POST /api/auth/users
 */
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, full_name, position, organization, permission_level, district_id, role_ids } = req.body;

    if (!username || !password || !full_name) {
      throw new ValidationError('Username, password, and full_name are required');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser) {
      throw new ValidationError(`User '${username}' already exists`);
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user with roles
    const user = await prisma.user.create({
      data: {
        username,
        password_hash,
        full_name,
        position,
        organization,
        permission_level: permission_level || 'district',
        district_id,
        ...(role_ids && role_ids.length > 0 && {
          userRoles: {
            create: role_ids.map(roleId => ({
              role: {
                connect: { id: parseInt(roleId) }
              }
            }))
          }
        })
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    logger.info('User created', { userId: user.id, username: user.username });

    // Transform data to match frontend expectations
    const { password_hash: _, userRoles, ...userData } = user;
    const transformedUser = {
      ...userData,
      roles: userRoles.map(ur => ur.role)
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: transformedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user
 * @route PATCH /api/auth/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, full_name, position, organization, permission_level, district_id, is_active, role_ids } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData = {};

    if (username) updateData.username = username;
    if (full_name) updateData.full_name = full_name;
    if (position !== undefined) updateData.position = position;
    if (organization !== undefined) updateData.organization = organization;
    if (permission_level !== undefined) updateData.permission_level = permission_level;
    if (district_id !== undefined) updateData.district_id = district_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Hash new password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Update roles if provided
    if (role_ids !== undefined) {
      updateData.userRoles = {
        deleteMany: {}, // Remove all existing roles
        create: role_ids.map(roleId => ({
          role: {
            connect: { id: parseInt(roleId) }
          }
        }))
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    logger.info('User updated', { userId: updatedUser.id });

    // Transform data to match frontend expectations
    const { password_hash: _, userRoles, ...userData } = updatedUser;
    const transformedUser = {
      ...userData,
      roles: userRoles.map(ur => ur.role)
    };

    res.json({
      success: true,
      message: 'User updated successfully',
      data: transformedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user
 * @route DELETE /api/auth/users/:id
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    logger.info('User deleted', { userId: id, username: user.username });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign role to user
 * @route POST /api/auth/users/:userId/roles
 */
exports.assignRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      throw new ValidationError('Role ID is required');
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Assign role to user
    await prisma.userRole.create({
      data: {
        userId: parseInt(userId),
        roleId: parseInt(roleId)
      }
    });

    logger.info('Role assigned to user', { userId, roleId, roleName: role.name });

    res.json({
      success: true,
      message: 'Role assigned successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove role from user
 * @route DELETE /api/auth/users/:userId/roles/:roleId
 */
exports.removeRole = async (req, res, next) => {
  try {
    const { userId, roleId } = req.params;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove role from user
    await prisma.userRole.deleteMany({
      where: {
        userId: parseInt(userId),
        roleId: parseInt(roleId)
      }
    });

    logger.info('Role removed from user', { userId, roleId });

    res.json({
      success: true,
      message: 'Role removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
