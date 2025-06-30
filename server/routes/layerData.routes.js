// server/routes/layerData.routes.js - Routes gọn gàng sau khi tách controller
const express = require("express");
const router = express.Router();
const layerDataController = require("../controllers/layerData.controller");

/**
 * @swagger
 * /layer-data/info:
 *   get:
 *     summary: Lấy thông tin tổng quan về các lớp dữ liệu
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Thông tin metadata của các bảng
 */
router.get("/info", layerDataController.getLayerInfo);

/**
 * @swagger
 * /layer-data/administrative:
 *   get:
 *     summary: Lấy dữ liệu lớp ranh giới hành chính từ laocai_ranhgioihc
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Số lượng records tối đa
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON ranh giới hành chính
 */
router.get("/administrative", layerDataController.getAdministrativeBoundaries);

/**
 * @swagger
 * /layer-data/forest-management:
 *   get:
 *     summary: Lấy dữ liệu lớp chủ quản lý rừng từ laocai_chuquanly
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON chủ quản lý rừng
 */
router.get("/forest-management", layerDataController.getForestManagement);

/**
 * @swagger
 * /layer-data/terrain:
 *   get:
 *     summary: Lấy dữ liệu lớp nền địa hình từ laocai_nendiahinh và laocai_nendiahinh_line
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON nền địa hình (polygon + line)
 */
router.get("/terrain", layerDataController.getTerrainData);

/**
 * @swagger
 * /layer-data/forest-types:
 *   get:
 *     summary: Lấy dữ liệu lớp 3 loại rừng từ laocai_rg3lr
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Số lượng records tối đa
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON 3 loại rừng
 */
router.get("/forest-types", layerDataController.getForestTypes);

/**
 * @swagger
 * /layer-data/forest-status:
 *   get:
 *     summary: Lấy dữ liệu lớp hiện trạng rừng từ tlaocai_tkk_3lr_cru
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Số lượng records tối đa
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON hiện trạng rừng
 */
router.get("/forest-status", layerDataController.getForestStatus);

/**
 * @swagger
 * /layer-data/deforestation-alerts:
 *   get:
 *     summary: Lấy dữ liệu lớp dự báo mất rừng mới nhất
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Số ngày gần đây
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON dự báo mất rừng mới nhất
 */
router.get("/deforestation-alerts", layerDataController.getDeforestationAlerts);

module.exports = router;