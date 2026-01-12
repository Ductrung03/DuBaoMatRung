// gis-service/src/controllers/layer.controller.js
const createLogger = require('../../../../shared/logger');
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');

const logger = createLogger('layer-controller');

// Map frontend layer names to database tables (Sơn La)
const layerMapping = {
  // New Sơn La layers
  'hientrangrung': 'sonla_hientrangrung',
  'ranhgioixa': 'sonla_rgx',
  'tieukukhoanh': 'sonla_tkkl',
  // Legacy endpoints
  'administrative': 'sonla_rgx',
  'forest-management': 'sonla_hientrangrung',
  'deforestation-alerts': 'son_la_mat_rung',
  'matrung': 'son_la_mat_rung'
};

// Get layer data by path parameter (new endpoint for frontend)
exports.getLayerDataByPath = async (req, res, next) => {
  let adminDb = null;

  try {
    const { layerName } = req.params;
    const { format = 'geojson', days } = req.query;

    // ✅ DEBUG: Log all x-user headers
    logger.info('🔍 DEBUG - Headers received:', {
      layerName,
      'x-user-id': req.headers['x-user-id'],
      'x-user-username': req.headers['x-user-username'],
      'x-user-roles': req.headers['x-user-roles'],
      'x-user-xa': req.headers['x-user-xa'],
      'x-user-tieukhu': req.headers['x-user-tieukhu'],
      'x-user-khoanh': req.headers['x-user-khoanh'],
      'authorization': req.headers['authorization'] ? 'Bearer ***' : 'MISSING'
    });

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Map layer name to table
    const tableName = layerMapping[layerName] || layerName;

    // ✅ FIX: Include user scope in cache key for restricted users
    const userXa = req.headers['x-user-xa'] || '';
    const userTk = req.headers['x-user-tieukhu'] || '';
    const userKhoanh = req.headers['x-user-khoanh'] || '';
    const userScope = userXa || userTk || userKhoanh ? `${userXa}:${userTk}:${userKhoanh}` : 'all';
    const cacheKey = `layer:${layerName}:${format}:${days || 'all'}:${userScope}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for layer data', { layerName, userScope });
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

    // ✅ Đặc biệt cho mat_rung (deforestation-alerts): Lấy đầy đủ properties + X,Y coordinates
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
          -- ✅ FIX: Tính diện tích từ geometry thay vì dùng field area (có thể = 0)
          ST_Area(geom::geography) as dtich,
          COALESCE(verified_area, 0) as "dtichXM",
          ST_X(ST_Transform(ST_Centroid(geom), 4326)) as x_coordinate,
          ST_Y(ST_Transform(ST_Centroid(geom), 4326)) as y_coordinate,
          -- ✅ FIX: Thêm x, y shorthand cho Table.jsx
          ST_X(ST_Transform(ST_Centroid(geom), 4326)) as x,
          ST_Y(ST_Transform(ST_Centroid(geom), 4326)) as y,
          ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
        FROM ${tableName}
        WHERE geom IS NOT NULL
      `;

      // Add date filter - ✅ FIXED: Sử dụng start_dau thay vì end_sau vì end_sau rỗng
      if (days) {
        query += ` AND start_dau::date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`;
      }

      query += ' ORDER BY start_dau DESC LIMIT 10000';

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

        // Query admin info từ sonla_rgx và sonla_tkkl với centroid cho faster query
        const adminQuery = `
          WITH geoms AS (
            SELECT
              unnest(ARRAY[${placeholders}])::text as geom_json,
              generate_series(1, ${geometries.length}) as idx
          ),
          centroids AS (
            SELECT
              idx,
              ST_Centroid(ST_GeomFromGeoJSON(geom_json)) as centroid
            FROM geoms
          )
          SELECT DISTINCT ON (c.idx)
            c.idx,
            rgx.xa,
            tkkl.tieukhu as tk,
            tkkl.khoanh
          FROM centroids c
          LEFT JOIN sonla_rgx rgx
            ON ST_Intersects(rgx.geom, c.centroid)
          LEFT JOIN sonla_tkkl tkkl
            ON ST_Intersects(tkkl.geom, c.centroid)
          ORDER BY c.idx
        `;

        const adminResult = await adminDb.query(adminQuery, geometries);
        const adminInfoMap = {};

        adminResult.rows.forEach(row => {
          if (row.idx) {
            adminInfoMap[row.idx - 1] = {
              xa: row.xa || null,
              tk: row.tk || null,
              khoanh: row.khoanh || null
            };
          }
        });

        // Get usernames from auth_db
        const userIds = [...new Set(result.rows.map(r => r.verified_by).filter(id => id))];
        const userMap = {};

        if (userIds.length > 0) {
          try {
            const authDb = new Pool({
              host: process.env.DB_HOST || 'localhost',
              port: process.env.DB_PORT || 5433,
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD,
              database: 'auth_db',
              max: 3,
              idleTimeoutMillis: 3000
            });

            const userQuery = `SELECT id, username, email FROM "User" WHERE id = ANY($1::int[])`;
            const userResult = await authDb.query(userQuery, [userIds]);

            userResult.rows.forEach(user => {
              userMap[user.id] = user.username || user.email || `User ${user.id}`;
            });

            await authDb.end();
            logger.info(`Fetched ${userResult.rows.length} usernames from auth_db`);
          } catch (err) {
            logger.warn('Failed to fetch usernames:', err.message);
          }
        }

        // Merge admin info và username vào result
        result.rows = result.rows.map((row, idx) => {
          const adminInfo = adminInfoMap[idx] || {};
          return {
            ...row,
            xa: adminInfo.xa || null,
            tk: adminInfo.tk || null,
            khoanh: adminInfo.khoanh || null,
            verified_by_name: row.verified_by ? (userMap[row.verified_by] || null) : null
          };
        });

        logger.info(`Added admin info for ${Object.keys(adminInfoMap).length}/${result.rows.length} features`);
      } catch (err) {
        logger.error('Failed to get admin info for layer:', err.message);
      }
    }

    // ✅ FIX: Apply scope filtering based on user headers
    const userRolesStr = req.headers['x-user-roles'] ? decodeURIComponent(req.headers['x-user-roles']) : '';
    const userRoles = userRolesStr.split(',');
    const isRestricted = !userRoles.includes('Admin') && !userRoles.includes('LanhDao');

    if (isRestricted && layerName === 'deforestation-alerts') {
      const effectiveXa = req.headers['x-user-xa'] ? decodeURIComponent(req.headers['x-user-xa']) : null;
      const effectiveTk = req.headers['x-user-tieukhu'] ? decodeURIComponent(req.headers['x-user-tieukhu']) : null;
      const effectiveKhoanh = req.headers['x-user-khoanh'] ? decodeURIComponent(req.headers['x-user-khoanh']) : null;

      logger.info('Applying scope filter', { effectiveXa, effectiveTk, effectiveKhoanh, isRestricted });

      // Filter rows by user scope
      const originalCount = result.rows.length;
      result.rows = result.rows.filter(row => {
        if (effectiveXa && row.xa !== effectiveXa) return false;
        if (effectiveTk && row.tk !== effectiveTk) return false;
        if (effectiveKhoanh && row.khoanh !== effectiveKhoanh) return false;
        return true;
      });

      logger.info(`Scope filter applied: ${result.rows.length}/${originalCount} features after filtering`);
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

    // Determine table based on layer (Sơn La)
    switch (layer) {
      case 'hientrangrung':
        tableName = 'sonla_hientrangrung';
        break;
      case 'ranhgioixa':
        tableName = 'sonla_rgx';
        break;
      case 'tieukukhoanh':
        tableName = 'sonla_tkkl';
        break;
      case 'matrung':
        tableName = 'son_la_mat_rung';
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
      case 'hientrangrung':
        tableName = 'sonla_hientrangrung';
        break;
      case 'ranhgioixa':
        tableName = 'sonla_rgx';
        break;
      case 'tieukukhoanh':
        tableName = 'sonla_tkkl';
        break;
      case 'matrung':
        tableName = 'son_la_mat_rung';
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
