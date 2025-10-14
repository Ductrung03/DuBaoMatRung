// gateway/src/routes/index.js - Gateway routes (if needed)
const express = require('express');
const router = express.Router();

// Gateway-specific routes can be added here
// For example: API documentation, service status, etc.

router.get('/services', (req, res) => {
  res.json({
    services: [
      {
        name: 'auth',
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        description: 'Authentication & Authorization'
      },
      {
        name: 'user',
        url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
        description: 'User Management'
      },
      {
        name: 'gis',
        url: process.env.GIS_SERVICE_URL || 'http://localhost:3003',
        description: 'GIS Data & Spatial Operations'
      },
      {
        name: 'report',
        url: process.env.REPORT_SERVICE_URL || 'http://localhost:3004',
        description: 'Report Generation & Analytics'
      },
      {
        name: 'admin',
        url: process.env.ADMIN_SERVICE_URL || 'http://localhost:3005',
        description: 'Administrative Data'
      },
      {
        name: 'search',
        url: process.env.SEARCH_SERVICE_URL || 'http://localhost:3006',
        description: 'Search & Filtering'
      }
    ]
  });
});

module.exports = router;
