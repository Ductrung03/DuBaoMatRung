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

// Get mat rung data with filters - OPTIMIZED VERSION WITH PAGINATION
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
      limit = 100,  // ⚡ OPTIMIZED: Default to 100 instead of 1000
      page = 1      // ⚡ NEW: Pagination support
    } = req.query;

    // ⚡ Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // ✅ SCOPE ENFORCEMENT
    const userRolesStr = req.headers['x-user-roles'] ? decodeURIComponent(req.headers['x-user-roles']) : '';
    const userRoles = userRolesStr.split(',');
    const isRestricted = !userRoles.includes('Admin') && !userRoles.includes('LanhDao');

    // Determine effective filters (User forced > Query param)
    let effectiveXa = xa;
    let effectiveTk = tk;
    let effectiveKhoanh = khoanh;

    if (isRestricted) {
      if (req.headers['x-user-xa']) effectiveXa = decodeURIComponent(req.headers['x-user-xa']);
      if (req.headers['x-user-tieukhu']) effectiveTk = decodeURIComponent(req.headers['x-user-tieukhu']);
      if (req.headers['x-user-khoanh']) effectiveKhoanh = decodeURIComponent(req.headers['x-user-khoanh']);
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // ⚡ Build cache key with effective filters AND pagination params
    const cacheKey = `matrung:${JSON.stringify({
      ...req.query,
      xa: effectiveXa,
      tk: effectiveTk,
      khoanh: effectiveKhoanh,
      isRestricted,
      limit: parseInt(limit),
      page: parseInt(page)
    })}`;

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
    // CAREFUL: If restricted, we MUST filter, so we cannot use "No filters" default block unless we add filters to it.
    // For simplicity, if restricted, we treat it as "With filters" flow or add WHERE clause here.
    // Actually, "With filters" block below handles spatial join.
    // If user is restricted, we should probably SKIP this "No filters" block and force "With filters" flow,
    // OR add spatial filtering to this block too.
    // But this block is "12 months data".
    // Let's modify the condition:
    if (!isRestricted && !fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      logger.info('Loading mat rung data: 12 months default (Unrestricted)', { limit, page, offset });

      // ⚡ Count total records for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM son_la_mat_rung m
        WHERE m.geom IS NOT NULL
          AND m.start_dau::date >= CURRENT_DATE - INTERVAL '12 months'
      `;

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
          COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography)) as dtich,
          m.verified_area as "dtichXM",

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

        FROM son_la_mat_rung m
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
        LIMIT $1 OFFSET $2
      `;

      // ⚡ Run both queries in parallel
      const [result, countResult] = await Promise.all([
        db.query(query, [parseInt(limit), offset]),
        db.query(countQuery, [])
      ]);

      const totalRecords = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(totalRecords / parseInt(limit));
      const geoJSON = buildGeoJSON(result.rows);

      // ⚡ Pagination metadata
      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRecords,
        totalPages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      };

      // Cache for 5 minutes
      await redis.set(cacheKey, {
        message: `Loaded ${geoJSON.features.length} mat rung features (12 months)`,
        data: geoJSON,
        pagination,
        isDefault: true,
        timeRange: '12_months'
      }, 300);

      return res.json(formatResponse(
        true,
        `Loaded ${geoJSON.features.length} features (12 months, page ${page}/${totalPages})`,
        geoJSON,
        { isDefault: true, cached: false, pagination }
      ));
    }

    // With filters (or restricted user default view which requires filtering)
    // If unrestricted and missing dates, throw error.
    // If restricted, we might want to allow default view but filtered by scope.
    // If restricted and NO dates provided, we can default to 12 months BUT with filters.

    let effectiveFromDate = fromDate;
    let effectiveToDate = toDate;

    if (!fromDate || !toDate) {
      if (isRestricted) {
        // Default to 12 months if restricted user didn't pick dates
        // This handles the "default view" for restricted users
        // We need to calculate dates in JS or use Postgres current_date
        // Let's use JS for params
        const today = new Date();
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        effectiveToDate = today.toISOString().split('T')[0];
        effectiveFromDate = lastYear.toISOString().split('T')[0];
      } else {
        throw new ValidationError('fromDate and toDate are required for filtered search');
      }
    }

    logger.info('Loading mat rung data with filters', {
      fromDate: effectiveFromDate,
      toDate: effectiveToDate,
      huyen,
      xa: effectiveXa,
      isRestricted,
      limit,
      page,
      offset
    });

    // Build WHERE clause
    const conditions = ['m.start_dau >= $1', 'm.start_dau <= $2'];
    const params = [effectiveFromDate, effectiveToDate];
    let index = 3;

    // Add spatial filters using laocai_rg3lr for better accuracy
    let spatialJoin = '';
    // Always join if we have any spatial filter (including forced scope)
    const hasSpatialFilter = huyen || effectiveXa || effectiveTk || effectiveKhoanh || churung;

    if (hasRg3lr && hasSpatialFilter) {
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
      if (effectiveXa) {
        conditions.push(`r.xa = $${index++}`);
        params.push(effectiveXa);
      }
      if (effectiveTk) {
        conditions.push(`r.tk = $${index++}`);
        params.push(effectiveTk);
      }
      if (effectiveKhoanh) {
        conditions.push(`r.khoanh = $${index++}`);
        params.push(effectiveKhoanh);
      }
      if (churung) {
        conditions.push(`r.churung ILIKE $${index++}`);
        params.push(`%${churung}%`);
      }
    } else if (!hasRg3lr && isRestricted) {
      // Fallback: If no rg reference table but user is restricted, we can't filter safely!
      // Return empty or error?
      // Or maybe try filtering on 'mahuyen' if that's all we have?
      // mat_rung table has 'mahuyen', 'xa', 'tk', 'khoanh' columns?
      // Query implies they come from 'laocai_rg3lr r' mostly.
      // But 'mat_rung' has 'mahuyen'.
      // If we can't join, we can't enforce xa/tk/khoanh accurately if they aren't on mat_rung.
      // Assuming rg3lr exists as per existing code.
      logger.warn('Scope enforcement requires laocai_rg3lr table which is missing');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')} AND m.geom IS NOT NULL`;

    // ⚡ Count query for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM son_la_mat_rung m
      ${spatialJoin}
      ${whereClause}
    `;

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
        COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography)) as dtich,
        COALESCE(m.verified_area, 0) as "dtichXM",

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

      FROM son_la_mat_rung m
      ${spatialJoin}
      ${hasUsers ? 'LEFT JOIN users u ON m.verified_by = u.id' : ''}
      ${whereClause}
      ORDER BY m.start_dau DESC, m.gid DESC
      LIMIT $${index} OFFSET $${index + 1}
    `;

    params.push(parseInt(limit), offset);

    // ⚡ Run both queries in parallel
    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, -2)) // Remove LIMIT/OFFSET params for count
    ]);

    const totalRecords = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalRecords / parseInt(limit));
    const geoJSON = buildGeoJSON(result.rows);

    // ⚡ Pagination metadata
    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: totalRecords,
      totalPages: totalPages,
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1
    };

    // Cache for 5 minutes
    await redis.set(cacheKey, {
      message: `Loaded ${geoJSON.features.length} features`,
      data: geoJSON,
      pagination,
      filters: { fromDate, toDate, huyen, xa, tk, khoanh, churung }
    }, 300);

    res.json(formatResponse(
      true,
      `Loaded ${geoJSON.features.length} features with filters (page ${page}/${totalPages})`,
      geoJSON,
      { isDefault: false, cached: false, pagination }
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
        COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography)) as dtich,
        COALESCE(m.verified_area, 0) as "dtichXM",

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

      FROM son_la_mat_rung m
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
      FROM son_la_mat_rung m
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
      FROM son_la_mat_rung m
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
        COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography)) as dtich,
        COALESCE(m.verified_area, 0) as "dtichXM",

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

      FROM son_la_mat_rung m
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
        tk: convertTcvn3ToUnicode(row.tk || ''),
        khoanh: convertTcvn3ToUnicode(row.khoanh || ''),
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

