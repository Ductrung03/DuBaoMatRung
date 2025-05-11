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
 *       - in: query
 *         name: idField
 *         schema:
 *           type: string
 *         description: Tên trường ID (mặc định là gid)
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
 * /data/{tableName}/composite:
 *   put:
 *     summary: Cập nhật giá trị của một cột sử dụng composite key
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               column:
 *                 type: string
 *               value:
 *                 type: string
 *               whereClause:
 *                 type: string
 *               compositeFields:
 *                 type: array
 *                 items:
 *                   type: string
 *               compositeValues:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.put("/:tableName/composite", dataController.updateFeatureComposite);

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
 *       - in: query
 *         name: idField
 *         schema:
 *           type: string
 *         description: Tên trường ID (mặc định là gid)
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.delete("/:tableName/:featureId", dataController.deleteFeature);

/**
 * @swagger
 * /data/{tableName}/composite:
 *   delete:
 *     summary: Xóa một bản ghi sử dụng composite key
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               whereClause:
 *                 type: string
 *               compositeFields:
 *                 type: array
 *                 items:
 *                   type: string
 *               compositeValues:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.delete("/:tableName/composite", dataController.deleteFeatureComposite);

// Thêm các route này vào data.routes.js

/**
 * @swagger
 * /data/update-with-where:
 *   post:
 *     summary: Cập nhật dữ liệu sử dụng điều kiện WHERE
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               table:
 *                 type: string
 *                 description: Tên bảng
 *               column:
 *                 type: string
 *                 description: Tên cột cần cập nhật
 *               value:
 *                 type: string
 *                 description: Giá trị mới
 *               whereClause:
 *                 type: string
 *                 description: Điều kiện WHERE
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.post("/update-with-where", dataController.updateWithWhere);

/**
 * @swagger
 * /data/delete-with-where:
 *   post:
 *     summary: Xóa dữ liệu sử dụng điều kiện WHERE
 *     tags:
 *       - Data
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               table:
 *                 type: string
 *                 description: Tên bảng
 *               whereClause:
 *                 type: string
 *                 description: Điều kiện WHERE
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy bảng hoặc bản ghi
 */
router.post("/delete-with-where", dataController.deleteWithWhere);

module.exports = router;