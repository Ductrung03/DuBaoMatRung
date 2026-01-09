// report-service/src/routes/report.routes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report generation and statistics endpoints
 */

/**
 * @swagger
 * /api/reports/pdf:
 *   post:
 *     summary: Generate PDF report
 *     description: Generate a PDF report for forest loss data
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Báo Cáo Mất Rừng Tháng 10/2024"
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: FeatureCollection
 *                   features:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request data
 */
router.post('/pdf', asyncHandler(reportController.generatePDF));

/**
 * @swagger
 * /api/reports/docx:
 *   post:
 *     summary: Generate DOCX report
 *     description: Generate a DOCX (Word) report for forest loss data
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Báo Cáo Mất Rừng Tháng 10/2024"
 *               data:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     example: FeatureCollection
 *                   features:
 *                     type: array
 *                     items:
 *                       type: object
 *     responses:
 *       200:
 *         description: DOCX generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request data
 */
router.post('/docx', asyncHandler(reportController.generateDOCX));

/**
 * @swagger
 * /api/bao-cao/export-docx:
 *   get:
 *     summary: Export DOCX report
 *     description: Generate and download a DOCX report for forest loss data
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
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
 *         name: xacMinh
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Whether to include verified data only
 *     responses:
 *       200:
 *         description: DOCX report generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.wordprocessingml.document:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request parameters
 */
router.get('/export-docx', asyncHandler(reportController.exportDOCX));

/**
 * @swagger
 * /api/bao-cao/export-pdf:
 *   get:
 *     summary: Export PDF report
 *     description: Generate and display a PDF report for forest loss data
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
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
 *         name: xacMinh
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Whether to include verified data only
 *     responses:
 *       200:
 *         description: PDF report generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid request parameters
 */
router.get('/export-pdf', asyncHandler(reportController.exportPDF));

/**
 * @swagger
 * /api/bao-cao/export-geojson:
 *   get:
 *     summary: Export GeoJSON file
 *     description: Generate and download a GeoJSON file for forest loss data
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for report
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for report
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
 *         name: xacMinh
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Whether to include verified data only
 *     responses:
 *       200:
 *         description: GeoJSON file generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   example: FeatureCollection
 *                 features:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid request parameters
 */
router.get('/export-geojson', asyncHandler(reportController.exportGeoJSON));

/**
 * @swagger
 * /api/reports/stats:
 *   get:
 *     summary: Get report statistics
 *     description: Retrieve statistical information for mat rung data
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
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
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_count:
 *                       type: integer
 *                       description: Total number of records
 *                     total_area:
 *                       type: number
 *                       description: Total area in square meters
 *                     total_area_ha:
 *                       type: number
 *                       description: Total area in hectares
 *                     avg_area:
 *                       type: number
 *                       description: Average area in square meters
 *                     avg_area_ha:
 *                       type: number
 *                       description: Average area in hectares
 *                     verified_count:
 *                       type: integer
 *                       description: Number of verified records
 *                     district_count:
 *                       type: integer
 *                       description: Number of unique districts
 */
router.get('/stats', asyncHandler(reportController.getStats));

module.exports = router;
