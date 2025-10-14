// auth-service/src/controllers/auth.controller.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const createLogger = require('../../../../shared/logger');
const { AuthenticationError, ValidationError } = require('../../../../shared/errors');

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

    const db = req.app.locals.db;

    // Query user - LẤY ROLE THỰC TẾ TỪ DATABASE
    const userQuery = `
      SELECT
        id, username, password_hash, full_name, position, organization,
        role, permission_level, district_id, is_active
      FROM users
      WHERE username = $1 AND is_active = TRUE
    `;

    const result = await db.query(userQuery, [username]);

    if (result.rows.length === 0) {
      logger.warn('Login failed: user not found', { username });
      throw new AuthenticationError('Invalid username or password');
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logger.warn('Login failed: invalid password', { username });
      throw new AuthenticationError('Invalid username or password');
    }

    // Generate JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permission_level: user.permission_level,
      full_name: user.full_name
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    logger.info('Login successful', { userId: user.id, username });

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

    if (!userId) {
      throw new AuthenticationError('User ID not found in request');
    }

    const db = req.app.locals.db;

    const result = await db.query(
      `SELECT id, username, full_name, position, organization,
              role, permission_level, district_id, is_active, created_at, last_login
       FROM users
       WHERE id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    res.json({
      success: true,
      user: result.rows[0]
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

    const db = req.app.locals.db;

    // Check if user still exists and is active
    const result = await db.query(
      'SELECT id, username, full_name, role, permission_level FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      throw new AuthenticationError('User not found or inactive');
    }

    const user = result.rows[0];

    // Generate new token - LẤY ROLE THỰC TẾ TỪ DATABASE
    const newTokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permission_level: user.permission_level,
      full_name: user.full_name
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
