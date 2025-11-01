// admin-service/src/db/types.js
// Type definitions for Kysely Query Builder
// This file defines the database schema for type-safe queries

/**
 * @typedef {Object} MvHuyenTable
 * @property {string} huyen - District name
 */

/**
 * @typedef {Object} MvXaByHuyenTable
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 */

/**
 * @typedef {Object} MvTieuKhuByXaTable
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 * @property {string} tieukhu - Tieu khu name
 */

/**
 * @typedef {Object} MvKhoanhByTieuKhuTable
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 * @property {string} tieukhu - Tieu khu name
 * @property {string} khoanh - Khoanh name
 */

/**
 * @typedef {Object} MvChurungTable
 * @property {string} churung - Chu rung (forest owner)
 */

/**
 * @typedef {Object} LaoCaiRanhGioiHCTable
 * @property {number} gid - Primary key
 * @property {string} geom - PostGIS geometry (MultiPolygon)
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 */

/**
 * @typedef {Object} ChucNangRungTable
 * @property {number} id - Primary key
 * @property {string} ten_chuc_nang - Function name
 */

/**
 * @typedef {Object} TrangThaiXacMinhTable
 * @property {number} id - Primary key
 * @property {string} ten_trang_thai - Status name
 */

/**
 * @typedef {Object} NguyenNhanTable
 * @property {number} id - Primary key
 * @property {string} ten_nguyen_nhan - Cause name
 */

/**
 * @typedef {Object} AdminDatabase
 * @property {MvHuyenTable} mv_huyen
 * @property {MvXaByHuyenTable} mv_xa_by_huyen
 * @property {MvTieuKhuByXaTable} mv_tieukhu_by_xa
 * @property {MvKhoanhByTieuKhuTable} mv_khoanh_by_tieukhu
 * @property {MvChurungTable} mv_churung
 * @property {LaoCaiRanhGioiHCTable} laocai_ranhgioihc
 * @property {ChucNangRungTable} chuc_nang_rung
 * @property {TrangThaiXacMinhTable} trang_thai_xac_minh
 * @property {NguyenNhanTable} nguyen_nhan
 */

module.exports = {};
