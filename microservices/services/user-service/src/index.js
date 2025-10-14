// user-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('../../../shared/database');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');
const userRoutes = require('./routes/user.routes');

const app = express();
const PORT = process.env.PORT || 3002;
const logger = createLogger('user-service');

let dbManager;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'user-service' });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'User Service',
  'User Management Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

app.use('/api/users', userRoutes);
app.use(errorHandler(logger));

const startServer = async () => {
  try {
    dbManager = new DatabaseManager('user-service', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    await dbManager.initialize();
    app.locals.db = dbManager;

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`User Service running on port ${PORT}`);
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start user service', { error: error.message });
    process.exit(1);
  }
};

startServer();
