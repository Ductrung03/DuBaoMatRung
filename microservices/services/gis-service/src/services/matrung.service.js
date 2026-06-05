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
      keepAliveInitialDelayMillis: 10000,
      // ✅ FIX: Force UTF8 encoding to prevent garbled characters
      client_encoding: 'UTF8'
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
        // ✅ FIX: Set client encoding to UTF8 before EVERY query
        await this.adminDb.query('SET CLIENT_ENCODING TO UTF8');
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

        // ✅ FIX: Use sonla_tkkl instead of sonla_hientrangrung_new
        // sonla_hientrangrung_new stores xa in TCVN3 encoding (garbled Unicode like 'XÃ£ Mai SÆ¡n')
        // sonla_tkkl stores xa in proper Unicode ('Xã Mai Sơn')
        // Column mapping: sonla_tkkl uses 'tieukhu' instead of 'tk'
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
            h.xa,
            h.tieukhu as tk,
            h.khoanh
          FROM input_points g
          LEFT JOIN sonla_tkkl h
            ON h.geom IS NOT NULL AND ST_Intersects(h.geom, g.pt)
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
   * Enrich rows with so_lan, end_dau, start_sau from bang_ke_xu_ly_anh
   * Match by xa name + date range: mat_rung.start_dau phải nằm trong [bk.start_dau, bk.end_sau]
   * Nếu nhiều bản ghi cùng khớp (dữ liệu bị trùng), lấy so_lan nhỏ nhất (lần đầu tiên khớp)
   */
  async enrichWithSoLan(rows) {
    if (!rows || rows.length === 0) return rows;

    try {
      const xaNames = [...new Set(rows.map(r => r.xa).filter(Boolean))];
      if (xaNames.length === 0) return rows;

      // Lấy tất cả bang_ke records cho các xã, sắp xếp so_lan tăng dần
      const result = await this.db
        .selectFrom('bang_ke_xu_ly_anh')
        .select(['ten_xa', 'so_lan', 'start_dau', 'end_dau', 'start_sau', 'end_sau'])
        .where('ten_xa', 'in', xaNames)
        .orderBy('so_lan', 'asc')
        .execute();

      // Group theo xa: { 'Xã Chiềng Mai': [{ so_lan:1, ... }, { so_lan:2, ... }] }
      const bangKeByXa = {};
      result.forEach(r => {
        if (!bangKeByXa[r.ten_xa]) bangKeByXa[r.ten_xa] = [];
        bangKeByXa[r.ten_xa].push(r);
      });

      return rows.map(row => {
        const bangKeList = bangKeByXa[row.xa];
        if (!bangKeList || bangKeList.length === 0) return row;

        const rowStart = new Date(row.start_dau);

        // Tìm bang_ke có khoảng ngày bao hàm start_dau của mat_rung
        // Lấy bản ghi đầu tiên khớp (so_lan nhỏ nhất) để đảm bảo đúng lần
        let matched = bangKeList.find(bk => {
          const bkStart = new Date(bk.start_dau);
          const bkEnd = new Date(bk.end_sau);
          return rowStart >= bkStart && rowStart <= bkEnd;
        });

        // Fallback: nếu không khớp ngày chính xác, lấy bản ghi có start_dau gần nhất
        if (!matched) {
          matched = bangKeList.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.start_dau) - rowStart);
            const currDiff = Math.abs(new Date(curr.start_dau) - rowStart);
            return currDiff < prevDiff ? curr : prev;
          });
        }

        return {
          ...row,
          so_lan: matched.so_lan ?? null,
          end_dau: matched.end_dau || row.end_dau || null,
          start_sau: matched.start_sau || row.start_sau || null,
        };
      });
    } catch (error) {
      logger.warn('Failed to enrich with bang_ke info:', error.message);
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
   * ✅ FIX: Sử dụng spatial filter khi có xa/tk/khoanh thay vì post-filter
   */
  async getMatRung({ fromDate, toDate, huyen, xa, tk, khoanh, churung, limit = 1000 }) {
    const hasUsers = await this.tableExists('users');

    // ✅ FIX: Nếu có xa/tk/khoanh, sử dụng spatial filter từ admin_db
    if (xa || tk || khoanh) {
      logger.info('Loading mat rung data with spatial filter (xa/tk/khoanh)', { fromDate, toDate, xa, tk, khoanh });

      try {
        // Lấy union geometry từ admin_db cho khu vực xa/tk/khoanh
        let adminQuery = `SELECT ST_AsText(ST_Union(geom)) as union_geom FROM sonla_tkkl WHERE 1=1`;
        const adminParams = [];

        if (xa) {
          adminParams.push(xa);
          adminQuery = `SELECT ST_AsText(ST_Union(geom)) as union_geom FROM sonla_tkkl WHERE xa = $1`;
        }
        if (tk) {
          adminParams.push(tk);
          adminQuery = `SELECT ST_AsText(ST_Union(geom)) as union_geom FROM sonla_tkkl WHERE xa = $1 AND tieukhu = $2`;
        }
        if (khoanh) {
          adminParams.push(khoanh);
          adminQuery = `SELECT ST_AsText(ST_Union(geom)) as union_geom FROM sonla_tkkl WHERE xa = $1 AND tieukhu = $2 AND khoanh = $3`;
        }

        logger.info('Executing admin geometry query', { adminQuery: adminQuery.substring(0, 100), adminParams });
        let adminResult = await this.adminDb.query(adminQuery, adminParams);

        // ✅ FIX: Fallback to sonla_rgx if sonla_tkkl doesn't have this xa
        if (!adminResult.rows[0]?.union_geom && xa && !tk && !khoanh) {
          logger.info('No geometry in sonla_tkkl, trying sonla_rgx fallback', { xa });
          const fallbackQuery = `SELECT ST_AsText(ST_Union(geom)) as union_geom FROM sonla_rgx WHERE xa = $1`;
          adminResult = await this.adminDb.query(fallbackQuery, [xa]);
        }

        if (!adminResult.rows[0]?.union_geom) {
          logger.warn('No geometry found for spatial filter in both tables', { xa, tk, khoanh });
          return [];
        }

        const unionGeomWKT = adminResult.rows[0].union_geom;

        // Build date filter
        let dateFilter = sql`m.end_sau::date >= CURRENT_DATE - INTERVAL '12 months'`;
        if (fromDate && toDate) {
          // ✅ FIX: Use start_dau for both conditions (more predictable)
          dateFilter = sql`m.start_dau::date >= ${fromDate}::date AND m.start_dau::date <= ${toDate}::date`;
        } else if (fromDate) {
          dateFilter = sql`m.start_dau::date >= ${fromDate}::date`;
        } else if (toDate) {
          dateFilter = sql`m.start_dau::date <= ${toDate}::date`;
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
            sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('x_coordinate'),
            sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('y_coordinate'),
            sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
            sql`m.verified_area`.as('dtichXM'),
            sql`ST_AsGeoJSON(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326), 6)`.as('geometry'),
            'm.has_intersection',
            sql`NULL`.as('huyen'),
            sql`NULL`.as('xa'),
            sql`NULL`.as('tk'),
            sql`NULL`.as('khoanh')
          ])
          .where('m.geom', 'is not', null)
          .where(sql`NOT ST_IsEmpty(m.geom)`)
          // ✅ FIX: Only show records within forest boundary (clipped)
          .where('m.has_intersection', '=', true)
          .where('m.clipped_geom', 'is not', null)
          .where(dateFilter)
          // ✅ SPATIAL FILTER: Using pre-clipped geometries
          .where(sql`ST_Intersects(COALESCE(m.clipped_geom, m.geom), ST_GeomFromText(${unionGeomWKT}, 4326))`)
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

        let result = await query.execute();
        logger.info(`Spatial filter returned ${result.length} records for xa=${xa}, tk=${tk}, khoanh=${khoanh}`);

        // ✅ Enrich với xa, tk, khoanh từ admin_db cho từng điểm
        let enrichedResult = await this.enrichWithAdminInfo(result);

        // ✅ FIX: Post-filter để chỉ giữ records có xa/tk/khoanh khớp chính xác
        // Vì ST_Intersects có thể trả về records ở biên giới overlap sang xã khác
        const beforeFilter = enrichedResult.length;

        // ✅ CRITICAL: Filter ra records KHÔNG có xa (không nằm trong sonla_hientrangrung)
        enrichedResult = enrichedResult.filter(r => r.xa && r.xa.trim() !== '');

        if (xa) {
          enrichedResult = enrichedResult.filter(r => r.xa === xa);
        }
        if (tk) {
          enrichedResult = enrichedResult.filter(r => r.tk === tk);
        }
        if (khoanh) {
          enrichedResult = enrichedResult.filter(r => r.khoanh === khoanh);
        }
        logger.info(`Post-filter: ${enrichedResult.length}/${beforeFilter} records after exact match filter`);

        enrichedResult = await this.enrichWithSoLan(enrichedResult);
        return enrichedResult;

      } catch (error) {
        logger.error('Error in spatial filter query:', error.message);
        // Fallback: return empty array on error
        return [];
      }
    }

    // No spatial filters - original logic
    if (!fromDate && !toDate && !huyen && !churung) {
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
          sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('x_coordinate'),
          sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('y_coordinate'),
          sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
          sql`m.verified_area`.as('dtichXM'),
          sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326), 6)`.as('geometry'),
          sql`NULL`.as('huyen'),
          sql`NULL`.as('xa'),
          sql`NULL`.as('tk'),
          sql`NULL`.as('khoanh')
        ])
        .where('m.geom', 'is not', null)
        .where(sql`NOT ST_IsEmpty(m.geom)`)
        // ✅ FIX: Only show records within forest boundary (clipped)
        .where('m.has_intersection', '=', true)
        .where('m.clipped_geom', 'is not', null)
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

      let result = await query.execute();
      // ✅ Enrich với xa, tk, khoanh từ admin_db
      result = await this.enrichWithAdminInfo(result);

      // ✅ FIX: Filter để CHỈ lấy records CÓ XA
      const beforeFilter = result.length;
      result = result.filter(r => r.xa && r.xa.trim() !== '');
      if (beforeFilter > result.length) {
        logger.info(`getMatRung (12mo default): Filtered out ${beforeFilter - result.length} records without xa`);
      }

      result = await this.enrichWithSoLan(result);
      return result;
    }

    // With date/huyen filters only (no spatial)
    logger.info('Loading mat rung data with date filters', { fromDate, toDate, huyen });

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
        sql`ST_X(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)))`.as('y_coordinate'),
        sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
        sql`m.verified_area`.as('dtichXM'),
        sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326), 6)`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      .where(sql`NOT ST_IsEmpty(m.geom)`)
      // ✅ FIX: Only show records within forest boundary (like "Dữ liệu mới nhất")
      .where('m.has_intersection', '=', true)
      .where('m.clipped_geom', 'is not', null)
      // ✅ FIX: Use start_dau with date cast for consistent filtering
      .where(sql`m.start_dau::date`, '>=', sql`${fromDate}::date`)
      .where(sql`m.start_dau::date`, '<=', sql`${toDate}::date`);

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

    // ✅ FIX: Filter để CHỈ lấy records CÓ XA
    const beforeFilter = result.length;
    result = result.filter(r => r.xa && r.xa.trim() !== '');
    if (beforeFilter > result.length) {
      logger.info(`getMatRung (date filter): Filtered out ${beforeFilter - result.length} records without xa`);
    }

    result = await this.enrichWithSoLan(result);
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
        // ✅ FIX: Calculate area from clipped geometry (prioritize clipped over original)
        sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
        sql`m.verified_area`.as('dtichXM'),
        sql`ST_X(ST_Centroid(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326)))`.as('y_coordinate'),
        sql`ST_AsGeoJSON(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326))`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      // ✅ FIX: Only show records within forest boundary (clipped)
      .where('m.has_intersection', '=', true)
      .where('m.clipped_geom', 'is not', null)
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

    let result = await query.execute();
    // ✅ Enrich với xa, tk, khoanh từ admin_db
    result = await this.enrichWithAdminInfo(result);

    // ✅ FIX: Filter để CHỈ lấy records CÓ XA
    const beforeFilter = result.length;
    result = result.filter(r => r.xa && r.xa.trim() !== '');
    if (beforeFilter > result.length) {
      logger.info(`getAllMatRung: Filtered out ${beforeFilter - result.length} records without xa`);
    }

    result = await this.enrichWithSoLan(result);
    return result;
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
        // ✅ FIX: Calculate area from clipped geometry (prioritize clipped over original)
        sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
        sql`m.verified_area`.as('dtichXM'),
        sql`ST_X(ST_Centroid(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326)))`.as('x_coordinate'),
        sql`ST_Y(ST_Centroid(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326)))`.as('y_coordinate'),
        sql`ST_AsGeoJSON(ST_Transform(COALESCE(m.clipped_geom, m.geom), 4326))`.as('geometry'),
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
      ])
      .where('m.geom', 'is not', null)
      // ✅ FIX: Only show records within forest boundary (clipped)
      .where('m.has_intersection', '=', true)
      .where('m.clipped_geom', 'is not', null)
      .where(sql`(
        (m.start_dau::date >= ${fromDate}::date AND m.start_dau::date <= ${toDate}::date)
        OR
        (m.start_sau IS NOT NULL AND m.start_sau::date >= ${fromDate}::date AND m.start_sau::date <= ${toDate}::date)
      )`)
      .orderBy('m.start_sau', 'desc')
      .orderBy('m.start_dau', 'desc')
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

    // ✅ FIX: Filter để CHỈ lấy records CÓ XA (nằm trong sonla_hientrangrung)
    const beforeFilter = result.length;
    result = result.filter(r => r.xa && r.xa.trim() !== '');
    if (beforeFilter > result.length) {
      logger.info(`Filtered out ${beforeFilter - result.length} records without xa (not in sonla_hientrangrung)`);
    }

    result = await this.enrichWithSoLan(result);

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
        sql`COALESCE(NULLIF(m.clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(m.clipped_geom, m.geom)), 4326)::geography))`.as('dtich'),
        sql`m.verified_area`.as('dtichXM'),
        sql`ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)`.as('geometry'),
        sql`NULL`.as('huyen'),
        // ✅ FIX: Set NULL để enrichWithAdminInfo lookup chính xác từ sonla_tkkl
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh')
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

    let result = await query.execute();
    // ✅ FIX: Enrich với xa, tk, khoanh từ admin_db cho từng điểm
    result = await this.enrichWithAdminInfo(result);

    // ✅ FIX: Filter để CHỈ lấy records CÓ XA
    const beforeFilter = result.length;
    result = result.filter(r => r.xa && r.xa.trim() !== '');
    if (beforeFilter > result.length) {
      logger.info(`getMatRungWithSpatialFilter: Filtered out ${beforeFilter - result.length} records without xa`);
    }

    result = await this.enrichWithSoLan(result);

    return result;
  }
}

module.exports = MatRungService;
