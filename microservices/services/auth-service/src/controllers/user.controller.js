// auth-service/src/controllers/user.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError, AuthorizationError } = require('../../../../shared/errors');
const prisma = require('../lib/prisma');

const logger = createLogger('user-controller');

const JWT_SECRET = process.env.JWT_SECRET || 'dubaomatrung_secret_key_change_this_in_production';

// Thứ tự ưu tiên role: số càng nhỏ = quyền càng cao
const ROLE_HIERARCHY = {
  'super_admin': 0,  // Toàn quyền tuyệt đối
  'admin': 1,
  'Công ty Fis': 1,
  'Chi cục kiểm lâm': 2,
  'Hạt kiểm lâm': 3,
  'Kiểm lâm viên': 4,
};

/**
 * Lấy level quyền cao nhất của user (số nhỏ = quyền cao hơn)
 * Role không trong hierarchy → level 99 (thấp nhất)
 */
function getHighestRoleLevel(roleNames) {
  let highest = 99;
  for (const name of roleNames) {
    const level = ROLE_HIERARCHY[name] ?? 99;
    if (level < highest) highest = level;
  }
  return highest;
}

/**
 * Lấy current user từ JWT token trong request header
 */
function getCurrentUserFromToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Get all users
 * @route GET /api/auth/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    // Xác định scope xem user dựa trên role của người gọi
    const callerRoles = req.headers['x-user-roles']
      ? decodeURIComponent(req.headers['x-user-roles']).split(',').filter(Boolean)
      : [];
    const callerXa = req.headers['x-user-xa']
      ? decodeURIComponent(req.headers['x-user-xa'])
      : null;

    const HAT_KIEM_LAM_ROLE = 'Hạt kiểm lâm';
    const isHatKiemLam = callerRoles.includes(HAT_KIEM_LAM_ROLE);

    // Hạt kiểm lâm chỉ xem users trong cùng xã
    const whereClause = (isHatKiemLam && callerXa)
      ? { xa: callerXa }
      : {};

    const users = await prisma.user.findMany({
      where: whereClause,
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
    const { username, password, full_name, position, organization, district_id, role_ids, xa, tieukhu, khoanh } = req.body;

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
        district_id,
        xa: xa || null,
        tieukhu: tieukhu || null,
        khoanh: khoanh || null,
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
    const { username, password, full_name, position, organization, district_id, is_active, role_ids } = req.body;

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
    if (district_id !== undefined) updateData.district_id = district_id;
    if (district_id !== undefined) updateData.district_id = district_id;
    if (is_active !== undefined) updateData.is_active = is_active;
    // Update administrative units
    if (req.body.xa !== undefined) updateData.xa = req.body.xa;
    if (req.body.khoanh !== undefined) updateData.khoanh = req.body.khoanh;
    if (req.body.tieukhu !== undefined) updateData.tieukhu = req.body.tieukhu;

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
 * Get roles of a user
 * @route GET /api/auth/users/:userId/roles
 */
exports.getUserRoles = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const roles = user.userRoles.map(ur => ur.role);

    res.json({
      success: true,
      data: roles
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

    // Kiểm tra xác thực và phân quyền
    const currentUser = getCurrentUserFromToken(req);
    if (!currentUser) {
      throw new AuthorizationError('Yêu cầu đăng nhập');
    }

    const currentUserRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const currentLevel = getHighestRoleLevel(currentUserRoles);

    // Từ level 1 đến 3 (Công ty Fis, Chi cục, Hạt kiểm lâm) mới được phép gán role
    if (currentLevel > 3) {
      throw new AuthorizationError('Bạn không có quyền thực hiện thao tác này');
    }

    // Verify user exists và lấy roles hiện tại của user đó
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userRoles: { include: { role: true } }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Kiểm tra quyền trên user mục tiêu: không được thao tác với user có quyền cao hơn hoặc bằng mình
    const targetUserRoleNames = user.userRoles.map(ur => ur.role.name);
    const targetLevel = getHighestRoleLevel(targetUserRoleNames);
    if (targetLevel <= currentLevel) {
      throw new AuthorizationError('Không được phép thao tác với tài khoản có quyền cao hơn hoặc bằng bạn');
    }

    // Verify role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(roleId) }
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Kiểm tra quyền trên role được gán: không được gán role có level >= level của mình
    const assigningRoleLevel = ROLE_HIERARCHY[role.name] ?? 99;
    if (assigningRoleLevel <= currentLevel) {
      throw new AuthorizationError('Không được phép gán role có quyền cao hơn hoặc bằng bạn');
    }

    // Assign role to user
    await prisma.userRole.create({
      data: {
        user_id: parseInt(userId),
        role_id: parseInt(roleId)
      }
    });

    logger.info('Role assigned to user', { userId, roleId, roleName: role.name, assignedBy: currentUser.id });

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

    // Kiểm tra xác thực và phân quyền
    const currentUser = getCurrentUserFromToken(req);
    if (!currentUser) {
      throw new AuthorizationError('Yêu cầu đăng nhập');
    }

    const currentUserRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const currentLevel = getHighestRoleLevel(currentUserRoles);

    // Chỉ super_admin và admin mới được phép gỡ role
    if (currentLevel > 2) {
      throw new AuthorizationError('Bạn không có quyền thực hiện thao tác này');
    }

    // Verify user exists và lấy roles hiện tại
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        userRoles: { include: { role: true } }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Kiểm tra quyền trên user mục tiêu
    const targetUserRoleNames = user.userRoles.map(ur => ur.role.name);
    const targetLevel = getHighestRoleLevel(targetUserRoleNames);
    if (targetLevel <= currentLevel) {
      throw new AuthorizationError('Không được phép thao tác với tài khoản có quyền cao hơn hoặc bằng bạn');
    }

    // Kiểm tra role đang gỡ có level cao hơn mình không
    const roleToRemove = await prisma.role.findUnique({ where: { id: parseInt(roleId) } });
    if (roleToRemove) {
      const removingRoleLevel = ROLE_HIERARCHY[roleToRemove.name] ?? 99;
      if (removingRoleLevel <= currentLevel) {
        throw new AuthorizationError('Không được phép gỡ role có quyền cao hơn hoặc bằng bạn');
      }
    }

    // Remove role from user
    await prisma.userRole.deleteMany({
      where: {
        user_id: parseInt(userId),
        role_id: parseInt(roleId)
      }
    });

    logger.info('Role removed from user', { userId, roleId, removedBy: currentUser.id });

    res.json({
      success: true,
      message: 'Role removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
