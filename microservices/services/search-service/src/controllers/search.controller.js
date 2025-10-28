// search-service/src/controllers/search.controller.js
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('search-controller');

// Search mat rung - OPTIMIZED VERSION
exports.searchMatRung = async (req, res, next) => {
  let adminDb = null;

  try {
    const { q, status, fromDate, toDate, limit = 100, huyen, xa, xacMinh } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `search:${q || ''}:${status || ''}:${fromDate || ''}:${toDate || ''}:${huyen || ''}:${xa || ''}:${xacMinh || ''}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info('Cache hit for search');
      return res.json({ ...cached, cached: true });
    }

    logger.info('Searching mat rung', { q, status, fromDate, toDate, huyen, xa, xacMinh });

    let whereClause = 'WHERE m.geom IS NOT NULL AND ST_IsValid(m.geom)';
    const params = [];
    let paramIndex = 1;

    // Full-text search on notes
    if (q) {
      whereClause += ` AND (m.verification_notes ILIKE $${paramIndex++} OR CAST(m.gid AS TEXT) ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status === 'true' || xacMinh === 'true') {
      whereClause += ` AND m.detection_status = $${paramIndex++}`;
      params.push('Đã xác minh');
    }

    if (fromDate) {
      whereClause += ` AND m.detection_date >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ` AND m.detection_date <= $${paramIndex++}`;
      params.push(toDate);
    }

    if (huyen) {
      whereClause += ` AND m.mahuyen = $${paramIndex++}`;
      params.push(huyen);
    }

    // ✅ OPTIMIZED: Query với tất cả thông tin cần thiết
    const query = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        CONCAT('CB-', m.gid) as lo_canbao,
        ROUND(ST_X(ST_Centroid(m.geom))::numeric, 0) as x,
        ROUND(ST_Y(ST_Centroid(m.geom))::numeric, 0) as y,
        m.area as dtich,
        m.verified_area as dtichXM,
        m.verification_reason,
        m.detection_status,
        m.verification_notes,
        ST_AsGeoJSON(m.geom) as geometry,
        ST_AsEWKT(ST_Centroid(m.geom)) as centroid_ewkt
      FROM mat_rung m
      ${whereClause}
      ORDER BY m.gid DESC
      LIMIT $${paramIndex}
    `;

    params.push(parseInt(limit));

    const result = await db.query(query, params);

    logger.info(`Found ${result.rows.length} mat_rung records`);

    // ✅ OPTIMIZED: Tạo connection pool đến admin_db CHỈ 1 LẦN
    const { Pool } = require('pg');
    adminDb = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5433,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'admin_db',
      max: 5,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000
    });

    // ✅ OPTIMIZED: Batch query thay vì query từng record
    // Lấy tất cả centroids
    const centroids = result.rows.map(row => row.centroid_ewkt);

    // Query admin info cho tất cả records trong 1 lần
    let adminInfoMap = {};

    if (centroids.length > 0) {
      try {
        // Tạo temporary table với centroids
        const tempTableQuery = `
          WITH centroids AS (
            SELECT
              unnest(ARRAY[${centroids.map((_, idx) => `$${idx + 1}`).join(',')}]) as point_ewkt
          )
          SELECT
            r.huyen,
            r.xa,
            r.tieukhu,
            r.khoanh,
            ST_AsEWKT(c.point_ewkt::geometry) as centroid_key
          FROM centroids c
          LEFT JOIN laocai_ranhgioihc r
            ON ST_Intersects(r.geom, c.point_ewkt::geometry)
        `;

        const adminResult = await adminDb.query(tempTableQuery, centroids);

        // Map kết quả theo centroid
        adminResult.rows.forEach(row => {
          if (row.centroid_key) {
            adminInfoMap[row.centroid_key] = {
              huyen_name: convertTcvn3ToUnicode(row.huyen),
              xa_name: convertTcvn3ToUnicode(row.xa),
              tk: row.tieukhu,
              khoanh: row.khoanh
            };
          }
        });

        logger.info(`Retrieved admin info for ${Object.keys(adminInfoMap).length} locations`);
      } catch (err) {
        logger.error('Failed to batch query admin info:', err.message);
      }
    }

    // ✅ Map kết quả với admin info
    const features = result.rows.map((row) => {
      const adminInfo = adminInfoMap[row.centroid_ewkt] || {
        huyen_name: row.mahuyen,
        xa_name: null,
        tk: null,
        khoanh: null
      };

      return {
        type: 'Feature',
        geometry: JSON.parse(row.geometry),
        properties: {
          gid: row.gid,
          area: row.area,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          xa: adminInfo.xa_name,
          lo_canbao: row.lo_canbao,
          tk: adminInfo.tk,
          khoanh: adminInfo.khoanh,
          x: row.x,
          y: row.y,
          dtich: row.dtich,
          dtichXM: row.dtichXM,
          verification_reason: row.verification_reason,
          detection_status: row.detection_status,
          verification_notes: row.verification_notes,
          xacminh: row.detection_status === 'Đã xác minh' ? 1 : 0,
          huyen_name: adminInfo.huyen_name,
          xa_name: adminInfo.xa_name
        }
      };
    });

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(true, `Found ${features.length} results`, geoJSON);

    // ✅ Cache lâu hơn nếu không có search query động
    const cacheTime = q ? 60 : 300; // 1 min nếu có search, 5 min nếu filter tĩnh
    await redis.set(cacheKey, response, cacheTime);

    res.json(response);
  } catch (error) {
    logger.error('Error in searchMatRung:', error);
    next(error);
  } finally {
    // ✅ Đảm bảo đóng connection
    if (adminDb) {
      try {
        await adminDb.end();
      } catch (err) {
        logger.warn('Error closing admin_db pool:', err.message);
      }
    }
  }
};

