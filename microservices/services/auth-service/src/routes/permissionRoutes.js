import express from 'express';
import {
  getPermissionsTree,
  getPermissionsByCategory,
  getUserMenuItems,
  checkPageAccess,
  getPageActions,
  validatePermissions
} from '../controllers/permissionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes cần authentication
router.use(authenticateToken);

// Lấy permissions tree (cho admin)
router.get('/tree', getPermissionsTree);

// Lấy permissions theo category
router.get('/category/:category', getPermissionsByCategory);

// Lấy menu items cho user hiện tại
router.get('/menu', getUserMenuItems);

// Kiểm tra quyền truy cập trang
router.get('/check/:pageCode', checkPageAccess);

// Lấy actions có thể thực hiện trong một trang
router.get('/page/:pageCode/actions', getPageActions);

// Validate permission structure (admin only)
router.get('/validate', validatePermissions);

export default router;
