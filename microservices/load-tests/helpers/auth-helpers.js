// load-tests/helpers/auth-helpers.js
// Helper functions for Artillery load tests

module.exports = {
  // Generate random user credentials for testing
  generateRandomUser: function(userContext, events, done) {
    const randomNum = Math.floor(Math.random() * 10000);
    userContext.vars.randomUsername = `user${randomNum}`;
    userContext.vars.randomPassword = `Password${randomNum}!`;
    return done();
  },

  // Add timestamp to requests
  addTimestamp: function(requestParams, context, ee, next) {
    requestParams.headers = requestParams.headers || {};
    requestParams.headers['X-Request-Timestamp'] = Date.now().toString();
    return next();
  },

  // Log response time
  logResponseTime: function(requestParams, response, context, ee, next) {
    const responseTime = response.timings.phases.total;
    console.log(`Response time: ${responseTime}ms`);
    return next();
  },

  // Generate random coordinates within Lao Cai bounds
  generateRandomCoordinates: function(userContext, events, done) {
    // Lao Cai approximate bounds
    const minLat = 22.0;
    const maxLat = 23.0;
    const minLon = 103.5;
    const maxLon = 104.5;

    userContext.vars.randomLat = (Math.random() * (maxLat - minLat) + minLat).toFixed(6);
    userContext.vars.randomLon = (Math.random() * (maxLon - minLon) + minLon).toFixed(6);
    return done();
  },

  // Generate random date range
  generateRandomDateRange: function(userContext, events, done) {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    const randomStart = new Date(
      threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime())
    );
    const randomEnd = new Date(
      randomStart.getTime() + Math.random() * (now.getTime() - randomStart.getTime())
    );

    userContext.vars.startDate = randomStart.toISOString().split('T')[0];
    userContext.vars.endDate = randomEnd.toISOString().split('T')[0];
    return done();
  },

  // Select random status
  generateRandomStatus: function(userContext, events, done) {
    const statuses = [
      'Chưa xác minh',
      'Đã xác minh',
      'Không chính xác',
      'Cần kiểm tra lại'
    ];
    userContext.vars.randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    return done();
  },

  // Select random huyen
  generateRandomHuyen: function(userContext, events, done) {
    const huyens = [
      'Thành phố Lào Cai',
      'Huyện Bát Xát',
      'Huyện Sa Pa',
      'Huyện Văn Bàn',
      'Huyện Bảo Thắng'
    ];
    userContext.vars.randomHuyen = huyens[Math.floor(Math.random() * huyens.length)];
    return done();
  },

  // Custom metrics reporter
  reportMetrics: function(context, events, done) {
    events.on('response', (response) => {
      const statusCode = response.statusCode;
      const url = response.request.uri.path;
      const duration = response.timings.phases.total;

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow request: ${url} - ${duration}ms - Status: ${statusCode}`);
      }

      // Log errors
      if (statusCode >= 400) {
        console.error(`Error: ${url} - Status: ${statusCode}`);
      }
    });

    return done();
  },

  // Validate response structure
  validateGeoJSONResponse: function(requestParams, response, context, ee, next) {
    try {
      const body = JSON.parse(response.body);

      if (body.data && body.data.type === 'FeatureCollection') {
        ee.emit('counter', 'validation.geojson.success', 1);
      } else {
        ee.emit('counter', 'validation.geojson.failure', 1);
        console.warn('Invalid GeoJSON response structure');
      }
    } catch (error) {
      ee.emit('counter', 'validation.parse.error', 1);
      console.error('Failed to parse response:', error.message);
    }

    return next();
  },

  // Simulate user think time
  simulateThinkTime: function(userContext, events, done) {
    // Random think time between 1-5 seconds
    const thinkTime = Math.floor(Math.random() * 4000) + 1000;
    userContext.vars.thinkTime = thinkTime;
    return done();
  }
};
