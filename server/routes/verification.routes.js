// server/routes/searchMatRung.routes.js - FIXED VERSION
const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchMatRung.controller");
const authMiddleware = require("../middleware/auth.middleware");

// ✅ Middleware để bắt lỗi async
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ✅ Log middleware để debug
router.use((req, res, next) => {
  console.log(`🔍 Search API: ${req.method} ${req.url}`);
  console.log(`🔑 Authorization: ${req.headers.authorization ? 'Có token' : 'Không có token'}`);
  next();
});

// ✅ Authentication middleware cho tất cả routes
router.use(authMiddleware.authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             target_feature:
 *               type: object
 *               description: Feature chính được tìm kiếm
 *             geojson:
 *               type: object
 *               description: GeoJSON chứa target và surrounding features
 *             center:
 *               type: array
 *               items:
 *                 type: number
 *               description: Tọa độ trung tâm [longitude, latitude]
 *             bbox:
 *               type: array
 *               items:
 *                 type: number
 *               description: Bounding box [west, south, east, north]
 *             total_features:
 *               type: integer
 *             surrounding_count:
 *               type: integer
 *             search_radius_meters:
 *               type: integer
 *             target_gid:
 *               type: integer
 */

/**
 * @swagger
 * /search/mat-rung/{gid}:
 *   get:
 *     summary: Tìm kiếm lô CB trong CSDL và load dữ liệu xung quanh
 *     description: |
 *       Tìm kiếm một lô CB theo GID và lấy các lô CB xung quanh trong bán kính cho trước.
 *       Kết quả bao gồm GeoJSON data để hiển thị trên bản đồ và thông tin để zoom.
 *     tags:
 *       - Search Mat Rung
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4899
 *         description: ID của lô CB cần tìm (VD CB-4899 thì gid=4899)
 *       - in: query
 *         name: radius
 *         schema:
 *           type: integer
 *           default: 5000
 *           minimum: 1000
 *           maximum: 50000
 *         description: Bán kính tìm kiếm xung quanh (mét)
 *         example: 5000
 *     responses:
 *       200:
 *         description: Tìm thấy lô CB và dữ liệu xung quanh thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *       400:
 *         description: Thiếu hoặc không hợp lệ GID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Vui lòng cung cấp mã lô CB (gid)"
 *       404:
 *         description: Không tìm thấy lô CB với GID đã cho
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Không tìm thấy lô CB-4899 trong cơ sở dữ liệu"
 *       401:
 *         description: Không có quyền truy cập (token invalid)
 *       500:
 *         description: Lỗi server
 */
router.get("/mat-rung/:gid", asyncHandler(searchController.searchMatRungById));

/**
 * @swagger
 * /search/mat-rung/{gid}/detail:
 *   get:
 *     summary: Lấy thông tin chi tiết một lô CB
 *     description: |
 *       Lấy thông tin chi tiết đầy đủ của một lô CB bao gồm:
 *       - Thông tin cơ bản (diện tích, thời gian, mã huyện)
 *       - Thông tin hành chính (huyện, xã, tiểu khu, khoảnh)
 *       - Trạng thái và thông tin xác minh
 *       - Tọa độ centroid
 *     tags:
 *       - Search Mat Rung
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *           example: 4899
 *         description: ID của lô CB cần lấy chi tiết
 *     responses:
 *       200:
 *         description: Lấy chi tiết thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     gid:
 *                       type: integer
 *                       example: 4899
 *                     area:
 *                       type: number
 *                       description: Diện tích tính bằng m²
 *                       example: 15000
 *                     area_ha:
 *                       type: string
 *                       description: Diện tích tính bằng hectare
 *                       example: "1.50"
 *                     start_dau:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-15"
 *                     end_sau:
 *                       type: string
 *                       format: date
 *                       example: "2024-01-20"
 *                     detection_status:
 *                       type: string
 *                       example: "Chưa xác minh"
 *                     huyen:
 *                       type: string
 *                       example: "Bát Xát"
 *                     xa:
 *                       type: string
 *                       example: "Y Tý"
 *                     x_coordinate:
 *                       type: number
 *                       example: 103.45678
 *                     y_coordinate:
 *                       type: number
 *                       example: 22.12345
 *       400:
 *         description: Thiếu GID
 *       404:
 *         description: Không tìm thấy lô CB
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get("/mat-rung/:gid/detail", asyncHandler(searchController.getMatRungDetail));

// ✅ Error handling middleware
router.use((err, req, res, next) => {
  console.error("❌ Lỗi trong search routes:", err);
  
  // Log chi tiết hơn cho debugging
  console.error("Stack trace:", err.stack);
  console.error("Request info:", {
    method: req.method,
    url: req.url,
    params: req.params,
    query: req.query,
    user: req.user?.username || 'anonymous'
  });
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' 
      ? `Lỗi server trong tìm kiếm: ${err.message}`
      : "Lỗi server trong tìm kiếm",
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack.split('\n').slice(0, 5) // Chỉ lấy 5 dòng đầu của stack trace
    } : undefined,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;