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

/**
 * @swagger
 * /api/import-geojson-url:
 *   post:
 *     summary: Import from GeoJSON URL with spatial validation
 *     description: Import GeoJSON data from a URL and validate features intersect with forest status areas (sonla_hientrangrung)
 *     tags: [Shapefile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jsonUrl
 *             properties:
 *               jsonUrl:
 *                 type: string
 *                 description: URL to GeoJSON file
 *                 example: https://example.com/data.geojson
 *     responses:
 *       200:
 *         description: Data imported successfully with spatial validation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 totalFeatures:
 *                   type: number
 *                   description: Total features in source GeoJSON
 *                 validFeatures:
 *                   type: number
 *                   description: Features that intersect with forest areas
 *                 filteredFeatures:
 *                   type: number
 *                   description: Features filtered out (no intersection)
 *                 recordsAdded:
 *                   type: number
 *                   description: Records successfully inserted
 *                 recordsError:
 *                   type: number
 *                   description: Records failed to insert
 *                 geojson:
 *                   type: object
 *       400:
 *         description: Invalid URL or GeoJSON format
 *       408:
 *         description: Request timeout
 */
router.post('/geojson-url',
  asyncHandler(shapefileController.importFromGeoJsonUrl)
);

module.exports = router;
