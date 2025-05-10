const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Middleware để bắt lỗi async
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập và lấy token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token
 *       401:
 *         description: Thông tin đăng nhập không đúng
 */
router.post("/login", asyncHandler(authController.login));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Lấy thông tin người dùng hiện tại
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về thông tin người dùng
 *       401:
 *         description: Không có quyền truy cập
 */
router.get("/me", authMiddleware.authenticate, asyncHandler(authController.getCurrentUser));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post("/logout", authController.logout);

// Error handler middleware
router.use((err, req, res, next) => {
  console.error("❌ Lỗi trong auth routes:", err);
  res.status(500).json({
    success: false,
    message: "Lỗi server trong quá trình xác thực",
    error: err.message
  });
});

module.exports = router;