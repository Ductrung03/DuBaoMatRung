// gateway/src/services/loggingService.js - Logging Service
const { getDB } = require('./mongodb');

/**
 * Save activity log to MongoDB
 * @param {Object} logData - Log data to save
 * @param {string} logData.service - Service name
 * @param {string} logData.action - Action performed
 * @param {number} logData.userId - User ID
 * @param {string} logData.ipAddress - IP address
 * @param {Object} logData.details - Additional details
 * @returns {Promise<Object>} Inserted log document
 */
async function saveActivityLog(logData) {
  try {
    const db = await getDB();
    const collection = db.collection('activity_logs');

    const logDocument = {
      timestamp: logData.timestamp || new Date(),
      userId: logData.userId || null,
      service: logData.service || 'unknown',
      action: logData.action || 'UNKNOWN_ACTION',
      ipAddress: logData.ipAddress || null,
      details: logData.details || {}
    };

    const result = await collection.insertOne(logDocument);

    return {
      success: true,
      insertedId: result.insertedId,
      ...logDocument
    };
  } catch (error) {
    console.error('Error saving activity log:', error);
    throw error;
  }
}

/**
 * Query activity logs with filters
 * @param {Object} filters - Query filters
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.service - Filter by service name
 * @param {string} filters.action - Filter by action
 * @param {Date} filters.startDate - Start date filter
 * @param {Date} filters.endDate - End date filter
 * @param {number} filters.limit - Limit results (default: 100)
 * @param {number} filters.skip - Skip results for pagination
 * @returns {Promise<Array>} Array of log documents
 */
async function queryActivityLogs(filters = {}) {
  try {
    const db = await getDB();
    const collection = db.collection('activity_logs');

    const query = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.service) {
      query.service = filters.service;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const limit = filters.limit || 100;
    const skip = filters.skip || 0;

    const logs = await collection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return logs;
  } catch (error) {
    console.error('Error querying activity logs:', error);
    throw error;
  }
}

/**
 * Get log statistics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Statistics object
 */
async function getLogStatistics(filters = {}) {
  try {
    const db = await getDB();
    const collection = db.collection('activity_logs');

    const matchStage = {};

    if (filters.startDate || filters.endDate) {
      matchStage.timestamp = {};
      if (filters.startDate) {
        matchStage.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchStage.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          serviceBreakdown: { $push: '$service' },
          actionBreakdown: { $push: '$action' }
        }
      }
    ];

    const result = await collection.aggregate(pipeline).toArray();

    if (result.length === 0) {
      return {
        totalLogs: 0,
        uniqueUsers: 0,
        services: {},
        actions: {}
      };
    }

    const stats = result[0];

    // Count service occurrences
    const serviceCount = {};
    stats.serviceBreakdown.forEach(service => {
      serviceCount[service] = (serviceCount[service] || 0) + 1;
    });

    // Count action occurrences
    const actionCount = {};
    stats.actionBreakdown.forEach(action => {
      actionCount[action] = (actionCount[action] || 0) + 1;
    });

    return {
      totalLogs: stats.totalLogs,
      uniqueUsers: stats.uniqueUsers.filter(id => id !== null).length,
      services: serviceCount,
      actions: actionCount
    };
  } catch (error) {
    console.error('Error getting log statistics:', error);
    throw error;
  }
}

module.exports = {
  saveActivityLog,
  queryActivityLogs,
  getLogStatistics
};
