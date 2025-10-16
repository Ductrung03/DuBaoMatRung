// auth-service/src/routes/permission.routes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.controller');

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
