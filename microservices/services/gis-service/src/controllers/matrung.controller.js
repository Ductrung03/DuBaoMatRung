// gis-service/src/controllers/matrung.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, NotFoundError } = require('../../../../shared/errors');
const { convertTcvn3ToUnicode, formatResponse } = require('../../../../shared/utils');

const logger = createLogger('matrung-controller');

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

// Helper function to check if table exists
async function tableExists(db, tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )
  `;
  const result = await db.query(query, [tableName]);
  return result.rows[0].exists;
}

// Helper function to check if materialized view exists
async function materializedViewExists(db, viewName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = $1
    ) OR EXISTS (
      SELECT FROM pg_matviews
      WHERE schemaname = 'public' AND matviewname = $1
    )
  `;
  const result = await db.query(query, [viewName]);
  return result.rows[0].exists;
}

// Optimized function to get administrative data using materialized views
async function getAdminDataOptimized(db, geom) {
  try {
    // Check if materialized views exist
    const hasMvHuyen = await materializedViewExists(db, 'mv_huyen');
    const hasMvXa = await materializedViewExists(db, 'mv_xa_by_huyen');
    const hasMvTieukhu = await materializedViewExists(db, 'mv_tieukhu_by_xa');
    const hasMvKhoanh = await materializedViewExists(db, 'mv_khoanh_by_tieukhu');
    
    if (!hasMvHuyen) {
      return { huyen: null, xa: null, tk: null, khoanh: null };
    }

    // Use spatial intersection with laocai_rg3lr for most accurate data
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');
    
    if (hasRg3lr) {
      const query = `
        SELECT 
          r.huyen,
          r.xa,
          r.tk,
          r.khoanh
        FROM laocai_rg3lr r
        WHERE ST_Intersects(ST_Transform($1, 4326), ST_Transform(r.geom, 4326))
        LIMIT 1
      `;
      
      const result = await db.query(query, [geom]);
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    // Fallback to laocai_ranhgioihc
    const hasRanhGioiHC = await tableExists(db, 'laocai_ranhgioihc');
    if (hasRanhGioiHC) {
      const query = `
        SELECT 
          r.huyen,
          r.xa,
          r.tieukhu as tk,
          r.khoanh
        FROM laocai_ranhgioihc r
        WHERE ST_Intersects(ST_Transform($1, 4326), ST_Transform(r.geom, 4326))
        LIMIT 1
      `;
      
      const result = await db.query(query, [geom]);
      if (result.rows.length > 0) {
        return result.rows[0];
      }
    }

    return { huyen: null, xa: null, tk: null, khoanh: null };
  } catch (error) {
    logger.error('Error getting admin data:', error);
    return { huyen: null, xa: null, tk: null, khoanh: null };
  }
}

// Get mat rung data with filters - OPTIMIZED VERSION
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
    const cacheKey = `matrung:${JSON.stringify(req.query)}`;

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

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');

    // No filters - return 12 months data
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      logger.info('Loading mat rung data: 12 months default');

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

          -- ✅ FIX: Tính diện tích từ geometry thay vì dùng field area (có thể = 0)
          ST_Area(m.geom::geography) as dtich,
          COALESCE(m.verified_area, ST_Area(m.geom::geography)) as "dtichXM",

          ${hasUsers ? `
          u.full_name as verified_by_name,
          u.username as verified_by_username,
          ` : `
          NULL as verified_by_name,
          NULL as verified_by_username,
          `}

          ${hasRg3lr ? `
          r.huyen,
          r.xa,
          r.tk,
          r.khoanh,
          r.churung,
          ` : `
          NULL as huyen,
          NULL as xa,
          NULL as tk,
          NULL as khoanh,
          NULL as churung,
          `}

          ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
          ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
          -- ✅ FIX: Thêm x, y shorthand cho Table.jsx
          ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x,
          ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y,

          ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

        FROM mat_rung m
        ${hasRg3lr ? `
        LEFT JOIN laocai_rg3lr r ON ST_Intersects(
          ST_Transform(m.geom, 4326),
          ST_Transform(r.geom, 4326)
        )
        ` : ''}
        ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
        WHERE m.geom IS NOT NULL
          AND m.start_dau::date >= CURRENT_DATE - INTERVAL '12 months'
        ORDER BY m.start_dau DESC, m.gid DESC
        LIMIT $1
      `;

      const result = await db.query(query, [parseInt(limit)]);
      const geoJSON = buildGeoJSON(result.rows);

      // Cache for 5 minutes
      await redis.set(cacheKey, {
        message: `Loaded ${geoJSON.features.length} mat rung features (12 months)`,
        data: geoJSON,
        isDefault: true,
        timeRange: '12_months'
      }, 300);

      return res.json(formatResponse(
        true,
        `Loaded ${geoJSON.features.length} features (12 months)`,
        geoJSON,
        { isDefault: true, cached: false }
      ));
    }

    // With filters
    if (!fromDate || !toDate) {
      throw new ValidationError('fromDate and toDate are required for filtered search');
    }

    logger.info('Loading mat rung data with filters', { fromDate, toDate, huyen, xa });

    // Build WHERE clause
    const conditions = ['m.start_dau >= $1', 'm.start_dau <= $2'];
    const params = [fromDate, toDate];
    let index = 3;

    // Add spatial filters using laocai_rg3lr for better accuracy
    let spatialJoin = '';
    if (hasRg3lr && (huyen || xa || tk || khoanh || churung)) {
      spatialJoin = `
        LEFT JOIN laocai_rg3lr r ON ST_Intersects(
          ST_Transform(m.geom, 4326),
          ST_Transform(r.geom, 4326)
        )
      `;
      
      if (huyen) {
        conditions.push(`r.huyen = $${index++}`);
        params.push(huyen);
      }
      if (xa) {
        conditions.push(`r.xa = $${index++}`);
        params.push(xa);
      }
      if (tk) {
        conditions.push(`r.tk = $${index++}`);
        params.push(tk);
      }
      if (khoanh) {
        conditions.push(`r.khoanh = $${index++}`);
        params.push(khoanh);
      }
      if (churung) {
        conditions.push(`r.churung ILIKE $${index++}`);
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

        -- ✅ FIX: Tính diện tích từ geometry thay vì dùng field area (có thể = 0)
        ST_Area(m.geom::geography) as dtich,
        COALESCE(m.verified_area, ST_Area(m.geom::geography)) as "dtichXM",

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasRg3lr ? `
        r.huyen,
        r.xa,
        r.tk,
        r.khoanh,
        r.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        -- ✅ FIX: Thêm x, y shorthand cho Table.jsx
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${spatialJoin}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      ${whereClause}
      ORDER BY m.start_dau DESC, m.gid DESC
      LIMIT $${index}
    `;

    params.push(parseInt(limit));

    const result = await db.query(query, params);
    const geoJSON = buildGeoJSON(result.rows);

    // Cache for 5 minutes
    await redis.set(cacheKey, {
      message: `Loaded ${geoJSON.features.length} features`,
      data: geoJSON,
      filters: { fromDate, toDate, huyen, xa, tk, khoanh, churung }
    }, 300);

    res.json(formatResponse(
      true,
      `Loaded ${geoJSON.features.length} features with filters`,
      geoJSON,
      { isDefault: false, cached: false }
    ));

  } catch (error) {
    next(error);
  }
};

// Get all mat rung data - OPTIMIZED VERSION
exports.getAllMatRung = async (req, res, next) => {
  try {
    const { limit = 1000, months = 3 } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `matrung:all:${months}:${limit}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info(`Loading all mat rung data: ${months} months, limit: ${limit}`);

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');

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

        -- ✅ FIX: Tính diện tích từ geometry thay vì dùng field area (có thể = 0)
        ST_Area(m.geom::geography) as dtich,
        COALESCE(m.verified_area, ST_Area(m.geom::geography)) as "dtichXM",

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasRg3lr ? `
        r.huyen,
        r.xa,
        r.tk,
        r.khoanh,
        r.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        -- ✅ FIX: Thêm x, y shorthand cho Table.jsx
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${hasRg3lr ? `
      LEFT JOIN laocai_rg3lr r ON ST_Intersects(
        ST_Transform(m.geom, 4326),
        ST_Transform(r.geom, 4326)
      )
      ` : ''}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      WHERE m.geom IS NOT NULL
        AND m.start_dau::date >= CURRENT_DATE - INTERVAL '${parseInt(months)} months'
      ORDER BY m.start_dau DESC, m.gid DESC
      LIMIT $1
    `;

    const result = await db.query(query, [parseInt(limit)]);
    const geoJSON = buildGeoJSON(result.rows);

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

// Get statistics - OPTIMIZED VERSION
exports.getStats = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'matrung:stats';

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info('Calculating mat rung statistics');

    // Check if table exists
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');

    const query = `
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN m.geom IS NOT NULL THEN 1 END) as records_with_geometry,
        ${hasRg3lr ? `COUNT(CASE WHEN r.gid IS NOT NULL THEN 1 END) as records_with_spatial_data,` : `0 as records_with_spatial_data,`}
        COUNT(CASE WHEN m.start_dau::date >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as recent_3_months,
        COUNT(CASE WHEN m.start_dau::date >= CURRENT_DATE - INTERVAL '12 months' THEN 1 END) as recent_12_months,
        MIN(m.start_dau) as earliest_date,
        MAX(m.start_dau) as latest_date,
        SUM(m.area) as total_area,
        COUNT(DISTINCT m.mahuyen) as unique_districts,
        COUNT(CASE WHEN m.detection_status = 'Đã xác minh' THEN 1 END) as verified_records,
        COUNT(CASE WHEN m.verified_by IS NOT NULL THEN 1 END) as records_with_verifier
      FROM mat_rung m
      ${hasRg3lr ? `
      LEFT JOIN laocai_rg3lr r ON ST_Intersects(
        ST_Transform(m.geom, 4326),
        ST_Transform(r.geom, 4326)
      )
      ` : ''}
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

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

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    logger.info('Forecast preview request', { year, month, period, fromDate, toDate });

    // Check cache first
    const cacheKey = `forecast:preview:${fromDate}:${toDate}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Forecast preview cache hit');
      return res.json({ ...cached, cached: true });
    }

    // Quick count query - no geometry processing
    const query = `
      SELECT
        COUNT(*) as total_features,
        SUM(m.area) as total_area,
        MIN(m.start_dau) as earliest_date,
        MAX(m.start_dau) as latest_date
      FROM mat_rung m
      WHERE m.geom IS NOT NULL
        AND m.start_dau::date >= $1::date
        AND m.start_dau::date <= $2::date
    `;

    const startTime = Date.now();
    const result = await db.query(query, [fromDate, toDate]);
    const queryTime = Date.now() - startTime;

    const stats = result.rows[0];
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
        query_time_ms: queryTime
      }
    };

    // Cache for 5 minutes
    await redis.set(cacheKey, response, 300);

    logger.info(`Forecast preview: ${totalFeatures} features, ${totalAreaHa} ha, ${queryTime}ms`);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Auto forecast - OPTIMIZED VERSION
