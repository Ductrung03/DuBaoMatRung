/**
 * BaseRepository - Base class cho tất cả repositories
 *
 * Cung cấp:
 * - Connection pooling
 * - Transaction support
 * - Error handling
 * - Query logging
 * - Common CRUD operations
 */

class BaseRepository {
  /**
   * @param {Pool} pool - PostgreSQL connection pool
   * @param {string} tableName - Tên bảng chính
   */
  constructor(pool, tableName = null) {
    this.pool = pool;
    this.tableName = tableName;
  }

  /**
   * Execute query với error handling
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(sql, params = []) {
    const start = Date.now();
    let client;

    try {
      client = await this.pool.connect();
      const result = await client.query(sql, params);

      const duration = Date.now() - start;

      // Log slow queries (> 1000ms)
      if (duration > 1000) {
        console.warn(`[SLOW QUERY] ${duration}ms:`, sql.substring(0, 100));
      }

      return result;
    } catch (error) {
      console.error('[Query Error]', {
        sql: sql.substring(0, 200),
        params,
        error: error.message
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute transaction
   * @param {Function} callback - Async function nhận client làm tham số
   * @returns {Promise<any>} Result from callback
   *
   * @example
   * await repo.transaction(async (client) => {
   *   await client.query('INSERT INTO users...');
   *   await client.query('INSERT INTO audit_log...');
   *   return { success: true };
   * });
   */
  async transaction(callback) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[Transaction Error]', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    if (!this.tableName) {
      throw new Error('tableName is required for findById');
    }

    const { rows } = await this.query(
      `SELECT * FROM ${this.tableName} WHERE id = $1 OR gid = $1`,
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Find all records with optional conditions
   * @param {Object} options - Query options
   * @param {Object} options.where - WHERE conditions
   * @param {string} options.orderBy - ORDER BY clause
   * @param {number} options.limit - LIMIT
   * @param {number} options.offset - OFFSET
   * @returns {Promise<Array>}
   *
   * @example
   * await repo.findAll({
   *   where: { status: 'active' },
   *   orderBy: 'created_at DESC',
   *   limit: 10
   * });
   */
  async findAll(options = {}) {
    if (!this.tableName) {
      throw new Error('tableName is required for findAll');
    }

    const { where = {}, orderBy = 'id DESC', limit, offset } = options;

    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    Object.entries(where).forEach(([key, value]) => {
      whereConditions.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    });

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const limitClause = limit ? `LIMIT ${limit}` : '';
    const offsetClause = offset ? `OFFSET ${offset}` : '';

    const sql = `
      SELECT * FROM ${this.tableName}
      ${whereClause}
      ORDER BY ${orderBy}
      ${limitClause}
      ${offsetClause}
    `;

    const { rows } = await this.query(sql, params);
    return rows;
  }

  /**
   * Count records with optional conditions
   * @param {Object} where - WHERE conditions
   * @returns {Promise<number>}
   */
  async count(where = {}) {
    if (!this.tableName) {
      throw new Error('tableName is required for count');
    }

    const whereConditions = [];
    const params = [];
    let paramCount = 1;

    Object.entries(where).forEach(([key, value]) => {
      whereConditions.push(`${key} = $${paramCount}`);
      params.push(value);
      paramCount++;
    });

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`;
    const { rows } = await this.query(sql, params);

    return parseInt(rows[0].count, 10);
  }

  /**
   * Insert new record
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted record
   */
  async create(data) {
    if (!this.tableName) {
      throw new Error('tableName is required for create');
    }

    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const { rows } = await this.query(sql, values);
    return rows[0];
  }

  /**
   * Update record
   * @param {number} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated record
   */
  async update(id, data) {
    if (!this.tableName) {
      throw new Error('tableName is required for update');
    }

    const keys = Object.keys(data);
    const values = Object.values(data);

    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${keys.length + 1} OR gid = $${keys.length + 1}
      RETURNING *
    `;

    const { rows } = await this.query(sql, [...values, id]);
    return rows[0];
  }

  /**
   * Delete record
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(id) {
    if (!this.tableName) {
      throw new Error('tableName is required for delete');
    }

    const sql = `
      DELETE FROM ${this.tableName}
      WHERE id = $1 OR gid = $1
      RETURNING *
    `;

    const { rows } = await this.query(sql, [id]);
    return rows.length > 0;
  }

  /**
   * Check if record exists
   * @param {Object} where - WHERE conditions
   * @returns {Promise<boolean>}
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Execute raw SQL (use with caution)
   * @param {string} sql - Raw SQL
   * @param {Array} params - Parameters
   * @returns {Promise<Array>}
   */
  async raw(sql, params = []) {
    const { rows } = await this.query(sql, params);
    return rows;
  }

  /**
   * Batch insert (efficient for large datasets)
   * @param {Array<Object>} records - Array of objects to insert
   * @returns {Promise<Array>} Inserted records
   */
  async batchCreate(records) {
    if (!this.tableName) {
      throw new Error('tableName is required for batchCreate');
    }

    if (!records || records.length === 0) {
      return [];
    }

    const keys = Object.keys(records[0]);
    const columns = keys.join(', ');

    // Build values placeholders
    let paramCount = 1;
    const valuePlaceholders = [];
    const allValues = [];

    records.forEach(record => {
      const placeholders = keys.map(() => `$${paramCount++}`).join(', ');
      valuePlaceholders.push(`(${placeholders})`);
      allValues.push(...Object.values(record));
    });

    const sql = `
      INSERT INTO ${this.tableName} (${columns})
      VALUES ${valuePlaceholders.join(', ')}
      RETURNING *
    `;

    const { rows } = await this.query(sql, allValues);
    return rows;
  }

  /**
   * Get connection pool statistics
   * @returns {Object} Pool stats
   */
  getPoolStats() {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }
}

module.exports = BaseRepository;
