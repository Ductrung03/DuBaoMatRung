// search-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('../../../shared/database');
// const RedisManager = require('../../../shared/redis'); // Search service doesn't need Redis
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');
const searchRoutes = require('./routes/search.routes');

const app = express();
const PORT = process.env.PORT || 3006;
const logger = createLogger('search-service');

let dbManager; // redisManager removed - not needed

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'search-service' });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'Search Service',
  'Search & Query Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

app.use('/api/search', searchRoutes);
app.use(errorHandler(logger));

const startServer = async () => {
  dbManager = new DatabaseManager('search-service', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // Redis not needed for search service
  // redisManager = new RedisManager('search-service', {
  //   host: process.env.REDIS_HOST,
  //   port: process.env.REDIS_PORT
  // });

  await dbManager.initialize();
  // await redisManager.initialize(); // Disabled

  app.locals.db = dbManager;
  // app.locals.redis = redisManager; // Disabled

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Search Service running on port ${PORT}`);
  });

  server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
};

startServer();
