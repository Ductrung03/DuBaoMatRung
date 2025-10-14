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

const app = express();
const PORT = process.env.PORT || 3005;
const logger = createLogger('admin-service');

let dbManager, redisManager;

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
    await redisManager.initialize();

    app.locals.db = dbManager;
    app.locals.redis = redisManager;

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Admin Service running on port ${PORT}`);
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
