// admin-service/src/controllers/admin.controller.kysely.js
// Controller using Kysely Query Builder for admin operations

const { formatResponse, convertTcvn3ToUnicode } = require('../../../../shared/utils');
const createLogger = require('../../../../shared/logger');
const AdminService = require('../services/admin.service');

const logger = createLogger('admin-controller-kysely');

// Get dropdown data - Huyen
exports.getHuyen = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getHuyen();

    const data = results.map(r => ({
      value: r.huyen,
      label: convertTcvn3ToUnicode(r.huyen)
    }));

    const response = formatResponse(true, 'Huyen list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Xa
exports.getXa = async (req, res, next) => {
  try {
    const { huyen } = req.query;
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getXa(huyen);

    const data = results.map(r => ({
      value: r.xa,
      label: convertTcvn3ToUnicode(r.xa)
    }));

    const response = formatResponse(true, 'Xa list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Tieu Khu
exports.getTieuKhu = async (req, res, next) => {
  try {
    const { huyen, xa } = req.query;
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getTieuKhu(huyen, xa);

    const data = results.map(r => ({
      value: r.tieukhu,
      label: convertTcvn3ToUnicode(r.tieukhu)
    }));

    const response = formatResponse(true, 'Tieu khu list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Khoanh
exports.getKhoanh = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getKhoanh();

    const data = results.map(r => ({
      value: r.khoanh,
      label: convertTcvn3ToUnicode(r.khoanh)
    }));

    const response = formatResponse(true, 'Khoanh list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Churung
exports.getChurung = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getChurung();

    const data = results.map(r => ({
      value: r.churung,
      label: convertTcvn3ToUnicode(r.churung)
    }));

    const response = formatResponse(true, 'Churung list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get hanhchinh boundaries
exports.getHanhChinh = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    logger.info('Getting hanh chinh data');

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getHanhChinh();

    const features = results.map(row => ({
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
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getChucNangRung();

    const data = results.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Chuc nang rung list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - TrangThaiXacMinh
exports.getTrangThaiXacMinh = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getTrangThaiXacMinh();

    const data = results.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Trang thai xac minh list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - NguyenNhan
exports.getNguyenNhan = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getNguyenNhan();

    const data = results.map(r => ({
      value: r.id,
      label: r.ten
    }));

    const response = formatResponse(true, 'Nguyen nhan list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Xa from Sơn La
exports.getSonLaXa = async (req, res, next) => {
  try {
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getSonLaXa();

    const data = results.map(r => ({
      value: r.xa,
      label: r.xa
    }));

    const response = formatResponse(true, 'Sơn La Xa list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Tieu Khu from Sơn La
exports.getSonLaTieuKhu = async (req, res, next) => {
  try {
    const { xa } = req.query;
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getSonLaTieuKhu(xa);

    const data = results.map(r => ({
      value: r.tieukhu,
      label: r.tieukhu
    }));

    const response = formatResponse(true, 'Sơn La Tieu khu list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

// Get dropdown data - Khoanh from Sơn La
exports.getSonLaKhoanh = async (req, res, next) => {
  try {
    const { xa, tieukhu } = req.query;
    const kyselyDb = req.app.locals.kyselyDb;

    const adminService = new AdminService(kyselyDb);
    const results = await adminService.getSonLaKhoanh(xa, tieukhu);

    const data = results.map(r => ({
      value: r.khoanh,
      label: r.khoanh
    }));

    const response = formatResponse(true, 'Sơn La Khoanh list retrieved', data);
    res.json(response);
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
