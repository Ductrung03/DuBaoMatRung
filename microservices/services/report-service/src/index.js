// report-service/src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const DatabaseManager = require('../../../shared/database');
const createLogger = require('../../../shared/logger');
const { errorHandler } = require('../../../shared/errors');
const { createSwaggerConfig, setupSwagger } = require('../../../shared/swagger');
const reportRoutes = require('./routes/report.routes');

const app = express();
const PORT = process.env.PORT || 3004;
const logger = createLogger('report-service');

let dbManager;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'report-service' });
});

// ========== SWAGGER DOCUMENTATION ==========
const swaggerSpec = createSwaggerConfig(
  'Report Service',
  'Report & Statistics Service for DuBaoMatRung',
  PORT,
  [path.join(__dirname, './routes/*.js')]
);
setupSwagger(app, swaggerSpec);

app.use('/api/bao-cao', reportRoutes);
app.use(errorHandler(logger));

const startServer = async () => {
  dbManager = new DatabaseManager('report-service', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  await dbManager.initialize();
  app.locals.db = dbManager;

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Report Service running on port ${PORT}`);
  });

  server.on('error', (error) => {
    logger.error('Server error:', error);
    process.exit(1);
  });
};

startServer();
