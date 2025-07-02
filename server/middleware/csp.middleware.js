// server/middleware/csp.middleware.js - Content Security Policy Fix
const setCspHeaders = (req, res, next) => {
  // Set CSP headers để cho phép embed Google Earth Engine
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.gstatic.com *.google.com *.earthengine.google.com *.googleusercontent.com earthengine.googleapis.com",
    "style-src 'self' 'unsafe-inline' *.googleapis.com *.gstatic.com fonts.googleapis.com",
    "img-src 'self' data: blob: *.googleapis.com *.gstatic.com *.google.com *.googleusercontent.com earthengine.googleapis.com",
    "font-src 'self' fonts.googleapis.com fonts.gstatic.com",
    "connect-src 'self' *.googleapis.com *.google.com *.earthengine.google.com earthengine.googleapis.com ws: wss:",
    "frame-src 'self' *.google.com *.earthengine.google.com *.projects.earthengine.app ee-phathiensommatrung.projects.earthengine.app",
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '));
  
  // Additional headers cho iframe embedding
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers cho Earth Engine
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
};

module.exports = setCspHeaders;