/**
 * MatRungRepository - Quản lý dữ liệu mất rừng và spatial operations
 * Database: gis_db
 *
 * Chức năng:
 * - Spatial queries (ST_Intersects, ST_DWithin, etc.)
 * - Verification management
 * - Deforestation data CRUD
 * - Geometry operations
 */

const BaseRepository = require('./BaseRepository');

class MatRungRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'son_la_mat_rung');
  }

  // ========================================
  // SPATIAL QUERIES
  // ========================================

  /**
   * Spatial intersect query using optimized view
   * @param {Object} filters
   * @param {Date} filters.fromDate
   * @param {Date} filters.toDate
   * @param {string} filters.huyen
   * @param {string} filters.xa
   * @param {string} filters.tk
   * @param {string} filters.khoanh
   * @param {string} filters.churung
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<Array>}
   */
  async spatialIntersect(filters) {
    const {
      fromDate,
      toDate,
      huyen = null,
      xa = null,
      tk = null,
      khoanh = null,
      churung = null,
      limit = 500,
      offset = 0
    } = filters;

    // Use the optimized view from migration
    const { rows } = await this.query(`
      SELECT
        m.gid,
        m.start_dau,
        m.end_sau,
        m.area,
        ROUND((m.area / 10000.0)::NUMERIC, 2) as area_ha,
        m.mahuyen,
        m.detection_status,
        m.verified_by,
        m.detection_date,
        ST_AsGeoJSON(m.geom) as geometry
      FROM v_mat_rung_optimized m
      WHERE m.start_date >= $1::date
        AND m.end_date <= $2::date
        AND ($3::text IS NULL OR m.mahuyen = $3)
      ORDER BY m.gid DESC
      LIMIT $4 OFFSET $5
    `, [fromDate, toDate, huyen, limit, offset]);

    return rows;
  }

  /**
   * Count spatial intersect results
   * @param {Object} filters - Same as spatialIntersect
   * @returns {Promise<number>}
   */
  async countSpatialIntersect(filters) {
    const { fromDate, toDate, huyen = null } = filters;

    const { rows } = await this.query(`
      SELECT COUNT(*) as total
      FROM v_mat_rung_optimized m
      WHERE m.start_date >= $1::date
        AND m.end_date <= $2::date
        AND ($3::text IS NULL OR m.mahuyen = $3)
    `, [fromDate, toDate, huyen]);

    return parseInt(rows[0].total, 10);
  }

  /**
   * Search surrounding deforestation lots
   * Sử dụng stored function từ migration
   *
   * @param {number} gid - Reference mat_rung ID
   * @param {number} radiusMeters - Search radius in meters (default 5000m)
   * @returns {Promise<Array>}
   */
  async searchSurroundingLots(gid, radiusMeters = 5000) {
    const { rows } = await this.query(
      'SELECT * FROM search_surrounding_lots($1, $2)',
      [gid, radiusMeters]
    );
    return rows;
  }

  /**
   * Find mat_rung by point (latitude, longitude)
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Array>}
   */
  async findByPoint(latitude, longitude) {
    const { rows } = await this.query(`
      SELECT
        gid,
        start_dau,
        end_sau,
        area,
        ROUND((area / 10000.0)::NUMERIC, 2) as area_ha,
        mahuyen,
        detection_status,
        ST_AsGeoJSON(geom) as geometry
      FROM son_la_mat_rung
      WHERE ST_Contains(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
    `, [longitude, latitude]);

    return rows;
  }

  /**
   * Find mat_rung intersecting with polygon
   * @param {Object} polygon - GeoJSON polygon
   * @returns {Promise<Array>}
   */
  async findByPolygon(polygon) {
    const { rows } = await this.query(`
      SELECT
        gid,
        start_dau,
        end_sau,
        area,
        ROUND((area / 10000.0)::NUMERIC, 2) as area_ha,
        detection_status,
        ST_AsGeoJSON(geom) as geometry,
        ST_Area(
          ST_Intersection(
            geom,
            ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
          )::geography
        ) / 10000.0 as intersection_area_ha
      FROM son_la_mat_rung
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
      )
    `, [JSON.stringify(polygon)]);

    return rows;
  }

  // ========================================
  // VERIFICATION MANAGEMENT
  // ========================================

  /**
   * Get verification info for a mat_rung record
   * Sử dụng stored function từ migration
   *
   * @param {number} gid
   * @returns {Promise<Object|null>}
   */
  async getVerificationInfo(gid) {
    const { rows } = await this.query(
      'SELECT * FROM get_verification_basic_info($1)',
      [gid]
    );
    return rows[0] || null;
  }

  /**
   * Verify mat_rung record
   * Transaction để đảm bảo data consistency
   * Trigger sẽ tự động log vào mat_rung_verification_log
   *
   * @param {number} gid
   * @param {Object} data
   * @param {string} data.status - 'Đã xác minh' | 'Từ chối' | 'Đang xử lý'
   * @param {number} data.verifiedArea
   * @param {string} data.reason
   * @param {string} data.notes
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async verify(gid, data, userId) {
    return await this.transaction(async (client) => {
      // Update mat_rung
      const result = await client.query(`
        UPDATE son_la_mat_rung
        SET
          detection_status = $1,
          verified_area = $2,
          verification_reason = $3,
          verification_notes = $4,
          verified_by = $5,
          detection_date = CURRENT_DATE
        WHERE gid = $6
        RETURNING *
      `, [
        data.status,
        data.verifiedArea,
        data.reason,
        data.notes,
        userId,
        gid
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Mat rung with gid ${gid} not found`);
      }

      // Trigger sẽ tự động log vào mat_rung_verification_log
      return result.rows[0];
    });
  }

  /**
   * Update verification status only
   * @param {number} gid
   * @param {string} status
   * @param {number} userId
   * @returns {Promise<Object>}
   */
  async updateVerificationStatus(gid, status, userId) {
    const { rows } = await this.query(`
      UPDATE mat_rung
      SET
        detection_status = $1,
        verified_by = $2,
        detection_date = CURRENT_DATE
      WHERE gid = $3
      RETURNING *
    `, [status, userId, gid]);

    return rows[0];
  }

  /**
   * Get verification log for a record
   * @param {number} gid
   * @returns {Promise<Array>}
   */
  async getVerificationLog(gid) {
    const { rows } = await this.query(`
      SELECT
        id, gid, action,
        old_status, new_status,
        old_verified_area, new_verified_area,
        old_verification_reason, new_verification_reason,
        changed_by, changed_at,
        client_ip, user_agent
      FROM son_la_mat_rung_verification_log
      WHERE gid = $1
      ORDER BY changed_at DESC
    `, [gid]);

    return rows;
  }

  /**
   * Get recent verifications
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentVerifications(limit = 20) {
    const { rows } = await this.query(`
      SELECT
        gid,
        detection_status,
        verified_area,
        verification_reason,
        verified_by,
        detection_date
      FROM son_la_mat_rung
      WHERE detection_status = 'Đã xác minh'
      ORDER BY detection_date DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  /**
   * Find mat_rung by ID with full details
   * @param {number} gid
   * @returns {Promise<Object|null>}
   */
  async findById(gid) {
    const { rows } = await this.query(`
      SELECT
        gid,
        start_sau,
        area,
        ROUND((area / 10000.0)::NUMERIC, 2) as area_ha,
        start_dau,
        end_sau,
        mahuyen,
        end_dau,
        detection_status,
        detection_date,
        verified_by,
        verified_area,
        ROUND((verified_area / 10000.0)::NUMERIC, 2) as verified_area_ha,
        verification_reason,
        verification_notes,
        ST_AsGeoJSON(geom) as geometry,
        ST_AsGeoJSON(geom_simplified) as geometry_simplified
      FROM son_la_mat_rung
      WHERE gid = $1
    `, [gid]);

    return rows[0] || null;
  }

  /**
   * Search mat_rung with filters
   * @param {Object} filters
   * @param {string} filters.status - Detection status
   * @param {string} filters.mahuyen - District code
   * @param {Date} filters.startDate
   * @param {Date} filters.endDate
   * @param {number} filters.minArea - Minimum area in hectares
   * @param {number} filters.maxArea - Maximum area in hectares
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<Object>} { data, total }
   */
  async search(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    // Filter by status
    if (filters.status) {
      conditions.push(`detection_status = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    // Filter by district
    if (filters.mahuyen) {
      conditions.push(`mahuyen = $${paramCount}`);
      params.push(filters.mahuyen);
      paramCount++;
    }

    // Filter by date range
    if (filters.startDate) {
      conditions.push(`start_dau::date >= $${paramCount}::date`);
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      conditions.push(`end_sau::date <= $${paramCount}::date`);
      params.push(filters.endDate);
      paramCount++;
    }

    // Filter by area (in hectares)
    if (filters.minArea) {
      conditions.push(`area >= $${paramCount} * 10000`);
      params.push(filters.minArea);
      paramCount++;
    }

    if (filters.maxArea) {
      conditions.push(`area <= $${paramCount} * 10000`);
      params.push(filters.maxArea);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const { rows: countRows } = await this.query(
      `SELECT COUNT(*) as total FROM mat_rung WHERE ${whereClause}`,
      params
    );

    // Get data
    const { rows: data } = await this.query(`
      SELECT
        gid,
        start_dau,
        end_sau,
        area,
        ROUND((area / 10000.0)::NUMERIC, 2) as area_ha,
        mahuyen,
        detection_status,
        verified_by,
        detection_date,
        ST_AsGeoJSON(geom_simplified) as geometry
      FROM son_la_mat_rung
      WHERE ${whereClause}
      ORDER BY gid DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...params, limit, offset]);

    return {
      data,
      total: parseInt(countRows[0].total, 10),
      limit,
      offset
    };
  }

  /**
   * Create new mat_rung record
   * Trigger sẽ tự động calculate area
   *
   * @param {Object} data
   * @param {string} data.start_dau - Start date
   * @param {string} data.end_sau - End date
   * @param {string} data.mahuyen - District code
   * @param {Object} data.geometry - GeoJSON geometry
   * @returns {Promise<Object>}
   */
  async create(data) {
    const { rows } = await this.query(`
      INSERT INTO son_la_mat_rung (
        start_dau,
        end_sau,
        mahuyen,
        geom,
        detection_status
      ) VALUES (
        $1,
        $2,
        $3,
        ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
        'Chưa xác minh'
      )
      RETURNING *
    `, [
      data.start_dau,
      data.end_sau,
      data.mahuyen,
      JSON.stringify(data.geometry)
    ]);

    return rows[0];
  }

  /**
   * Update mat_rung geometry
   * @param {number} gid
   * @param {Object} geometry - GeoJSON geometry
   * @returns {Promise<Object>}
   */
  async updateGeometry(gid, geometry) {
    const { rows } = await this.query(`
      UPDATE mat_rung
      SET geom = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
      WHERE gid = $2
      RETURNING *
    `, [JSON.stringify(geometry), gid]);

    return rows[0];
  }

  // ========================================
  // STATISTICS & REPORTS
  // ========================================

  /**
   * Get statistics by status
   * @returns {Promise<Array>}
   */
  async getStatsByStatus() {
    const { rows } = await this.query(`
      SELECT * FROM verification_stats_by_status
    `);
    return rows;
  }

  /**
   * Get statistics by reason
   * @returns {Promise<Array>}
   */
  async getStatsByReason() {
    const { rows } = await this.query(`
      SELECT * FROM verification_stats_by_reason
    `);
    return rows;
  }

  /**
   * Get statistics by district
   * @returns {Promise<Array>}
   */
  async getStatsByDistrict() {
    const { rows } = await this.query(`
      SELECT
        mahuyen as district_code,
        COUNT(*) as total_lots,
        COUNT(*) FILTER (WHERE detection_status = 'Đã xác minh') as verified_lots,
        SUM(area) / 10000.0 as total_area_ha,
        SUM(area) FILTER (WHERE detection_status = 'Đã xác minh') / 10000.0 as verified_area_ha
      FROM son_la_mat_rung
      GROUP BY mahuyen
      ORDER BY total_lots DESC
    `);
    return rows;
  }

  /**
   * Get statistics by time period
   * @param {string} period - 'day' | 'week' | 'month' | 'year'
   * @param {number} limit - Number of periods to return
   * @returns {Promise<Array>}
   */
  async getStatsByTimePeriod(period = 'month', limit = 12) {
    const dateFormat = {
      day: 'YYYY-MM-DD',
      week: 'IYYY-IW',
      month: 'YYYY-MM',
      year: 'YYYY'
    }[period] || 'YYYY-MM';

    const { rows } = await this.query(`
      SELECT
        TO_CHAR(end_sau::date, $1) as period,
        COUNT(*) as total_lots,
        COUNT(*) FILTER (WHERE detection_status = 'Đã xác minh') as verified_lots,
        SUM(area) / 10000.0 as total_area_ha
      FROM son_la_mat_rung
      WHERE end_sau IS NOT NULL
      GROUP BY TO_CHAR(end_sau::date, $1)
      ORDER BY period DESC
      LIMIT $2
    `, [dateFormat, limit]);

    return rows;
  }

  /**
   * Get deforestation hotspots (areas with high density)
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getHotspots(limit = 10) {
    const { rows } = await this.query(`
      SELECT
        mahuyen,
        COUNT(*) as lot_count,
        SUM(area) / 10000.0 as total_area_ha,
        AVG(area) / 10000.0 as avg_area_ha
      FROM son_la_mat_rung
      WHERE end_sau::date >= NOW() - INTERVAL '90 days'
      GROUP BY mahuyen
      HAVING COUNT(*) > 5
      ORDER BY lot_count DESC, total_area_ha DESC
      LIMIT $1
    `, [limit]);

    return rows;
  }

  /**
   * Get summary statistics
   * @returns {Promise<Object>}
   */
  async getSummaryStats() {
    const { rows } = await this.query(`
      SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE detection_status = 'Đã xác minh') as verified_count,
        COUNT(*) FILTER (WHERE detection_status = 'Chưa xác minh') as unverified_count,
        SUM(area) / 10000.0 as total_area_ha,
        AVG(area) / 10000.0 as avg_area_ha,
        MIN(end_sau::date) as earliest_detection,
        MAX(end_sau::date) as latest_detection
      FROM son_la_mat_rung
    `);

    return rows[0];
  }
}

module.exports = MatRungRepository;