exports.autoForecast = async (req, res, next) => {
  try {
    const { year, month, period, fromDate, toDate } = req.body;

    if (!year || !month || !period || !fromDate || !toDate) {
      throw new ValidationError('Missing required parameters: year, month, period, fromDate, toDate');
    }

    const db = req.app.locals.db;

    logger.info('Auto forecast request', { year, month, period, fromDate, toDate });

    // Check which tables exist
    const hasUsers = await tableExists(db, 'users');
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');

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

        -- ✅ FIX: Tính diện tích từ geometry thay vì dùng field area (có thể = 0)
        ST_Area(m.geom::geography) as dtich,
        COALESCE(m.verified_area, ST_Area(m.geom::geography)) as "dtichXM",

        ${hasUsers ? `
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        ` : `
        NULL as verified_by_name,
        NULL as verified_by_username,
        `}

        ${hasRg3lr ? `
        r.huyen,
        r.xa,
        r.tk,
        r.khoanh,
        r.churung,
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung,
        `}

        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        -- ✅ FIX: Thêm x, y shorthand cho Table.jsx
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y,

        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry

      FROM mat_rung m
      ${hasRg3lr ? `
      LEFT JOIN laocai_rg3lr r ON ST_Intersects(
        ST_Transform(m.geom, 4326),
        ST_Transform(r.geom, 4326)
      )
      ` : ''}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      WHERE m.geom IS NOT NULL
        AND m.start_dau::date >= $1::date
        AND m.start_dau::date <= $2::date
      ORDER BY m.start_dau DESC, m.gid DESC
      LIMIT 5000
    `;

    const startTime = Date.now();
    const result = await db.query(query, [fromDate, toDate]);
    const queryTime = Date.now() - startTime;

    logger.info(`Auto forecast query completed in ${queryTime}ms, found ${result.rows.length} records`);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: `No data found for period ${fromDate} to ${toDate}`,
        data: { type: 'FeatureCollection', features: [] },
        metadata: {
          query_time_ms: queryTime,
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

    // Calculate statistics - ✅ FIX: Dùng dtich (tính từ geometry) thay vì area
    const totalArea = geoJSON.features.reduce((sum, f) => sum + (f.properties.dtich || f.properties.area || 0), 0);

    res.json({
      success: true,
      message: `Auto forecast completed: ${geoJSON.features.length} features`,
      data: geoJSON,
      summary: {
        period: `${period} tháng ${month}/${year}`,
        total_features: geoJSON.features.length,
        total_area_ha: Math.round((totalArea / 10000) * 100) / 100,
        date_range: `${fromDate} → ${toDate}`,
        query_time: `${queryTime}ms`
      }
    });

  } catch (error) {
    next(error);
  }
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

        // ✅ FIX: Thêm dtich và dtichXM (tính từ geometry)
        dtich: row.dtich,
        dtichXM: row.dtichXM,

        verified_by_name: row.verified_by_name,
        verified_by_username: row.verified_by_username,

        huyen,
        xa: convertTcvn3ToUnicode(row.xa || ''),
        tk: row.tk,
        khoanh: row.khoanh,
        churung: convertTcvn3ToUnicode(row.churung || ''),

        x_coordinate: row.x_coordinate,
        y_coordinate: row.y_coordinate,
        // ✅ FIX: Thêm x, y shorthand cho Table.jsx
        x: row.x,
        y: row.y,

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
