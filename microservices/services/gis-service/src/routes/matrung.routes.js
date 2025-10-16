// gis-service/src/routes/matrung.routes.js
const express = require('express');
const router = express.Router();
// Use Kysely-based controller for better query building
const matRungController = require('../controllers/matrung.controller.kysely');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Mat Rung
 *   description: Forest loss detection and management endpoints
 */

/**
 * @swagger
 * /api/mat-rung:
 *   get:
 *     summary: Get mat rung data with filters
 *     description: Retrieve forest loss data with optional filtering. If no filters provided, returns last 3 months of data
 *     tags: [Mat Rung]
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: huyen
 *         schema:
 *           type: string
 *         description: District name
 *       - in: query
 *         name: xa
 *         schema:
 *           type: string
 *         description: Commune name
 *       - in: query
 *         name: tk
 *         schema:
 *           type: string
 *         description: Sub-compartment (Tieu khu)
 *       - in: query
 *         name: khoanh
 *         schema:
 *           type: string
 *         description: Compartment (Khoanh)
 *       - in: query
 *         name: churung
 *         schema:
 *           type: string
 *         description: Forest owner
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Forest loss data retrieved successfully
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
 *       400:
 *         description: Validation error
 */
router.get('/', asyncHandler(matRungController.getMatRung));

/**
 * @swagger
 * /api/mat-rung/all:
 *   get:
 *     summary: Get all mat rung data
 *     description: Retrieve all forest loss data within a time period
 *     tags: [Mat Rung]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Maximum number of results
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *           default: 3
 *         description: Number of months to retrieve data for
 *     responses:
 *       200:
 *         description: All mat rung data retrieved successfully
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
 *                 total:
 *                   type: integer
 *                 cached:
 *                   type: boolean
 */
router.get('/all', asyncHandler(matRungController.getAllMatRung));

/**
 * @swagger
 * /api/mat-rung/stats:
 *   get:
 *     summary: Get mat rung statistics
 *     description: Retrieve statistical information about forest loss data
 *     tags: [Mat Rung]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_records:
 *                       type: integer
 *                     records_with_geometry:
 *                       type: integer
 *                     records_with_spatial_data:
 *                       type: integer
 *                     recent_3_months:
 *                       type: integer
 *                     recent_12_months:
 *                       type: integer
 *                     earliest_date:
 *                       type: string
 *                     latest_date:
 *                       type: string
 *                     total_area:
 *                       type: number
 *                     total_area_ha:
 *                       type: number
 *                     unique_districts:
 *                       type: integer
 *                     verified_records:
 *                       type: integer
 *                     spatial_intersection_rate:
 *                       type: string
 *                     verification_rate:
 *                       type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/stats', asyncHandler(matRungController.getStats));

/**
 * @swagger
 * /api/mat-rung/forecast-preview:
 *   post:
 *     summary: Get forecast preview statistics
 *     description: Get preview statistics for a forecast period without loading full data
 *     tags: [Mat Rung]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - month
 *               - period
 *               - fromDate
 *               - toDate
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2024
 *               month:
 *                 type: integer
 *                 example: 10
 *               period:
 *                 type: string
 *                 example: "Cuối"
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-31"
 *     responses:
 *       200:
 *         description: Preview statistics retrieved successfully
 */
router.post('/forecast-preview', asyncHandler(matRungController.forecastPreview));

/**
 * @swagger
 * /api/mat-rung/auto-forecast:
 *   post:
 *     summary: Auto forecast mat rung
 *     description: Generate automatic forecast for forest loss based on time period
 *     tags: [Mat Rung]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - year
 *               - month
 *               - period
 *               - fromDate
 *               - toDate
 *             properties:
 *               year:
 *                 type: integer
 *                 example: 2024
 *               month:
 *                 type: integer
 *                 example: 10
 *               period:
 *                 type: string
 *                 example: "Cuối"
 *                 description: Period type (Đầu, Giữa, Cuối)
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-10-31"
 *     responses:
 *       200:
 *         description: Forecast generated successfully
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
 *                 summary:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: string
 *                     total_features:
 *                       type: integer
 *                     total_area_ha:
 *                       type: number
 *                     date_range:
 *                       type: string
 *                     query_time:
 *                       type: string
 *       400:
 *         description: Missing required parameters
 */
router.post('/auto-forecast', asyncHandler(matRungController.autoForecast));

module.exports = router;
