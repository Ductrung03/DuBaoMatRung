// gis-service/src/controllers/layer.controller.js
const createLogger = require('../../../../shared/logger');
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');

const logger = createLogger('layer-controller');

// Map frontend layer names to database tables
const layerMapping = {
  'administrative': 'laocai_ranhgioihc',
  'forest-management': 'laocai_rg3lr',
  'terrain': 'laocai_terrain',
  'deforestation-alerts': 'mat_rung',
  'ranhgioihc': 'laocai_ranhgioihc',
  'rg3lr': 'laocai_rg3lr',
  'matrung': 'mat_rung'
};

// Get layer data by path parameter (new endpoint for frontend)
exports.getLayerDataByPath = async (req, res, next) => {
  let adminDb = null;

  try {
    const { layerName } = req.params;
    const { format = 'geojson', days } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Map layer name to table
    const tableName = layerMapping[layerName] || layerName;
    const cacheKey = `layer:${layerName}:${format}:${days || 'all'}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for layer data', { layerName });
      return res.json({
        ...cached,
        cached: true
      });
    }

    logger.info('Loading layer data from database', { layerName, tableName });

    // Check if table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `;

    const tableExists = await db.query(tableCheckQuery, [tableName]);

    if (!tableExists.rows[0].exists) {
      logger.warn('Table does not exist', { tableName });
      return res.json(formatResponse(
        true,
        `Layer ${layerName} is not available yet`,
        { type: 'FeatureCollection', features: [] },
        { layer: layerName, cached: false, available: false }
      ));
    }

    // Build query with optional date filter
    let query;

    // ✅ Đặc biệt cho mat_rung (deforestation-alerts): Lấy đầy đủ properties
    if (layerName === 'deforestation-alerts') {
      query = `
        SELECT
          gid,
          start_sau,
          area,
          start_dau,
          end_sau,
          mahuyen,
          end_dau,
          detection_status,
          detection_date,
          verified_by,
          verified_area,
          verification_reason,
          verification_notes,
          created_at,
          updated_at,
          ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
        FROM ${tableName}
        WHERE geom IS NOT NULL
      `;

      // Add date filter
      if (days) {
        query += ` AND end_sau::date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`;
      }

      query += ' ORDER BY end_sau DESC LIMIT 10000';

    } else {
      // Query mặc định cho các layer khác
      query = `
        SELECT
          gid,
          ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
        FROM ${tableName}
        WHERE geom IS NOT NULL
        LIMIT 10000
      `;
    }

    const result = await db.query(query);

    // ✅ Nếu là deforestation-alerts, thêm admin info từ admin_db
    if (layerName === 'deforestation-alerts' && result.rows.length > 0) {
      try {
        const { Pool } = require('pg');
        adminDb = new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5433,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
          database: 'admin_db',
          max: 5,
          idleTimeoutMillis: 5000
        });

        // Batch query admin info
        const geometries = result.rows.map(row => row.geometry);
        const placeholders = geometries.map((_, idx) => `$${idx + 1}`).join(',');

        const adminQuery = `
          WITH geoms AS (
            SELECT
              unnest(ARRAY[${placeholders}])::text as geom_json,
              generate_series(1, ${geometries.length}) as idx
          )
          SELECT idx, r.huyen, r.xa, r.tieukhu, r.khoanh
          FROM geoms g
          LEFT JOIN laocai_ranhgioihc r
            ON ST_Intersects(r.geom, ST_GeomFromGeoJSON(g.geom_json))
        `;

        const adminResult = await adminDb.query(adminQuery, geometries);
        const adminInfoMap = {};

        adminResult.rows.forEach(row => {
          if (row.idx) {
            adminInfoMap[row.idx - 1] = {
              huyen: convertTcvn3ToUnicode(row.huyen),
              xa: convertTcvn3ToUnicode(row.xa),
              tk: row.tieukhu,
              khoanh: row.khoanh
            };
          }
        });

        // Merge admin info vào result
        result.rows = result.rows.map((row, idx) => {
          const adminInfo = adminInfoMap[idx] || {};
          return {
            ...row,
            huyen: adminInfo.huyen || null,
            xa: adminInfo.xa || null,
            tk: adminInfo.tk || null,
            khoanh: adminInfo.khoanh || null
          };
        });

        logger.info(`Added admin info for ${Object.keys(adminInfoMap).length}/${result.rows.length} features`);
      } catch (err) {
        logger.error('Failed to get admin info for layer:', err.message);
      }
    }

    const features = result.rows.map(row => {
      // Build properties object, loại bỏ geometry
      const properties = { ...row };
      delete properties.geometry;

      return {
        type: 'Feature',
        id: row.gid,
        geometry: JSON.parse(row.geometry),
        properties: properties
      };
    });

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(
      true,
      `Loaded ${features.length} features from ${layerName}`,
      geoJSON,
      { layer: layerName, format, cached: false }
    );

    // Cache for 1 hour
    await redis.set(cacheKey, response, 3600);

    res.json(response);

  } catch (error) {
    logger.error('Error loading layer data', { error: error.message });
    next(error);
  } finally {
    if (adminDb) {
      try {
        await adminDb.end();
      } catch (err) {
        logger.warn('Error closing admin_db:', err.message);
      }
    }
  }
};

