/**
 * Routes cho phân quyền theo trang và chức năng
 */

const express = require('express');
const router = express.Router();
const {
  getMyPageAccess,
  getAllPagesAndFeatures,
  checkPageAccess,
  checkFeatureAccess
} = require('../controllers/pagePermissionController');
const { authenticateToken } = require('../middleware/auth');

// Lấy thông tin phân quyền của user hiện tại
router.get('/my-access', authenticateToken, getMyPageAccess);

// Lấy tất cả trang và chức năng (dành cho admin)
router.get('/all-pages-features', authenticateToken, getAllPagesAndFeatures);

// Kiểm tra quyền truy cập trang
router.get('/check-page/:pageKey', authenticateToken, checkPageAccess);

// Kiểm tra quyền truy cập chức năng
router.get('/check-feature/:featureCode', authenticateToken, checkFeatureAccess);

module.exports = router;
