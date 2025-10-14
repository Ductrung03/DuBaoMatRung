// shared/errors/index.js - Custom Error Classes

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError) {
    super(message, 500, false);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message) {
    super(`${service} service error: ${message}`, 503, false);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

// Error handler middleware factory
const errorHandler = (logger) => {
  return (err, req, res, next) => {
    // Default to 500 server error
    err.statusCode = err.statusCode || 500;
    err.isOperational = err.isOperational || false;

    // Log error
    if (err.isOperational) {
      logger.warn('Operational error', {
        name: err.name,
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method
      });
    } else {
      logger.error('Programming or unknown error', {
        name: err.name,
        message: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method
      });
    }

    // Send response
    const response = {
      success: false,
      message: err.message,
      timestamp: err.timestamp || new Date().toISOString()
    };

    // Add validation errors if present
    if (err.errors && Array.isArray(err.errors)) {
      response.errors = err.errors;
    }

    // In development, send stack trace
    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
  };
};

// Async handler wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  errorHandler,
  asyncHandler
};
