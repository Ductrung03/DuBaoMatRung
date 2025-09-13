const express = require('express');
const path = require('path');
const app = express();

const PORT = 5173;
const DIST_PATH = path.join(__dirname, 'client', 'dist');

console.log(`📁 Serving files from: ${DIST_PATH}`);

// Serve static files from dist folder
app.use(express.static(DIST_PATH));

// Handle SPA routing - return index.html for all routes that don't match static files
app.get('/*', (req, res) => {
  res.sendFile(path.join(DIST_PATH, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Frontend server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving files from: ${DIST_PATH}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Frontend server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📴 Frontend server shutting down...');
  process.exit(0);
});