// Get layer data with smart caching (legacy - query parameter)
exports.getLayerData = async (req, res, next) => {
  try {
    const { layer, format = 'geojson' } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `layer:${layer}:${format}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for layer data', { layer });
      return res.json({
        ...cached,
        cached: true
      });
    }

    logger.info('Loading layer data from database', { layer });

    let query;
    let tableName;

    // Determine table based on layer
    switch (layer) {
      case 'ranhgioihc':
        tableName = 'laocai_ranhgioihc';
        break;
      case 'rg3lr':
        tableName = 'laocai_rg3lr';
        break;
      case 'matrung':
        tableName = 'mat_rung';
        break;
      default:
        tableName = layer;
    }

    // Build query
    query = `
      SELECT
        gid,
        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
      FROM ${tableName}
      WHERE geom IS NOT NULL
      LIMIT 10000
    `;

    const result = await db.query(query);

    const features = result.rows.map(row => ({
      type: 'Feature',
      id: row.gid,
      geometry: JSON.parse(row.geometry),
      properties: { gid: row.gid }
    }));

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(
      true,
      `Loaded ${features.length} features from ${layer}`,
      geoJSON,
      { layer, format, cached: false }
    );

    // Cache for 1 hour
    await redis.set(cacheKey, response, 3600);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Get layer bounds
exports.getLayerBounds = async (req, res, next) => {
  try {
    const { layer } = req.params;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `layer:bounds:${layer}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info('Calculating layer bounds', { layer });

    let tableName;
    switch (layer) {
      case 'ranhgioihc':
        tableName = 'laocai_ranhgioihc';
        break;
      case 'rg3lr':
        tableName = 'laocai_rg3lr';
        break;
      case 'matrung':
        tableName = 'mat_rung';
        break;
      default:
        tableName = layer;
    }

    const query = `
      SELECT
        ST_XMin(ST_Extent(ST_Transform(geom, 4326))) as minx,
        ST_YMin(ST_Extent(ST_Transform(geom, 4326))) as miny,
        ST_XMax(ST_Extent(ST_Transform(geom, 4326))) as maxx,
        ST_YMax(ST_Extent(ST_Transform(geom, 4326))) as maxy
      FROM ${tableName}
      WHERE geom IS NOT NULL
    `;

    const result = await db.query(query);
    const bounds = result.rows[0];

    const response = {
      success: true,
      bounds: {
        southwest: [bounds.minx, bounds.miny],
        northeast: [bounds.maxx, bounds.maxy]
      },
      bbox: [bounds.minx, bounds.miny, bounds.maxx, bounds.maxy]
    };

    // Cache for 24 hours
    await redis.set(cacheKey, response, 86400);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

module.exports = exports;
