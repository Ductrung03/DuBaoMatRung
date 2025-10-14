// gis-service/src/controllers/verification.controller.js
const createLogger = require('../../../../shared/logger');
const { ValidationError, AuthorizationError } = require('../../../../shared/errors');
const { formatResponse } = require('../../../../shared/utils');

const logger = createLogger('verification-controller');

// Verify mat rung
exports.verifyMatRung = async (req, res, next) => {
  try {
    const { gid, status, reason, notes, verifiedArea } = req.body;

    // Get user info from gateway headers
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
      throw new AuthorizationError('User authentication required');
    }

    if (!gid) {
      throw new ValidationError('gid is required');
    }

    if (!status) {
      throw new ValidationError('status is required');
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    logger.info('Verifying mat rung', { gid, status, userId });

    // Check if record exists
    const checkQuery = 'SELECT gid FROM mat_rung WHERE gid = $1';
    const checkResult = await db.query(checkQuery, [gid]);

    if (checkResult.rows.length === 0) {
      throw new ValidationError(`Mat rung with gid ${gid} not found`);
    }

    // Update verification
    const updateQuery = `
      UPDATE mat_rung
      SET
        detection_status = $1,
        verified_by = $2,
        verification_reason = $3,
        verification_notes = $4,
        verified_area = $5,
        detection_date = CURRENT_TIMESTAMP
      WHERE gid = $6
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      status,
      userId,
      reason || null,
      notes || null,
      verifiedArea || null,
      gid
    ]);

    // Clear cache
    await redis.clearPattern('matrung:*');

    logger.info('Mat rung verified successfully', { gid, userId });

    res.json(formatResponse(
      true,
      'Verification completed successfully',
      {
        gid,
        status,
        verified_by: userId,
        updated_at: result.rows[0].detection_date
      }
    ));

  } catch (error) {
    next(error);
  }
};

// Get verification history
exports.getVerificationHistory = async (req, res, next) => {
  try {
    const { gid } = req.params;

    if (!gid) {
      throw new ValidationError('gid is required');
    }

    const db = req.app.locals.db;
    const authDb = req.app.locals.authDb;

    logger.info('Getting verification history', { gid });

    // Query mat_rung from gis_db
    const matRungQuery = `
      SELECT
        gid,
        detection_status,
        detection_date,
        verified_by,
        verification_reason,
        verification_notes,
        verified_area
      FROM mat_rung
      WHERE gid = $1
    `;

    const result = await db.query(matRungQuery, [gid]);

    if (result.rows.length === 0) {
      throw new ValidationError(`Mat rung with gid ${gid} not found`);
    }

    const matRungData = result.rows[0];

    // If there's a verified_by user, fetch user info from auth_db
    if (matRungData.verified_by) {
      const userQuery = `
        SELECT id, full_name, username
        FROM users
        WHERE id = $1
      `;
      const userResult = await authDb.query(userQuery, [matRungData.verified_by]);

      if (userResult.rows.length > 0) {
        matRungData.verified_by_name = userResult.rows[0].full_name;
        matRungData.verified_by_username = userResult.rows[0].username;
      }
    }

    res.json(formatResponse(
      true,
      'Verification history retrieved',
      matRungData
    ));

  } catch (error) {
    next(error);
  }
};

// Batch verification
exports.batchVerify = async (req, res, next) => {
  try {
    const { gids, status, reason, notes } = req.body;

    const userId = req.headers['x-user-id'];

    if (!userId) {
      throw new AuthorizationError('User authentication required');
    }

    if (!gids || !Array.isArray(gids) || gids.length === 0) {
      throw new ValidationError('gids array is required');
    }

    if (!status) {
      throw new ValidationError('status is required');
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    logger.info('Batch verification', { count: gids.length, userId });

    // Update in batch
    const updateQuery = `
      UPDATE mat_rung
      SET
        detection_status = $1,
        verified_by = $2,
        verification_reason = $3,
        verification_notes = $4,
        detection_date = CURRENT_TIMESTAMP
      WHERE gid = ANY($5::int[])
      RETURNING gid
    `;

    const result = await db.query(updateQuery, [
      status,
      userId,
      reason || null,
      notes || null,
      gids
    ]);

    // Clear cache
    await redis.clearPattern('matrung:*');

    logger.info('Batch verification completed', {
      requested: gids.length,
      verified: result.rows.length
    });

    res.json(formatResponse(
      true,
      `Batch verification completed: ${result.rows.length} records updated`,
      {
        verified_count: result.rows.length,
        verified_gids: result.rows.map(r => r.gid)
      }
    ));

  } catch (error) {
    next(error);
  }
};

// ✅ NEW: Verify mat rung by GID (matching frontend format)
exports.verifyMatRungById = async (req, res, next) => {
  try {
    const { gid } = req.params;
    const { verification_reason, verification_notes, verified_area, detection_date } = req.body;

    // Get user info from gateway headers
    const userId = req.headers['x-user-id'];
    const userName = req.headers['x-user-name'] || req.headers['x-user-username'];

    if (!userId) {
      throw new AuthorizationError('User authentication required');
    }

    if (!gid || isNaN(parseInt(gid))) {
      throw new ValidationError('Valid gid is required');
    }

    if (!verification_reason) {
      throw new ValidationError('verification_reason is required');
    }

    const db = req.app.locals.db;         // gis_db connection
    const authDb = req.app.locals.authDb; // auth_db connection
    const redis = req.app.locals.redis;

    logger.info('Verifying mat rung by ID', { gid, verification_reason, userId });

    // Check if record exists and get current data from gis_db
    const checkQuery = `
      SELECT
        gid,
        area as original_area,
        verified_area as current_verified_area,
        detection_status,
        verified_by
      FROM mat_rung
      WHERE gid = $1
    `;
    const checkResult = await db.query(checkQuery, [gid]);

    if (checkResult.rows.length === 0) {
      throw new ValidationError(`Mat rung with gid ${gid} not found`);
    }

    const currentRecord = checkResult.rows[0];

    // Get verified_by user info from auth_db if exists
    let verifiedByName = null;
    if (currentRecord.verified_by) {
      const userQuery = 'SELECT full_name FROM users WHERE id = $1';
      const userResult = await authDb.query(userQuery, [currentRecord.verified_by]);
      if (userResult.rows.length > 0) {
        verifiedByName = userResult.rows[0].full_name;
      }
    }

    // Determine verified area (use provided value or keep original area)
    const finalVerifiedArea = verified_area || currentRecord.original_area;
    const areaChanged = verified_area && verified_area !== currentRecord.original_area;

    // Determine detection date (use provided value or current timestamp)
    const finalDetectionDate = detection_date || new Date().toISOString().split('T')[0];

    // Update verification with status "Đã xác minh"
    const updateQuery = `
      UPDATE mat_rung
      SET
        detection_status = 'Đã xác minh',
        verified_by = $1,
        verification_reason = $2,
        verification_notes = $3,
        verified_area = $4,
        detection_date = $5
      WHERE gid = $6
      RETURNING
        gid,
        area,
        detection_status,
        verified_area,
        verification_reason,
        verification_notes,
        verified_by,
        detection_date
    `;

    const result = await db.query(updateQuery, [
      userId,
      verification_reason,
      verification_notes || null,
      finalVerifiedArea,
      finalDetectionDate,
      gid
    ]);

    const updatedRecord = result.rows[0];

    // Get verified user info from auth_db
    const userQuery = 'SELECT id, full_name, username FROM users WHERE id = $1';
    const userResult = await authDb.query(userQuery, [userId]);
    const verifiedByUser = userResult.rows.length > 0 ? userResult.rows[0] : null;

    // Clear cache
    await redis.clearPattern('matrung:*');

    logger.info('Mat rung verified successfully', {
      gid,
      userId,
      verification_reason,
      area_changed: areaChanged
    });

    // Prepare detailed response
    const responseData = {
      gid: parseInt(gid),
      detection_status: updatedRecord.detection_status,
      verification_reason: updatedRecord.verification_reason,
      verified_area: updatedRecord.verified_area,
      verification_notes: updatedRecord.verification_notes,
      detection_date: updatedRecord.detection_date,
      verified_by: updatedRecord.verified_by,
      verified_by_name: verifiedByUser ? verifiedByUser.full_name : userName
    };

    const changes = {
      original_area: currentRecord.original_area,
      new_verified_area: finalVerifiedArea,
      area_changed: areaChanged,
      verification_date_used: finalDetectionDate,
      verified_by_user: verifiedByUser ? verifiedByUser.full_name : userName
    };

    res.json(formatResponse(
      true,
      'Verification completed successfully',
      responseData,
      { changes }
    ));

  } catch (error) {
    logger.error('Error verifying mat rung by ID', {
      error: error.message,
      gid: req.params.gid
    });
    next(error);
  }
};

module.exports = exports;
