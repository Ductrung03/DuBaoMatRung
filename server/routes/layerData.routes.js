// server/routes/layerData.routes.js - Routes tối ưu với cache management
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
 *     summary: Lấy dữ liệu lớp ranh giới hành chính từ laocai_ranhgioihc (Optimized)
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON ranh giới hành chính với streaming và cache
 */
router.get("/administrative", layerDataController.getAdministrativeBoundaries);

/**
 * @swagger
 * /layer-data/forest-management:
 *   get:
 *     summary: Lấy dữ liệu lớp chủ quản lý rừng từ laocai_chuquanly (Optimized)
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON chủ quản lý rừng với streaming và cache
 */
router.get("/forest-management", layerDataController.getForestManagement);

/**
 * @swagger
 * /layer-data/terrain:
 *   get:
 *     summary: Lấy dữ liệu lớp nền địa hình từ laocai_nendiahinh và laocai_nendiahinh_line (Optimized)
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON nền địa hình với parallel loading và cache
 */
router.get("/terrain", layerDataController.getTerrainData);

/**
 * @swagger
 * /layer-data/forest-types:
 *   get:
 *     summary: Lấy dữ liệu lớp 3 loại rừng từ laocai_rg3lr (Heavily Optimized)
 *     tags:
 *       - Layer Data
 *     description: |
 *       Endpoint được tối ưu đặc biệt cho dataset lớn 200K+ records:
 *       - Streaming pagination với chunks 3000 records
 *       - Geometry simplification thông minh
 *       - Memory management
 *       - Caching 10 phút
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON 3 loại rừng với optimizations mạnh
 */
router.get("/forest-types", layerDataController.getForestTypes);

/**
 * @swagger
 * /layer-data/deforestation-alerts:
 *   get:
 *     summary: Lấy dữ liệu lớp dự báo mất rừng mới nhất từ bảng mat_rung (Optimized)
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 365
 *         description: Số ngày gần đây để lấy dữ liệu (mặc định 1 năm)
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON dự báo mất rừng với streaming và cache
 */
router.get("/deforestation-alerts", layerDataController.getDeforestationAlerts);

/**
 * @swagger
 * /layer-data/forest-status:
 *   get:
 *     summary: Lấy dữ liệu lớp hiện trạng rừng từ tlaocai_tkk_3lr_cru (Legacy endpoint - Optimized)
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON hiện trạng rừng với streaming
 */
router.get("/forest-status", layerDataController.getForestStatus);

/**
 * @swagger
 * /layer-data/cache/status:
 *   get:
 *     summary: Xem trạng thái cache của các layers
 *     tags:
 *       - Cache Management
 *     responses:
 *       200:
 *         description: Thông tin về cache hiện tại
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cache_count:
 *                   type: integer
 *                   description: Số lượng entries trong cache
 *                 cache_ttl:
 *                   type: integer
 *                   description: TTL của cache (ms)
 *                 cache_entries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       size:
 *                         type: integer
 *                       age:
 *                         type: integer
 *                       expires_in:
 *                         type: integer
 */
router.get("/cache/status", layerDataController.getCacheStatus);

/**
 * @swagger
 * /layer-data/cache/clear:
 *   post:
 *     summary: Xóa toàn bộ cache của layers
 *     tags:
 *       - Cache Management
 *     responses:
 *       200:
 *         description: Cache đã được xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post("/cache/clear", layerDataController.clearCache);

module.exports = router;