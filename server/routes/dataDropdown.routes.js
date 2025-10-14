const express = require("express");
const router = express.Router();
const controller = require("../controllers/dataDropdown.controller");

// Routes for dropdowns
router.get("/huyen", controller.getHuyen);
router.get("/xa", controller.getXaByHuyen);
router.get("/tieukhu", controller.getTieuKhuByXa);
router.get("/khoanh", controller.getAllKhoanh);
router.get("/churung", controller.getAllChuRung);

// NEW: Routes for additional dropdowns
router.get("/chucnangrung", controller.getChucNangRung);
router.get("/trangthaixacminh", controller.getTrangThaiXacMinh); 
router.get("/nguyennhan", controller.getNguyenNhan);

// Cache management routes
router.post("/clear-cache", controller.clearCache);
router.get("/cache-status", controller.getCacheStatus);

module.exports = router;