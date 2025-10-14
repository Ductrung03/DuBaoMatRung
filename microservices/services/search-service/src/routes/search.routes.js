// search-service/src/routes/search.routes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search functionality for mat rung data
 */

/**
 * @swagger
 * /api/search/mat-rung:
 *   get:
 *     summary: Search mat rung records
 *     description: Search forest loss records by query text, district, or status
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (searches in verification notes and GID)
 *       - in: query
 *         name: huyen
 *         schema:
 *           type: string
 *         description: District name filter
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Detection status filter (e.g., "Đã xác minh")
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                     type:
 *                       type: string
 *                       example: FeatureCollection
 *                     features:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                             example: Feature
 *                           geometry:
 *                             type: object
 *                           properties:
 *                             type: object
 *                             properties:
 *                               gid:
 *                                 type: integer
 *                               area:
 *                                 type: number
 *                               detection_status:
 *                                 type: string
 *                               verification_notes:
 *                                 type: string
 *                               huyen:
 *                                 type: string
 *                               xa:
 *                                 type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/mat-rung', asyncHandler(searchController.searchMatRung));

/**
 * @swagger
 * /api/search/mat-rung/{id}:
 *   get:
 *     summary: Search mat rung by GID with surrounding features
 *     description: Find a specific forest loss record by GID and return it with surrounding features within a radius
 *     tags: [Search]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: GID of the target mat rung record (e.g., 3619)
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           default: 5000
 *         description: Search radius in meters (default 5000m = 5km)
 *     responses:
 *       200:
 *         description: Target feature and surrounding features retrieved successfully
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
 *                     target_feature:
 *                       type: object
 *                       description: The target feature being searched
 *                     geojson:
 *                       type: object
 *                       description: GeoJSON FeatureCollection with target and surrounding features
 *                       properties:
 *                         type:
 *                           type: string
 *                           example: FeatureCollection
 *                         features:
 *                           type: array
 *                     center:
 *                       type: object
 *                       properties:
 *                         lat:
 *                           type: number
 *                         lng:
 *                           type: number
 *                       description: Center coordinates of target feature
 *                     bbox:
 *                       type: array
 *                       description: Bounding box [[south, west], [north, east]]
 *                     total_features:
 *                       type: integer
 *                     radius:
 *                       type: number
 *                 cached:
 *                   type: boolean
 *       404:
 *         description: Target feature not found
 *       400:
 *         description: Invalid GID parameter
 */
router.get('/mat-rung/:id', asyncHandler(searchController.searchMatRungById));

module.exports = router;
