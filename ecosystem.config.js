// ecosystem.config.js - PM2 Configuration
module.exports = {
  apps: [{
    name: 'dubaomatrung-backend',
    cwd: './server',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true
  }, {
    name: 'dubaomatrung-frontend',
    cwd: './client',
    script: 'npm',
    args: 'run preview -- --host 0.0.0.0 --port 5173',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/frontend-error.log',
    out_file: './logs/frontend-out.log',
    log_file: './logs/frontend-combined.log',
    time: true
  }]
}
