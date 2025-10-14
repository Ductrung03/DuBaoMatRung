/**
 * UserRepository - Quản lý users và authentication
 * Database: auth_db
 *
 * Chức năng:
 * - User CRUD
 * - Session management
 * - Activity logging
 * - Password reset
 */

const BaseRepository = require('./BaseRepository');
const bcrypt = require('bcrypt');

class UserRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'users');
  }

  /**
   * Find user by username (for login)
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  async findByUsername(username) {
    const { rows } = await this.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return rows[0] || null;
  }

  /**
   * Find user by ID (không trả về password_hash)
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const { rows } = await this.query(`
      SELECT
        id, username, full_name, role, is_active,
        created_at, last_login, district_id,
        position, organization, permission_level
      FROM users
      WHERE id = $1
    `, [id]);

    return rows[0] || null;
  }

  /**
   * Find multiple users by IDs (bulk fetch)
   * @param {Array<number>} ids
   * @returns {Promise<Array>}
   */
  async findByIds(ids) {
    if (!ids || ids.length === 0) return [];

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await this.query(`
      SELECT
        id, username, full_name, role, is_active,
        organization, position, permission_level
      FROM users
      WHERE id IN (${placeholders})
    `, ids);

    return rows;
  }

  /**
   * Create new user
   * @param {Object} userData
   * @param {string} userData.username
   * @param {string} userData.password - Plain text password
   * @param {string} userData.full_name
   * @param {string} userData.role
   * @param {string} userData.position
   * @param {string} userData.organization
   * @returns {Promise<Object>}
   */
  async createUser(userData) {
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const { rows } = await this.query(`
      INSERT INTO users (
        username, password_hash, full_name, role,
        position, organization, permission_level, district_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, full_name, role, organization
    `, [
      userData.username,
      passwordHash,
      userData.full_name,
      userData.role || 'user',
      userData.position,
      userData.organization,
      userData.permission_level || 'district',
      userData.district_id || null
    ]);

    return rows[0];
  }

  /**
   * Verify password
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user password
   * @param {number} userId
   * @param {string} newPassword - Plain text
   * @returns {Promise<boolean>}
   */
  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { rows } = await this.query(`
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      RETURNING id
    `, [passwordHash, userId]);

    return rows.length > 0;
  }

  /**
   * Update last login timestamp
   * @param {number} userId
   */
  async updateLastLogin(userId) {
    await this.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  /**
   * Update user profile
   * @param {number} userId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, updates) {
    const allowedFields = [
      'full_name', 'position', 'organization', 'district_id'
    ];

    const setFields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key)) {
        setFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (setFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    const { rows } = await this.query(`
      UPDATE users
      SET ${setFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, full_name, organization, position
    `, values);

    return rows[0];
  }

  /**
   * Activate/Deactivate user
   * @param {number} userId
   * @param {boolean} isActive
   * @returns {Promise<boolean>}
   */
  async setActiveStatus(userId, isActive) {
    const { rows } = await this.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id',
      [isActive, userId]
    );
    return rows.length > 0;
  }

  /**
   * Get active users by role
   * @param {string} role - 'admin' | 'user' | 'viewer' | 'manager'
   * @returns {Promise<Array>}
   */
  async findByRole(role) {
    const { rows } = await this.query(`
      SELECT id, username, full_name, organization, position
      FROM users
      WHERE role = $1 AND is_active = true
      ORDER BY full_name
    `, [role]);

    return rows;
  }

  /**
   * Get users by district
   * @param {string} districtId
   * @returns {Promise<Array>}
   */
  async findByDistrict(districtId) {
    const { rows } = await this.query(`
      SELECT id, username, full_name, role, organization
      FROM users
      WHERE district_id = $1 AND is_active = true
      ORDER BY full_name
    `, [districtId]);

    return rows;
  }

  /**
   * Search users
   * @param {Object} filters
   * @param {string} filters.search - Search in username, full_name
   * @param {string} filters.role
   * @param {boolean} filters.isActive
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<Object>} { users, total }
   */
  async searchUsers(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    // Search by username or full_name
    if (filters.search) {
      conditions.push(`(
        username ILIKE $${paramCount} OR
        full_name ILIKE $${paramCount}
      )`);
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    // Filter by role
    if (filters.role) {
      conditions.push(`role = $${paramCount}`);
      params.push(filters.role);
      paramCount++;
    }

    // Filter by active status
    if (filters.isActive !== undefined) {
      conditions.push(`is_active = $${paramCount}`);
      params.push(filters.isActive);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    // Get total count
    const { rows: countRows } = await this.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );

    // Get users
    const { rows: users } = await this.query(`
      SELECT
        id, username, full_name, role, is_active,
        organization, position, district_id,
        created_at, last_login
      FROM users
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...params, limit, offset]);

    return {
      users,
      total: parseInt(countRows[0].total, 10),
      limit,
      offset
    };
  }

  // ========================================
  // SESSION MANAGEMENT
  // ========================================

  /**
   * Create user session
   * @param {number} userId
   * @param {string} tokenHash - Hashed JWT token
   * @param {Object} metadata
   * @param {string} metadata.ipAddress
   * @param {string} metadata.userAgent
   * @param {Date} expiresAt
   * @returns {Promise<Object>}
   */
  async createSession(userId, tokenHash, metadata, expiresAt) {
    const { rows } = await this.query(`
      INSERT INTO user_sessions (
        user_id, token_hash, ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, expires_at, created_at
    `, [userId, tokenHash, metadata.ipAddress, metadata.userAgent, expiresAt]);

    return rows[0];
  }

  /**
   * Find session by token hash
   * @param {string} tokenHash
   * @returns {Promise<Object|null>}
   */
  async findSessionByToken(tokenHash) {
    const { rows } = await this.query(`
      SELECT s.*, u.username, u.is_active
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
    `, [tokenHash]);

    return rows[0] || null;
  }

  /**
   * Get active sessions for user
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async getActiveSessions(userId) {
    const { rows } = await this.query(`
      SELECT
        id, ip_address, user_agent,
        created_at, last_activity, expires_at
      FROM user_sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY last_activity DESC
    `, [userId]);

    return rows;
  }

  /**
   * Revoke session
   * @param {string} sessionId
   * @returns {Promise<boolean>}
   */
  async revokeSession(sessionId) {
    const { rows } = await this.query(
      'DELETE FROM user_sessions WHERE id = $1 RETURNING id',
      [sessionId]
    );
    return rows.length > 0;
  }

  /**
   * Revoke all sessions for user
   * @param {number} userId
   * @returns {Promise<number>} Number of revoked sessions
   */
  async revokeAllUserSessions(userId) {
    const { rowCount } = await this.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [userId]
    );
    return rowCount;
  }

  /**
   * Clean expired sessions
   * @returns {Promise<number>} Number of deleted sessions
   */
  async cleanExpiredSessions() {
    const { rows } = await this.query(
      'SELECT clean_expired_sessions() as deleted_count'
    );
    return rows[0].deleted_count;
  }

  // ========================================
  // ACTIVITY LOGGING
  // ========================================

  /**
   * Log user activity
   * @param {number} userId
   * @param {string} action - e.g., 'login', 'verify_matrung', 'update_profile'
   * @param {Object} details - Additional details in JSON
   * @param {Object} metadata
   * @param {string} metadata.ipAddress
   * @param {string} metadata.userAgent
   */
  async logActivity(userId, action, details = {}, metadata = {}) {
    await this.query(`
      INSERT INTO user_activity_log (
        user_id, action, resource, details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      userId,
      action,
      details.resource || null,
      JSON.stringify(details),
      metadata.ipAddress || null,
      metadata.userAgent || null
    ]);
  }

  /**
   * Get user activity history
   * @param {number} userId
   * @param {Object} options
   * @param {number} options.limit
   * @param {number} options.offset
   * @returns {Promise<Array>}
   */
  async getUserActivity(userId, options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const { rows } = await this.query(`
      SELECT
        action, resource, details, ip_address,
        created_at
      FROM user_activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    return rows;
  }

  /**
   * Get activity statistics
   * @param {Object} filters
   * @param {Date} filters.startDate
   * @param {Date} filters.endDate
   * @param {string} filters.action
   * @returns {Promise<Object>}
   */
  async getActivityStats(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramCount}`);
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramCount}`);
      params.push(filters.endDate);
      paramCount++;
    }

    if (filters.action) {
      conditions.push(`action = $${paramCount}`);
      params.push(filters.action);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const { rows } = await this.query(`
      SELECT
        action,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_activity_log
      WHERE ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `, params);

    return rows;
  }

  // ========================================
  // STATISTICS & REPORTS
  // ========================================

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getUserStats() {
    const { rows } = await this.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_count,
        COUNT(*) FILTER (WHERE role = 'user') as user_count,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days') as weekly_active,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '30 days') as monthly_active
      FROM users
    `);

    return rows[0];
  }

  /**
   * Get recently created users
   * @param {number} days - Last N days
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentUsers(days = 7, limit = 10) {
    const { rows } = await this.query(`
      SELECT
        id, username, full_name, role,
        organization, created_at
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Get users by organization
   * @returns {Promise<Array>}
   */
  async getUsersByOrganization() {
    const { rows } = await this.query(`
      SELECT
        organization,
        COUNT(*) as user_count,
        COUNT(*) FILTER (WHERE is_active = true) as active_count
      FROM users
      GROUP BY organization
      ORDER BY user_count DESC
    `);

    return rows;
  }
}

module.exports = UserRepository;
