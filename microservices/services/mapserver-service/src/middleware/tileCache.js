const Redis = require('ioredis');
const crypto = require('crypto');

class TileCacheMiddleware {
  constructor(logger) {
    this.logger = logger;
    this.redis = null;
    this.enabled = false;
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.prefix = process.env.TILE_CACHE_PREFIX || 'mapserver:tile:';
  }

  async initialize() {
    if (process.env.TILE_CACHE_ENABLED === 'false') {
      this.logger.info('Tile cache disabled by TILE_CACHE_ENABLED=false');
      return;
    }

    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: Number(process.env.REDIS_PORT || 6379),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false
      });

      this.redis.on('error', (error) => {
        this.errors += 1;
        this.logger.warn('Tile cache Redis error', { error: error.message });
      });

      await this.redis.connect();
      this.enabled = true;
      this.logger.info('Tile cache connected to Redis');
    } catch (error) {
      this.enabled = false;
      this.errors += 1;
      this.logger.warn('Tile cache disabled; Redis unavailable', { error: error.message });
    }
  }

  getCacheKey(req) {
    const rawKey = `${req.path}?${new URLSearchParams(req.query).toString()}`;
    return `${this.prefix}${crypto.createHash('sha1').update(rawKey).digest('hex')}`;
  }

  async checkCache(req, res, next) {
    if (!this.enabled || !this.redis) {
      return next();
    }

    const key = this.getCacheKey(req);
    req.tileCacheKey = key;

    try {
      const cached = await this.redis.get(key);
      if (!cached) {
        this.misses += 1;
        return next();
      }

      const payload = JSON.parse(cached);
      this.hits += 1;
      res.setHeader('Content-Type', payload.contentType || 'image/png');
      res.setHeader('X-Tile-Cache', 'HIT');
      return res.send(Buffer.from(payload.body, 'base64'));
    } catch (error) {
      this.errors += 1;
      this.logger.warn('Tile cache read failed', { error: error.message });
      return next();
    }
  }

  async storeInCache(key, body, contentType, ttl) {
    if (!this.enabled || !this.redis || !key) {
      return;
    }

    try {
      const payload = JSON.stringify({
        contentType,
        body: Buffer.from(body).toString('base64')
      });
      await this.redis.set(key, payload, 'EX', ttl);
    } catch (error) {
      this.errors += 1;
      this.logger.warn('Tile cache write failed', { error: error.message });
    }
  }

  async clearCache(pattern = '*') {
    if (!this.enabled || !this.redis) {
      return 0;
    }

    const searchPattern = pattern.startsWith(this.prefix) ? pattern : `${this.prefix}${pattern}`;
    const keys = await this.redis.keys(searchPattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
    return keys.length;
  }

  getStats() {
    return {
      enabled: this.enabled,
      hits: this.hits,
      misses: this.misses,
      errors: this.errors
    };
  }

  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

module.exports = TileCacheMiddleware;
