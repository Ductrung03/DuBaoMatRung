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
 *
 * Query params:
 *   - ids: comma-separated list of user IDs (e.g., "1,5,23")
 *
 * Headers:
 *   - X-Internal-Api-Key: Required internal API key for authentication
 *   - X-Service-Name: Optional service identifier for logging
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "1": { "id": 1, "fullName": "...", "organization": "..." },
 *       "5": { "id": 5, "fullName": "...", "organization": "..." },
 *       "23": null  // User not found
 *     }
 *   }
 */
router.get('/user-info', asyncHandler(internalController.getUserInfo));

module.exports = router;
