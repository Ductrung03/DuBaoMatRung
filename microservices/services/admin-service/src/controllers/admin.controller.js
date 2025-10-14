// admin-service/src/controllers/admin.controller.js
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('admin-controller');

// Get dropdown data - Huyen
exports.getHuyen = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:huyen';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT huyen FROM mv_huyen ORDER BY huyen';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.huyen,
      label: convertTcvn3ToUnicode(r.huyen)
    }));

    const response = formatResponse(true, 'Huyen list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Xa
exports.getXa = async (req, res, next) => {
  try {
    const { huyen } = req.query;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `dropdown:xa:${huyen || 'all'}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let query = 'SELECT xa FROM mv_xa_by_huyen WHERE xa IS NOT NULL';
    const params = [];

    if (huyen) {
      query += ' AND huyen = $1';
      params.push(huyen);
    }

    query += ' ORDER BY xa';

    const result = await db.query(query, params);

    const data = result.rows.map(r => ({
      value: r.xa,
      label: convertTcvn3ToUnicode(r.xa)
    }));

    const response = formatResponse(true, 'Xa list retrieved', data);
    await redis.set(cacheKey, response, 86400);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Tieu Khu
exports.getTieuKhu = async (req, res, next) => {
  try {
    const { huyen, xa } = req.query;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `dropdown:tk:${huyen || 'all'}:${xa || 'all'}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    let query = 'SELECT tieukhu FROM mv_tieukhu_by_xa WHERE tieukhu IS NOT NULL';
    const params = [];
    let paramIndex = 1;

    if (huyen) {
      query += ` AND huyen = $${paramIndex++}`;
      params.push(huyen);
    }

    if (xa) {
      query += ` AND xa = $${paramIndex++}`;
      params.push(xa);
    }

    query += ' ORDER BY tieukhu';

    const result = await db.query(query, params);

    const data = result.rows.map(r => ({
      value: r.tieukhu,
      label: convertTcvn3ToUnicode(r.tieukhu)
    }));

    const response = formatResponse(true, 'Tieu khu list retrieved', data);
    await redis.set(cacheKey, response, 86400);

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Khoanh
exports.getKhoanh = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:khoanh';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT khoanh FROM mv_khoanh_by_tieukhu WHERE khoanh IS NOT NULL ORDER BY khoanh';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.khoanh,
      label: convertTcvn3ToUnicode(r.khoanh)
    }));

    const response = formatResponse(true, 'Khoanh list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Churung
exports.getChurung = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:churung';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT churung FROM mv_churung ORDER BY churung';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.churung,
      label: convertTcvn3ToUnicode(r.churung)
    }));

    const response = formatResponse(true, 'Churung list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get hanhchinh boundaries
exports.getHanhChinh = async (req, res, next) => {
  try {
    const { level = 'huyen' } = req.query;
    const db = req.app.locals.db;

    logger.info('Getting hanh chinh data', { level });

    const query = `
      SELECT
        huyen,
        xa,
        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
      FROM laocai_ranhgioihc
      WHERE geom IS NOT NULL
      LIMIT 1000
    `;

    const result = await db.query(query);

    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        huyen: convertTcvn3ToUnicode(row.huyen),
        xa: convertTcvn3ToUnicode(row.xa)
      }
    }));

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    res.json(formatResponse(true, 'Hanh chinh data retrieved', geoJSON));
  } catch (error) {
    next(error);
  }
};


// Get dropdown data - ChucNangRung
exports.getChucNangRung = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:chucnangrung';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT id, ten_chuc_nang as ten FROM chuc_nang_rung ORDER BY ten_chuc_nang';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Chuc nang rung list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - TrangThaiXacMinh
exports.getTrangThaiXacMinh = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:trangthaixacminh';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT id, ten_trang_thai as ten FROM trang_thai_xac_minh ORDER BY id';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Trang thai xac minh list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - NguyenNhan
exports.getNguyenNhan = async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = 'dropdown:nguyennhan';
    const cached = await redis.get(cacheKey);

    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const query = 'SELECT id, ten_nguyen_nhan as ten FROM nguyen_nhan ORDER BY ten_nguyen_nhan';
    const result = await db.query(query);

    const data = result.rows.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Nguyen nhan list retrieved', data);
    await redis.set(cacheKey, response, 86400); // Cache 24h

    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = exports;