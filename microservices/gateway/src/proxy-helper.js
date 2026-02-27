// gateway/src/proxy-helper.js - Proxy Helper Functions

const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Create a standardized proxy middleware with common configuration
 *
 * @param {object} logger - Winston logger instance
 * @param {object} options - Proxy configuration options
 * @param {string} options.target - Target service URL
 * @param {function} options.pathRewrite - Path rewrite function
 * @param {number} [options.timeout=30000] - Request timeout in ms
 * @param {string} [options.serviceName='service'] - Service name for logging
 * @param {boolean} [options.forwardUserHeaders=false] - Whether to forward user authentication headers
 * @param {function} [options.onProxyReq] - Additional proxyReq handler (optional)
 * @param {function} [options.onProxyRes] - Additional proxyRes handler (optional)
 * @param {function} [options.onError] - Additional error handler (optional)
 * @returns {function} Configured proxy middleware
 */
function createProxy(logger, options) {
  const {
    target,
    pathRewrite,
    timeout = 30000,
    serviceName = 'service',
    forwardUserHeaders = false,
    onProxyReq,
    onProxyRes,
    onError
  } = options;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout,
    proxyTimeout: timeout,
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Log the proxied request
        logger.info(`${serviceName} request: ${req.method} ${req.url} -> ${proxyReq.path}`);

        // Forward user authentication headers if enabled
        if (forwardUserHeaders && req.user) {
          // Set headers directly from req.user (populated by auth middleware)
          // This is more reliable than reading req.headers which may not reflect
          // middleware modifications due to http-proxy-middleware header copying
          proxyReq.setHeader('x-user-id', String(req.user.id || ''));
          proxyReq.setHeader('x-user-username', String(req.user.username || ''));
          const rolesArray = (req.user.roles || []).map(r => typeof r === 'object' ? r.name || r.id : r);
          proxyReq.setHeader('x-user-roles', encodeURIComponent(rolesArray.join(',')));
          proxyReq.setHeader('x-user-permissions', (req.user.permissions || []).join(','));
          proxyReq.setHeader('x-user-xa', req.user.xa ? encodeURIComponent(String(req.user.xa)) : '');
          proxyReq.setHeader('x-user-tieukhu', req.user.tieukhu ? encodeURIComponent(String(req.user.tieukhu)) : '');
          proxyReq.setHeader('x-user-khoanh', req.user.khoanh ? encodeURIComponent(String(req.user.khoanh)) : '');
        } else if (forwardUserHeaders) {
          // Fallback: forward from req.headers if req.user not set
          const userHeaders = ['x-user-id', 'x-user-roles', 'x-user-permissions', 'x-user-username', 'x-user-name', 'x-user-full-name', 'x-user-xa', 'x-user-tieukhu', 'x-user-khoanh'];
          userHeaders.forEach(header => {
            if (req.headers[header]) {
              proxyReq.setHeader(header, req.headers[header]);
            }
          });
        }

        // Restream body if it was parsed by body-parser
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }

        // Call custom onProxyReq handler if provided
        if (onProxyReq) {
          onProxyReq(proxyReq, req, res);
        }
      },

      proxyRes: (proxyRes, req, res) => {
        // Log the proxy response
        logger.info(`${serviceName} response ${proxyRes.statusCode} from ${req.url}`);

        // Call custom onProxyRes handler if provided
        if (onProxyRes) {
          onProxyRes(proxyRes, req, res);
        }
      },

      error: (err, req, res) => {
        // Log the error
        logger.error(`${serviceName} proxy error:`, { error: err.message });

        // Call custom onError handler if provided, otherwise use default error response
        if (onError) {
          onError(err, req, res);
        } else if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: `${serviceName} unavailable`,
            error: err.message
          });
        }
      }
    }
  });
}

module.exports = {
  createProxy
};
