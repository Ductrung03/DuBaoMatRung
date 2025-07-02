// server/routes/layerData.routes.js - CẬP NHẬT VỚI SERVER CACHE
const express = require("express");
const router = express.Router();
const layerDataController = require("../controllers/layerData.controller");

/**
 * @swagger
 * /layer-data/progress/{layer}:
 *   get:
 *     summary: Lấy progress real-time của layer đang tải
 *     tags:
 *       - Progress Tracking
 *     parameters:
 *       - in: path
 *         name: layer
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên layer cần track progress
 *     responses:
 *       200:
 *         description: Progress data real-time
 */
router.get("/progress/:layer", layerDataController.getProgress);

/**
 * Main layer data endpoints - với persistent cache
 */
router.get("/administrative", layerDataController.getAdministrativeBoundaries);
router.get("/forest-management", layerDataController.getForestManagement);
router.get("/terrain", layerDataController.getTerrainData);
router.get("/forest-types", layerDataController.getForestTypes);
router.get("/deforestation-alerts", layerDataController.getDeforestationAlerts);

/**
 * @swagger
 * /layer-data/server-cache/status:
 *   get:
 *     summary: Xem trạng thái server persistent cache
 *     tags:
 *       - Server Cache Management
 *     responses:
 *       200:
 *         description: Thông tin về server cache
 */
router.get("/server-cache/status", layerDataController.getServerCacheStatus);

/**
 * @swagger
 * /layer-data/server-cache/clear:
 *   post:
 *     summary: Xóa toàn bộ server persistent cache
 *     tags:
 *       - Server Cache Management
 *     responses:
 *       200:
 *         description: Server cache đã được xóa
 */
router.post("/server-cache/clear", layerDataController.clearServerCache);

/**
 * @swagger
 * /layer-data/server-cache/rebuild:
 *   post:
 *     summary: Rebuild server persistent cache
 *     tags:
 *       - Server Cache Management
 *     responses:
 *       200:
 *         description: Server cache rebuild initiated
 */
router.post("/server-cache/rebuild", layerDataController.rebuildServerCache);

/**
 * Legacy endpoints for compatibility
 */
router.get("/forest-status", layerDataController.getForestStatus);

module.exports = router;