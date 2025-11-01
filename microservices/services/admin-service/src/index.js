// admin-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('../../../shared/database');
const RedisManager = require('../../../shared/redis');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');
const adminRoutes = require('./routes/admin.routes');

// Import Kysely
const { createKyselyAdminDb } = require('./db/kysely');

const app = express();
const PORT = process.env.PORT || 3005;
const logger = createLogger('admin-service');

let dbManager, kyselyDb, redisManager;

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
    dbManager = new DatabaseManager('admin-service', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    redisManager = new RedisManager('admin-service', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT
    });

    await dbManager.initialize();

    // Initialize Kysely Query Builder
    const adminDbUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
    kyselyDb = createKyselyAdminDb(adminDbUrl);
    logger.info('Kysely Query Builder initialized for admin_db');

    await redisManager.initialize();

    app.locals.db = dbManager;           // Legacy connection
    app.locals.kyselyDb = kyselyDb;      // Kysely Query Builder
    app.locals.redis = redisManager;

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
