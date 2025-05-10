const express = require("express");
const router = express.Router();
const dataController = require("../controllers/data.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Tất cả các route đều yêu cầu xác thực và quyền admin
router.use(authMiddleware.authenticate, authMiddleware.isAdmin);

/**
 * @swagger
 * /data/tables:
 *   get:
 *     summary: Lấy danh sách tất cả các bảng
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách bảng
 *       403:
 *         description: Không có quyền truy cập
 */
router.get("/tables", dataController.getTables);

/**
 * @swagger
 * /data/tables/{tableName}/structure:
 *   get:
 *     summary: Lấy cấu trúc của bảng
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cấu trúc bảng
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng
 */
router.get("/tables/:tableName/structure", dataController.getTableStructure);

/**
 * @swagger
 * /data/{tableName}/{featureId}/{columnName}:
 *   put:
 *     summary: Cập nhật giá trị của một cột trong một bản ghi
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: columnName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.put("/:tableName/:featureId/:columnName", dataController.updateFeature);

/**
 * @swagger
 * /data/{tableName}/{featureId}:
 *   delete:
 *     summary: Xóa một bản ghi từ bảng
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tableName
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: featureId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.delete("/:tableName/:featureId", dataController.deleteFeature);

module.exports = router;