// Cache utility functions

const cache = require('./cache');

/**
 * Generate cache key for dropdown data
 * @param {string} type - Type of dropdown (huyen, xa, etc.)
 * @param {...string} params - Additional parameters
 * @returns {string} - Cache key
 */
function getCacheKey(type, ...params) {
  const baseKey = `dropdown:${type}`;
  if (params.length > 0) {
    return `${baseKey}:${params.join(':')}`;
  }
  return baseKey;
}

/**
 * Get cached data
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if not found/expired
 */
function getCachedData(key) {
  if (!cache.has(key)) {
    return null;
  }
  
  const item = cache.get(key);
  if (!item) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

/**
 * Set cached data
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
function setCachedData(key, data, ttl = 300000) {
  cache.set(key, data, ttl);
}

/**
 * Clear cache by pattern
 * @param {string} pattern - Pattern to match keys
 */
function clearCacheByPattern(pattern) {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.delete(key);
    }
  });
}

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

module.exports = {
  getCacheKey,
  getCachedData,
  setCachedData,
  clearCacheByPattern,
  getCacheStats
};
