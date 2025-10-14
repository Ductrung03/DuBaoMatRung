// admin-service/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative data and dropdown endpoints
 */

/**
 * @swagger
 * /api/admin/dropdown/huyen:
 *   get:
 *     summary: Get district list (Huyện)
 *     description: Retrieve list of districts for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: District list retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/dropdown/huyen', asyncHandler(adminController.getHuyen));

/**
 * @swagger
 * /api/admin/dropdown/xa:
 *   get:
 *     summary: Get commune list (Xã)
 *     description: Retrieve list of communes for dropdown, optionally filtered by district
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: huyen
 *         schema:
 *           type: string
 *         description: District name to filter communes
 *     responses:
 *       200:
 *         description: Commune list retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/dropdown/xa', asyncHandler(adminController.getXa));

/**
 * @swagger
 * /api/admin/dropdown/tieukhu:
 *   get:
 *     summary: Get sub-compartment list (Tiểu khu)
 *     description: Retrieve list of sub-compartments for dropdown, optionally filtered by district and commune
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: huyen
 *         schema:
 *           type: string
 *         description: District name to filter
 *       - in: query
 *         name: xa
 *         schema:
 *           type: string
 *         description: Commune name to filter
 *     responses:
 *       200:
 *         description: Sub-compartment list retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/dropdown/tieukhu', asyncHandler(adminController.getTieuKhu));

/**
 * @swagger
 * /api/admin/dropdown/khoanh:
 *   get:
 *     summary: Get compartment list (Khoảnh)
 *     description: Retrieve list of compartments for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Compartment list retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/dropdown/khoanh', asyncHandler(adminController.getKhoanh));

/**
 * @swagger
 * /api/admin/dropdown/churung:
 *   get:
 *     summary: Get forest owner list (Chủ rừng)
 *     description: Retrieve list of forest owners for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Forest owner list retrieved successfully
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
 *                 cached:
 *                   type: boolean
 */
router.get('/dropdown/churung', asyncHandler(adminController.getChurung));

/**
 * @swagger
 * /api/admin/dropdown/chucnangrung:
 *   get:
 *     summary: Get forest function list (Chức năng rừng)
 *     description: Retrieve list of forest functions for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Forest function list retrieved successfully
 */
router.get('/dropdown/chucnangrung', asyncHandler(adminController.getChucNangRung));

/**
 * @swagger
 * /api/admin/dropdown/trangthaixacminh:
 *   get:
 *     summary: Get verification status list (Trạng thái xác minh)
 *     description: Retrieve list of verification statuses for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Verification status list retrieved successfully
 */
router.get('/dropdown/trangthaixacminh', asyncHandler(adminController.getTrangThaiXacMinh));

/**
 * @swagger
 * /api/admin/dropdown/nguyennhan:
 *   get:
 *     summary: Get cause list (Nguyên nhân)
 *     description: Retrieve list of causes for dropdown
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Cause list retrieved successfully
 */
router.get('/dropdown/nguyennhan', asyncHandler(adminController.getNguyenNhan));

/**
 * @swagger
 * /api/admin/hanhchinh:
 *   get:
 *     summary: Get administrative boundaries (Hành chính)
 *     description: Retrieve administrative boundary GeoJSON data
 *     tags: [Admin]
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           default: huyen
 *         description: Administrative level (huyen or xa)
 *     responses:
 *       200:
 *         description: Administrative boundaries retrieved successfully
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
 */
router.get('/hanhchinh', asyncHandler(adminController.getHanhChinh));

module.exports = router;
