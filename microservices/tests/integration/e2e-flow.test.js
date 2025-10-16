// tests/integration/e2e-flow.test.js
// End-to-end test for the new "Self-Host" architecture
// Tests: Login -> View Map -> Update -> Logging flow

const axios = require('axios');

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

describe('E2E Flow: Login -> View Map -> Update -> Logging', () => {
  let adminToken;
  let gisSpecialistToken;
  let adminUserId;
  let testGid;

  beforeAll(async () => {
    // Wait for services to be ready
    console.log('⏳ Waiting for services to start...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  // ========================================
  // TEST 1: Authentication & RBAC
  // ========================================
  describe('1. Authentication and RBAC', () => {
    test('Admin user should login successfully', async () => {
      const response = await axios.post(`${GATEWAY_URL}/api/auth/login`, {
        username: 'admin',
        password: 'Admin@123#'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.token).toBeDefined();
      expect(response.data.user).toBeDefined();

      adminToken = response.data.token;
      adminUserId = response.data.user.id;

      console.log('✅ Admin login successful');
    });

    test('Admin should have admin role', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.user.roles).toBeDefined();
      expect(response.data.user.roles).toContain('admin');

      console.log('✅ Admin role verified');
    });

    test('Should fail login with invalid credentials', async () => {
      try {
        await axios.post(`${GATEWAY_URL}/api/auth/login`, {
          username: 'invalid',
          password: 'invalid'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        console.log('✅ Invalid login correctly rejected');
      }
    });
  });

  // ========================================
  // TEST 2: View Map Data (GIS with Kysely)
  // ========================================
  describe('2. View Map Data (GIS)', () => {
    test('Should get mat rung statistics', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/mat-rung/stats`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toBeDefined();
      expect(response.data.data.total_records).toBeGreaterThanOrEqual(0);

      console.log('✅ Mat rung stats retrieved via Kysely');
    });

    test('Should get mat rung features list', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/mat-rung/all?limit=10`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.type).toBe('FeatureCollection');
      expect(Array.isArray(response.data.data.features)).toBe(true);

      if (response.data.data.features.length > 0) {
        testGid = response.data.data.features[0].properties.gid;
        console.log(`✅ Mat rung features retrieved, test GID: ${testGid}`);
      } else {
        console.log('⚠️ No mat rung features found');
      }
    });

    test('Should get administrative boundaries from admin-service', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/dropdown/huyen`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);

      console.log('✅ Administrative boundaries retrieved via Kysely');
    });

    test('Should get specific mat rung by GID', async () => {
      if (!testGid) {
        console.log('⚠️ No test GID available, skipping');
        return;
      }

      const response = await axios.get(`${GATEWAY_URL}/api/mat-rung/${testGid}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.properties.gid).toBe(testGid);

      console.log(`✅ Specific mat rung (GID: ${testGid}) retrieved`);
    });
  });

  // ========================================
  // TEST 3: Update Operations
  // ========================================
  describe('3. Update Operations', () => {
    test('Should verify mat rung with authentication', async () => {
      if (!testGid) {
        console.log('⚠️ No test GID available, skipping');
        return;
      }

      const response = await axios.post(
        `${GATEWAY_URL}/api/verification/verify`,
        {
          gid: testGid,
          status: 'Đã xác minh',
          reason: 'E2E test verification',
          notes: 'Automated end-to-end test'
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`✅ Mat rung (GID: ${testGid}) verified successfully`);
    });

    test('Should fail verification without authentication', async () => {
      if (!testGid) {
        console.log('⚠️ No test GID available, skipping');
        return;
      }

      try {
        await axios.post(`${GATEWAY_URL}/api/verification/verify`, {
          gid: testGid,
          status: 'Đã xác minh'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.response.status).toBe(401);
        console.log('✅ Unauthenticated verification correctly blocked');
      }
    });

    test('Should update mat rung detection status', async () => {
      if (!testGid) {
        console.log('⚠️ No test GID available, skipping');
        return;
      }

      const response = await axios.put(
        `${GATEWAY_URL}/api/mat-rung/${testGid}`,
        {
          detection_status: 'Đang xem xét'
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`✅ Mat rung (GID: ${testGid}) status updated`);
    });
  });

  // ========================================
  // TEST 4: Logging (MongoDB)
  // ========================================
  describe('4. Logging to MongoDB', () => {
    test('Should create activity log for user login', async () => {
      const response = await axios.post(`${GATEWAY_URL}/api/logs`, {
        userId: adminUserId,
        service: 'auth-service',
        action: 'USER_LOGIN',
        ipAddress: '127.0.0.1',
        details: {
          username: 'admin',
          timestamp: new Date().toISOString()
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.logId).toBeDefined();

      console.log('✅ Login activity logged to MongoDB');
    });

    test('Should create activity log for verification action', async () => {
      if (!testGid) {
        console.log('⚠️ No test GID available, skipping');
        return;
      }

      const response = await axios.post(`${GATEWAY_URL}/api/logs`, {
        userId: adminUserId,
        service: 'gis-service',
        action: 'UPDATE_VERIFICATION_STATUS',
        ipAddress: '127.0.0.1',
        details: {
          gid: testGid,
          status: 'Đã xác minh',
          timestamp: new Date().toISOString()
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);

      console.log('✅ Verification activity logged to MongoDB');
    });

    test('Should retrieve activity logs for user', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/logs?userId=${adminUserId}&limit=10`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.logs)).toBe(true);
      expect(response.data.logs.length).toBeGreaterThan(0);

      console.log(`✅ Retrieved ${response.data.logs.length} activity logs from MongoDB`);
    });

    test('Should filter logs by service', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/logs?service=auth-service&limit=5`,
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.logs)).toBe(true);

      if (response.data.logs.length > 0) {
        expect(response.data.logs[0].service).toBe('auth-service');
      }

      console.log('✅ Service-filtered logs retrieved successfully');
    });
  });

  // ========================================
  // TEST 5: Role-Based Access Control
  // ========================================
  describe('5. Role-Based Access Control (RBAC)', () => {
    test('Admin should be able to manage roles', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/auth/roles`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.roles)).toBe(true);

      console.log(`✅ Retrieved ${response.data.roles.length} roles from Prisma`);
    });

    test('Admin should be able to view permissions', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/auth/permissions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.permissions)).toBe(true);

      console.log(`✅ Retrieved ${response.data.permissions.length} permissions from Prisma`);
    });

    test('Should check user permissions for specific action', async () => {
      const response = await axios.post(
        `${GATEWAY_URL}/api/auth/check-permission`,
        {
          action: 'manage',
          subject: 'users'
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.hasPermission).toBeDefined();

      console.log(`✅ Permission check completed: ${response.data.hasPermission}`);
    });
  });

  // ========================================
  // TEST 6: Search Functionality
  // ========================================
  describe('6. Search and Query Operations', () => {
    test('Should search mat rung by huyen', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/search/mat-rung?huyen=Bảo Thắng&limit=5`
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.type).toBe('FeatureCollection');

      console.log(`✅ Search by huyen returned ${response.data.data.features.length} results`);
    });

    test('Should search mat rung by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';
      const response = await axios.get(
        `${GATEWAY_URL}/api/search/mat-rung?startDate=${startDate}&endDate=${endDate}&limit=10`
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log(`✅ Date range search completed`);
    });

    test('Should search mat rung by verification status', async () => {
      const response = await axios.get(
        `${GATEWAY_URL}/api/search/mat-rung?status=Đã xác minh&limit=5`
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);

      console.log('✅ Status-based search completed');
    });
  });

  // ========================================
  // TEST 7: Complete E2E Flow
  // ========================================
  describe('7. Complete End-to-End Flow', () => {
    test('Complete flow: Login -> View -> Update -> Log', async () => {
      console.log('\n🔄 Starting complete E2E flow...\n');

      // Step 1: Login
      const loginResponse = await axios.post(`${GATEWAY_URL}/api/auth/login`, {
        username: 'admin',
        password: 'Admin@123#'
      });
      expect(loginResponse.status).toBe(200);
      const token = loginResponse.data.token;
      const userId = loginResponse.data.user.id;
      console.log('  ✓ Step 1: Logged in');

      // Step 2: View map data
      const mapResponse = await axios.get(`${GATEWAY_URL}/api/mat-rung/all?limit=1`);
      expect(mapResponse.status).toBe(200);
      console.log('  ✓ Step 2: Viewed map data');

      if (mapResponse.data.data.features.length > 0) {
        const gid = mapResponse.data.data.features[0].properties.gid;

        // Step 3: Update verification status
        const updateResponse = await axios.post(
          `${GATEWAY_URL}/api/verification/verify`,
          {
            gid,
            status: 'Đã xác minh',
            reason: 'Complete E2E test',
            notes: 'Full flow test'
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        expect(updateResponse.status).toBe(200);
        console.log('  ✓ Step 3: Updated verification');

        // Step 4: Log the activity
        const logResponse = await axios.post(`${GATEWAY_URL}/api/logs`, {
          userId,
          service: 'gis-service',
          action: 'E2E_FLOW_TEST',
          ipAddress: '127.0.0.1',
          details: {
            gid,
            flowStep: 'complete',
            timestamp: new Date().toISOString()
          }
        });
        expect(logResponse.status).toBe(201);
        console.log('  ✓ Step 4: Activity logged');
      }

      console.log('\n✅ Complete E2E flow successful!\n');
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  const jest = require('jest');
  jest.run(['--testMatch', '**/e2e-flow.test.js']);
}

module.exports = {};
