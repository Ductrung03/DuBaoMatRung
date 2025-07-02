// server/utils/enhancedCache.js
const Redis = require('redis');
const zlib = require('zlib');
const { promisify } = require('util');

class EnhancedCache {
  constructor() {
    // Redis for production, memory for development
    this.useRedis = process.env.NODE_ENV === 'production';
    this.memoryCache = new Map();
    
    if (this.useRedis) {
      this.redis = Redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retry_strategy: (options) => Math.min(options.attempt * 100, 3000)
      });
    }
    
    // Compression utilities
    this.gzip = promisify(zlib.gzip);
    this.gunzip = promisify(zlib.gunzip);
  }

  async get(key) {
    try {
      if (this.useRedis) {
        const compressed = await this.redis.getBuffer(key);
        if (compressed) {
          const decompressed = await this.gunzip(compressed);
          const data = JSON.parse(decompressed.toString());
          console.log(`🚀 Redis cache HIT: ${key}`);
          return data;
        }
      } else {
        if (this.memoryCache.has(key)) {
          const { data, timestamp } = this.memoryCache.get(key);
          const age = Date.now() - timestamp;
          const TTL = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age < TTL) {
            console.log(`🚀 Memory cache HIT: ${key} (age: ${Math.round(age/1000/60)}min)`);
            return data;
          } else {
            this.memoryCache.delete(key);
          }
        }
      }
      
      console.log(`❌ Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  async set(key, data, ttl = 24 * 60 * 60) {
    try {
      if (this.useRedis) {
        const json = JSON.stringify(data);
        const compressed = await this.gzip(json);
        await this.redis.setex(key, ttl, compressed);
        
        const originalSize = Buffer.byteLength(json, 'utf8');
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize/originalSize) * 100).toFixed(1);
        
        console.log(`💾 Redis cached: ${key} (${this.formatBytes(originalSize)} → ${this.formatBytes(compressedSize)}, ${ratio}% compression)`);
      } else {
        this.memoryCache.set(key, {
          data,
          timestamp: Date.now()
        });
        console.log(`💾 Memory cached: ${key} (${this.formatBytes(JSON.stringify(data).length)})`);
      }
    } catch (error) {
      console.error(`Cache set error for ${key}:`, error);
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  async clear() {
    if (this.useRedis) {
      await this.redis.flushall();
    } else {
      this.memoryCache.clear();
    }
    console.log('🗑️ Cache cleared');
  }
}

module.exports = new EnhancedCache();