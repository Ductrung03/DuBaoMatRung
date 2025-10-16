// auth-service/src/middleware/internalAuth.middleware.js
const createLogger = require('../../../../shared/logger');

const logger = createLogger('internal-auth-middleware');

/**
 * Middleware to protect internal service-to-service endpoints
 * Checks for X-Internal-Api-Key header
 */
const verifyInternalApiKey = (req, res, next) => {
  const apiKey = req.headers['x-internal-api-key'];
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (!expectedApiKey) {
    logger.error('INTERNAL_API_KEY environment variable is not set');
    return res.status(500).json({
      success: false,
      message: 'Internal server configuration error'
    });
  }

  if (!apiKey) {
    logger.warn('Internal API call rejected: missing API key', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing internal API key.'
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn('Internal API call rejected: invalid API key', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing internal API key.'
    });
  }

  // API key is valid
  logger.debug('Internal API call authorized', {
    path: req.path,
    serviceName: req.headers['x-service-name'] || 'unknown'
  });

  next();
};

module.exports = { verifyInternalApiKey };
