/**
 * AdminRepository - Quản lý administrative boundaries và reference data
 * Database: admin_db
 *
 * Chức năng:
 * - Administrative hierarchies (Tỉnh > Huyện > Xã > Tiểu khu > Khoảnh)
 * - Dropdown data (cached via materialized views)
 * - Forest classification data
 * - Terrain/topography data
 */

const BaseRepository = require('./BaseRepository');

class AdminRepository extends BaseRepository {
  constructor(pool) {
    super(pool, 'tlaocai_tkk_3lr_cru');
  }

  // ========================================
  // DROPDOWN DATA (from Materialized Views)
  // ========================================

  /**
   * Get all districts (Huyện)
   * Uses mv_dropdown_huyen materialized view for performance
   * @returns {Promise<Array<string>>}
   */
  async getDistinctHuyen() {
    const { rows } = await this.query('SELECT huyen FROM mv_dropdown_huyen');
    return rows.map(r => r.huyen);
  }

  /**
   * Get all forest compartments (Khoảnh)
   * @returns {Promise<Array<string>>}
   */
  async getAllKhoanh() {
    const { rows } = await this.query('SELECT khoanh FROM mv_dropdown_khoanh');
    return rows.map(r => r.khoanh);
  }

  /**
   * Get all forest types (Chủ rừng)
   * @returns {Promise<Array<string>>}
   */
  async getAllChurung() {
    const { rows } = await this.query('SELECT churung FROM mv_dropdown_churung');
    return rows.map(r => r.churung);
  }

  /**
   * Refresh all dropdown caches
   * Should be called after admin data updates
   * @returns {Promise<void>}
   */
  async refreshDropdownCache() {
    await this.query('SELECT refresh_dropdown_cache()');
  }

  // ========================================
  // HIERARCHICAL QUERIES
  // ========================================

  /**
   * Get communes (Xã) by district (Huyện)
   * Uses stored function from migration
   *
   * @param {string} huyen - District name
   * @returns {Promise<Array<string>>}
   */
  async getXaByHuyen(huyen) {
    const { rows } = await this.query(
      'SELECT * FROM get_xa_by_huyen($1)',
      [huyen]
    );
    return rows.map(r => r.xa);
  }

  /**
   * Get sub-compartments (Tiểu khu) by commune (Xã)
   * @param {string} xa - Commune name
   * @returns {Promise<Array<string>>}
   */
  async getTkByXa(xa) {
    const { rows } = await this.query(
      'SELECT * FROM get_tk_by_xa($1)',
      [xa]
    );
    return rows.map(r => r.tk);
  }

  /**
   * Get compartments (Khoảnh) by sub-compartment (Tiểu khu)
   * @param {string} tk - Sub-compartment code
   * @returns {Promise<Array<string>>}
   */
  async getKhoanhByTk(tk) {
    const { rows } = await this.query(`
      SELECT DISTINCT khoanh
      FROM tlaocai_tkk_3lr_cru
      WHERE tk = $1 AND khoanh IS NOT NULL AND khoanh <> ''
      ORDER BY khoanh
    `, [tk]);
    return rows.map(r => r.khoanh);
  }

