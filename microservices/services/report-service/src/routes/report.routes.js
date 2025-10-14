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
