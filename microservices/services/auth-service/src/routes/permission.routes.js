// auth-service/src/routes/permission.routes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');
const { authenticateToken } = require('../middleware/auth');

// Web-based permission routes
/**
 * @swagger
 * /api/auth/permissions/tree:
 *   get:
 *     summary: Get permissions tree (web-based structure)
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Web-based permission tree
 */
router.get('/tree', authenticateToken, permissionController.getPermissionsTree);

/**
 * @swagger
 * /api/auth/permissions/menu:
 *   get:
 *     summary: Get menu items for current user
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: User menu items based on permissions
 */
router.get('/menu', authenticateToken, permissionController.getUserMenuItems);

/**
 * @swagger
 * /api/auth/permissions/check/{pageCode}:
 *   get:
 *     summary: Check page access permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: pageCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Access check result
 */
router.get('/check/:pageCode', authenticateToken, permissionController.checkPageAccess);

/**
 * @swagger
 * /api/auth/permissions/page/{pageCode}/actions:
 *   get:
 *     summary: Get available actions for a page
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: pageCode
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Available actions for the page
 */
router.get('/page/:pageCode/actions', authenticateToken, permissionController.getPageActions);

/**
 * @swagger
 * /api/auth/permissions/category/{category}:
 *   get:
 *     summary: Get permissions by category
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permissions in category
 */
router.get('/category/:category', authenticateToken, permissionController.getPermissionsByCategory);

/**
 * @swagger
 * /api/auth/permissions/validate:
 *   get:
 *     summary: Validate permission structure
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: Validation result
 */
router.get('/validate', authenticateToken, permissionController.validatePermissions);

// Legacy routes (keep for backward compatibility)
router.get('/page-tree', permissionController.getPagePermissionTree);
router.get('/ui-grouped', permissionController.getUIGroupedPermissions);
router.get('/modern-tree', permissionController.getModernPermissionsTree);

// Standard CRUD routes
router.get('/', permissionController.getAllPermissions);
router.get('/:id', permissionController.getPermissionById);
router.post('/', permissionController.createPermission);
router.patch('/:id', permissionController.updatePermission);
router.delete('/:id', permissionController.deletePermission);

module.exports = router;

/**
 * @swagger
 * /api/auth/permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: List of all permissions
 */
router.get('/', permissionController.getAllPermissions);

/**
 * @swagger
 * /api/auth/permissions/{id}:
 *   get:
 *     summary: Get permission by ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permission details
 */
router.get('/:id', permissionController.getPermissionById);

/**
 * @swagger
 * /api/auth/permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - subject
 *             properties:
 *               action:
 *                 type: string
 *                 example: read
 *               subject:
 *                 type: string
 *                 example: users
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Permission created successfully
 */
router.post('/', permissionController.createPermission);

/**
 * @swagger
 * /api/auth/permissions/{id}:
 *   patch:
 *     summary: Update a permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Permission updated successfully
 */
router.patch('/:id', permissionController.updatePermission);

/**
 * @swagger
 * /api/auth/permissions/{id}:
 *   delete:
 *     summary: Delete a permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Permission deleted successfully
 */
router.delete('/:id', permissionController.deletePermission);

module.exports = router;
