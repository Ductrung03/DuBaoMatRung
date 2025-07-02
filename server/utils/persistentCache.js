// server/utils/persistentCache.js - Hệ thống cache persistent
const fs = require('fs').promises;
const path = require('path');

class PersistentCache {
  constructor() {
    this.cacheDir = path.join(__dirname, '../cache');
    this.memoryCache = new Map();
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      console.log(`📁 Cache directory initialized: ${this.cacheDir}`);
    } catch (err) {
      console.error('❌ Error initializing cache directory:', err);
    }
  }

  getCacheFilePath(key) {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async exists(key) {
    try {
      const filePath = this.getCacheFilePath(key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async get(key) {
    try {
      // Check memory cache first
      if (this.memoryCache.has(key)) {
        console.log(`🚀 Memory cache HIT for: ${key}`);
        return this.memoryCache.get(key);
      }

      // Check file cache
      const filePath = this.getCacheFilePath(key);
      const data = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(data);
      
      // Load into memory cache
      this.memoryCache.set(key, parsed);
      console.log(`💾 File cache HIT for: ${key}`);
      return parsed;
    } catch (err) {
      console.log(`❌ Cache MISS for: ${key}`);
      return null;
    }
  }

  async set(key, data) {
    try {
      // Save to memory cache
      this.memoryCache.set(key, data);
      
      // Save to file cache
      const filePath = this.getCacheFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
      
      const size = this.getDataSize(data);
      console.log(`💾 Cached to persistent storage: ${key} (${size})`);
      return true;
    } catch (err) {
      console.error(`❌ Error caching ${key}:`, err);
      return false;
    }
  }

  async delete(key) {
    try {
      // Remove from memory
      this.memoryCache.delete(key);
      
      // Remove file
      const filePath = this.getCacheFilePath(key);
      await fs.unlink(filePath);
      console.log(`🗑️ Deleted cache: ${key}`);
      return true;
    } catch (err) {
      console.error(`❌ Error deleting cache ${key}:`, err);
      return false;
    }
  }

  async clear() {
    try {
      // Clear memory
      this.memoryCache.clear();
      
      // Clear files
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
      console.log(`🗑️ Cleared all persistent cache`);
      return true;
    } catch (err) {
      console.error(`❌ Error clearing cache:`, err);
      return false;
    }
  }

  async getStatus() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      const status = {
        memory_cache_count: this.memoryCache.size,
        file_cache_count: jsonFiles.length,
        cached_layers: jsonFiles.map(f => f.replace('.json', '')),
        total_cache_size: 0
      };

      // Calculate total size
      for (const file of jsonFiles) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        status.total_cache_size += stats.size;
      }

      return status;
    } catch (err) {
      console.error('❌ Error getting cache status:', err);
      return {
        memory_cache_count: 0,
        file_cache_count: 0,
        cached_layers: [],
        total_cache_size: 0
      };
    }
  }

  async rebuild() {
    console.log('🔄 Starting cache rebuild...');
    await this.clear();
    return true;
  }

  getDataSize(data) {
    const size = JSON.stringify(data).length;
    if (size > 1024 * 1024) {
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(size / 1024).toFixed(1)} KB`;
  }
}

// Export singleton instance
module.exports = new PersistentCache();