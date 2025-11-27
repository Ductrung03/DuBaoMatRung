// gis-service/src/db/types.js
// Type definitions for Kysely Query Builder
// This file defines the database schema for type-safe queries

/**
 * @typedef {Object} MatRungTable
 * @property {number} gid - Primary key
 * @property {string} geom - PostGIS geometry (MultiPolygon)
 * @property {string} start_sau - Start date (after)
 * @property {number} area - Area in square meters
 * @property {string} start_dau - Start date (before)
 * @property {string} end_sau - End date (after)
 * @property {string} mahuyen - District code
 * @property {string} end_dau - End date (before)
 * @property {string} detection_status - Detection status
 * @property {string} detection_date - Detection date
 * @property {number|null} verified_by - User ID who verified (from auth_db)
 * @property {number|null} verified_area - Verified area
 * @property {string|null} verification_reason - Reason for verification
 * @property {string|null} verification_notes - Verification notes
 */

/**
 * @typedef {Object} LaoCaiRg3lrTable
 * @property {number} gid - Primary key
 * @property {string} geom - PostGIS geometry (MultiPolygon)
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 * @property {string} tk - Tieu khu (sub-district)
 * @property {string} khoanh - Khoanh (plot)
 * @property {string} churung - Chu rung (forest owner)
 */

/**
 * @typedef {Object} LaoCaiRanhGioiHCTable
 * @property {number} gid - Primary key
 * @property {string} geom - PostGIS geometry (MultiPolygon)
 * @property {string} huyen - District name
 * @property {string} xa - Commune name
 * @property {string} tieukhu - Tieu khu
 * @property {string} khoanh - Khoanh
 */

/**
 * @typedef {Object} GisDatabase
 * @property {MatRungTable} son_la_mat_rung
 * @property {LaoCaiRg3lrTable} laocai_rg3lr
 * @property {LaoCaiRanhGioiHCTable} laocai_ranhgioihc
 */

module.exports = {};
