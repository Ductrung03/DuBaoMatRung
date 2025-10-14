// shared/redis/index.js - Redis Client Manager
const Redis = require('ioredis');
const createLogger = require('../logger');

class RedisManager {
  constructor(serviceName, config) {
    this.logger = createLogger(serviceName);
    this.serviceName = serviceName;
    this.config = config;
    this.client = null;
  }

  // Initialize Redis client
  async initialize() {
    this.client = new Redis({
      host: this.config.host || process.env.REDIS_HOST || 'localhost',
      port: this.config.port || process.env.REDIS_PORT || 6379,
      password: this.config.password || process.env.REDIS_PASSWORD,
      db: this.config.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    });

    // Event handlers
    this.client.on('connect', () => {
      this.logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', {
        message: err.message
      });
    });

    this.client.on('close', () => {
      this.logger.warn('Redis client closed');
    });

    this.client.on('reconnecting', () => {
      this.logger.info('Redis client reconnecting');
    });

    // Wait for ready
    await new Promise((resolve, reject) => {
      this.client.once('ready', resolve);
      this.client.once('error', reject);
    });

    this.logger.info('Redis manager initialized successfully');
  }

  // Get value with error handling
  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  // Set value with TTL
  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.error('Redis SET error', { key, error: error.message });
      return false;
    }
  }

  // Delete key
  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error('Redis DEL error', { key, error: error.message });
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error('Redis EXISTS error', { key, error: error.message });
      return false;
    }
  }

  // Increment value
  async incr(key, amount = 1) {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      this.logger.error('Redis INCR error', { key, error: error.message });
      return null;
    }
  }

  // Get multiple keys
  async mget(keys) {
    try {
      const values = await this.client.mget(keys);
      return values.map(v => v ? JSON.parse(v) : null);
    } catch (error) {
      this.logger.error('Redis MGET error', { keys, error: error.message });
      return [];
    }
  }

  // Set with pattern-based expiration
  async setWithPattern(pattern, value, ttl = 3600) {
    const key = `${this.serviceName}:${pattern}`;
    return await this.set(key, value, ttl);
  }

  // Get with pattern
  async getWithPattern(pattern) {
    const key = `${this.serviceName}:${pattern}`;
    return await this.get(key);
  }

  // Clear all keys with pattern
  async clearPattern(pattern) {
    try {
      const keys = await this.client.keys(`${this.serviceName}:${pattern}*`);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      return keys.length;
    } catch (error) {
      this.logger.error('Redis CLEAR PATTERN error', { pattern, error: error.message });
      return 0;
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.client.ping();
      return { healthy: result === 'PONG', redis: true };
    } catch (error) {
      return { healthy: false, redis: false, error: error.message };
    }
  }

  // Graceful shutdown
  async close() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis client closed');
    }
  }
}

module.exports = RedisManager;
