// auth-service/src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createLogger = require('../../../../shared/logger');
const { AuthenticationError, ValidationError } = require('../../../../shared/errors');
const { sendActivityLog } = require('../../../../shared/loggerClient');
const prisma = require('../lib/prisma');

const logger = createLogger('auth-controller');
const JWT_SECRET = process.env.JWT_SECRET || 'dubaomatrung_secret_key_change_this_in_production';
const JWT_EXPIRES_IN = '24h';

// Login
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    logger.info('Login attempt', { username });

    // Query user with Prisma - bao gồm roles và permissions
    const user = await prisma.user.findFirst({
      where: { username, is_active: true },
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
      logger.warn('Login failed: user not found', { username });
      throw new AuthenticationError('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Login failed: invalid password', { username });
      throw new AuthenticationError('Invalid username or password');
    }

    // Generate JWT token với roles và permissions
    const roles = user.userRoles.map(ur => ur.role);
    const tokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      roles: roles.map(role => role.name),
      permissions: roles.flatMap(role =>
        role.rolePermissions.map(rp => `${rp.permission.action}:${rp.permission.subject}`)
      )
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    logger.info('Login successful', { userId: user.id, username });

    // Send activity log to logging service
    sendActivityLog({
      service: 'auth-service',
      action: 'USER_LOGIN',
      userId: user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      details: {
        username: user.username,
        timestamp: new Date().toISOString()
      }
    });

    // Remove sensitive data
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userWithoutPassword
    });

  } catch (error) {
    next(error);
  }
};

// Get current user
exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];

    if (!userId || isNaN(parseInt(userId))) {
      throw new ValidationError('Invalid User ID in request');
    }

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
        is_active: true
      },
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
      },
      select: {
        id: true,
        username: true,
        full_name: true,
        is_active: true,
        created_at: true,
        last_login: true,
        userRoles: true
      }
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    next(error);
  }
};

// Logout
exports.logout = async (req, res) => {
  // Since JWT is stateless, logout is handled client-side
  // But we can log the event
  const userId = req.headers['x-user-id'];

  if (userId) {
    logger.info('User logout', { userId });

    // Send activity log to logging service
    sendActivityLog({
      service: 'auth-service',
      action: 'USER_LOGOUT',
      userId: parseInt(userId),
      ipAddress: req.ip || req.connection.remoteAddress,
      details: {
        timestamp: new Date().toISOString()
      }
    });
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Refresh token
exports.refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Token is required');
    }

    // Verify old token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (error) {
      throw new AuthenticationError('Invalid token');
    }

    // Check if user still exists and is active
    const user = await prisma.user.findFirst({
      where: {
        id: decoded.id,
        is_active: true
      },
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
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new token với roles và permissions
    const roles = user.userRoles.map(ur => ur.role);
    const newTokenPayload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      roles: roles.map(role => role.name),
      permissions: roles.flatMap(role =>
        role.rolePermissions.map(rp => `${rp.permission.action}:${rp.permission.subject}`)
      )
    };

    const newToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    logger.info('Token refreshed', { userId: user.id });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    next(error);
  }
};

// Verify token (for other services)
exports.verifyToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Token is required');
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    res.json({
      success: true,
      valid: true,
      user: {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        permission_level: decoded.permission_level
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.json({
        success: false,
        valid: false,
        error: 'Token expired'
      });
    }

    res.json({
      success: false,
      valid: false,
      error: 'Invalid token'
    });
  }
};