  /**
   * Get full hierarchy for a location
   * @param {Object} filters
   * @param {string} filters.huyen
   * @param {string} filters.xa
   * @param {string} filters.tk
   * @param {string} filters.khoanh
   * @returns {Promise<Array>}
   */
  async getHierarchy(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    if (filters.huyen) {
      conditions.push(`huyen = $${paramCount}`);
      params.push(filters.huyen);
      paramCount++;
    }

    if (filters.xa) {
      conditions.push(`xa = $${paramCount}`);
      params.push(filters.xa);
      paramCount++;
    }

    if (filters.tk) {
      conditions.push(`tk = $${paramCount}`);
      params.push(filters.tk);
      paramCount++;
    }

    if (filters.khoanh) {
      conditions.push(`khoanh = $${paramCount}`);
      params.push(filters.khoanh);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');

    const { rows } = await this.query(`
      SELECT
        gid,
        tinh,
        huyen,
        xa,
        tk,
        khoanh,
        churung,
        malr3,
        matinh,
        mahuyen,
        maxa
      FROM tlaocai_tkk_3lr_cru
      WHERE ${whereClause}
      ORDER BY huyen, xa, tk, khoanh
    `, params);

    return rows;
  }

  /**
   * Get district codes (for user permissions)
   * @returns {Promise<Array>}
   */
  async getDistrictCodes() {
    const { rows } = await this.query('SELECT * FROM get_district_codes()');
    return rows;
  }

  // ========================================
  // SPATIAL QUERIES
  // ========================================

  /**
   * Find administrative unit by point
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async findByPoint(latitude, longitude) {
    const { rows } = await this.query(`
      SELECT
        gid,
        tinh,
        huyen,
        xa,
        tk,
        khoanh,
        churung,
        ST_AsGeoJSON(geom) as geometry
      FROM tlaocai_tkk_3lr_cru
      WHERE ST_Contains(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
      LIMIT 1
    `, [longitude, latitude]);

    return rows[0] || null;
  }

  /**
   * Find administrative units intersecting with polygon
   * @param {Object} polygon - GeoJSON polygon
   * @returns {Promise<Array>}
   */
  async findByPolygon(polygon) {
    const { rows } = await this.query(`
      SELECT
        gid,
        huyen,
        xa,
        tk,
        khoanh,
        churung,
        ST_AsGeoJSON(geom) as geometry
      FROM tlaocai_tkk_3lr_cru
      WHERE ST_Intersects(
        geom,
        ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
      )
    `, [JSON.stringify(polygon)]);

    return rows;
  }

  /**
   * Get administrative boundaries for map rendering
   * @param {Object} options
   * @param {string} options.huyen - Filter by district
   * @param {boolean} options.simplified - Use simplified geometry
   * @returns {Promise<Array>}
   */
  async getBoundaries(options = {}) {
    const geomColumn = options.simplified ? 'geom_low' : 'geom';
    const conditions = [];
    const params = [];
    let paramCount = 1;

    if (options.huyen) {
      conditions.push(`huyen = $${paramCount}`);
      params.push(options.huyen);
      paramCount++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const { rows } = await this.query(`
      SELECT
        gid,
        huyen,
        xa,
        tieukhu,
        khoanh,
        ST_AsGeoJSON(${geomColumn}) as geometry
      FROM laocai_ranhgioihc
      ${whereClause}
    `, params);

    return rows;
  }

  // ========================================
  // FOREST CLASSIFICATION DATA
  // ========================================

  /**
   * Get forest classification (3LR) data
   * @param {Object} filters
   * @param {string} filters.ldlr - Forest land use type
   * @param {string} filters.huyen
   * @param {number} filters.limit
   * @param {number} filters.offset
   * @returns {Promise<Object>} { data, total }
   */
  async getForestClassification(filters = {}) {
    const conditions = ['1=1'];
    const params = [];
    let paramCount = 1;

    if (filters.ldlr) {
      conditions.push(`ldlr = $${paramCount}`);
      params.push(filters.ldlr);
      paramCount++;
    }

    if (filters.huyen) {
      conditions.push(`huyen = $${paramCount}`);
      params.push(filters.huyen);
      paramCount++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    // Get total count
    const { rows: countRows } = await this.query(
      `SELECT COUNT(*) as total FROM laocai_rg3lr WHERE ${whereClause}`,
      params
    );

    // Get data
    const { rows: data } = await this.query(`
      SELECT
        gid,
        tinh,
        huyen,
        xa,
        tk,
        khoanh,
        ldlr,
        churung,
        dtich,
        namtr,
        captuoi,
        mdsd,
        ST_AsGeoJSON(geom_simplified_low) as geometry
      FROM laocai_rg3lr
      WHERE ${whereClause}
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
   * Get forest statistics by type
   * @returns {Promise<Array>}
   */
  async getForestStatsByType() {
    const { rows } = await this.query(`
      SELECT
        ldlr as forest_type,
        COUNT(*) as count,
        SUM(dtich) as total_area,
        AVG(dtich) as avg_area
      FROM laocai_rg3lr
      WHERE ldlr IS NOT NULL
      GROUP BY ldlr
      ORDER BY total_area DESC
    `);

    return rows;
  }

  /**
   * Get forest owner statistics (Chủ rừng)
   * @returns {Promise<Array>}
   */
  async getForestOwnerStats() {
    const { rows } = await this.query(`
      SELECT
        churung as owner,
        COUNT(*) as count,
        SUM(dtich) as total_area
      FROM laocai_rg3lr
      WHERE churung IS NOT NULL
      GROUP BY churung
      ORDER BY total_area DESC
    `);

    return rows;
  }

  // ========================================
  // TERRAIN/TOPOGRAPHY DATA
  // ========================================

  /**
   * Get terrain types
   * @returns {Promise<Array>}
   */
  async getTerrainTypes() {
    const { rows } = await this.query(`
      SELECT DISTINCT
        ma as code,
        ten as name
      FROM laocai_nendiahinh
      WHERE ten IS NOT NULL
      ORDER BY ten
    `);

    return rows;
  }

  /**
   * Find terrain by point
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async findTerrainByPoint(latitude, longitude) {
    const { rows } = await this.query(`
      SELECT
        gid,
        ma as code,
        ten as name,
        ST_AsGeoJSON(geom) as geometry
      FROM laocai_nendiahinh
      WHERE ST_Contains(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
      LIMIT 1
    `, [longitude, latitude]);

    return rows[0] || null;
  }

  // ========================================
  // MANAGEMENT UNITS (Chủ quản lý)
  // ========================================

  /**
   * Get management units
   * @returns {Promise<Array>}
   */
  async getManagementUnits() {
    const { rows } = await this.query(`
      SELECT DISTINCT
        tt as id,
        chuquanly as name
      FROM laocai_chuquanly
      WHERE chuquanly IS NOT NULL
      ORDER BY chuquanly
    `);

    return rows;
  }

  /**
   * Find management unit by point
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async findManagementUnitByPoint(latitude, longitude) {
    const { rows } = await this.query(`
      SELECT
        gid,
        tt as id,
        chuquanly as name,
        ST_AsGeoJSON(geom_simplified) as geometry
      FROM laocai_chuquanly
      WHERE ST_Contains(
        geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
      LIMIT 1
    `, [longitude, latitude]);

    return rows[0] || null;
  }

  // ========================================
  // SEARCH & AUTOCOMPLETE
  // ========================================

  /**
   * Search administrative units (for autocomplete)
   * @param {string} query - Search term
   * @param {string} field - Field to search ('huyen', 'xa', 'tk', 'churung')
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async searchAdminUnits(query, field = 'huyen', limit = 10) {
    const allowedFields = ['huyen', 'xa', 'tk', 'khoanh', 'churung'];

    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }

    const { rows } = await this.query(`
      SELECT DISTINCT ${field}
      FROM tlaocai_tkk_3lr_cru
      WHERE ${field} ILIKE $1
        AND ${field} IS NOT NULL
        AND ${field} <> ''
      ORDER BY ${field}
      LIMIT $2
    `, [`%${query}%`, limit]);

    return rows.map(r => r[field]);
  }

  /**
   * Get complete location info by coordinates
   * Returns all hierarchical levels + additional info
   *
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async getLocationInfo(latitude, longitude) {
    const { rows } = await this.query(`
      SELECT
        t.gid,
        t.tinh,
        t.huyen,
        t.xa,
        t.tk,
        t.khoanh,
        t.churung,
        t.malr3,
        r.tieukhu,
        ST_AsGeoJSON(t.geom) as geometry
      FROM tlaocai_tkk_3lr_cru t
      LEFT JOIN laocai_ranhgioihc r ON
        ST_Intersects(t.geom, r.geom)
      WHERE ST_Contains(
        t.geom,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)
      )
      LIMIT 1
    `, [longitude, latitude]);

    return rows[0] || null;
  }

  // ========================================
  // STATISTICS
  // ========================================

  /**
   * Get summary statistics for admin data
   * @returns {Promise<Object>}
   */
  async getSummaryStats() {
    const { rows } = await this.query(`
      SELECT
        COUNT(DISTINCT huyen) as total_districts,
        COUNT(DISTINCT xa) as total_communes,
        COUNT(DISTINCT tk) as total_subcompartments,
        COUNT(DISTINCT khoanh) as total_compartments,
        COUNT(DISTINCT churung) as total_forest_types,
        COUNT(*) as total_records
      FROM tlaocai_tkk_3lr_cru
    `);

    return rows[0];
  }

  /**
   * Get area statistics by district
   * @returns {Promise<Array>}
   */
  async getAreaStatsByDistrict() {
    const { rows } = await this.query(`
      SELECT
        h.huyen as district_name,
        h.sum_dtich as area,
        COUNT(t.gid) as unit_count
      FROM laocai_huyen h
      LEFT JOIN tlaocai_tkk_3lr_cru t ON h.huyen = t.huyen
      GROUP BY h.huyen, h.sum_dtich
      ORDER BY h.sum_dtich DESC
    `);

    return rows;
  }

  // ========================================
  // COORDINATE CONVERSION
  // ========================================

  /**
   * Convert WGS84 to VN2000 (Lao Cai zone)
   * @param {number} longitude
   * @param {number} latitude
   * @returns {Promise<Object>} { x, y }
   */
  async wgs84ToVn2000(longitude, latitude) {
    const { rows } = await this.query(
      'SELECT * FROM wgs84_to_vn2000_laocai($1, $2)',
      [longitude, latitude]
    );
    return rows[0];
  }

  // ========================================
  // BULK OPERATIONS
  // ========================================

  /**
   * Get all data for a district (for export)
   * @param {string} huyen
   * @returns {Promise<Array>}
   */
  async exportDistrictData(huyen) {
    const { rows } = await this.query(`
      SELECT
        gid, matinh, mahuyen, maxa,
        tinh, huyen, xa, tk, khoanh,
        malr3, churung,
        ST_AsGeoJSON(geom) as geometry
      FROM tlaocai_tkk_3lr_cru
      WHERE huyen = $1
    `, [huyen]);

    return rows;
  }
}

module.exports = AdminRepository;
