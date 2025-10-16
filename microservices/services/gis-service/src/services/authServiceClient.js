// gis-service/src/services/authServiceClient.js
const axios = require('axios');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('auth-service-client');

/**
 * Client for communicating with auth-service internal API
 */
class AuthServiceClient {
  constructor() {
    this.baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    this.apiKey = process.env.INTERNAL_API_KEY;
    this.timeout = parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10);

    if (!this.apiKey) {
      logger.warn('INTERNAL_API_KEY environment variable is not set');
    }
  }

  /**
   * Get user information for multiple user IDs
   * @param {number[]} userIds - Array of user IDs
   * @returns {Promise<Object>} Map of user ID to user info
   */
  async getUserInfo(userIds) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      logger.warn('getUserInfo called with invalid userIds', { userIds });
      return {};
    }

    try {
      const idsParam = userIds.join(',');
      const url = `${this.baseURL}/api/auth/internal/user-info`;

      logger.debug('Fetching user info from auth-service', {
        url,
        userIds: idsParam
      });

      const response = await axios.get(url, {
        params: { ids: idsParam },
        headers: {
          'X-Internal-Api-Key': this.apiKey,
          'X-Service-Name': 'gis-service'
        },
        timeout: this.timeout
      });

      if (response.data && response.data.success) {
        logger.debug('User info fetched successfully', {
          requestedCount: userIds.length,
          receivedCount: Object.keys(response.data.data || {}).length
        });
        return response.data.data || {};
      }

      logger.warn('Unexpected response from auth-service', {
        status: response.status,
        data: response.data
      });
      return {};

    } catch (error) {
      if (error.response) {
        // Server responded with error status
        logger.error('Auth service responded with error', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else if (error.request) {
        // Request was made but no response received
        logger.error('No response from auth service', {
          message: error.message,
          baseURL: this.baseURL
        });
      } else {
        // Error setting up the request
        logger.error('Error calling auth service', {
          message: error.message
        });
      }

      // Return empty map on error to prevent crashes
      return {};
    }
  }

  /**
   * Get single user information
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User info or null if not found
   */
  async getSingleUserInfo(userId) {
    const result = await this.getUserInfo([userId]);
    return result[userId.toString()] || null;
  }
}

// Export singleton instance
module.exports = new AuthServiceClient();
