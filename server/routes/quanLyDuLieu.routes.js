const express = require("express");
const router = express.Router();
const controller = require("../controllers/quanLyDuLieu.controller");

// ✅ Route chính cho tra cứu dữ liệu
router.get("/tra-cuu-du-lieu-bao-mat-rung", controller.traCuuDuLieuBaoMatRung);

// ✅ THÊM: Route test spatial intersection
router.get("/test-spatial-intersection", controller.testSpatialIntersection);

module.exports = router;