// Simple in-memory cache implementation

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  get(key) {
    if (this.cache.has(key)) {
      this.stats.hits++;
      return this.cache.get(key);
    }
    this.stats.misses++;
    return null;
  }

  set(key, value, ttl = 300000) { // Default TTL: 5 minutes
    this.stats.sets++;
    
    const item = {
      value,
      expires: Date.now() + ttl
    };
    
    this.cache.set(key, item);
    
    // Set cleanup timer
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }
    
    const item = this.cache.get(key);
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  get size() {
    // Clean expired items first
    this.cleanExpired();
    return this.cache.size;
  }

  keys() {
    this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  getStats() {
    return {
      ...this.stats,
      size: this.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
const cache = new SimpleCache();

module.exports = cache;
