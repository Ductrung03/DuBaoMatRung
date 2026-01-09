// gateway/src/index.js - API Gateway Main Entry
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const createLogger = require('../../shared/logger');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { createProxy } = require('./proxy-helper');
const { connectMongoDB, closeMongoDB } = require('./services/mongodb');
const loggingRoutes = require('./routes/loggingRoutes');
// const routes = require('./routes'); // Commented out - using proxy middleware instead
const swaggerSpec = require('./swagger');

// Initialize Winston logger for API Gateway
const logger = createLogger('api-gateway');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARE ==========

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "https://earthengine.googleapis.com", "https://ee-phathiensommatrung.projects.earthengine.app"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://earthengine.googleapis.com"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'"],
      // Allow images from self and same host on port 3000 (gateway) to avoid NotSameOrigin blocks
      imgSrc: ["'self'", "data:", "https:", "http://103.56.160.66:3000"],
      // Allow connecting to gateway and earth engine
      connectSrc: ["'self'", "http://103.56.160.66:3000", "https://earthengine.googleapis.com"],
      // IMPORTANT: Disable upgrade-insecure-requests for HTTP deployment
      upgradeInsecureRequests: null
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable HSTS for HTTP deployment
  hsts: false,
  // Disable Cross-Origin-Opener-Policy for HTTP deployment
  crossOriginOpenerPolicy: false
}));

// CORS configuration
app.use((req, res, next) => {
  // Dynamic CORS to reflect allowed origins and ensure images can be consumed cross-origin
  const allowed = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://103.56.160.66:5173',
    'http://103.56.160.66',
    'http://103.56.160.66:3000',
    'https://dubaomatrung-frontend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean));

  const origin = req.headers.origin;
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // For public image/tile GET requests, allow all if not using credentials
    if (req.method === 'GET' && req.path.startsWith('/api/mapserver')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control');
  // Only allow credentials for known origins
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  // Help CORB/CORP for images
  if (req.path.startsWith('/api/mapserver')) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Compression
app.use(compression());

// Logging - using Winston logger stream
app.use(morgan('combined', { stream: logger.stream }));

// ✅ Body parsing - Không skip cho bất kỳ route nào
// http-proxy-middleware sẽ tự động handle body restreaming
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting - với limit cao hơn cho WMS tiles
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 10000 requests per windowMs (tăng cho WMS tiles)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting cho MapServer WMS (tiles có thể gửi nhiều requests)
    return req.path.startsWith('/api/mapserver');
  }
});
app.use(limiter);

// ========== STATIC FILES (Frontend) ==========
const path = require('path');
const frontendDistPath = path.join(__dirname, '../../../client/dist');

// Serve static files from frontend build
app.use(express.static(frontendDistPath, {
  maxAge: 0, // No cache - always serve fresh files
  etag: false,
  setHeaders: (res, path) => {
    // Prevent caching for HTML files
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// ========== SWAGGER DOCUMENTATION ==========
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'DuBaoMatRung API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true
  }
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ========== HEALTH CHECK ==========

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'API Gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/ready', async (req, res) => {
  // Check if downstream services are available
  const services = {
    auth: process.env.AUTH_SERVICE_URL,
    user: process.env.USER_SERVICE_URL,
    gis: process.env.GIS_SERVICE_URL,
    report: process.env.REPORT_SERVICE_URL,
    admin: process.env.ADMIN_SERVICE_URL,
    search: process.env.SEARCH_SERVICE_URL
  };

  res.json({
    status: 'READY',
    services: Object.keys(services).reduce((acc, key) => {
      acc[key] = services[key] ? 'configured' : 'not configured';
      return acc;
    }, {})
  });
});

// ========== LOGGING SERVICE ==========

// Logging routes (internal service)
app.use('/api/logs', loggingRoutes);

// ========== SERVICE PROXIES ==========

// ✅ Protected Auth endpoints (require authentication) - MUST come before general auth proxy
app.use('/api/auth/me',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: (path, req) => '/api/auth/me',
    serviceName: 'Auth /me',
    forwardUserHeaders: true
  })
);

app.use('/api/auth/logout',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: (path, req) => '/api/auth/logout',
    serviceName: 'Auth logout',
    forwardUserHeaders: true
  })
);

// Protected permissions endpoints
app.use('/api/auth/permissions',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: (path, req) => '/api/auth/permissions' + path,
    serviceName: 'Auth permissions',
    forwardUserHeaders: true
  })
);

// Auth Service proxy - với body restreaming support (public endpoints like login, register)
app.use('/api/auth', createProxy(logger, {
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  pathRewrite: (path, req) => '/api/auth' + path,
  serviceName: 'Auth',
  timeout: 30000
}));

// User Service (protected) -> Now routed to Auth Service
app.use('/api/users',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathRewrite: (path, req) => '/api/auth/users' + path,
    serviceName: 'User (via Auth)',
    timeout: 30000,
    forwardUserHeaders: true
  })
);

