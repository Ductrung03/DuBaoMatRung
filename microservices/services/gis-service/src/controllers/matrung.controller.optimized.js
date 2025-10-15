// gis-service/src/controllers/matrung.controller.optimized.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const { convertTcvn3ToUnicode, formatResponse } = require('../../../../shared/utils');

const logger = createLogger('matrung-controller-optimized');

// Mapping huyện
const HUYEN_MAPPING = {
  '01': 'Lào Cai',
  '02': 'Bát Xát',
  '03': 'Mường Khương',
  '04': 'Si Ma Cai',
  '05': 'Bắc Hà',
  '06': 'Bảo Thắng',
  '07': 'Bảo Yên',
  '08': 'Sa Pa',
  '09': 'Văn Bàn'
};

// Helper function to check if table/view exists
async function tableExists(db, tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) OR EXISTS (
      SELECT FROM pg_matviews
      WHERE schemaname = 'public' AND matviewname = $1
    )
  `;
  const result = await db.query(query, [tableName]);
  return result.rows[0].exists;
}

// OPTIMIZED: Get mat rung data with pre-computed administrative lookup
exports.getMatRung = async (req, res, next) => {
  try {
    const {
      fromDate,
      toDate,
      huyen,
      xa,
      tk,
      khoanh,
      churung,
      limit = 1000
    } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Build cache key
    const cacheKey = `matrung:optimized:${JSON.stringify(req.query)}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for optimized mat rung data');
      return res.json({
        success: true,
        cached: true,
        ...cached
      });
    }

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasLookup = await tableExists(db, 'mv_mat_rung_admin_lookup');

    // No filters - return 12 months data
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      logger.info('Loading optimized mat rung data: 12 months default');

      const query = `
        SELECT
          m.gid,
          m.start_sau,
          m.area,
          m.start_dau,
          m.end_sau,
          m.mahuyen,
          m.end_dau,
          m.detection_status,
          m.detection_date,
          m.verified_by,
          m.verified_area,
          m.verification_reason,
          m.verification_notes,

          ${hasUsers ? `
          u.full_name as verified_by_name,
          u.username as verified_by_username,
          ` : `
          NULL as verified_by_name,
          NULL as verified_by_username,
          `}

          ${hasLookup ? `
          l.huyen,
          l.xa,
          l.tk,
          l.khoanh,
          l.churung,
          ` : `
          NULL as huyen,
          NULL as xa,
          NULL as tk,
          NULL as khoanh,
          NULL as churung,
          `}

          ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
          ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,

          ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

        FROM mat_rung m
        ${hasLookup ? 'LEFT JOIN mv_mat_rung_admin_lookup l ON m.gid = l.gid' : ''}
        ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
        WHERE m.geom IS NOT NULL
          AND m.end_sau::date >= CURRENT_DATE - INTERVAL '12 months'
        ORDER BY m.end_sau DESC, m.gid DESC
        LIMIT $1
      `;

      const result = await db.query(query, [parseInt(limit)]);
      const geoJSON = buildGeoJSON(result.rows);

      // Cache for 5 minutes
      await redis.set(cacheKey, {
        message: `Loaded ${geoJSON.features.length} mat rung features (12 months, optimized)`,
        data: geoJSON,
        isDefault: true,
        timeRange: '12_months',
        optimized: true
      }, 300);

      return res.json(formatResponse(
        true,
        `Loaded ${geoJSON.features.length} features (12 months, optimized)`,
        geoJSON,
        { isDefault: true, cached: false, optimized: true }
      ));
    }

    // With filters
    if (!fromDate || !toDate) {
      throw new ValidationError('fromDate and toDate are required for filtered search');
    }

    logger.info('Loading optimized mat rung data with filters', { fromDate, toDate, huyen, xa });

    // Build WHERE clause
    const conditions = ['m.start_dau >= $1', 'm.end_sau <= $2'];
    const params = [fromDate, toDate];
    let index = 3;

    // Add filters using pre-computed lookup
    if (hasLookup) {
      if (huyen) {
        conditions.push(`l.huyen = $${index++}`);
        params.push(huyen);
      }
      if (xa) {
        conditions.push(`l.xa = $${index++}`);
        params.push(xa);
      }
      if (tk) {
        conditions.push(`l.tk = $${index++}`);
        params.push(tk);
      }
      if (khoanh) {
        conditions.push(`l.khoanh = $${index++}`);
        params.push(khoanh);
      }
      if (churung) {
        conditions.push(`l.churung ILIKE $${index++}`);
        params.push(`%${churung}%`);
      }
    }

    const whereClause = `WHERE ${conditions.join(' AND ')} AND m.geom IS NOT NULL`;

    const query = `
      SELECT
        m.gid,
        m.start_sau,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.end_dau,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasLookup ? `
        l.huyen,
        l.xa,
        l.tk,
        l.khoanh,
        l.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${hasLookup ? 'LEFT JOIN mv_mat_rung_admin_lookup l ON m.gid = l.gid' : ''}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      ${whereClause}
      ORDER BY m.end_sau DESC, m.gid DESC
      LIMIT $${index}
    `;

    params.push(parseInt(limit));

    const startTime = Date.now();
    const result = await db.query(query, params);
    const queryTime = Date.now() - startTime;

    const geoJSON = buildGeoJSON(result.rows);

    logger.info(`Optimized query completed in ${queryTime}ms, found ${result.rows.length} records`);

    // Cache for 5 minutes
    await redis.set(cacheKey, {
      message: `Loaded ${geoJSON.features.length} features (optimized)`,
      data: geoJSON,
      filters: { fromDate, toDate, huyen, xa, tk, khoanh, churung },
      queryTime: `${queryTime}ms`,
      optimized: true
    }, 300);

    res.json(formatResponse(
      true,
      `Loaded ${geoJSON.features.length} features with filters (optimized, ${queryTime}ms)`,
      geoJSON,
      { isDefault: false, cached: false, optimized: true, queryTime }
    ));

  } catch (error) {
    next(error);
  }
};

// OPTIMIZED: Get all mat rung data
exports.getAllMatRung = async (req, res, next) => {
  try {
    const { limit = 1000, months = 3 } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `matrung:all:optimized:${months}:${limit}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info(`Loading all optimized mat rung data: ${months} months, limit: ${limit}`);

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasLookup = await tableExists(db, 'mv_mat_rung_admin_lookup');

    const query = `
      SELECT
        m.gid,
        m.start_sau,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.end_dau,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasLookup ? `
        l.huyen,
        l.xa,
        l.tk,
        l.khoanh,
        l.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${hasLookup ? 'LEFT JOIN mv_mat_rung_admin_lookup l ON m.gid = l.gid' : ''}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      WHERE m.geom IS NOT NULL
        AND m.end_sau::date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
      ORDER BY m.end_sau DESC, m.gid DESC
      LIMIT $1
    `;

    const startTime = Date.now();
    const result = await db.query(query, [parseInt(limit)]);
    const queryTime = Date.now() - startTime;

    const geoJSON = buildGeoJSON(result.rows);

    const response = {
      success: true,
      message: `Loaded ${geoJSON.features.length} features (${months} months, optimized, ${queryTime}ms)`,
      data: geoJSON,
      total: geoJSON.features.length,
      limit: parseInt(limit),
      timeRange: `${months}_months`,
      optimized: true,
      queryTime
    };

    // Cache for 10 minutes
    await redis.set(cacheKey, response, 600);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// OPTIMIZED: Auto forecast
exports.autoForecast = async (req, res, next) => {
  try {
    const { year, month, period, fromDate, toDate } = req.body;

    if (!year || !month || !period || !fromDate || !toDate) {
      throw new ValidationError('Missing required parameters: year, month, period, fromDate, toDate');
    }

    const db = req.app.locals.db;

    logger.info('Optimized auto forecast request', { year, month, period, fromDate, toDate });

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasLookup = await tableExists(db, 'mv_mat_rung_admin_lookup');

    const query = `
      SELECT
        m.gid,
        m.start_sau,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.end_dau,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasLookup ? `
        l.huyen,
        l.xa,
        l.tk,
        l.khoanh,
        l.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${hasLookup ? 'LEFT JOIN mv_mat_rung_admin_lookup l ON m.gid = l.gid' : ''}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      WHERE m.geom IS NOT NULL
        AND m.end_sau::date >= $1::date
        AND m.end_sau::date <= $2::date
      ORDER BY m.end_sau DESC, m.gid DESC
      LIMIT 5000
    `;

    const startTime = Date.now();
    const result = await db.query(query, [fromDate, toDate]);
    const queryTime = Date.now() - startTime;

    logger.info(`Optimized auto forecast query completed in ${queryTime}ms, found ${result.rows.length} records`);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: `No data found for period ${fromDate} to ${toDate}`,
        data: { type: 'FeatureCollection', features: [] },
        metadata: {
          query_time_ms: queryTime,
          period_type: period,
          total_features: 0,
          optimized: true
        }
      });
    }

    const geoJSON = buildGeoJSON(result.rows, {
      forecast_period: period,
      forecast_year: parseInt(year),
      forecast_month: parseInt(month)
    });

    // Calculate statistics
    const totalArea = geoJSON.features.reduce((sum, f) => sum + (f.properties.area || 0), 0);

    res.json({
      success: true,
      message: `Optimized auto forecast completed: ${geoJSON.features.length} features (${queryTime}ms)`,
      data: geoJSON,
      summary: {
        period: `${period} tháng ${month}/${year}`,
        total_features: geoJSON.features.length,
        total_area_ha: Math.round((totalArea / 10000) * 100) / 100,
        date_range: `${fromDate} → ${toDate}`,
        query_time: `${queryTime}ms`,
        optimized: true
      }
    });

  } catch (error) {
    next(error);
  }
};

// Helper function to build GeoJSON - OPTIMIZED
function buildGeoJSON(rows, extraProps = {}) {
  const features = rows.map(row => {
    const huyen = convertTcvn3ToUnicode(
      row.huyen || HUYEN_MAPPING[row.mahuyen] || `Huyện ${row.mahuyen}`
    );

    return {
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        start_sau: row.start_sau,
        area: row.area,
        start_dau: row.start_dau,
        end_sau: row.end_sau,
        mahuyen: row.mahuyen,
        end_dau: row.end_dau,
        detection_status: row.detection_status,
        detection_date: row.detection_date,
        verified_by: row.verified_by,
        verified_area: row.verified_area,
        verification_reason: row.verification_reason,
        verification_notes: row.verification_notes,

        verified_by_name: row.verified_by_name,
        verified_by_username: row.verified_by_username,

        // Administrative data from materialized view lookup
        huyen,
        xa: convertTcvn3ToUnicode(row.xa || ''),
        tk: row.tk,
        khoanh: row.khoanh,
        churung: convertTcvn3ToUnicode(row.churung || ''),

        x_coordinate: row.x_coordinate,
        y_coordinate: row.y_coordinate,

        ...extraProps
      }
    };
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

module.exports = exports;
