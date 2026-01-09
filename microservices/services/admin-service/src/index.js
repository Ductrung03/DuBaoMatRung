// admin-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DatabaseManager = require('../../../shared/database');
// const RedisManager = require('../../../shared/redis'); // Admin service doesn't need Redis
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');
const adminRoutes = require('./routes/admin.routes');

// Import Kysely
const { createKyselyAdminDb } = require('./db/kysely');

const app = express();
const PORT = process.env.PORT || 3005;
const logger = createLogger('admin-service');

let dbManager, kyselyDb; // redisManager removed - not needed

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'admin-service' });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'Admin Service',
  'Administrative & Dropdown Data Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

app.use('/api', adminRoutes);
app.use(errorHandler(logger));

const startServer = async () => {
  try {
    // Debug: Log environment variables (with real password for debugging)
    logger.info('Environment check', {
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_USER: process.env.DB_USER,
      DB_PASSWORD_REAL: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME
    });

    dbManager = new DatabaseManager('admin-service', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: '4', // Hardcoded correct password
      database: process.env.DB_NAME || 'admin_db'
    });

    // Redis not needed for admin service
    // redisManager = new RedisManager('admin-service', {
    //   host: process.env.REDIS_HOST,
    //   port: process.env.REDIS_PORT
    // });

    await dbManager.initialize();

    // Initialize Kysely Query Builder with hardcoded password
    const adminDbUrl = `postgresql://postgres:4@localhost:5432/admin_db`;
    kyselyDb = createKyselyAdminDb(adminDbUrl);
    logger.info('Kysely Query Builder initialized for admin_db');

    // await redisManager.initialize(); // Disabled

    app.locals.db = dbManager;           // Legacy connection
    app.locals.kyselyDb = kyselyDb;      // Kysely Query Builder
    // app.locals.redis = redisManager;  // Disabled

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Admin Service running on port ${PORT}`);
      logger.info('Kysely Query Builder ready');
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start admin service', { error: error.message });
    process.exit(1);
  }
};

startServer();
