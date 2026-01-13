// gis-service/src/services/matrung.service.js
// Service layer for mat_rung operations using Kysely Query Builder

const { sql } = require('kysely');
const { Pool } = require('pg');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('matrung-service');

// Admin DB pool for spatial lookups
let adminDbPool = null;

function getAdminDbPool() {
  if (!adminDbPool) {
    adminDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'admin_db',
      max: 10,
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });

    adminDbPool.on('error', (err) => {
      logger.error('Admin DB pool error:', err.message);
      // Reset pool on error
      adminDbPool = null;
    });

    logger.info('Admin DB pool created for spatial lookups');
  }
  return adminDbPool;
}

class MatRungService {
  constructor(kyselyDb) {
    this.db = kyselyDb;
    this.adminDb = getAdminDbPool();
  }

  /**
   * Enrich rows with admin info (xa, tk, khoanh) from admin_db
   * Uses point-based lookup with centroid for faster performance
   */
  async enrichWithAdminInfo(rows) {
    if (!rows || rows.length === 0) return rows;

    const BATCH_SIZE = 100;
    const adminInfoMap = {};
    const MAX_RETRIES = 2;

    const executeWithRetry = async (query, params, retries = 0) => {
      try {
        // Refresh pool reference in case it was reset
        this.adminDb = getAdminDbPool();
        return await this.adminDb.query(query, params);
      } catch (error) {
        if (retries < MAX_RETRIES && (error.message.includes('terminated') || error.message.includes('Connection'))) {
          logger.warn(`Admin DB query failed, retrying (${retries + 1}/${MAX_RETRIES})...`);
          // Force pool reset
          adminDbPool = null;
          this.adminDb = getAdminDbPool();
          await new Promise(resolve => setTimeout(resolve, 500));
          return executeWithRetry(query, params, retries + 1);
        }
        throw error;
      }
    };

    try {
      const startTime = Date.now();

      // Process in batches for better performance
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const validPoints = [];
        const pointIndexMap = [];

        batch.forEach((row, batchIdx) => {
          // Skip invalid coordinates
          if (row.x_coordinate && row.y_coordinate &&
            !isNaN(row.x_coordinate) && !isNaN(row.y_coordinate)) {
            validPoints.push(`${row.x_coordinate},${row.y_coordinate}`);
            pointIndexMap.push(i + batchIdx);
          }
        });

        if (validPoints.length === 0) continue;

        // Optimized query - sonla_tkkl geometry is already in 4326
        const adminQuery = `
          WITH input_points AS (
            SELECT
              ordinality as idx,
              ST_SetSRID(ST_MakePoint(
                NULLIF(split_part(coords, ',', 1), '')::float,
                NULLIF(split_part(coords, ',', 2), '')::float
              ), 4326) as pt
            FROM unnest($1::text[]) WITH ORDINALITY AS t(coords, ordinality)
            WHERE coords IS NOT NULL AND coords != 'null,null' AND coords != ','
          )
          SELECT DISTINCT ON (g.idx)
            g.idx,
            COALESCE(t.xa, r.xa) as xa,
            t.tieukhu as tk,
            t.khoanh
          FROM input_points g
          LEFT JOIN sonla_tkkl t ON t.geom IS NOT NULL AND ST_Intersects(t.geom, g.pt)
          LEFT JOIN sonla_rgx r ON t.xa IS NULL AND r.geom IS NOT NULL AND ST_Intersects(r.geom, g.pt)
          WHERE g.pt IS NOT NULL
          ORDER BY g.idx
        `;

        const result = await executeWithRetry(adminQuery, [validPoints]);

        // Add to map with correct offset using pointIndexMap
        result.rows.forEach(row => {
          if (row.idx && row.idx > 0 && row.idx <= pointIndexMap.length) {
            const originalIdx = pointIndexMap[row.idx - 1];
            adminInfoMap[originalIdx] = {
              xa: row.xa,
              tk: row.tk,
              khoanh: row.khoanh
            };
          }
        });
      }

      const duration = Date.now() - startTime;
      const enrichedCount = Object.keys(adminInfoMap).length;
      logger.info(`Admin info enriched: ${enrichedCount}/${rows.length} records in ${duration}ms`);

      // Merge admin info into rows
      return rows.map((row, idx) => {
        const adminInfo = adminInfoMap[idx] || {};
        return {
          ...row,
          xa: adminInfo.xa || row.xa || null,
          tk: adminInfo.tk || row.tk || null,
          khoanh: adminInfo.khoanh || row.khoanh || null
        };
      });
    } catch (error) {
      logger.error('Failed to enrich with admin info:', error.message);
      // Return original rows if enrichment fails
      return rows;
    }
  }

  /**
   * Check if a table exists in the database (can be in different database/schema)
   */
  async tableExists(tableName, schemaName = 'public', databaseName = null) {
    try {
      if (databaseName && databaseName !== 'gis_db') {
        // For cross-database check (e.g., sonla_tkkl)
        const checkQuery = sql`SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = ${schemaName}
          AND table_name = ${tableName}
        )`;
        const result = await checkQuery.execute(this.db);
        return result.rows[0]?.exists || false;
      }

      const result = await this.db
        .selectFrom(sql`information_schema.tables`.as('tables'))
        .select(sql`1`.as('exists'))
        .where('table_schema', '=', schemaName)
        .where('table_name', '=', tableName)
        .executeTakeFirst();

      return !!result;
    } catch (error) {
      console.error(`Error checking table ${tableName}:`, error);
      return false;
    }
  }

  /**
   * Check if a materialized view exists
   */
  async materializedViewExists(viewName) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = ${viewName}
      ) OR EXISTS (
        SELECT FROM pg_matviews
        WHERE schemaname = 'public' AND matviewname = ${viewName}
      )
    `.execute(this.db);

    return result.rows[0]?.exists || false;
  }

  /**
   * Get mat rung data with filters
   */
  async getMatRung({ fromDate, toDate, huyen, xa, tk, khoanh, churung, limit = 1000 }) {
    const hasUsers = await this.tableExists('users');

    // No filters - return 12 months data
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      logger.info('Loading mat rung data: 12 months default');

      let query = this.db
        .selectFrom('son_la_mat_rung as m')
        .select([
          'm.gid',
          'm.start_sau',
          'm.area',
          'm.start_dau',
          'm.end_sau',
          'm.mahuyen',
          'm.end_dau',
          'm.detection_status',
          'm.detection_date',
          'm.verified_by',
          'm.verified_area',
          'm.verification_reason',
          'm.verification_notes',
          sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('x_coordinate'),
          sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('y_coordinate'),
          sql`ST_Area(m.geom::geography)`.as('dtich'),
          sql`COALESCE(m.verified_area, 0)`.as('dtichXM'),
          sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)`.as('geometry'),
          sql`NULL`.as('huyen'),
          sql`NULL`.as('xa'),
          sql`NULL`.as('tk'),
          sql`NULL`.as('khoanh')
        ])
        .where('m.geom', 'is not', null)
        .where(sql`NOT ST_IsEmpty(m.geom)`)
        .where(sql`m.end_sau::date`, '>=', sql`CURRENT_DATE - INTERVAL '12 months'`)
        .orderBy('m.end_sau', 'desc')
        .orderBy('m.gid', 'desc')
        .limit(parseInt(limit));

      // Add user join if users table exists
      if (hasUsers) {
        query = query
          .leftJoin('users as u', 'u.id', 'm.verified_by')
          .select([
            'u.full_name as verified_by_name',
            'u.username as verified_by_username'
          ]);
      } else {
        query = query.select([
          sql`NULL`.as('verified_by_name'),
          sql`NULL`.as('verified_by_username')
        ]);
      }

      const result = await query.execute();
      // ✅ Enrich với xa, tk, khoanh từ admin_db
      return await this.enrichWithAdminInfo(result);
    }

    // With filters
    logger.info('Loading mat rung data with filters', { fromDate, toDate, huyen, xa });

    let query = this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        'm.gid',
        'm.start_sau',
        'm.area',
        'm.start_dau',
        'm.end_sau',
        'm.mahuyen',
        'm.end_dau',
        'm.detection_status',
        'm.detection_date',
        'm.verified_by',
        'm.verified_area',
        'm.verification_reason',
        'm.verification_notes',
        sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('y_coordinate'),
        sql`ST_Area(m.geom::geography)`.as('dtich'),
        sql`COALESCE(m.verified_area, 0)`.as('dtichXM'),
        sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`NOT ST_IsEmpty(m.geom)`)
      .where('m.start_dau', '>=', fromDate)
      .where('m.end_sau', '<=', toDate);

    // Add user join if users table exists
    if (hasUsers) {
      query = query
        .leftJoin('users as u', 'u.id', 'm.verified_by')
        .select([
          'u.full_name as verified_by_name',
          'u.username as verified_by_username'
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('verified_by_name'),
        sql`NULL`.as('verified_by_username')
      ]);
    }

    query = query
      .orderBy('m.end_sau', 'desc')
      .orderBy('m.gid', 'desc')
      .limit(parseInt(limit));

    let result = await query.execute();

    // ✅ Enrich với xa, tk, khoanh từ admin_db
    result = await this.enrichWithAdminInfo(result);

    // Filter by xa, tk, khoanh after enrichment
    if (xa) result = result.filter(r => r.xa === xa);
    if (tk) result = result.filter(r => r.tk === tk);
    if (khoanh) result = result.filter(r => r.khoanh === khoanh);

    return result;
  }

  /**
   * Get all mat rung data
   */
  async getAllMatRung({ limit = 1000, months = 3 }) {
    logger.info(`Loading all mat rung data: ${months} months, limit: ${limit}`);

    const hasUsers = await this.tableExists('users');

    let query = this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        'm.gid',
        'm.start_sau',
        'm.area',
        'm.start_dau',
        'm.end_sau',
        'm.mahuyen',
        'm.end_dau',
        'm.detection_status',
        'm.detection_date',
        'm.verified_by',
        'm.verified_area',
        'm.verification_reason',
        'm.verification_notes',
        sql`ST_X(ST_Centroid(ST_Transform(m.geom, 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(m.geom, 4326)))`.as('y_coordinate'),
        sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`m.end_sau::date`, '>=', sql`CURRENT_DATE - INTERVAL '${sql.raw(months.toString())} months'`)
      .orderBy('m.end_sau', 'desc')
      .orderBy('m.gid', 'desc')
      .limit(parseInt(limit));

    if (hasUsers) {
      query = query
        .leftJoin('users as u', 'u.id', 'm.verified_by')
        .select([
          'u.full_name as verified_by_name',
          'u.username as verified_by_username'
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('verified_by_name'),
        sql`NULL`.as('verified_by_username')
      ]);
    }

    const result = await query.execute();
    // ✅ Enrich với xa, tk, khoanh từ admin_db
    return await this.enrichWithAdminInfo(result);
  }

  /**
   * Get statistics
   */
  async getStats() {
    logger.info('Calculating mat rung statistics');

    const query = this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        sql`COUNT(*)`.as('total_records'),
        sql`COUNT(CASE WHEN m.geom IS NOT NULL THEN 1 END)`.as('records_with_geometry'),
        sql`COUNT(CASE WHEN m.end_sau::date >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END)`.as('recent_3_months'),
        sql`COUNT(CASE WHEN m.end_sau::date >= CURRENT_DATE - INTERVAL '12 months' THEN 1 END)`.as('recent_12_months'),
        sql`MIN(m.start_dau)`.as('earliest_date'),
        sql`MAX(m.end_sau)`.as('latest_date'),
        sql`SUM(m.area)`.as('total_area'),
        sql`COUNT(DISTINCT m.mahuyen)`.as('unique_districts'),
        sql`COUNT(CASE WHEN m.detection_status = 'Đã xác minh' THEN 1 END)`.as('verified_records'),
        sql`COUNT(CASE WHEN m.verified_by IS NOT NULL THEN 1 END)`.as('records_with_verifier'),
        sql`0`.as('records_with_spatial_data')
      ]);

    const result = await query.executeTakeFirst();
    return result;
  }

  /**
   * Forecast preview - lightweight statistics
   */
  async forecastPreview({ fromDate, toDate }) {
    logger.info('Forecast preview request', { fromDate, toDate });

    const startTime = Date.now();

    const result = await this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        sql`COUNT(*)`.as('total_features'),
        sql`SUM(m.area)`.as('total_area'),
        sql`MIN(m.end_sau)`.as('earliest_date'),
        sql`MAX(m.end_sau)`.as('latest_date')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`m.end_sau::date`, '>=', sql`${fromDate}::date`)
      .where(sql`m.end_sau::date`, '<=', sql`${toDate}::date`)
      .executeTakeFirst();

    const queryTime = Date.now() - startTime;

    return {
      ...result,
      query_time_ms: queryTime
    };
  }

  /**
   * Auto forecast
   */
  async autoForecast({ fromDate, toDate }) {
    logger.info('Auto forecast request', { fromDate, toDate });

    const hasUsers = await this.tableExists('users');

    const startTime = Date.now();

    let query = this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        'm.gid',
        'm.start_sau',
        'm.area',
        'm.start_dau',
        'm.end_sau',
        'm.mahuyen',
        'm.end_dau',
        'm.detection_status',
        'm.detection_date',
        'm.verified_by',
        'm.verified_area',
        'm.verification_reason',
        'm.verification_notes',
        sql`ST_X(ST_Centroid(ST_Transform(m.geom, 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(m.geom, 4326)))`.as('y_coordinate'),
        sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`m.end_sau::date`, '>=', sql`${fromDate}::date`)
      .where(sql`m.end_sau::date`, '<=', sql`${toDate}::date`)
      .orderBy('m.end_sau', 'desc')
      .orderBy('m.gid', 'desc')
      .limit(5000);

    if (hasUsers) {
      query = query
        .leftJoin('users as u', 'u.id', 'm.verified_by')
        .select([
          'u.full_name as verified_by_name',
          'u.username as verified_by_username'
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('verified_by_name'),
        sql`NULL`.as('verified_by_username')
      ]);
    }

    let result = await query.execute();

    // ✅ Enrich với xa, tk, khoanh từ admin_db
    result = await this.enrichWithAdminInfo(result);

    const queryTime = Date.now() - startTime;

    logger.info(`Auto forecast query completed in ${queryTime}ms, found ${result.length} records`);

    return {
      rows: result,
      queryTime
    };
  }

  /**
   * Get mat rung data with spatial filter for restricted users
   * @param {Object} params - Query parameters
   * @param {string} params.spatialFilterWKT - WKT geometry for spatial filter
   * @param {string} params.userXa - User's xa scope
   * @param {string} params.userTk - User's tk scope
   * @param {string} params.userKhoanh - User's khoanh scope
   */
  async getMatRungWithSpatialFilter({
    fromDate, toDate, huyen, xa, tk, khoanh, churung, limit = 1000,
    spatialFilterWKT, userXa, userTk, userKhoanh
  }) {
    logger.info('Loading mat rung data with spatial filter', { userXa, userTk, userKhoanh });

    const hasUsers = await this.tableExists('users');

    // No filters - return 12 months data within spatial boundary
    let dateFilter = sql`m.end_sau::date >= CURRENT_DATE - INTERVAL '12 months'`;
    if (fromDate && toDate) {
      dateFilter = sql`m.end_sau::date BETWEEN ${fromDate}::date AND ${toDate}::date`;
    } else if (fromDate) {
      dateFilter = sql`m.end_sau::date >= ${fromDate}::date`;
    } else if (toDate) {
      dateFilter = sql`m.end_sau::date <= ${toDate}::date`;
    }

    let query = this.db
      .selectFrom('son_la_mat_rung as m')
      .select([
        'm.gid',
        'm.start_sau',
        'm.area',
        'm.start_dau',
        'm.end_sau',
        'm.mahuyen',
        'm.end_dau',
        'm.detection_status',
        'm.detection_date',
        'm.verified_by',
        'm.verified_area',
        'm.verification_reason',
        'm.verification_notes',
        sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326)))`.as('y_coordinate'),
        sql`ST_Area(m.geom::geography)`.as('dtich'),
        sql`COALESCE(m.verified_area, 0)`.as('dtichXM'),
        sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)`.as('geometry'),
        sql`NULL`.as('huyen'),
        // ✅ Set xa/tk/khoanh from user scope (already filtered by spatial)
        sql`${userXa}`.as('xa'),
        sql`${userTk || null}`.as('tk'),
        sql`${userKhoanh || null}`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`NOT ST_IsEmpty(m.geom)`)
      .where(dateFilter)
      // ✅ Spatial filter
      .where(sql`ST_Intersects(m.geom, ST_GeomFromText(${spatialFilterWKT}, 4326))`)
      .orderBy('m.end_sau', 'desc')
      .orderBy('m.gid', 'desc')
      .limit(parseInt(limit));

    // Add optional filters
    if (huyen) {
      query = query.where('m.mahuyen', '=', huyen);
    }

    // Add user join if users table exists
    if (hasUsers) {
      query = query
        .leftJoin('users as u', 'u.id', 'm.verified_by')
        .select([
          sql`u.full_name`.as('verified_by_name'),
          sql`u.username`.as('verified_by_username')
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('verified_by_name'),
        sql`NULL`.as('verified_by_username')
      ]);
    }

    const result = await query.execute();
    // Không cần enrichWithAdminInfo vì đã có xa/tk/khoanh từ spatial filter
    return result;
  }
}

module.exports = MatRungService;
