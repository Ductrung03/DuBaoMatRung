// tests/integration/auth-gis.test.js
const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

describe('Auth + GIS Integration Tests', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  test('Should login successfully', async () => {
    const response = await axios.post(`${GATEWAY_URL}/api/auth/login`, {
      username: 'admin',
      password: 'Admin@123#'
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.token).toBeDefined();
    expect(response.data.user).toBeDefined();

    authToken = response.data.token;
    userId = response.data.user.id;

    console.log('✅ Login successful, token obtained');
  });

  test('Should get mat rung stats', async () => {
    const response = await axios.get(`${GATEWAY_URL}/api/mat-rung/stats`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();
    expect(response.data.data.total_records).toBeGreaterThanOrEqual(0);

    console.log('✅ Mat rung stats retrieved');
  });

  test('Should verify mat rung with authentication', async () => {
    // First, get a mat rung gid
    const matRungResponse = await axios.get(`${GATEWAY_URL}/api/mat-rung/all?limit=1`);

    if (matRungResponse.data.data.features.length === 0) {
      console.log('⚠️ No mat rung data to verify, skipping test');
      return;
    }

    const gid = matRungResponse.data.data.features[0].properties.gid;

    // Verify it
    const verifyResponse = await axios.post(
      `${GATEWAY_URL}/api/verification/verify`,
      {
        gid,
        status: 'Đã xác minh',
        reason: 'Integration test verification',
        notes: 'Automated test'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.data.success).toBe(true);

    console.log('✅ Mat rung verified successfully');
  });

  test('Should fail verification without token', async () => {
    try {
      await axios.post(`${GATEWAY_URL}/api/verification/verify`, {
        gid: 1,
        status: 'Đã xác minh'
      });

      fail('Should have thrown error');
    } catch (error) {
      expect(error.response.status).toBe(401);
      console.log('✅ Verification correctly blocked without token');
    }
  });

  test('Should get current user info', async () => {
    const response = await axios.get(`${GATEWAY_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.user.id).toBe(userId);

    console.log('✅ Current user info retrieved');
  });

  test('Should get dropdown data from admin service', async () => {
    const response = await axios.get(`${GATEWAY_URL}/api/dropdown/huyen`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);

    console.log('✅ Dropdown data retrieved');
  });

  test('Should search mat rung', async () => {
    const response = await axios.get(`${GATEWAY_URL}/api/search/mat-rung?limit=10`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.type).toBe('FeatureCollection');

    console.log('✅ Search completed successfully');
  });
});

// Run tests if executed directly
if (require.main === module) {
  const jest = require('jest');
  jest.run(['--testMatch', '**/*.test.js']);
}

module.exports = {};
