// mapserver-service/src/index-apache.js
// PRODUCTION SOLUTION: Use Apache HTTP Proxy
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3008;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors());
app.use(compression());

// MapServer configuration - Use Apache CGI
const MAPSERVER_URL = process.env.MAPSERVER_URL || 'http://localhost/cgi-bin/mapserv.exe';
const MAPFILE_PATH = process.env.MAPFILE_PATH || 'C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map';

logger.info('MapServer Service Configuration:', {
  mapserverUrl: MAPSERVER_URL,
  mapfilePath: MAPFILE_PATH,
  environment: process.env.NODE_ENV
});

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test MapServer connection
    const testUrl = `${MAPSERVER_URL}?map=${MAPFILE_PATH}&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities`;
    const response = await axios.get(testUrl, { timeout: 5000 });

    const mapserverOk = response.data.includes('WMS_Capabilities');

    res.json({
      status: mapserverOk ? 'ok' : 'degraded',
      service: 'mapserver-service',
      mapserver: {
        url: MAPSERVER_URL,
        accessible: mapserverOk
      },
      mapfile: MAPFILE_PATH,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'error',
      service: 'mapserver-service',
      error: 'MapServer not accessible',
      details: error.message
    });
  }
});

// Main handler - Proxy to Apache MapServer
const handleMapServerRequest = async (req, res) => {
  const requestId = Date.now();
  logger.info('Incoming request', {
    requestId,
    path: req.path,
    query: req.query,
    ip: req.ip
  });

  try {
    // Build query string with map parameter
    const queryParams = new URLSearchParams(req.query);
    queryParams.set('map', MAPFILE_PATH);

    const fullUrl = `${MAPSERVER_URL}?${queryParams.toString()}`;

    logger.debug('Proxying request', { requestId, url: fullUrl });

    // Proxy request to Apache
    const response = await axios({
      method: 'GET',
      url: fullUrl,
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: 50 * 1024 * 1024, // 50MB
      validateStatus: () => true, // Accept any HTTP status
      headers: {
        'User-Agent': 'MapServer-Service/1.0'
      }
    });

    // Forward all headers from MapServer
    Object.keys(response.headers).forEach(key => {
      res.setHeader(key, response.headers[key]);
    });

    // Add custom header
    res.setHeader('X-MapServer-Service', 'mapserver-service');
    res.setHeader('X-Request-Id', requestId);

    // Send response
    res.status(response.status).send(response.data);

    logger.info('Request completed', {
      requestId,
      status: response.status,
      contentType: response.headers['content-type'],
      size: response.data.length
    });

  } catch (error) {
    logger.error('Request failed', {
      requestId,
      error: error.message,
      stack: error.stack,
      url: error.config?.url
    });

    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'MapServer service unavailable',
        details: 'Cannot connect to Apache MapServer. Please ensure Apache is running.',
        hint: 'Run: C:\\ms4w\\apache-start.bat'
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({
        error: 'MapServer request timeout',
        details: 'The request took too long to complete'
      });
    } else {
      res.status(500).json({
        error: 'Failed to process MapServer request',
        details: error.message
      });
    }
  }
};

// WMS endpoint
app.get('/wms', handleMapServerRequest);

// WFS endpoint
app.get('/wfs', handleMapServerRequest);

// Catch-all for other MapServer requests
app.get('/', (req, res) => {
  if (Object.keys(req.query).length > 0) {
    // Has query params, treat as MapServer request
    handleMapServerRequest(req, res);
  } else {
    res.json({
      service: 'mapserver-service',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        wms: '/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities',
        wfs: '/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities'
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`MapServer Service started successfully`);
  logger.info(`Listening on port ${PORT}`);
  logger.info(`Proxying to: ${MAPSERVER_URL}`);
  logger.info(`Mapfile: ${MAPFILE_PATH}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});
