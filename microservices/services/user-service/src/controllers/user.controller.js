// user-service/src/controllers/user.controller.js
const bcrypt = require('bcryptjs');
const { ValidationError, AuthorizationError } = require('../../../../shared/errors');
const { formatResponse, sanitizeObject } = require('../../../../shared/utils');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('user-controller');

// Get all users
exports.getAllUsers = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const query = `
      SELECT id, username, full_name, position, organization,
             permission_level, district_id, is_active, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = 'SELECT COUNT(*) FROM users';

    const [result, countResult] = await Promise.all([
      db.query(query, [limit, offset]),
      db.query(countQuery)
    ]);

    res.json(formatResponse(true, 'Users retrieved', result.rows, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(countResult.rows[0].count)
    }));
  } catch (error) {
    next(error);
  }
};

// Get user by ID
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const result = await db.query(
      'SELECT id, username, full_name, position, organization, permission_level, district_id, is_active, created_at, last_login FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new ValidationError(`User with id ${id} not found`);
    }

    res.json(formatResponse(true, 'User retrieved', result.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Create user
exports.createUser = async (req, res, next) => {
  try {
    const { username, password, full_name, position, organization, permission_level, district_id } = req.body;

    // Validate required fields
    if (!username || !password || !full_name) {
      throw new ValidationError('username, password, and full_name are required');
    }

    const db = req.app.locals.db;

    // Check if username exists
    const checkResult = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (checkResult.rows.length > 0) {
      throw new ValidationError('Username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const insertQuery = `
      INSERT INTO users (username, password_hash, full_name, position, organization, permission_level, district_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING id, username, full_name, position, organization, permission_level, district_id, created_at
    `;

    const result = await db.query(insertQuery, [
      username,
      passwordHash,
      full_name,
      position || null,
      organization || null,
      permission_level || 'user',
      district_id || null
    ]);

    logger.info('User created', { userId: result.rows[0].id, username });

    res.status(201).json(formatResponse(true, 'User created successfully', result.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Update user
exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = sanitizeObject(req.body);

    // Don't allow password update via this endpoint
    delete updates.password;
    delete updates.password_hash;

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    const db = req.app.locals.db;

    // Build update query
    const fields = Object.keys(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 2}`).join(', ');

    const query = `
      UPDATE users
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, username, full_name, position, organization, permission_level, district_id, is_active
    `;

    const values = [id, ...Object.values(updates)];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      throw new ValidationError(`User with id ${id} not found`);
    }

    logger.info('User updated', { userId: id });

    res.json(formatResponse(true, 'User updated successfully', result.rows[0]));
  } catch (error) {
    next(error);
  }
};

// Delete user (soft delete)
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = req.app.locals.db;

    const result = await db.query(
      'UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new ValidationError(`User with id ${id} not found`);
    }

    logger.info('User deleted', { userId: id });

    res.json(formatResponse(true, 'User deleted successfully', { id }));
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
