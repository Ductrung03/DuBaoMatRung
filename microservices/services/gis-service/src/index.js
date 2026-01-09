// gis-service/src/index.js - GIS Service Entry Point
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import shared libraries
const DatabaseManager = require('../../../shared/database');
const RedisManager = require('../../../shared/redis');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');

// Import Kysely
const { createKyselyGisDb } = require('./db/kysely');

// Import routes
const matRungRoutes = require('./routes/matrung.routes');
const shapefileRoutes = require('./routes/shapefile.routes');
const layerRoutes = require('./routes/layer.routes');
const verificationRoutes = require('./routes/verification.routes');

// Import controllers for direct route
const shapefileController = require('./controllers/shapefile.controller');
const { asyncHandler } = require('../../../shared/errors');

const app = express();
const PORT = process.env.PORT || 3003;
const logger = createLogger('gis-service');

// Managers
let dbManager;       // Primary connection to gis_db (legacy, will be phased out)
let kyselyDb;        // Kysely Query Builder for gis_db
let redisManager;

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userId: req.headers['x-user-id']
  });
  next();
});

// ========== HEALTH CHECKS ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'gis-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  const dbHealth = await dbManager.healthCheck();
  const redisHealth = await redisManager.healthCheck();

  if (!dbHealth.healthy || !redisHealth.healthy) {
    return res.status(503).json({
      status: 'NOT_READY',
      database: dbHealth,
      redis: redisHealth
    });
  }

  res.json({
    status: 'READY',
    database: dbHealth,
    redis: redisHealth
  });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'GIS Service',
  'GIS Data & Spatial Operations Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

// ========== ROUTES ==========
app.use('/api/mat-rung', matRungRoutes);
app.use('/api/import-shapefile', shapefileRoutes);
app.use('/api/layer-data', layerRoutes);
app.use('/api/verification', verificationRoutes);

// Direct route for GEE URL import
app.post('/api/import-gee-url', asyncHandler(shapefileController.importFromGeeUrl));

// Direct route for GeoJSON URL import with spatial validation
app.post('/api/import-geojson-url', asyncHandler(shapefileController.importFromGeoJsonUrl));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler(logger));

// ========== INITIALIZE & START ==========
const startServer = async () => {
  try {
    // Initialize primary database (PostGIS - gis_db)
    dbManager = new DatabaseManager('gis-service', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await dbManager.initialize();

    // Initialize Kysely Query Builder
    const gisDbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
    kyselyDb = createKyselyGisDb(gisDbUrl);
    logger.info('Kysely Query Builder initialized for gis_db');

    // Initialize Redis
    redisManager = new RedisManager('gis-service', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    await redisManager.initialize();

    // Make available to routes
    app.locals.db = dbManager;           // gis_db connection (legacy)
    app.locals.kyselyDb = kyselyDb;      // Kysely Query Builder
    app.locals.redis = redisManager;
    app.locals.logger = logger;

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`GIS Service running on port ${PORT}`);
      logger.info('PostGIS database (gis_db) connected');
      logger.info('Kysely Query Builder ready');
      logger.info('Redis cache connected');
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start GIS service', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down GIS service...');
  await dbManager.close();
  await redisManager.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
