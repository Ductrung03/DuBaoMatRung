// PM2 Ecosystem Configuration
// Deploy all microservices on Windows Server

module.exports = {
  apps: [
    // Gateway - API Gateway & Routing
    {
      name: 'gateway',
      cwd: './microservices/gateway',
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REFRESH_TOKEN_SECRET: 'dubaomatrung_refresh_jwt_secret_production_key_2025_secure_random_string',
        // Service URLs
        AUTH_SERVICE_URL: 'http://localhost:3001',
        USER_SERVICE_URL: 'http://localhost:3002',
        GIS_SERVICE_URL: 'http://localhost:3003',
        REPORT_SERVICE_URL: 'http://localhost:3004',
        ADMIN_SERVICE_URL: 'http://localhost:3005',
        SEARCH_SERVICE_URL: 'http://localhost:3006',
        MAPSERVER_SERVICE_URL: 'http://127.0.0.1:3008'
      },
      error_file: './logs/gateway-error.log',
      out_file: './logs/gateway-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // Auth Service - Authentication & Authorization
    {
      name: 'auth-service',
      cwd: './microservices/services/auth-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:4@localhost:5432/auth_db?schema=public',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'auth_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production'
      },
      error_file: './logs/auth-error.log',
      out_file: './logs/auth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // User Service - User Management
    {
      name: 'user-service',
      cwd: './microservices/services/user-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'auth_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/user-error.log',
      out_file: './logs/user-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // GIS Service - GIS & Shapefile Processing
    {
      name: 'gis-service',
      cwd: './microservices/services/gis-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'gis_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        MAX_FILE_SIZE: '50mb',
        UPLOAD_DIR: './uploads'
      },
      error_file: './logs/gis-error.log',
      out_file: './logs/gis-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // Report Service - Reporting
    {
      name: 'report-service',
      cwd: './microservices/services/report-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3004,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'gis_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/report-error.log',
      out_file: './logs/report-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // Admin Service - Administration
    {
      name: 'admin-service',
      cwd: './microservices/services/admin-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3005,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'admin_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      },
      error_file: './logs/admin-error.log',
      out_file: './logs/admin-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // Search Service - Search Functionality
    {
      name: 'search-service',
      cwd: './microservices/services/search-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3006,
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_USER: 'postgres',
        DB_PASSWORD: '4',
        DB_NAME: 'gis_db',
        JWT_SECRET: 'dubaomatrung_secret_key_change_this_in_production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        SEARCH_RESULT_LIMIT: 100
      },
      error_file: './logs/search-error.log',
      out_file: './logs/search-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },

    // MapServer Service - MapServer Integration
    {
      name: 'mapserver-service',
      cwd: './microservices/services/mapserver-service',
      script: 'src/index.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3008,
        // Windows MapServer path (MS4W installation)
        MAPSERV_BIN: 'C:\\ms4w\\Apache\\cgi-bin\\mapserv.exe',
        MAPFILE_PATH: 'c:\\DuBaoMatRung\\mapserver\\mapfiles\\sonla-windows-optimized.map',
        // MapServer 8.x config file (REQUIRED)
        MS_CONFIG_FILE: 'c:\\DuBaoMatRung\\mapserver\\mapserver-windows.conf',
        // MS4W environment variables
        MS_ERRORFILE: 'stderr',
        PROJ_LIB: 'C:\\ms4w\\share\\proj',
        GDAL_DATA: 'C:\\ms4w\\gdaldata'
      },
      error_file: './logs/mapserver-error.log',
      out_file: './logs/mapserver-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
