// admin-service/src/services/admin.service.js
// Service layer for admin operations using Kysely Query Builder

const { sql } = require('kysely');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('admin-service');

class AdminService {
  constructor(kyselyDb) {
    this.db = kyselyDb;
  }

  /**
   * Get list of huyen (districts)
   */
  async getHuyen() {
    const result = await this.db
      .selectFrom('mv_huyen')
      .select('huyen')
      .orderBy('huyen')
      .execute();

    return result;
  }

  /**
   * Get list of xa (communes) filtered by huyen
   */
  async getXa(huyen) {
    let query = this.db
      .selectFrom('mv_xa_by_huyen')
      .select('xa')
      .where('xa', 'is not', null);

    if (huyen) {
      query = query.where('huyen', '=', huyen);
    }

    const result = await query.orderBy('xa').execute();
    return result;
  }

  /**
   * Get list of tieu khu filtered by huyen and xa
   */
  async getTieuKhu(huyen, xa) {
    let query = this.db
      .selectFrom('mv_tieukhu_by_xa')
      .select('tieukhu')
      .where('tieukhu', 'is not', null);

    if (huyen) {
      query = query.where('huyen', '=', huyen);
    }

    if (xa) {
      query = query.where('xa', '=', xa);
    }

    const result = await query.orderBy('tieukhu').execute();
    return result;
  }

  /**
   * Get list of khoanh
   */
  async getKhoanh() {
    const result = await this.db
      .selectFrom('mv_khoanh_by_tieukhu')
      .select('khoanh')
      .where('khoanh', 'is not', null)
      .orderBy('khoanh')
      .execute();

    return result;
  }

  /**
   * Get list of chu rung (forest owners)
   */
  async getChurung() {
    const result = await this.db
      .selectFrom('mv_churung')
      .select('churung')
      .orderBy('churung')
      .execute();

    return result;
  }

  /**
   * Get hanh chinh boundaries (administrative boundaries)
   */
  async getHanhChinh() {
    logger.info('Getting hanh chinh data');

    const result = await this.db
      .selectFrom('laocai_ranhgioihc')
      .select([
        'huyen',
        'xa',
        sql`ST_AsGeoJSON(ST_Transform(geom, 4326))`.as('geometry')
      ])
      .where('geom', 'is not', null)
      .limit(1000)
      .execute();

    return result;
  }

  /**
   * Get list of chuc nang rung (forest functions)
   */
  async getChucNangRung() {
    const result = await this.db
      .selectFrom('chuc_nang_rung')
      .select([
        'id',
        sql`ten_chuc_nang`.as('ten')
      ])
      .orderBy('ten_chuc_nang')
      .execute();

    return result;
  }

  /**
   * Get list of trang thai xac minh (verification statuses)
   */
  async getTrangThaiXacMinh() {
    const result = await this.db
      .selectFrom('trang_thai_xac_minh')
      .select([
        'id',
        sql`ten_trang_thai`.as('ten')
      ])
      .orderBy('id')
      .execute();

    return result;
  }

  /**
   * Get list of nguyen nhan (causes)
   */
  async getNguyenNhan() {
    const result = await this.db
      .selectFrom('nguyen_nhan')
      .select([
        'id',
        sql`ten_nguyen_nhan`.as('ten')
      ])
      .orderBy('ten_nguyen_nhan')
      .execute();

    return result;
  }

  /**
   * Get list of xa from Sơn La (sonla_rgx table)
   */
  async getSonLaXa() {
    const result = await this.db
      .selectFrom('sonla_rgx')
      .select('xa')
      .where('xa', 'is not', null)
      .distinct()
      .orderBy('xa')
      .execute();

    return result;
  }

  /**
   * Get list of tieu khu from Sơn La filtered by xa
   */
  async getSonLaTieuKhu(xa) {
    let query = this.db
      .selectFrom('sonla_tkkl')
      .select('tieukhu')
      .where('tieukhu', 'is not', null)
      .distinct();

    if (xa) {
      query = query.where('xa', '=', xa);
    }

    const result = await query.orderBy('tieukhu').execute();
    return result;
  }

  /**
   * Get list of khoanh from Sơn La filtered by xa and tieu khu
   */
  async getSonLaKhoanh(xa, tieuKhu) {
    let query = this.db
      .selectFrom('sonla_hientrangrung')
      .select('khoanh')
      .where('khoanh', 'is not', null)
      .distinct();

    if (xa) {
      query = query.where('xa', '=', xa);
    }

    if (tieuKhu) {
      query = query.where('tk', '=', tieuKhu);
    }

    const result = await query.orderBy('khoanh').execute();
    return result;
  }
}

module.exports = AdminService;
