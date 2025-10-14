// gis-service/src/routes/verification.routes.js
const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verification.controller');
const { asyncHandler } = require('../../../../shared/errors');

/**
 * @swagger
 * tags:
 *   name: Verification
 *   description: Mat rung verification endpoints
 */

/**
 * @swagger
 * /api/verification/verify:
 *   post:
 *     summary: Verify single mat rung
 *     description: Verify a single forest loss detection record
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gid
 *               - verified_area
 *             properties:
 *               gid:
 *                 type: integer
 *                 description: Mat rung record ID
 *               verified_area:
 *                 type: number
 *                 description: Verified area in square meters
 *               verification_reason:
 *                 type: string
 *                 description: Reason for verification
 *               verification_notes:
 *                 type: string
 *                 description: Additional notes
 *     responses:
 *       200:
 *         description: Mat rung verified successfully
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
 *         description: Validation error
 *       404:
 *         description: Mat rung record not found
 */
router.post('/verify', asyncHandler(verificationController.verifyMatRung));

/**
 * @swagger
 * /api/verification/history/{gid}:
 *   get:
 *     summary: Get verification history
 *     description: Retrieve verification history for a specific mat rung record
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mat rung record ID
 *     responses:
 *       200:
 *         description: Verification history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         description: No verification history found
 */
router.get('/history/:gid', asyncHandler(verificationController.getVerificationHistory));

/**
 * @swagger
 * /api/verification/batch-verify:
 *   post:
 *     summary: Batch verification
 *     description: Verify multiple forest loss detection records at once
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verifications
 *             properties:
 *               verifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - gid
 *                     - verified_area
 *                   properties:
 *                     gid:
 *                       type: integer
 *                     verified_area:
 *                       type: number
 *                     verification_reason:
 *                       type: string
 *                     verification_notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Batch verification completed
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
 *                     verified:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       400:
 *         description: Validation error
 */
router.post('/batch-verify', asyncHandler(verificationController.batchVerify));

/**
 * @swagger
 * /api/verification/mat-rung/{gid}/verify:
 *   post:
 *     summary: Verify mat rung by ID
 *     description: Verify a specific forest loss detection record by its GID
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: gid
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mat rung record ID (GID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verification_reason
 *             properties:
 *               verification_reason:
 *                 type: string
 *                 description: Reason for verification
 *               verification_notes:
 *                 type: string
 *                 description: Additional notes
 *               verified_area:
 *                 type: number
 *                 description: Verified area in square meters
 *               detection_date:
 *                 type: string
 *                 format: date
 *                 description: Detection date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Mat rung verified successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Mat rung record not found
 */
router.post('/mat-rung/:gid/verify', asyncHandler(verificationController.verifyMatRungById));

module.exports = router;
