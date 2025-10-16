// gis-service/src/services/matrung.service.js
// Service layer for mat_rung operations using Kysely Query Builder

const { sql } = require('kysely');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('matrung-service');

class MatRungService {
  constructor(kyselyDb) {
    this.db = kyselyDb;
  }

  /**
   * Check if a table exists in the database
   */
  async tableExists(tableName) {
    const result = await this.db
      .selectFrom(sql`information_schema.tables`.as('tables'))
      .select(sql`1`.as('exists'))
      .where('table_schema', '=', 'public')
      .where('table_name', '=', tableName)
      .executeTakeFirst();

    return !!result;
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
    const hasRg3lr = await this.tableExists('laocai_rg3lr');

    // No filters - return 12 months data
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      logger.info('Loading mat rung data: 12 months default');

      const query = this.db
        .selectFrom('mat_rung as m')
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
          sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry')
        ])
        .where('m.geom', 'is not', null)
        .where(sql`m.end_sau::date`, '>=', sql`CURRENT_DATE - INTERVAL '12 months'`)
        .orderBy('m.end_sau', 'desc')
        .orderBy('m.gid', 'desc')
        .limit(parseInt(limit));

      // Add user join if users table exists
      if (hasUsers) {
        query
          .leftJoin('users as u', 'u.id', 'm.verified_by')
          .select([
            'u.full_name as verified_by_name',
            'u.username as verified_by_username'
          ]);
      } else {
        query.select([
          sql`NULL`.as('verified_by_name'),
          sql`NULL`.as('verified_by_username')
        ]);
      }

      // Add rg3lr join if table exists
      if (hasRg3lr) {
        query
          .leftJoin('laocai_rg3lr as r', (join) =>
            join.on(sql`ST_Intersects(
              ST_Transform(m.geom, 4326),
              ST_Transform(r.geom, 4326)
            )`)
          )
          .select([
            'r.huyen',
            'r.xa',
            'r.tk',
            'r.khoanh',
            'r.churung'
          ]);
      } else {
        query.select([
          sql`NULL`.as('huyen'),
          sql`NULL`.as('xa'),
          sql`NULL`.as('tk'),
          sql`NULL`.as('khoanh'),
          sql`NULL`.as('churung')
        ]);
      }

      const result = await query.execute();
      return result;
    }

    // With filters
    logger.info('Loading mat rung data with filters', { fromDate, toDate, huyen, xa });

    let query = this.db
      .selectFrom('mat_rung as m')
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
        sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry')
      ])
      .where('m.geom', 'is not', null)
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

    // Add spatial filters using laocai_rg3lr
    if (hasRg3lr && (huyen || xa || tk || khoanh || churung)) {
      query = query.leftJoin('laocai_rg3lr as r', (join) =>
        join.on(sql`ST_Intersects(
          ST_Transform(m.geom, 4326),
          ST_Transform(r.geom, 4326)
        )`)
      );

      query = query.select([
        'r.huyen',
        'r.xa',
        'r.tk',
        'r.khoanh',
        'r.churung'
      ]);

      if (huyen) query = query.where('r.huyen', '=', huyen);
      if (xa) query = query.where('r.xa', '=', xa);
      if (tk) query = query.where('r.tk', '=', tk);
      if (khoanh) query = query.where('r.khoanh', '=', khoanh);
      if (churung) query = query.where('r.churung', 'ilike', `%${churung}%`);
    } else if (hasRg3lr) {
      query = query.select([
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh'),
        sql`NULL`.as('churung')
      ]);
    }

    query = query
      .orderBy('m.end_sau', 'desc')
      .orderBy('m.gid', 'desc')
      .limit(parseInt(limit));

    const result = await query.execute();
    return result;
  }

  /**
   * Get all mat rung data
   */
  async getAllMatRung({ limit = 1000, months = 3 }) {
    logger.info(`Loading all mat rung data: ${months} months, limit: ${limit}`);

    const hasUsers = await this.tableExists('users');
    const hasRg3lr = await this.tableExists('laocai_rg3lr');

    let query = this.db
      .selectFrom('mat_rung as m')
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
        sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry')
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

    if (hasRg3lr) {
      query = query
        .leftJoin('laocai_rg3lr as r', (join) =>
          join.on(sql`ST_Intersects(
            ST_Transform(m.geom, 4326),
            ST_Transform(r.geom, 4326)
          )`)
        )
        .select([
          'r.huyen',
          'r.xa',
          'r.tk',
          'r.khoanh',
          'r.churung'
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh'),
        sql`NULL`.as('churung')
      ]);
    }

    const result = await query.execute();
    return result;
  }

  /**
   * Get statistics
   */
  async getStats() {
    logger.info('Calculating mat rung statistics');

    const hasRg3lr = await this.tableExists('laocai_rg3lr');

    let query = this.db
      .selectFrom('mat_rung as m')
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
        sql`COUNT(CASE WHEN m.verified_by IS NOT NULL THEN 1 END)`.as('records_with_verifier')
      ]);

    if (hasRg3lr) {
      query = query
        .leftJoin('laocai_rg3lr as r', (join) =>
          join.on(sql`ST_Intersects(
            ST_Transform(m.geom, 4326),
            ST_Transform(r.geom, 4326)
          )`)
        )
        .select(sql`COUNT(CASE WHEN r.gid IS NOT NULL THEN 1 END)`.as('records_with_spatial_data'));
    } else {
      query = query.select(sql`0`.as('records_with_spatial_data'));
    }

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
      .selectFrom('mat_rung as m')
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
    const hasRg3lr = await this.tableExists('laocai_rg3lr');

    const startTime = Date.now();

    let query = this.db
      .selectFrom('mat_rung as m')
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
        sql`ST_AsGeoJSON(ST_Transform(m.geom, 4326))`.as('geometry')
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

    if (hasRg3lr) {
      query = query
        .leftJoin('laocai_rg3lr as r', (join) =>
          join.on(sql`ST_Intersects(
            ST_Transform(m.geom, 4326),
            ST_Transform(r.geom, 4326)
          )`)
        )
        .select([
          'r.huyen',
          'r.xa',
          'r.tk',
          'r.khoanh',
          'r.churung'
        ]);
    } else {
      query = query.select([
        sql`NULL`.as('huyen'),
        sql`NULL`.as('xa'),
        sql`NULL`.as('tk'),
        sql`NULL`.as('khoanh'),
        sql`NULL`.as('churung')
      ]);
    }

    const result = await query.execute();
    const queryTime = Date.now() - startTime;

    logger.info(`Auto forecast query completed in ${queryTime}ms, found ${result.length} records`);

    return {
      rows: result,
      queryTime
    };
  }
}

module.exports = MatRungService;