// GIS Service - Mat Rung endpoints
app.use('/api/mat-rung',
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/mat-rung' + path,
    serviceName: 'Mat Rung',
    timeout: 120000 // 2 minutes timeout for mat-rung queries
  })
);

app.use('/api/import-shapefile',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/import-shapefile' + path,
    serviceName: 'Import Shapefile',
    timeout: 60000, // Longer timeout for shapefile uploads
    forwardUserHeaders: true
  })
);

// Import from Google Earth Engine URL
app.use('/api/import-gee-url',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/import-gee-url' + path,
    serviceName: 'Import GEE URL',
    timeout: 300000, // 5 minutes timeout for GEE requests
    forwardUserHeaders: true
  })
);

// Import from GeoJSON URL with spatial validation
app.use('/api/import-geojson-url',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/import-geojson-url' + path,
    serviceName: 'Import GeoJSON URL',
    timeout: 300000, // 5 minutes timeout for GeoJSON processing
    forwardUserHeaders: true
  })
);

app.use('/api/layer-data',
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/layer-data' + path,
    serviceName: 'Layer Data'
  })
);

app.use('/api/verification',
  authMiddleware.authenticate,
  createProxy(logger, {
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    pathRewrite: (path, req) => '/api/verification' + path,
    serviceName: 'Verification',
    timeout: 30000,
    forwardUserHeaders: true,
    onProxyReq: (proxyReq, req, res) => {
      // Additional logging for verification body restreaming
      if (req.body && Object.keys(req.body).length > 0) {
        logger.debug('Restreaming body for verification:', { body: req.body });
      }
    }
  })
);

// Report Service
app.use('/api/bao-cao',
  authMiddleware.authenticateFlexible, // Support token from header or query parameter
  createProxy(logger, {
    target: process.env.REPORT_SERVICE_URL || 'http://localhost:3004',
    pathRewrite: (path, req) => '/api/bao-cao' + path, // Path already includes /api/bao-cao from mount point
    serviceName: 'Report',
    timeout: 60000, // Longer timeout for report generation
    forwardUserHeaders: true
  })
);

// Admin Service
app.use('/api/dropdown',
  createProxy(logger, {
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    pathRewrite: (path, req) => '/api/dropdown' + path,
    serviceName: 'Admin Dropdown'
  })
);

app.use('/api/hanhchinh',
  createProxy(logger, {
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    pathRewrite: (path, req) => '/api/hanhchinh' + path,
    serviceName: 'Admin Hanhchinh'
  })
);

// Search Service
app.use('/api/search',
  createProxy(logger, {
    target: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006',
    pathRewrite: (path, req) => '/api/search' + path,
    serviceName: 'Search'
  })
);

// MapServer WMS/WFS Service (for static layers)
app.use('/api/mapserver',
  createProxy(logger, {
    target: process.env.MAPSERVER_SERVICE_URL || 'http://127.0.0.1:3008',
    pathRewrite: (path, req) => {
      const url = new URL(`http://localhost${path}`);
      const serviceType = url.searchParams.get('service');
      let newPath = '';

      if (serviceType && serviceType.toUpperCase() === 'WFS') {
        newPath = '/wfs';
      } else {
        newPath = '/wms'; // Default to WMS if not specified or not WFS
      }

      // Preserve original query parameters
      const queryString = url.search;
      return newPath + queryString;
    },
    serviceName: 'MapServer',
    timeout: 300000,
    proxyTimeout: 300000,
    onProxyRes: (proxyRes, req, res) => {
      // Ensure correct headers for images to avoid CORB/NotSameOrigin
      if (req.method === 'GET') {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        const origin = req.headers.origin;
        if (origin) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        } else {
          res.setHeader('Access-Control-Allow-Origin', '*');
        }
      }
      // Preserve upstream Content-Type; do not override
      // If upstream misses it, try to infer for GetMap
      const urlStr = req.url.toLowerCase();
      const hasGetMap = urlStr.includes('request=getmap') || urlStr.includes('service=wms');
      if (hasGetMap && !proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', 'image/png');
      }
    }
  })
);

// ========== ERROR HANDLING ==========

// SPA Fallback - Serve index.html for non-API routes (must be before 404 handler)
app.get('*', (req, res, next) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    next();
  }
});

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.url,
    method: req.method
  });
});

// Error handler
app.use(errorHandler);

// ========== START SERVER ==========

// Initialize MongoDB connection before starting server
connectMongoDB()
  .then(() => {
    logger.info('MongoDB logging service initialized');
  })
  .catch((error) => {
    logger.warn('MongoDB connection failed, logging service will not be available:', error.message);
  });

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info('Services configured:', {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api-docs',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002/api-docs',
    gis: process.env.GIS_SERVICE_URL || 'http://localhost:3003/api-docs',
    report: process.env.REPORT_SERVICE_URL || 'http://localhost:3004/api-docs',
    admin: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005/api-docs',
    search: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006/api-docs'
  });
});

server.on('error', (error) => {
  logger.error('Server error:', { error });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing server gracefully...');
  await closeMongoDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing server gracefully...');
  await closeMongoDB();
  process.exit(0);
});