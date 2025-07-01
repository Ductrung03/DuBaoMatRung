// server/utils/dataCache.js - Hệ thống cache dữ liệu
class DataCache {
  constructor() {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 giờ
  }

  // Kiểm tra cache có hợp lệ không
  isValidCache(key) {
    if (!this.cache.has(key)) return false;
    
    const timestamp = this.cacheTimestamps.get(key);
    const now = Date.now();
    
    return (now - timestamp) < this.CACHE_DURATION;
  }

  // Lấy dữ liệu từ cache
  get(key) {
    if (this.isValidCache(key)) {
      console.log(`✅ Cache HIT for: ${key}`);
      return this.cache.get(key);
    }
    console.log(`❌ Cache MISS for: ${key}`);
    return null;
  }

  // Lưu dữ liệu vào cache
  set(key, data) {
    this.cache.set(key, data);
    this.cacheTimestamps.set(key, Date.now());
    console.log(`💾 Cached data for: ${key} (${this.getDataSize(data)})`);
  }

  // Xóa cache
  delete(key) {
    this.cache.delete(key);
    this.cacheTimestamps.delete(key);
    console.log(`🗑️ Deleted cache for: ${key}`);
  }

  // Xóa tất cả cache
  clear() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log(`🗑️ Cleared all cache`);
  }

  // Lấy thông tin cache
  getStats() {
    const stats = {};
    for (const [key, data] of this.cache.entries()) {
      stats[key] = {
        size: this.getDataSize(data),
        timestamp: this.cacheTimestamps.get(key),
        isValid: this.isValidCache(key)
      };
    }
    return stats;
  }

  // Tính kích thước dữ liệu
  getDataSize(data) {
    const size = JSON.stringify(data).length;
    if (size > 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(size / 1024).toFixed(1)} KB`;
  }
}

// Tạo instance duy nhất
const dataCache = new DataCache();

module.exports = dataCache;