// auth-service/src/routes/internal.routes.js
const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internal.controller');
const { verifyInternalApiKey } = require('../middleware/internalAuth.middleware');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * Internal API routes for service-to-service communication
 * All routes in this router are protected by verifyInternalApiKey middleware
 */

// Apply internal API key verification to all routes
router.use(verifyInternalApiKey);

/**
 * GET /api/auth/internal/user-info
 * Get user information by user IDs (batch request)
 */
router.get('/user-info', asyncHandler(internalController.getUserInfo));

/**
 * GET /api/auth/internal/users/:userId/permissions
 * Get all permissions for a user (for gateway RBAC check)
 */
router.get('/users/:userId/permissions', asyncHandler(internalController.getUserPermissions));

/**
 * GET /api/auth/internal/users/:userId/roles
 * Get all roles for a user
 */
router.get('/users/:userId/roles', asyncHandler(internalController.getUserRoles));

module.exports = router;
