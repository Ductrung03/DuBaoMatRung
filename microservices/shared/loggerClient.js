// shared/loggerClient.js - Client để gửi logs đến Gateway Logging Service
const axios = require('axios');

/**
 * Gửi activity log đến logging service
 * @param {Object} logData - Log data
 * @param {string} logData.service - Service name
 * @param {string} logData.action - Action performed
 * @param {number} logData.userId - User ID (optional)
 * @param {string} logData.ipAddress - IP address (optional)
 * @param {Object} logData.details - Additional details (optional)
 */
async function sendActivityLog(logData) {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:3000';
    const loggingEndpoint = `${gatewayUrl}/api/logs`;

    const payload = {
      timestamp: new Date().toISOString(),
      service: logData.service || 'unknown',
      action: logData.action || 'UNKNOWN_ACTION',
      userId: logData.userId || null,
      ipAddress: logData.ipAddress || null,
      details: logData.details || {}
    };

    // Fire and forget - don't wait for response
    axios.post(loggingEndpoint, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      // Silently fail - logging should not break the main flow
      console.error('Failed to send activity log:', error.message);
    });

  } catch (error) {
    // Silently fail - logging should not break the main flow
    console.error('Error in sendActivityLog:', error.message);
  }
}

/**
 * Middleware để tự động log các requests
 * @param {string} serviceName - Service name
 */
function createLoggingMiddleware(serviceName) {
  return (req, res, next) => {
    // Capture response
    const originalSend = res.send;
    res.send = function(data) {
      res.send = originalSend;

      // Log only successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = `${req.method}_${req.path.replace(/\//g, '_').toUpperCase()}`;

        sendActivityLog({
          service: serviceName,
          action: action,
          userId: req.user?.id || req.user?.userId || null,
          ipAddress: req.ip || req.connection.remoteAddress,
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            userAgent: req.headers['user-agent']
          }
        });
      }

      return res.send(data);
    };

    next();
  };
}

module.exports = {
  sendActivityLog,
  createLoggingMiddleware
};
