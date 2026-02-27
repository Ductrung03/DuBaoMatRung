// shared/utils/index.js - Common Utilities

const crypto = require('crypto');

const { toUnicode } = require('vietnamese-conversion');

// Check if text is already Unicode (contains Vietnamese Unicode characters)
const isUnicode = (text) => {
  if (!text) return true;
  // Vietnamese Unicode ranges
  const unicodePattern = /[\u00C0-\u024F\u1E00-\u1EFF]/;
  return unicodePattern.test(text);
};

// Convert TCVN3 to Unicode và sửa lỗi typo phổ biến
const convertTcvn3ToUnicode = (text) => {
  if (!text) return '';

  let fixed = text;

  // Fix common typos in Vietnamese place names - nhiều patterns
  // Pattern 1: Xó/Xo → Xã (với hoặc không có space sau)
  fixed = fixed.replace(/^Xó(\s|$)/gi, 'Xã$1');  // "Xó Chiềng" hoặc "Xó"
  fixed = fixed.replace(/^Xo(\s|$)/gi, 'Xã$1');   // "Xo Chiềng" hoặc "Xo"

  // Pattern 2: xa → xã (lowercase)
  fixed = fixed.replace(/^xa(\s|$)/g, 'xã$1');

  // Pattern 3: XA → Xã (all caps)
  fixed = fixed.replace(/^XA(\s|$)/g, 'Xã$1');

  // Pattern 4: Fix "Phường Xó", "Thị trấn Xó", etc.
  fixed = fixed.replace(/(Phường|Thị\s+trấn|Thành\s+phố)\s+Xó(\s|$)/gi, '$1 Xã$2');

  // Pattern 5: Double characters - Xaa → Xã
  fixed = fixed.replace(/^Xaa?(\s|$)/gi, 'Xã$1');

  // Try conversion from different encodings
  if (!isUnicode(fixed)) {
    try {
      // Try VNI first
      const vniConverted = toUnicode(fixed, 'vni');
      if (vniConverted && vniConverted !== fixed) {
        fixed = vniConverted;
      }
    } catch (e) {
      // Ignore VNI error
    }

    try {
      // Then try TCVN3
      const tcvn3Converted = toUnicode(fixed, 'tcvn3');
      if (tcvn3Converted && tcvn3Converted !== fixed) {
        fixed = tcvn3Converted;
      }
    } catch (e) {
      // Ignore TCVN3 error
    }
  }

  // Apply fixes again after conversion (in case conversion introduced issues)
  fixed = fixed.replace(/^Xó(\s|$)/gi, 'Xã$1');
  fixed = fixed.replace(/^Xo(\s|$)/gi, 'Xã$1');
  fixed = fixed.replace(/^xa(\s|$)/g, 'xã$1');
  fixed = fixed.replace(/^XA(\s|$)/g, 'Xã$1');

  return fixed;
};

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash data
const hashData = (data, algorithm = 'sha256') => {
  return crypto.createHash(algorithm).update(data).digest('hex');
};

// Sanitize object (remove null/undefined)
const sanitizeObject = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

// Paginate array
const paginate = (array, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  const paginatedItems = array.slice(offset, offset + limit);

  return {
    data: paginatedItems,
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit)
    }
  };
};

// Retry async function
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Deep clone object
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Format bytes to human readable
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse query parameters for filtering
const parseQueryFilters = (query) => {
  const filters = {};
  const pagination = {
    page: parseInt(query.page) || 1,
    limit: parseInt(query.limit) || 10
  };

  Object.entries(query).forEach(([key, value]) => {
    if (!['page', 'limit', 'sort', 'order'].includes(key)) {
      filters[key] = value;
    }
  });

  return { filters, pagination };
};

// Build SQL WHERE clause from filters
const buildWhereClause = (filters, startIndex = 1) => {
  const conditions = [];
  const params = [];
  let index = startIndex;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      conditions.push("${key} = $${index}");
      params.push(value);
      index++;
    }
  });

  const whereClause = conditions.length > 0
    ? "WHERE " + conditions.join(' AND ')
    : '';

  return { whereClause, params, nextIndex: index };
};

// Response formatter
const formatResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;

  return response;
};

module.exports = {
  isUnicode,
  convertTcvn3ToUnicode,
  generateRandomString,
  hashData,
  sanitizeObject,
  paginate,
  retry,
  deepClone,
  formatBytes,
  sleep,
  parseQueryFilters,
  buildWhereClause,
  formatResponse
};
