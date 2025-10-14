// gateway/src/middleware/errorHandler.js - Centralized Error Handler

const errorHandler = (err, req, res, next) => {
  console.error('Gateway Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? message : err.message,
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      details: err.details
    } : undefined,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
