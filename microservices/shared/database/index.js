// shared/database/index.js - PostgreSQL Pool Manager
const { Pool } = require('pg');
const createLogger = require('../logger');

class DatabaseManager {
  constructor(serviceName, config) {
    this.logger = createLogger(serviceName);
    this.serviceName = serviceName;
    this.config = config;
    this.pool = null;
  }

  // Initialize database pool
  async initialize() {
    this.pool = new Pool({
      host: this.config.host || process.env.DB_HOST,
      port: this.config.port || process.env.DB_PORT || 5432,
      user: this.config.user || process.env.DB_USER,
      password: this.config.password || process.env.DB_PASSWORD,
      database: this.config.database || process.env.DB_NAME,
      ssl: this.config.ssl || false,

      // Pool configuration
      max: this.config.max || 20,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 10000,

      // Application name for debugging
      application_name: `${this.serviceName}_service`
    });

    // Event handlers
    this.pool.on('error', (err, client) => {
      this.logger.error('Unexpected database error', {
        message: err.message,
        code: err.code
      });
    });

    this.pool.on('connect', (client) => {
      this.logger.debug('New database connection established');
    });

    this.pool.on('acquire', () => {
      this.logger.debug(`Connection acquired (Total: ${this.pool.totalCount}/${this.pool.options.max})`);
    });

    this.pool.on('remove', () => {
      this.logger.debug(`Connection removed (Total: ${this.pool.totalCount}/${this.pool.options.max})`);
    });

    // Test connection
    await this.testConnection();

    this.logger.info('Database pool initialized successfully');
  }

  // Test database connection
  async testConnection() {
    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW(), current_database(), version()');
      this.logger.info('Database connection test successful', {
        database: result.rows[0].current_database,
        timestamp: result.rows[0].now
      });
      client.release();
    } catch (error) {
      this.logger.error('Database connection test failed', {
        message: error.message,
        code: error.code
      });
      throw error;
    }
  }

  // Execute query with error handling
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      this.logger.debug('Query executed', {
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      this.logger.error('Query error', {
        message: error.message,
        code: error.code,
        query: text
      });
      throw error;
    }
  }

  // Get a client from pool for transactions
  async getClient() {
    return await this.pool.connect();
  }

  // Graceful shutdown
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database pool closed');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return { healthy: true, database: this.config.database };
    } catch (error) {
      return {
        healthy: false,
        database: this.config.database,
        error: error.message
      };
    }
  }
}

module.exports = DatabaseManager;