/**
 * ✅ NEW: Get recent/unverified mat rung data as GeoJSON (real-time)
 * Used for dynamic layer on map (data with clipped_geom from auto-clip trigger)
 */
exports.getRecentGeoJson = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { bbox, days = 7, status = 'Chưa xác minh' } = req.query;

    let bboxFilter = '';
    let params = [days];

    // Parse bbox if provided: minX,minY,maxX,maxY
    if (bbox) {
      const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
      bboxFilter = `AND clipped_geom && ST_MakeEnvelope($2, $3, $4, $5, 4326)`;
      params.push(minX, minY, maxX, maxY);
    }

    // Check if laocai_rg3lr table exists
    const hasRg3lr = await tableExists(db, 'laocai_rg3lr');

    const query = `
      SELECT
        m.gid,
        ST_AsGeoJSON(m.clipped_geom)::json as geometry,
        m.area as original_area,
        m.clipped_area,
        COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography)) as dtich,
        COALESCE(m.verified_area, 0) as "dtichXM",
        m.verified_area,
        m.verification_reason,
        m.detection_status,
        m.detection_date,
        m.verification_notes,
        m.verified_by,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        ST_X(ST_Transform(ST_Centroid(COALESCE(m.clipped_geom, m.geom)), 4326)) as x,
        ST_Y(ST_Transform(ST_Centroid(COALESCE(m.clipped_geom, m.geom)), 4326)) as y,
        m.created_at,
        m.updated_at,
        m.has_intersection,
        m.last_clipped_at,
        ${hasRg3lr ? `
        r.huyen,
        r.xa,
        r.tk,
        r.khoanh,
        r.churung
        ` : `
        NULL as huyen,
        NULL as xa,
        NULL as tk,
        NULL as khoanh,
        NULL as churung
        `}
      FROM son_la_mat_rung m
      ${hasRg3lr ? `
      LEFT JOIN laocai_rg3lr r ON ST_Intersects(
        ST_Transform(m.geom, 4326),
        ST_Transform(r.geom, 4326)
      )
      ` : ''}
      WHERE m.clipped_geom IS NOT NULL
        AND m.has_intersection = true
        AND (
          m.detection_status = $1
          OR m.created_at >= NOW() - INTERVAL '${days} days'
        )
        ${bboxFilter}
      ORDER BY m.created_at DESC
      LIMIT 1000
    `;

    const startTime = Date.now();
    const result = await db.query(query, params);
    const queryTime = Date.now() - startTime;

    const geojson = {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        id: row.gid,
        geometry: row.geometry,
        properties: {
          gid: row.gid,
          original_area: row.original_area,
          clipped_area: row.clipped_area,
          clipped_area_ha: row.clipped_area ? (row.clipped_area / 10000).toFixed(2) : '0',
          dtich: row.dtich,
          dtichXM: row.dtichXM,
          verified_area: row.verified_area,
          verification_reason: convertTcvn3ToUnicode(row.verification_reason || ''),
          detection_status: row.detection_status,
          detection_date: row.detection_date,
          verification_notes: row.verification_notes,
          verified_by: row.verified_by,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          huyen: convertTcvn3ToUnicode(row.huyen || HUYEN_MAPPING[row.mahuyen] || `Huyện ${row.mahuyen}`),
          xa: convertTcvn3ToUnicode(row.xa || ''),
          tk: convertTcvn3ToUnicode(row.tk || ''),
          khoanh: convertTcvn3ToUnicode(row.khoanh || ''),
          churung: convertTcvn3ToUnicode(row.churung || ''),
          x: row.x,
          y: row.y,
          created_at: row.created_at,
          updated_at: row.updated_at,
          has_intersection: row.has_intersection,
          last_clipped_at: row.last_clipped_at
        }
      }))
    };

    logger.info('Recent GeoJSON fetched', {
      count: result.rows.length,
      bbox: bbox || 'all',
      days,
      status,
      query_time: `${queryTime}ms`
    });

    // Set cache-control: 30 seconds for real-time data
    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      success: true,
      data: geojson,
      metadata: {
        count: result.rows.length,
        query_time: `${queryTime}ms`,
        bbox: bbox || null,
        days: parseInt(days)
      }
    });

  } catch (error) {
    logger.error('Failed to fetch recent GeoJSON', { error: error.message });
    next(error);
  }
};

