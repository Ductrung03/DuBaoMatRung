// shared/validators/index.js - Input Validation Utilities

const { ValidationError } = require('../errors');

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate username
const isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return usernameRegex.test(username);
};

// Validate password strength
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  return passwordRegex.test(password);
};

// Validate date format (YYYY-MM-DD)
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// Validate coordinate (latitude/longitude)
const isValidCoordinate = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
};

// Validate required fields
const validateRequired = (data, requiredFields) => {
  const errors = [];

  requiredFields.forEach(field => {
    if (!data[field] || data[field] === '') {
      errors.push({
        field,
        message: `${field} is required`
      });
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return true;
};

// Validate object schema
const validateSchema = (data, schema) => {
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];

    // Required check
    if (rules.required && (!value || value === '')) {
      errors.push({
        field,
        message: `${field} is required`
      });
      return;
    }

    // Skip other validations if not required and empty
    if (!rules.required && (!value || value === '')) {
      return;
    }

    // Type check
    if (rules.type && typeof value !== rules.type) {
      errors.push({
        field,
        message: `${field} must be of type ${rules.type}`
      });
    }

    // Min length
    if (rules.minLength && value.length < rules.minLength) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.minLength} characters`
      });
    }

    // Max length
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push({
        field,
        message: `${field} must not exceed ${rules.maxLength} characters`
      });
    }

    // Min value
    if (rules.min !== undefined && value < rules.min) {
      errors.push({
        field,
        message: `${field} must be at least ${rules.min}`
      });
    }

    // Max value
    if (rules.max !== undefined && value > rules.max) {
      errors.push({
        field,
        message: `${field} must not exceed ${rules.max}`
      });
    }

    // Pattern match
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push({
        field,
        message: rules.patternMessage || `${field} format is invalid`
      });
    }

    // Custom validator
    if (rules.validator && !rules.validator(value)) {
      errors.push({
        field,
        message: rules.validatorMessage || `${field} validation failed`
      });
    }

    // Enum check
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${rules.enum.join(', ')}`
      });
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Schema validation failed', errors);
  }

  return true;
};

// Sanitize string input
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

// Sanitize object
const sanitizeObject = (obj, allowedFields) => {
  const sanitized = {};

  allowedFields.forEach(field => {
    if (obj[field] !== undefined) {
      sanitized[field] = typeof obj[field] === 'string'
        ? sanitizeString(obj[field])
        : obj[field];
    }
  });

  return sanitized;
};

module.exports = {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  isValidDate,
  isValidCoordinate,
  validateRequired,
  validateSchema,
  sanitizeString,
  sanitizeObject
};
