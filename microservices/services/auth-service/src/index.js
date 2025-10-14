// auth-service/src/index.js - Authentication Service
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import shared libraries from parent directory
const DatabaseManager = require('../../../shared/database');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');

// Import routes
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('auth-service');

// Database manager
let dbManager;

// ========== MIDDLEWARE ==========
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// ========== HEALTH CHECKS ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  const dbHealth = await dbManager.healthCheck();

  if (!dbHealth.healthy) {
    return res.status(503).json({
      status: 'NOT_READY',
      database: dbHealth
    });
  }

  res.json({
    status: 'READY',
    database: dbHealth
  });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'Auth Service',
  'Authentication and Authorization Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

// ========== ROUTES ==========
app.use('/api/auth', authRoutes);

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
    // Initialize database
    dbManager = new DatabaseManager('auth-service', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await dbManager.initialize();

    // Make db available to routes
    app.locals.db = dbManager;

    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Auth Service running on port ${PORT}`);
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start auth service', { error: error.message });
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down auth service...');
  await dbManager.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
