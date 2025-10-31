// auth-service/src/routes/permission.routes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { authenticateToken } = require('../middleware/auth');

// Feature-based permission routes (specific routes first)
router.get('/feature-tree', authenticateToken, permissionController.getFeaturePermissionsTree);
router.get('/my-access', authenticateToken, permissionController.getMyAccessibleFeatures);
router.get('/role-management-tree', authenticateToken, permissionController.getRoleManagementTree);

// Web-based permission routes
router.get('/tree', authenticateToken, permissionController.getPermissionsTree);
router.get('/menu', authenticateToken, permissionController.getUserMenuItems);
router.get('/check/:pageCode', authenticateToken, permissionController.checkPageAccess);
router.get('/page/:pageCode/actions', authenticateToken, permissionController.getPageActions);
router.get('/category/:category', authenticateToken, permissionController.getPermissionsByCategory);
router.get('/validate', authenticateToken, permissionController.validatePermissions);

// Legacy routes (keep for backward compatibility)
router.get('/page-tree', authenticateToken, permissionController.getPagePermissionTree);
router.get('/ui-grouped', authenticateToken, permissionController.getUIGroupedPermissions);
router.get('/modern-tree', authenticateToken, permissionController.getModernPermissionsTree);

// Standard CRUD routes (generic routes last)
router.get('/', authenticateToken, permissionController.getAllPermissions);
router.post('/', authenticateToken, permissionController.createPermission);
router.get('/:id', authenticateToken, permissionController.getPermissionById);
router.patch('/:id', authenticateToken, permissionController.updatePermission);
router.delete('/:id', authenticateToken, permissionController.deletePermission);

module.exports = router;
