// gis-service/src/controllers/matrung.controller.kysely.js
// Controller using Kysely Query Builder for mat_rung operations

const createLogger = require('../../../../shared/logger');
const { ValidationError } = require('../../../../shared/errors');
const { convertTcvn3ToUnicode, formatResponse } = require('../../../../shared/utils');
const MatRungService = require('../services/matrung.service');

const logger = createLogger('matrung-controller-kysely');

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

// Helper function to build GeoJSON
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

// Get mat rung data with filters - KYSELY VERSION WITH ADMIN_DB
exports.getMatRung = async (req, res, next) => {
  let adminDb = null;

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

    const kyselyDb = req.app.locals.kyselyDb;
    const redis = req.app.locals.redis;

    // Build cache key
    const cacheKey = `matrung:kysely:${JSON.stringify(req.query)}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for mat rung data');
      return res.json({
        success: true,
        cached: true,
        ...cached
      });
    }

    // Create service instance
    const matRungService = new MatRungService(kyselyDb);

    // Get data using Kysely
    const rows = await matRungService.getMatRung({
      fromDate,
      toDate,
      huyen,
      xa,
      tk,
      khoanh,
      churung,
      limit
    });

    logger.info(`Retrieved ${rows.length} mat_rung records`);

    // ✅ Tạo connection đến admin_db
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

    // ✅ Batch query admin info
    const adminInfoMap = {};
    if (rows.length > 0) {
      try {
        const geometries = rows.map(row => row.geometry);
        const placeholders = geometries.map((_, idx) => `$${idx + 1}`).join(',');

        const adminQuery = `
          WITH geoms AS (
            SELECT
              unnest(ARRAY[${placeholders}])::text as geom_json,
              generate_series(1, ${geometries.length}) as idx
          )
          SELECT
            idx,
            r.huyen,
            r.xa,
            r.tieukhu,
            r.khoanh
          FROM geoms g
          LEFT JOIN laocai_ranhgioihc r
            ON ST_Intersects(r.geom, ST_GeomFromGeoJSON(g.geom_json))
        `;

        const adminResult = await adminDb.query(adminQuery, geometries);
        const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');
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

        logger.info(`Admin info retrieved for ${Object.keys(adminInfoMap).length} locations`);
      } catch (err) {
        logger.error('Failed to get admin info:', err.message);
      }
    }

    // ✅ Merge admin info (dữ liệu đã là Unicode, không cần convert)
    const enrichedRows = rows.map((row, idx) => {
      const adminInfo = adminInfoMap[idx] || {};
      return {
        ...row,
        huyen: adminInfo.huyen || row.huyen,
        xa: adminInfo.xa || row.xa,
        tk: adminInfo.tk || row.tk,
        khoanh: adminInfo.khoanh || row.khoanh
      };
    });

    const geoJSON = buildGeoJSON(enrichedRows);
    const isDefault = !fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung;

    // Cache for 5 minutes
    const response = {
      message: `Loaded ${geoJSON.features.length} features${isDefault ? ' (12 months)' : ' with filters'}`,
      data: geoJSON,
      isDefault,
      ...(isDefault && { timeRange: '12_months' }),
      ...(!isDefault && { filters: { fromDate, toDate, huyen, xa, tk, khoanh, churung } })
    };

    await redis.set(cacheKey, response, 300);

    return res.json(formatResponse(
      true,
      response.message,
      geoJSON,
      { isDefault, cached: false }
    ));

  } catch (error) {
    logger.error('Error in getMatRung:', error);
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

// Get all mat rung data - KYSELY VERSION
exports.getAllMatRung = async (req, res, next) => {
  try {
    const { limit = 1000, months = 3 } = req.query;

    const kyselyDb = req.app.locals.kyselyDb;
    const redis = req.app.locals.redis;

    const cacheKey = `matrung:kysely:all:${months}:${limit}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info(`Loading all mat rung data: ${months} months, limit: ${limit}`);

    // Create service instance
    const matRungService = new MatRungService(kyselyDb);

    // Get data using Kysely
    const rows = await matRungService.getAllMatRung({ limit, months });
    const geoJSON = buildGeoJSON(rows);

    const response = {
      success: true,
      message: `Loaded ${geoJSON.features.length} features (${months} months)`,
      data: geoJSON,
      total: geoJSON.features.length,
      limit: parseInt(limit),
      timeRange: `${months}_months`
    };

    // Cache for 10 minutes
    await redis.set(cacheKey, response, 600);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Get statistics - KYSELY VERSION
exports.getStats = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;
    const redis = req.app.locals.redis;

    const cacheKey = 'matrung:kysely:stats';

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info('Calculating mat rung statistics');

    // Create service instance
    const matRungService = new MatRungService(kyselyDb);

    // Get stats using Kysely
    const stats = await matRungService.getStats();

    // Format stats
    stats.total_area_ha = stats.total_area ? parseFloat((stats.total_area / 10000).toFixed(2)) : 0;
    stats.spatial_intersection_rate = stats.total_records > 0
      ? ((stats.records_with_spatial_data / stats.total_records) * 100).toFixed(2) + '%'
      : '0%';
    stats.verification_rate = stats.total_records > 0
      ? ((stats.verified_records / stats.total_records) * 100).toFixed(2) + '%'
      : '0%';

    const response = {
      success: true,
      data: stats
    };

    // Cache for 30 minutes
    await redis.set(cacheKey, response, 1800);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Forecast preview - lightweight statistics without full geometry
exports.forecastPreview = async (req, res, next) => {
  try {
    const { year, month, period, fromDate, toDate } = req.body;

    if (!year || !month || !period || !fromDate || !toDate) {
      throw new ValidationError('Missing required parameters: year, month, period, fromDate, toDate');
    }

    const kyselyDb = req.app.locals.kyselyDb;
    const redis = req.app.locals.redis;

    logger.info('Forecast preview request', { year, month, period, fromDate, toDate });

    // Check cache first
    const cacheKey = `forecast:kysely:preview:${fromDate}:${toDate}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Forecast preview cache hit');
      return res.json({ ...cached, cached: true });
    }

    // Create service instance
    const matRungService = new MatRungService(kyselyDb);

    // Get preview using Kysely
    const stats = await matRungService.forecastPreview({ fromDate, toDate });

    const totalFeatures = parseInt(stats.total_features) || 0;
    const totalArea = parseFloat(stats.total_area) || 0;
    const totalAreaHa = Math.round((totalArea / 10000) * 100) / 100;

    const response = {
      success: true,
      data: {
        period: `${period} tháng ${month}/${year}`,
        total_features: totalFeatures,
        total_area_ha: totalAreaHa,
        date_range: `${fromDate} → ${toDate}`,
        earliest_date: stats.earliest_date,
        latest_date: stats.latest_date,
        query_time_ms: stats.query_time_ms
      }
    };

    // Cache for 5 minutes
    await redis.set(cacheKey, response, 300);

    logger.info(`Forecast preview: ${totalFeatures} features, ${totalAreaHa} ha, ${stats.query_time_ms}ms`);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Auto forecast - KYSELY VERSION
exports.autoForecast = async (req, res, next) => {
  try {
    const { year, month, period, fromDate, toDate } = req.body;

    if (!year || !month || !period || !fromDate || !toDate) {
      throw new ValidationError('Missing required parameters: year, month, period, fromDate, toDate');
    }

    const kyselyDb = req.app.locals.kyselyDb;

    logger.info('Auto forecast request', { year, month, period, fromDate, toDate });

    // Create service instance
    const matRungService = new MatRungService(kyselyDb);

    // Get data using Kysely
    const result = await matRungService.autoForecast({ fromDate, toDate });

    logger.info(`Auto forecast query completed in ${result.queryTime}ms, found ${result.rows.length} records`);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: `No data found for period ${fromDate} to ${toDate}`,
        data: { type: 'FeatureCollection', features: [] },
        metadata: {
          query_time_ms: result.queryTime,
          period_type: period,
          total_features: 0
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
      message: `Auto forecast completed: ${geoJSON.features.length} features`,
      data: geoJSON,
      summary: {
        period: `${period} tháng ${month}/${year}`,
        total_features: geoJSON.features.length,
        total_area_ha: Math.round((totalArea / 10000) * 100) / 100,
        date_range: `${fromDate} → ${toDate}`,
        query_time: `${result.queryTime}ms`
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = exports;
