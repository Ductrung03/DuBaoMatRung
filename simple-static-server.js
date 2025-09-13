const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_PATH = path.join(__dirname, 'client', 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  let filePath = path.join(DIST_PATH, req.url === '/' ? 'index.html' : req.url);
  
  // For SPA routing, serve index.html for routes that don't match files
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    filePath = path.join(DIST_PATH, 'index.html');
  }
  
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found, serve index.html for SPA
        fs.readFile(path.join(DIST_PATH, 'index.html'), (error, content) => {
          if (error) {
            res.writeHead(500);
            res.end('Server Error');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎨 Frontend server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving files from: ${DIST_PATH}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('📴 Frontend server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('📴 Frontend server shutting down...');
  server.close(() => {
    process.exit(0);
  });
});