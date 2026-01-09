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

// Convert TCVN3 to Unicode (only if not already Unicode)
const convertTcvn3ToUnicode = (text) => {
  if (!text) return '';
  // If already Unicode, return as-is
  if (isUnicode(text)) return text;
  // Otherwise convert from TCVN3
  return toUnicode(text, 'tcvn3');
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
