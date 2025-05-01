const express = require("express");
const router = express.Router();
const controller = require("../controllers/dataDropdown.controller");

/**
 * @swagger
 * /dropdown/huyen:
 *   get:
 *     summary: Lấy danh sách huyện
 *     responses:
 *       200:
 *         description: Danh sách huyện duy nhất
 */
router.get("/huyen", controller.getHuyen);

/**
 * @swagger
 * /dropdown/xa:
 *   get:
 *     summary: Lấy danh sách xã theo huyện
 *     parameters:
 *       - in: query
 *         name: huyen
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên huyện
 *     responses:
 *       200:
 *         description: Danh sách xã thuộc huyện
 */
router.get("/xa", controller.getXaByHuyen);

/**
 * @swagger
 * /dropdown/tieukhu:
 *   get:
 *     summary: Lấy danh sách tiểu khu theo xã
 *     parameters:
 *       - in: query
 *         name: xa
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên xã
 *     responses:
 *       200:
 *         description: Danh sách tiểu khu
 */
router.get("/tieukhu", controller.getTieuKhuByXa);

/**
 * @swagger
 * /dropdown/khoanh:
 *   get:
 *     summary: Lấy danh sách khoảnh (toàn bộ)
 *     responses:
 *       200:
 *         description: Danh sách khoảnh
 */
router.get("/khoanh", controller.getAllKhoanh);

/**
 * @swagger
 * /dropdown/churung:
 *   get:
 *     summary: Lấy danh sách chủ rừng (toàn bộ)
 *     responses:
 *       200:
 *         description: Danh sách chủ rừng
 */
router.get("/churung", controller.getAllChuRung);

module.exports = router;
