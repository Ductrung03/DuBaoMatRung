// server/routes/searchMatRung.routes.js
const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchMatRung.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Middleware authentication cho tất cả routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * /search/mat-rung/{gid}:
 *   get:
 *     summary: Tìm kiếm lô CB trong CSDL và load dữ liệu xung quanh
 *     tags:
 *       - Search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của lô CB cần tìm
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 5000
 *         description: Bán kính tìm kiếm xung quanh (mét)
 *     responses:
 *       200:
 *         description: Tìm thấy lô CB và dữ liệu xung quanh
 *       404:
 *         description: Không tìm thấy lô CB
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/mat-rung/:gid", searchController.searchMatRungById);

/**
 * @swagger
 * /search/mat-rung/{gid}/detail:
 *   get:
 *     summary: Lấy thông tin chi tiết một lô CB
 *     tags:
 *       - Search
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết lô CB
 *       404:
 *         description: Không tìm thấy lô CB
 */
router.get("/mat-rung/:gid/detail", searchController.getMatRungDetail);

module.exports = router;