/**
 * ✅ NEW: Get clip progress for background worker
 */
exports.getClipProgress = async (req, res, next) => {
  try {
    const db = req.app.locals.db;

    // Get progress from tracking table
    const progressResult = await db.query(`
      SELECT
        total_records,
        clipped_records,
        progress_percent,
        last_updated
      FROM clip_progress
      WHERE id = 1
    `);

    // Get real-time stats from main table
    // Use last_clipped_at to track processing (not clipped_geom, which stays NULL for non-intersecting records)
    const statsResult = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN last_clipped_at IS NOT NULL THEN 1 END) as processed,
        COUNT(CASE WHEN has_intersection THEN 1 END) as intersected
      FROM son_la_mat_rung
    `);

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total);
    const clipped = parseInt(stats.processed);
    const remaining = total - clipped;
    const progress = total > 0 ? ((clipped / total) * 100).toFixed(2) : 0;

    // Estimate time remaining (based on 1s per record)
    const etaSeconds = remaining * 1; // ~1 second per record
    const etaMinutes = Math.ceil(etaSeconds / 60);
    const etaHours = Math.ceil(etaMinutes / 60);

    let eta = '';
    if (etaHours > 24) {
      eta = `${Math.ceil(etaHours / 24)} ngày`;
    } else if (etaHours > 1) {
      eta = `${etaHours} giờ`;
    } else {
      eta = `${etaMinutes} phút`;
    }

    const response = {
      total,
      clipped,
      remaining,
      intersected: parseInt(stats.intersected),
      progress: parseFloat(progress),
      progress_display: `${progress}%`,
      eta,
      is_complete: remaining === 0,
      last_updated: progressResult.rows[0]?.last_updated || null
    };

    logger.info('Clip progress fetched', { progress: response.progress });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('Failed to fetch clip progress', { error: error.message });
    next(error);
  }
};

/**
 * ✅ NEW: Get statistics about mat rung data and clipping
 */
exports.getStatistics = async (req, res, next) => {
  try {
    const db = req.app.locals.db;

    const startTime = Date.now();

    const result = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(clipped_geom) as clipped,
        COUNT(CASE WHEN has_intersection THEN 1 END) as has_intersection,
        COUNT(CASE WHEN detection_status = 'Chưa xác minh' THEN 1 END) as unverified,
        COUNT(CASE WHEN detection_status = 'Đã xác minh' THEN 1 END) as verified,
        COUNT(CASE WHEN detection_status = 'Đã xử lý' THEN 1 END) as processed,
        COALESCE(SUM(area), 0) as total_original_area,
        COALESCE(SUM(clipped_area), 0) as total_clipped_area_m2,
        COALESCE(SUM(clipped_area) / 10000, 0) as total_clipped_area_ha,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record,
        MAX(last_clipped_at) as last_clip_time
      FROM son_la_mat_rung
    `);

    const queryTime = Date.now() - startTime;

    const stats = result.rows[0];

    // Calculate clipping efficiency
    const clippingEfficiency = stats.total > 0
      ? ((parseInt(stats.clipped) / parseInt(stats.total)) * 100).toFixed(2)
      : 0;

    const intersectionRate = stats.clipped > 0
      ? ((parseInt(stats.has_intersection) / parseInt(stats.clipped)) * 100).toFixed(2)
      : 0;

    logger.info('Statistics fetched', { query_time: `${queryTime}ms` });

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total),
        clipped: parseInt(stats.clipped),
        has_intersection: parseInt(stats.has_intersection),
        status: {
          unverified: parseInt(stats.unverified),
          verified: parseInt(stats.verified),
          processed: parseInt(stats.processed)
        },
        area: {
          total_original_ha: parseFloat(stats.total_original_area).toFixed(2),
          total_clipped_m2: parseFloat(stats.total_clipped_area_m2).toFixed(2),
          total_clipped_ha: parseFloat(stats.total_clipped_area_ha).toFixed(2)
        },
        efficiency: {
          clipping_rate: `${clippingEfficiency}%`,
          intersection_rate: `${intersectionRate}%`
        },
        timeline: {
          oldest_record: stats.oldest_record,
          newest_record: stats.newest_record,
          last_clip_time: stats.last_clip_time
        }
      },
      metadata: {
        query_time: `${queryTime}ms`
      }
    });

  } catch (error) {
    logger.error('Failed to fetch statistics', { error: error.message });
    next(error);
  }
};

