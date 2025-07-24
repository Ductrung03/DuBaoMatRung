// server/routes/verification.routes.js - Route cho xác minh
const express = require("express");
const router = express.Router();
const verificationController = require("../controllers/verification.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Middleware authentication cho tất cả routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * /verification/mat-rung/{gid}/verify:
 *   post:
 *     summary: Xác minh lô CB với logic mới
 *     tags:
 *       - Verification
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verification_reason:
 *                 type: string
 *                 required: true
 *               verified_area:
 *                 type: number
 *                 nullable: true
 *                 description: "null = giữ nguyên diện tích gốc"
 *               verification_notes:
 *                 type: string
 *                 nullable: true
 *               detection_date:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 description: "null = sử dụng ngày hiện tại"
 *     responses:
 *       200:
 *         description: Xác minh thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy lô CB
 */
router.post("/mat-rung/:gid/verify", verificationController.verifyMatRung);

/**
 * @swagger
 * /verification/mat-rung/{gid}/history:
 *   get:
 *     summary: Lấy lịch sử xác minh của lô CB
 *     tags:
 *       - Verification
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
 *         description: Lịch sử xác minh
 *       404:
 *         description: Không tìm thấy lô CB
 */
router.get("/mat-rung/:gid/history", verificationController.getVerificationHistory);

module.exports = router;

// ===============================================
// Thêm vào server/server.js (trong phần routes):
// ===============================================

// const searchRoutes = require("./routes/searchMatRung.routes");
// const verificationRoutes = require("./routes/verification.routes");

// app.use("/api/search", searchRoutes);
// app.use("/api/verification", verificationRoutes);