// gateway/src/index.js - API Gateway Main Entry
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
// const routes = require('./routes'); // Commented out - using proxy middleware instead
const swaggerSpec = require('./swagger');

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
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://earthengine.googleapis.com"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:4173',
    'https://dubaomatrung-frontend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined'));

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

// ========== SERVICE PROXIES ==========

// ✅ Protected Auth endpoints (require authentication) - MUST come before general auth proxy
app.use('/api/auth/me',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/auth/me';
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Auth /me request with user ID: ${req.headers['x-user-id']}`);
        // Forward user headers set by authenticate middleware
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }
        if (req.headers['x-user-permission']) {
          proxyReq.setHeader('x-user-permission', req.headers['x-user-permission']);
        }
      }
    }
  })
);

app.use('/api/auth/logout',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/auth/logout';
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        // Forward user headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
      }
    }
  })
);

// Auth Service proxy - với body restreaming support (public endpoints like login, register)
const authProxy = createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  changeOrigin: true,
  // ✅ Add back /api/auth prefix vì Express đã strip nó
  pathRewrite: (path, req) => {
    return '/api/auth' + path;
  },
  timeout: 30000,
  proxyTimeout: 30000,
  // ✅ Để proxy tự parse body và restream (quan trọng!)
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`[Gateway] Proxying ${req.method} ${req.url} to ${proxyReq.path}`);

      // ✅ Restream body nếu đã được parsed bởi body-parser
      if (req.body) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`[Gateway] Response ${proxyRes.statusCode} from ${req.url}`);
    },
    error: (err, req, res) => {
      console.error('[Gateway] Auth service proxy error:', err.message);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: 'Auth service unavailable',
          error: err.message
        });
      }
    }
  }
});

app.use('/api/auth', authProxy);

// User Service (protected)
app.use('/api/users',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/users' + path;
    },
    timeout: 30000,
    proxyTimeout: 30000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] User request: ${req.method} ${req.url} -> ${proxyReq.path}`);

        // Forward user headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }

        // ✅ Restream body nếu đã được parsed
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error: (err, req, res) => {
        console.error('[Gateway] User service proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'User service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

// GIS Service - Mat Rung endpoints
app.use('/api/mat-rung',
  createProxyMiddleware({
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    timeout: 120000, // 2 minutes timeout for mat-rung queries
    proxyTimeout: 120000,
    pathRewrite: (path, req) => {
      return '/api/mat-rung' + path;
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Mat Rung request: ${req.method} ${req.url} -> ${proxyReq.path}`);

        // Restream body for POST requests
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        console.log(`[Gateway] Mat Rung response ${proxyRes.statusCode} from ${req.url}`);
      },
      error: (err, req, res) => {
        console.error('[Gateway] Mat Rung proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Mat Rung service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

app.use('/api/import-shapefile',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/import-shapefile' + path;
    },
    timeout: 60000, // Longer timeout for shapefile uploads
    proxyTimeout: 60000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Import shapefile request: ${req.method} ${req.url}`);

        // Forward user headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }

        // ✅ Restream body nếu đã được parsed
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error: (err, req, res) => {
        console.error('[Gateway] Import shapefile proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Import shapefile service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

// Import from Google Earth Engine URL
app.use('/api/import-gee-url',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/import-gee-url' + path;
    },
    timeout: 300000, // 5 minutes timeout for GEE requests
    proxyTimeout: 300000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Import GEE URL request: ${req.method} ${req.url}`);

        // Forward user headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }

        // ✅ Restream body nếu đã được parsed
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error: (err, req, res) => {
        console.error('[Gateway] Import GEE URL proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Import GEE URL service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

app.use('/api/layer-data',
  createProxyMiddleware({
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Add back the /api/layer-data prefix since Express strips it
      return '/api/layer-data' + path;
    }
  })
);

app.use('/api/verification',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/verification' + path;
    },
    timeout: 30000,
    proxyTimeout: 30000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Verification request: ${req.method} ${req.url} -> ${proxyReq.path}`);

        // Forward user headers set by authenticate middleware
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }
        if (req.headers['x-user-username']) {
          proxyReq.setHeader('x-user-username', req.headers['x-user-username']);
        }
        if (req.headers['x-user-name']) {
          proxyReq.setHeader('x-user-name', req.headers['x-user-name']);
        }

        // ✅ Restream body nếu đã được parsed bởi body-parser
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
          console.log(`[Gateway] Restreaming body for verification:`, req.body);
        }
      },
      proxyRes: (proxyRes, req, res) => {
        console.log(`[Gateway] Verification response ${proxyRes.statusCode} from ${req.url}`);
      },
      error: (err, req, res) => {
        console.error('[Gateway] Verification service proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Verification service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

// Report Service
app.use('/api/bao-cao',
  authMiddleware.authenticate,
  createProxyMiddleware({
    target: process.env.REPORT_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/bao-cao' + path;
    },
    timeout: 60000, // Longer timeout for report generation
    proxyTimeout: 60000,
    on: {
      proxyReq: (proxyReq, req, res) => {
        console.log(`[Gateway] Report request: ${req.method} ${req.url} -> ${proxyReq.path}`);

        // Forward user headers
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }

        // ✅ Restream body nếu đã được parsed
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
      error: (err, req, res) => {
        console.error('[Gateway] Report service proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Report service unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

// Admin Service
app.use('/api/dropdown',
  createProxyMiddleware({
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/dropdown' + path;
    }
  })
);

app.use('/api/hanhchinh',
  createProxyMiddleware({
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/hanhchinh' + path;
    }
  })
);

// Search Service
app.use('/api/search',
  createProxyMiddleware({
    target: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return '/api/search' + path;
    }
  })
);

// MapServer WMS/WFS Service (for static layers)
app.use('/api/mapserver',
  createProxyMiddleware({
    target: process.env.MAPSERVER_SERVICE_URL || 'http://127.0.0.1:3008', // Corrected target port
    changeOrigin: true,
    pathRewrite: (path, req) => {
      const url = new URL(`http://localhost${path}`); // Create a URL object to easily parse query params
      const serviceType = url.searchParams.get('service'); // Get 'service' query param (WMS or WFS)
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
    on: {
      // proxyReq: (proxyReq, req, res) => {
      //   console.log(`[Gateway] MapServer WMS request: ${req.url} -> ${proxyReq.path}`);
      // },
      // proxyRes: (proxyRes, req, res) => {
      //   console.log(`[Gateway] MapServer WMS response ${proxyRes.statusCode} for ${req.url}`);
      // },
      error: (err, req, res) => {
        console.error('[Gateway] MapServer proxy error:', err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'MapServer unavailable',
            error: err.message
          });
        }
      }
    }
  })
);

// ========== ERROR HANDLING ==========

// 404 handler
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

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Services configured:`);
  console.log(`   - Auth: ${process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api-docs'}`);
  console.log(`   - User: ${process.env.USER_SERVICE_URL || 'http://localhost:3002/api-docs'}`);
  console.log(`   - GIS: ${process.env.GIS_SERVICE_URL || 'http://localhost:3003/api-docs'}`);
  console.log(`   - Report: ${process.env.REPORT_SERVICE_URL || 'http://localhost:3004/api-docs'}`);
  console.log(`   - Admin: ${process.env.ADMIN_SERVICE_URL || 'http://localhost:3005/api-docs'}`);
  console.log(`   - Search: ${process.env.SEARCH_SERVICE_URL || 'http://localhost:3006/api-docs'}`);
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully...');
  process.exit(0);
});