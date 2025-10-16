// auth-service/src/index.js - Authentication Service
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Import shared libraries from parent directory
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');

// Import Prisma client
const prisma = require('./lib/prisma');

// Import routes
const authRoutes = require('./routes/auth.routes');
const internalRoutes = require('./routes/internal.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const permissionRoutes = require('./routes/permission.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const logger = createLogger('auth-service');

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
  try {
    // Check Prisma connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: 'READY',
      database: {
        healthy: true,
        type: 'postgresql',
        client: 'prisma'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      database: {
        healthy: false,
        error: error.message
      }
    });
  }
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
app.use('/api/auth/internal', internalRoutes);
app.use('/api/auth/users', userRoutes);
app.use('/api/auth/roles', roleRoutes);
app.use('/api/auth/permissions', permissionRoutes);

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
    // Test Prisma connection
    await prisma.$connect();
    logger.info('Prisma connected to database');

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
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
