module.exports = {
  apps: [
    {
      name: 'gateway',
      cwd: 'C:\\DuBaoMatRung\\microservices\\gateway',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'auth-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\auth-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'user-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\user-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'gis-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\gis-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'report-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\report-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3004
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'admin-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\admin-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3005
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'search-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\search-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'mapserver-service',
      cwd: 'C:\\DuBaoMatRung\\microservices\\services\\mapserver-service',
      script: 'src/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3007
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};