// PUT /:gid - Cập nhật trạng thái/dữ liệu xác minh cho một bản ghi (dùng bởi inline table edit)
exports.updateMatRung = async (req, res, next) => {
  try {
    const { gid } = req.params;
    if (!gid || isNaN(parseInt(gid))) {
      return res.status(400).json({ success: false, message: 'Invalid gid' });
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Map frontend field names → DB column names
    const { detection_status, dtichXM, verification_reason, verification_notes } = req.body;

    const setClauses = [];
    const params = [];
    let idx = 1;

    if (detection_status !== undefined) { setClauses.push(`detection_status = $${idx++}`); params.push(detection_status); }
    // dtichXM (frontend) → verified_area (DB)
    if (dtichXM !== undefined) { setClauses.push(`verified_area = $${idx++}`); params.push(dtichXM || null); }
    if (verification_reason !== undefined) { setClauses.push(`verification_reason = $${idx++}`); params.push(verification_reason || null); }
    if (verification_notes !== undefined) { setClauses.push(`verification_notes = $${idx++}`); params.push(verification_notes || null); }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(parseInt(gid));
    const query = `UPDATE son_la_mat_rung SET ${setClauses.join(', ')} WHERE gid = $${idx} RETURNING gid`;
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy PH-${gid}` });
    }

    // Xóa cache liên quan
    await redis.clearPattern('matrung:');
    await redis.clearPattern(`search:id:${gid}:`);

    res.json({ success: true, message: 'Cập nhật thành công', data: { gid: parseInt(gid) } });
  } catch (error) {
    logger.error('updateMatRung failed', { error: error.message, gid: req.params.gid });
    next(error);
  }
};

// DELETE /:gid - Xóa một bản ghi (dùng bởi inline table edit)
exports.deleteMatRung = async (req, res, next) => {
  try {
    const { gid } = req.params;
    if (!gid || isNaN(parseInt(gid))) {
      return res.status(400).json({ success: false, message: 'Invalid gid' });
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const result = await db.query('DELETE FROM son_la_mat_rung WHERE gid = $1 RETURNING gid', [parseInt(gid)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `Không tìm thấy PH-${gid}` });
    }

    await redis.clearPattern('matrung:');
    await redis.clearPattern(`search:id:${gid}:`);

    res.json({ success: true, message: 'Xóa thành công', data: { gid: parseInt(gid) } });
  } catch (error) {
    logger.error('deleteMatRung failed', { error: error.message, gid: req.params.gid });
    next(error);
  }
};

// ── Bảng kê xử lý ảnh viễn thám ──────────────────────────────────────────────
exports.getBangKeXuLyAnh = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const { maxa, ten_xa, page = 1, limit = 200 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tạo bảng nếu chưa tồn tại
    await db.query(`
      CREATE TABLE IF NOT EXISTS bang_ke_xu_ly_anh (
        id SERIAL PRIMARY KEY,
        maxa TEXT,
        ten_xa TEXT,
        start_dau TIMESTAMP,
        end_dau TIMESTAMP,
        start_sau TIMESTAMP,
        end_sau TIMESTAMP,
        so_lan INTEGER DEFAULT 1,
        ghi_chu TEXT,
        ngay_xu_ly TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await db.query(`ALTER TABLE bang_ke_xu_ly_anh ADD COLUMN IF NOT EXISTS ghi_chu TEXT`);

    const conditions = [];
    const params = [];
    let idx = 1;

    if (maxa) { conditions.push(`maxa ILIKE $${idx++}`); params.push(`%${maxa}%`); }
    if (ten_xa) { conditions.push(`ten_xa ILIKE $${idx++}`); params.push(`%${ten_xa}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM bang_ke_xu_ly_anh ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    params.push(parseInt(limit), offset);
    const dataResult = await db.query(
      `SELECT id, maxa, ten_xa, start_dau, end_dau, start_sau, end_sau, so_lan, ghi_chu, ngay_xu_ly, created_at
       FROM bang_ke_xu_ly_anh ${where}
       ORDER BY ten_xa ASC, so_lan ASC, ngay_xu_ly DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('getBangKeXuLyAnh failed', { error: error.message });
    next(error);
  }
};

module.exports = exports;
