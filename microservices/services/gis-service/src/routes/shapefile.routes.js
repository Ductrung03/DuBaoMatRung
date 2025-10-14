// gis-service/src/routes/shapefile.routes.js
const express = require('express');
const router = express.Router();
const shapefileController = require('../controllers/shapefile.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Shapefile
 *   description: Shapefile import and processing endpoints
 */

/**
 * @swagger
 * /api/import-shapefile:
 *   post:
 *     summary: Import shapefile
 *     description: Upload and import a shapefile (zip containing .shp, .shx, .dbf, .prj files)
 *     tags: [Shapefile]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - shapefile
 *             properties:
 *               shapefile:
 *                 type: string
 *                 format: binary
 *                 description: Zipped shapefile
 *     responses:
 *       200:
 *         description: Shapefile imported successfully
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
 *         description: Invalid file or import error
 */
router.post('/',
  shapefileController.uploadMiddleware,
  asyncHandler(shapefileController.importShapefile)
);

/**
 * @swagger
 * /api/import-gee-url:
 *   post:
 *     summary: Import from Google Earth Engine URL
 *     description: Import GeoJSON data from a Google Earth Engine getFeatures URL
 *     tags: [Shapefile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - zipUrl
 *             properties:
 *               zipUrl:
 *                 type: string
 *                 description: Google Earth Engine getFeatures URL
 *                 example: https://earthengine.googleapis.com/v1/projects/PROJECT_ID/assets/ASSET_ID:getFeatures
 *     responses:
 *       200:
 *         description: Data imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 recordsAdded:
 *                   type: number
 *                 recordsExisting:
 *                   type: number
 *                 totalFeatures:
 *                   type: number
 *                 geojson:
 *                   type: object
 *       400:
 *         description: Invalid URL or import error
 *       408:
 *         description: Request timeout
 */
router.post('/gee-url',
  asyncHandler(shapefileController.importFromGeeUrl)
);

module.exports = router;
