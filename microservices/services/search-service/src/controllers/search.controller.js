// search-service/src/controllers/search.controller.js
const { formatResponse } = require('../../../../shared/utils');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('search-controller');

// Search mat rung
exports.searchMatRung = async (req, res, next) => {
  try {
    const { q, status, fromDate, toDate, limit = 100 } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `search:${q || ''}:${status || ''}:${fromDate || ''}:${toDate || ''}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info('Searching mat rung', { q, status, fromDate, toDate });

    let whereClause = 'WHERE m.geom IS NOT NULL';
    const params = [];
    let paramIndex = 1;

    // Full-text search on notes
    if (q) {
      whereClause += ` AND (m.verification_notes ILIKE $${paramIndex++} OR CAST(m.gid AS TEXT) ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status === 'true') {
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

    const query = `
      SELECT
        m.gid,
        m.area,
        m.detection_status,
        m.verification_notes,
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
      FROM mat_rung m
      ${whereClause}
      ORDER BY m.gid DESC
      LIMIT $${paramIndex}
    `;

    params.push(parseInt(limit));

    const result = await db.query(query, params);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        area: row.area,
        detection_status: row.detection_status,
        verification_notes: row.verification_notes
      }
    }));

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(true, `Found ${features.length} results`, geoJSON);
    await redis.set(cacheKey, response, 300); // Cache 5 min

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Search mat rung by ID with surrounding features
exports.searchMatRungById = async (req, res, next) => {
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
  }
};

module.exports = exports;
