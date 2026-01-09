// mapserver-service/src/index.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const compression = require('compression');
const { spawn } = require('child_process');
const path = require('path');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3008;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors());
app.use(compression());

// MapServer config - Support both Linux and Windows
const MAPSERV_BIN = process.env.MAPSERV_BIN ||
  (process.platform === 'win32'
    ? 'C:\\ms4w\\Apache\\cgi-bin\\mapserv.exe'
    : '/usr/bin/mapserv');

const MAPFILE_PATH = process.env.MAPFILE_PATH
  ? path.resolve(process.env.MAPFILE_PATH)
  : path.join(__dirname, '../../../..', 'mapserver/mapfiles/laocai.map');

// MapServer config file - Auto detect Windows
const MS_CONFIG_FILE = process.env.MS_CONFIG_FILE ||
  (process.platform === 'win32'
    ? path.join(__dirname, '../../../..', 'mapserver/mapserver-windows.conf')
    : path.join(__dirname, '../../../..', 'mapserver/mapserver.conf'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mapserver-service',
    mapfile: MAPFILE_PATH
  });
});

const handleMapServerRequest = async (req, res) => {
  logger.info('--- NEW MAPSERVER REQUEST ---', { path: req.path, query: req.query });
  try {
    // Build query string from request
    const queryParams = new URLSearchParams(req.query);
    // ❌ KHÔNG set 'map' trong query params - dùng MS_MAPFILE env var thay vì
    // queryParams.set('map', MAPFILE_PATH);

    const queryString = queryParams.toString();

    logger.info('Executing MapServer', {
      binary: MAPSERV_BIN,
      mapfile: MAPFILE_PATH,
      queryString: queryString
    });

    // Set up environment for MapServer
    // MapServer 8.x requires MAPSERVER_CONFIG_FILE
    const configFile = process.env.MS_CONFIG_FILE || MS_CONFIG_FILE;
    const env = {
      ...process.env,
      QUERY_STRING: queryString,
      REQUEST_METHOD: 'GET',
      MS_MAPFILE: MAPFILE_PATH,  // ✅ Sử dụng MS_MAPFILE để MapServer tự động load
      MAPSERVER_CONFIG_FILE: configFile, // ✅ Required for MapServer 8.x
      // MS4W environment variables
      PROJ_DATA: process.env.PROJ_LIB || 'C:\\ms4w\\share\\proj',
      PROJ_LIB: process.env.PROJ_LIB || 'C:\\ms4w\\share\\proj',
      GDAL_DATA: 'C:\\ms4w\\gdaldata',
      GDAL_DRIVER_PATH: 'C:\\ms4w\\gdalplugins',
      PATH: `C:\\ms4w\\Apache\\cgi-bin;C:\\ms4w\\tools;${process.env.PATH || ''}`
    };

    // Spawn MapServer process
    const mapserv = spawn(MAPSERV_BIN, [], {
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = Buffer.alloc(0);
    let headers = '';
    let headersParsed = false;

    mapserv.stdout.on('data', (data) => {
      if (!headersParsed) {
        const dataStr = data.toString();
        const headerEndIndex = dataStr.indexOf('\r\n\r\n');

        if (headerEndIndex !== -1) {
          headers += dataStr.substring(0, headerEndIndex);
          headersParsed = true;

          // Parse and set headers
          headers.split('\r\n').forEach(header => {
            const colonIndex = header.indexOf(':');
            if (colonIndex > 0) {
              const key = header.substring(0, colonIndex).trim();
              const value = header.substring(colonIndex + 1).trim();
              res.setHeader(key, value);
            }
          });

          // Add remaining data to output
          const remainingData = Buffer.from(dataStr.substring(headerEndIndex + 4));
          output = Buffer.concat([output, remainingData]);
        } else {
          headers += dataStr;
        }
      } else {
        output = Buffer.concat([output, data]);
      }
    });

    mapserv.stderr.on('data', (data) => {
      logger.error('--> MAPSERVER STDERR', { stderr: data.toString() });
    });

    mapserv.on('close', (code) => {
      logger.info(`MapServer process closed with code: ${code}`);
      if (code !== 0) {
        logger.error('MapServer exited with non-zero code', { code });
        if (!res.headersSent) {
          res.status(500).send('MapServer process exited with an error.');
        }
      } else {
        if (!res.headersSent) {
          res.setHeader('X-MapServer-Service', 'mapserver-service');
        }
        res.send(output);
        logger.info('Successfully sent MapServer response.');
      }
    });

    mapserv.on('error', (err) => {
      logger.error('--> FAILED TO SPAWN MAPSERVER PROCESS', { error: err.message, stack: err.stack });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to execute MapServer binary.', details: err.message });
      }
    });

  } catch (error) {
    logger.error('--> UNEXPECTED ERROR in handleMapServerRequest', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Unexpected error in MapServer service.', details: error.message });
  }
};

// WMS endpoint
app.get('/wms', handleMapServerRequest);

// WFS endpoint
app.get('/wfs', handleMapServerRequest);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`MapServer Service running on port ${PORT}`);
  logger.info(`Mapfile: ${MAPFILE_PATH}`);
  logger.info(`MapServer binary: ${MAPSERV_BIN}`);
  logger.info(`Config file: ${MS_CONFIG_FILE}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
