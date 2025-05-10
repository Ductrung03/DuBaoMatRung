const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Middleware để bắt lỗi async
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Log middleware để debug
router.use((req, res, next) => {
  console.log(`📝 Users API: ${req.method} ${req.url}`);
  console.log(`🔑 Authorization Header: ${req.headers.authorization ? 'Có' : 'Không có'}`);
  next();
});

// Tất cả các route đều yêu cầu xác thực và quyền admin
router.use(authMiddleware.authenticate, authMiddleware.isAdmin);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lấy danh sách tất cả người dùng
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách người dùng
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/", asyncHandler(userController.getAllUsers));

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Tạo người dùng mới
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
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
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo người dùng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền truy cập
 */
router.post("/", asyncHandler(userController.createUser));

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Cập nhật thông tin người dùng
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               full_name:
 *                 type: string
 *               role:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.put("/:id", asyncHandler(userController.updateUser));

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Vô hiệu hóa người dùng
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vô hiệu hóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.delete("/:id", asyncHandler(userController.deleteUser));

/**
 * @swagger
 * /users/{id}/activate:
 *   put:
 *     summary: Kích hoạt lại người dùng
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Kích hoạt thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.put("/:id/activate", asyncHandler(userController.activateUser));

/**
 * @swagger
 * /users/{id}/change-password:
 *   put:
 *     summary: Đổi mật khẩu người dùng
 *     tags:
 *       - Users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu cũ không đúng
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.put("/:id/change-password", asyncHandler(userController.changePassword));

// Error handling middleware
router.use((err, req, res, next) => {
  console.error("❌ Lỗi trong user routes:", err);
  res.status(500).json({
    success: false,
    message: "Lỗi server trong quản lý người dùng",
    error: err.message
  });
});

module.exports = router;