// user-service/src/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a paginated list of all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users retrieved
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       username:
 *                         type: string
 *                       full_name:
 *                         type: string
 *                       position:
 *                         type: string
 *                       organization:
 *                         type: string
 *                       permission_level:
 *                         type: string
 *                       district_id:
 *                         type: integer
 *                       is_active:
 *                         type: boolean
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       last_login:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
router.get('/', asyncHandler(userController.getAllUsers));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a single user by their ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     full_name:
 *                       type: string
 *                     position:
 *                       type: string
 *                     organization:
 *                       type: string
 *                     permission_level:
 *                       type: string
 *                     district_id:
 *                       type: integer
 *                     is_active:
 *                       type: boolean
 *       404:
 *         description: User not found
 */
router.get('/:id', asyncHandler(userController.getUserById));

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     description: Create a new user account
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - full_name
 *             properties:
 *               username:
 *                 type: string
 *                 example: newuser
 *               password:
 *                 type: string
 *                 example: password123
 *               full_name:
 *                 type: string
 *                 example: Nguyen Van A
 *               position:
 *                 type: string
 *                 example: Staff
 *               organization:
 *                 type: string
 *                 example: Department A
 *               permission_level:
 *                 type: string
 *                 enum: [admin, manager, user]
 *                 example: user
 *               district_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 */
router.post('/', asyncHandler(userController.createUser));

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user information (password cannot be updated via this endpoint)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               position:
 *                 type: string
 *               organization:
 *                 type: string
 *               permission_level:
 *                 type: string
 *               district_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       400:
 *         description: Validation error
 */
router.put('/:id', asyncHandler(userController.updateUser));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Soft delete a user (sets is_active to false)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', asyncHandler(userController.deleteUser));

module.exports = router;
