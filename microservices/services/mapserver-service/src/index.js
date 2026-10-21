// mapserver-service/src/index.js
const express = require('express');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const cors = require('cors');
const compression = require('compression');
const { spawn } = require('child_process');
const winston = require('winston');
const TileCacheMiddleware = require('./middleware/tileCache');

const app = express();
const PORT = process.env.PORT || 3008;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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

// Tile Cache initialization
const tileCache = new TileCacheMiddleware(logger);

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
  : path.join(__dirname, '../../../..', process.platform==='win32'?'mapserver/mapfiles/sonla-windows-optimized.map':'mapserver/mapfiles/sonla-ultra-optimized.map');

// MapServer config file - Auto detect Windows
const MS_CONFIG_FILE = process.env.MS_CONFIG_FILE ||
  (process.platform === 'win32'
    ? path.join(__dirname, '../../../..', 'mapserver/mapserver-windows.conf')
    : path.join(__dirname, '../../../..', 'mapserver/mapserver.conf'));

// Cache TTL per layer (in seconds)
const CACHE_TTL = {
  'ranggioixa': 7200,        // Commune boundaries: 2 hours (rarely changes)
  'tieukukhoanh': 3600,      // Sub-compartments: 1 hour
  'hientrangrung': 1800,     // Forest status: 30 minutes (may change more frequently)
  'default': 3600            // Default: 1 hour
};

// Get TTL for specific layer
function getCacheTTL(layer) {
  return CACHE_TTL[layer] || CACHE_TTL.default;
}

// Health check with cache stats
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mapserver-service',
    mapfile: MAPFILE_PATH,
    cache: tileCache.getStats()
  });
});

// Cache stats endpoint
app.get('/cache/stats', (req, res) => {
  res.json(tileCache.getStats());
});

// Clear cache endpoint (admin only in production)
app.post('/cache/clear', async (req, res) => {
  try {
    const pattern = req.query.pattern || '*';
    const count = await tileCache.clearCache(pattern);
    res.json({
      success: true,
      message: `Cleared ${count} cache entries`,
      pattern
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const handleMapServerRequest = async (req, res) => {
  const startTime = Date.now();
  logger.info('MapServer request', {
    path: req.path,
    layer: req.query.layers,
    bbox: req.query.bbox
  });

  try {
    // Build query string from request
    let queryParams;
    try { queryParams = require('./forest-type-filter').applyForestTypeFilter(req.query); }
    catch(error) { return res.status(400).json({success:false,message:error.message}); }
    const queryString = queryParams.toString();

    logger.info('Executing MapServer', {
      binary: MAPSERV_BIN,
      mapfile: MAPFILE_PATH,
      layer: req.query.layers
    });

    // Set up environment for MapServer
    const configFile = process.env.MS_CONFIG_FILE || MS_CONFIG_FILE;
    const env = {
      ...process.env,
      QUERY_STRING: queryString,
      REQUEST_METHOD: 'GET',
      MS_MAPFILE: MAPFILE_PATH,
      MAPSERVER_CONFIG_FILE: configFile,
      // MS4W environment variables
      PROJ_DATA: process.env.PROJ_LIB || 'C:\\ms4w\\share\\proj',
      PROJ_LIB: process.env.PROJ_LIB || 'C:\\ms4w\\share\\proj',
      GDAL_DATA: 'C:\\ms4w\\gdaldata',
      GDAL_DRIVER_PATH: 'C:\\ms4w\\gdalplugins',
      PATH: `C:\\ms4w\\Apache\\cgi-bin;C:\\ms4w\\tools;${process.env.PATH || ''}`
    };

    // Spawn MapServer process
    const mapserv = spawn(MAPSERV_BIN, [], {
      windowsHide: true,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = Buffer.alloc(0);
    let headers = '';
    let headerBuffer=Buffer.alloc(0);
    let headersParsed = false;
    let contentType = 'image/png';

    mapserv.stdout.on('data', (data) => {
      if (!headersParsed) {
        headerBuffer=Buffer.concat([headerBuffer,data]);
        let headerEndIndex = headerBuffer.indexOf('\r\n\r\n'),separatorLength=4;
        if(headerEndIndex<0){headerEndIndex=headerBuffer.indexOf('\n\n');separatorLength=2;}

        if (headerEndIndex !== -1) {
          headers = headerBuffer.subarray(0,headerEndIndex).toString('ascii');
          headersParsed = true;

          // Parse and set headers
          headers.split(/\r?\n/).forEach(header => {
            const colonIndex = header.indexOf(':');
            if (colonIndex > 0) {
              const key = header.substring(0, colonIndex).trim();
              const value = header.substring(colonIndex + 1).trim();
              res.setHeader(key, value);

              // Capture content type for caching
              if (key.toLowerCase() === 'content-type') {
                contentType = value;
              }
            }
          });

          // Add remaining data to output
          const remainingData = headerBuffer.subarray(headerEndIndex + separatorLength);
          output = Buffer.concat([output, remainingData]);
          headerBuffer=Buffer.alloc(0);
        } else {
          if(headerBuffer.length>65536){mapserv.kill();if(!res.headersSent)res.status(502).send('Invalid CGI headers');}
        }
      } else {
        output = Buffer.concat([output, data]);
      }
    });

    mapserv.stderr.on('data', (data) => {
      logger.error('MapServer stderr', { stderr: data.toString() });
    });

    mapserv.on('close', async (code) => {
      const duration = Date.now() - startTime;

      if (code !== 0) {
        logger.error('MapServer exited with error', { code, duration: `${duration}ms` });
        if (!res.headersSent) {
          res.status(500).send('MapServer process exited with an error.');
        }
      } else {
        if (!res.headersSent) {
          res.setHeader('X-MapServer-Service', 'mapserver-service');
          res.setHeader('X-Render-Time', `${duration}ms`);
        }

        // Store in cache if cache key exists
        if (req.tileCacheKey && output.length > 0) {
          const layer = req.query.layers || 'unknown';
          const ttl = getCacheTTL(layer);
          await tileCache.storeInCache(req.tileCacheKey, output, contentType, ttl);
        }

        res.send(output);
        logger.info('MapServer response sent', {
          duration: `${duration}ms`,
          size: `${(output.length / 1024).toFixed(2)}KB`,
          layer: req.query.layers
        });
      }
    });

    mapserv.on('error', (err) => {
      logger.error('Failed to spawn MapServer', { error: err.message });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to execute MapServer binary.', details: err.message });
      }
    });

  } catch (error) {
    logger.error('Unexpected error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Unexpected error in MapServer service.', details: error.message });
  }
};

// WMS endpoint with cache middleware
app.get('/wms', (req, res, next) => {
  tileCache.checkCache(req, res, next).catch(next);
}, handleMapServerRequest);

// WFS endpoint (no caching for WFS)
app.get('/wfs', handleMapServerRequest);

// Start server
async function startServer() {
  try {
    // Initialize tile cache
    await tileCache.initialize();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`MapServer Service running on port ${PORT}`);
      logger.info(`Mapfile: ${MAPFILE_PATH}`);
      logger.info(`MapServer binary: ${MAPSERV_BIN}`);
      logger.info(`Config file: ${MS_CONFIG_FILE}`);
      logger.info(`Tile cache: ${tileCache.enabled ? 'ENABLED' : 'DISABLED'}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');
  await tileCache.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();
