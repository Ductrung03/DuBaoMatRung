// gateway/src/routes/loggingRoutes.js - Logging Routes
const express = require('express');
const router = express.Router();
const { saveActivityLog, queryActivityLogs, getLogStatistics } = require('../services/loggingService');

/**
 * @swagger
 * /api/logs:
 *   post:
 *     summary: Gửi một sự kiện log mới
 *     tags: [Logging]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               userId:
 *                 type: integer
 *               service:
 *                 type: string
 *                 example: "gis-service"
 *               action:
 *                 type: string
 *                 example: "UPDATE_VERIFICATION_STATUS"
 *               ipAddress:
 *                 type: string
 *                 format: ipv4
 *               details:
 *                 type: object
 *                 description: Bất kỳ dữ liệu JSON bổ sung nào cho ngữ cảnh
 *                 example: { "eventId": 123, "newStatus": "Đã xác minh" }
 *     responses:
 *       202:
 *         description: Sự kiện log đã được chấp nhận để xử lý
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */
router.post('/', async (req, res) => {
  try {
    const logData = {
      timestamp: req.body.timestamp ? new Date(req.body.timestamp) : new Date(),
      userId: req.body.userId || null,
      service: req.body.service || 'unknown',
      action: req.body.action || 'UNKNOWN_ACTION',
      ipAddress: req.body.ipAddress || req.ip || req.connection.remoteAddress,
      details: req.body.details || {}
    };

    // Validate required fields
    if (!logData.service || !logData.action) {
      return res.status(400).json({
        success: false,
        message: 'Service and action are required fields'
      });
    }

    // Save log asynchronously (fire and forget for performance)
    saveActivityLog(logData).catch(error => {
      console.error('Failed to save log:', error);
    });

    // Respond immediately with 202 Accepted
    res.status(202).json({
      success: true,
      message: 'Log event accepted for processing'
    });
  } catch (error) {
    console.error('Error processing log request:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Query activity logs with filters
 *     tags: [Logging]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: service
 *         schema:
 *           type: string
 *         description: Filter by service name
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Limit results
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Skip results for pagination
 *     responses:
 *       200:
 *         description: List of activity logs
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      userId: req.query.userId ? parseInt(req.query.userId) : undefined,
      service: req.query.service,
      action: req.query.action,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      skip: req.query.skip ? parseInt(req.query.skip) : 0
    };

    const logs = await queryActivityLogs(filters);

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    console.error('Error querying logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to query logs',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Get log statistics
 *     tags: [Logging]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Log statistics
 *       500:
 *         description: Server error
 */
router.get('/stats', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const stats = await getLogStatistics(filters);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting log statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
});

module.exports = router;
