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
        roles: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Remove password_hash from response
    const usersWithoutPassword = users.map(({ password_hash, ...user }) => user);

    logger.info('Retrieved all users', { count: users.length });

    res.json({
      success: true,
      data: usersWithoutPassword
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
        roles: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
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
    const { username, password, full_name, role_ids } = req.body;

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
        ...(role_ids && role_ids.length > 0 && {
          roles: {
            connect: role_ids.map(id => ({ id: parseInt(id) }))
          }
        })
      },
      include: {
        roles: true
      }
    });

    logger.info('User created', { userId: user.id, username: user.username });

    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword
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
    const { username, password, full_name, is_active, role_ids } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updateData = {};

    if (username) updateData.username = username;
    if (full_name) updateData.full_name = full_name;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Hash new password if provided
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    // Update roles if provided
    if (role_ids !== undefined) {
      updateData.roles = {
        set: [],
        connect: role_ids.map(id => ({ id: parseInt(id) }))
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        roles: true
      }
    });

    logger.info('User updated', { userId: updatedUser.id });

    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword
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
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        roles: {
          connect: { id: parseInt(roleId) }
        }
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
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: {
        roles: {
          disconnect: { id: parseInt(roleId) }
        }
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
