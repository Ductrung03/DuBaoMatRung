// gis-service/src/routes/layer.routes.js
const express = require('express');
const router = express.Router();
const layerController = require('../controllers/layer.controller');
const { asyncHandler } = require('../../../../shared/errors');
router.use(require('../../../../shared/current-access').currentAccess);
router.use((req,res,next)=>{
  const name=req.path.split('/').filter(Boolean).at(-1)||req.query.layer;
  const allowed=['bounds','hientrangrung','ranhgioixa','tieukukhoanh','matrung','deforestation-alerts','forest-status','commune-boundaries','sub-compartments','sonla_hientrangrung','sonla_hientrangrung_new','sonla_rgx','sonla_tkkl','son_la_mat_rung'];
  if(name&&!allowed.includes(name))return res.status(400).json({success:false,message:'Lớp dữ liệu không hợp lệ'});
  next();
});

/**
 * @swagger
 * tags:
 *   name: Layers
 *   description: GIS layer data endpoints
 */

/**
 * @swagger
 * /api/layer-data/bounds/{layer}:
 *   get:
 *     summary: Get layer bounds
 *     description: Retrieve the geographic bounds of a layer
 *     tags: [Layers]
 *     parameters:
 *       - in: path
 *         name: layer
 *         required: true
 *         schema:
 *           type: string
 *         description: Layer name
 *     responses:
 *       200:
 *         description: Layer bounds retrieved successfully
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
 *                     bounds:
 *                       type: array
 *                       items:
 *                         type: number
 *       404:
 *         description: Layer not found
 */
router.get('/bounds/:layer', asyncHandler(layerController.getLayerBounds));

/**
 * @swagger
 * /api/layer-data:
 *   get:
 *     summary: Get layer data (legacy)
 *     description: Retrieve layer data using query parameter
 *     tags: [Layers]
 *     parameters:
 *       - in: query
 *         name: layer
 *         required: true
 *         schema:
 *           type: string
 *         description: Layer name
 *     responses:
 *       200:
 *         description: Layer data retrieved successfully
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
 *                     type:
 *                       type: string
 *                       example: FeatureCollection
 *                     features:
 *                       type: array
 *       400:
 *         description: Layer name required
 */
router.get('/', asyncHandler(layerController.getLayerData));

/**
 * @swagger
 * /api/layer-data/{layerName}:
 *   get:
 *     summary: Get layer data by path
 *     description: Retrieve layer data using path parameter
 *     tags: [Layers]
 *     parameters:
 *       - in: path
 *         name: layerName
 *         required: true
 *         schema:
 *           type: string
 *         description: Layer name
 *     responses:
 *       200:
 *         description: Layer data retrieved successfully
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
 *                     type:
 *                       type: string
 *                       example: FeatureCollection
 *                     features:
 *                       type: array
 *       404:
 *         description: Layer not found
 */
router.get('/:layerName', asyncHandler(layerController.getLayerDataByPath));

module.exports = router;
