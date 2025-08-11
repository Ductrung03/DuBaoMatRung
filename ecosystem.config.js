module.exports = {
  apps: [{
    name: 'dubaomatrung-server',
    cwd: './server',
    script: 'server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }, {
    name: 'dubaomatrung-client',
    cwd: './client',
    script: 'npm',
    args: 'run dev',
    env: {
      NODE_ENV: 'production',
      PORT: 5173
    }
  }]
}