// ✅ NEW: Search mat rung by ID with surrounding features
exports.searchMatRungById = async (req, res, next) => {
  let adminDb = null;

  try {
    const { id } = req.params;
    const { radius = 5000 } = req.query; // Default 5km radius

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json(
        formatResponse(false, 'Invalid GID parameter')
      );
    }

    const gid = parseInt(id);
    const cacheKey = `search:id:${gid}:radius:${radius}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info(`Cache hit for CB-${gid}`);
      return res.json({ ...cached, cached: true });
    }

    logger.info(`Searching for CB-${gid} with radius ${radius}m`);

    // Step 1: Get target feature
    const targetQuery = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verified_area,
        m.verified_by,
        m.verification_reason,
        m.verification_notes,
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as center_lng,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as center_lat,
        ST_XMin(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_xmin,
        ST_YMin(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_ymin,
        ST_XMax(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_xmax,
        ST_YMax(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_ymax
      FROM mat_rung m
      WHERE m.gid = $1 AND m.geom IS NOT NULL
    `;

    const targetResult = await db.query(targetQuery, [gid]);

    if (targetResult.rows.length === 0) {
      logger.warn(`CB-${gid} not found in database`);
      return res.status(404).json(
        formatResponse(false, `Không tìm thấy lô CB-${gid} trong cơ sở dữ liệu`)
      );
    }

    const targetRow = targetResult.rows[0];

    // Build target feature
    const targetFeature = {
      type: 'Feature',
      geometry: JSON.parse(targetRow.geometry),
      properties: {
        gid: targetRow.gid,
        area: targetRow.area,
        start_dau: targetRow.start_dau,
        end_sau: targetRow.end_sau,
        mahuyen: targetRow.mahuyen,
        detection_status: targetRow.detection_status,
        detection_date: targetRow.detection_date,
        verified_area: targetRow.verified_area,
        verified_by: targetRow.verified_by,
        verification_reason: targetRow.verification_reason,
        verification_notes: targetRow.verification_notes,
        isTarget: true // Mark as target for highlighting
      }
    };

    const center = {
      lat: parseFloat(targetRow.center_lat),
      lng: parseFloat(targetRow.center_lng)
    };

    const bbox = [
      [parseFloat(targetRow.bbox_ymin), parseFloat(targetRow.bbox_xmin)],
      [parseFloat(targetRow.bbox_ymax), parseFloat(targetRow.bbox_xmax)]
    ];

    logger.info(`Found CB-${gid} at [${center.lat}, ${center.lng}]`);

    // Step 2: Get surrounding features within radius
    const surroundingQuery = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verified_area,
        m.verified_by,
        m.verification_reason,
        m.verification_notes,
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        ST_Distance(
          ST_Transform(m.geom, 3857),
          (SELECT ST_Transform(geom, 3857) FROM mat_rung WHERE gid = $1)
        ) as distance
      FROM mat_rung m
      WHERE m.gid != $1
        AND m.geom IS NOT NULL
        AND ST_DWithin(
          ST_Transform(m.geom, 3857),
          (SELECT ST_Transform(geom, 3857) FROM mat_rung WHERE gid = $1),
          $2
        )
      ORDER BY distance ASC
      LIMIT 50
    `;

    const surroundingResult = await db.query(surroundingQuery, [gid, parseFloat(radius)]);

    const surroundingFeatures = surroundingResult.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        area: row.area,
        start_dau: row.start_dau,
        end_sau: row.end_sau,
        mahuyen: row.mahuyen,
        detection_status: row.detection_status,
        detection_date: row.detection_date,
        verified_area: row.verified_area,
        verified_by: row.verified_by,
        verification_reason: row.verification_reason,
        verification_notes: row.verification_notes,
        distance: parseFloat(row.distance).toFixed(2),
        isTarget: false
      }
    }));

    logger.info(`Found ${surroundingFeatures.length} features within ${radius}m of CB-${gid}`);

    // ✅ Step 2.5: Get admin info for all features
    const allRows = [targetResult.rows[0], ...surroundingResult.rows];

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

      const geometries = allRows.map(row => row.geometry);
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
            huyen_name: convertTcvn3ToUnicode(row.huyen),
            xa_name: convertTcvn3ToUnicode(row.xa),
            tk: row.tieukhu,
            khoanh: row.khoanh
          };
        }
      });

      // Add admin info to target feature
      const targetAdminInfo = adminInfoMap[0] || {};
      targetFeature.properties.huyen_name = targetAdminInfo.huyen_name;
      targetFeature.properties.xa_name = targetAdminInfo.xa_name;
      targetFeature.properties.tk = targetAdminInfo.tk;
      targetFeature.properties.khoanh = targetAdminInfo.khoanh;

      // Add admin info to surrounding features
      surroundingFeatures.forEach((feature, idx) => {
        const adminInfo = adminInfoMap[idx + 1] || {};
        feature.properties.huyen_name = adminInfo.huyen_name;
        feature.properties.xa_name = adminInfo.xa_name;
        feature.properties.tk = adminInfo.tk;
        feature.properties.khoanh = adminInfo.khoanh;
      });

      logger.info(`Added admin info for ${Object.keys(adminInfoMap).length} features`);
    } catch (err) {
      logger.error('Failed to get admin info:', err.message);
    }

    // Step 3: Combine all features (target first)
    const allFeatures = [targetFeature, ...surroundingFeatures];

    const geoJSON = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    const response = formatResponse(
      true,
      `Tìm thấy CB-${gid} và ${surroundingFeatures.length} khu vực xung quanh`,
      {
        target_feature: targetFeature,
        geojson: geoJSON,
        center: center,
        bbox: bbox,
        total_features: allFeatures.length,
        radius: parseFloat(radius)
      }
    );

    // Cache for 5 minutes
    await redis.set(cacheKey, response, 300);

    res.json(response);

  } catch (error) {
    logger.error(`Error searching for mat rung by ID:`, error);
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

module.exports = exports;
