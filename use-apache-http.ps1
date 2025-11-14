# ===============================================
# GIẢI PHÁP CUỐI CÙNG: Dùng Apache HTTP
# ===============================================
# Thay vì spawn CGI, dùng HTTP request qua Apache

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SOLUTION: Use Apache HTTP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Apache
Write-Host "[1] Checking Apache..." -ForegroundColor Yellow
$apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue

if (!$apacheProcess) {
    Write-Host "  Apache is not running. Starting..." -ForegroundColor Yellow
    $apacheStart = "C:\ms4w\apache-start.bat"

    if (Test-Path $apacheStart) {
        Start-Process cmd -ArgumentList "/c", $apacheStart -WindowStyle Hidden
        Start-Sleep -Seconds 5

        $apacheProcess = Get-Process -Name "httpd" -ErrorAction SilentlyContinue
        if ($apacheProcess) {
            Write-Host "  [OK] Apache started" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Failed to start Apache" -ForegroundColor Red
            Write-Host "  Try manually: C:\ms4w\apache-start.bat" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "  [ERROR] apache-start.bat not found" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  [OK] Apache is running" -ForegroundColor Green
}

# Test Apache MapServer
Write-Host "`n[2] Testing MapServer through Apache HTTP..." -ForegroundColor Yellow

$mapfile = "C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map"
$testUrl = "http://localhost/cgi-bin/mapserv.exe?map=$mapfile&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"

Write-Host "  URL: $testUrl" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri $testUrl -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop

    if ($response.Content -match "WMS_Capabilities" -and $response.Content -match "LaoCai_GIS") {
        Write-Host "`n==========================================" -ForegroundColor Green
        Write-Host "           SUCCESS!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green

        Write-Host "`nMapServer works through Apache!" -ForegroundColor Yellow
        Write-Host "Apache URL: http://localhost/cgi-bin/mapserv.exe" -ForegroundColor White

        Write-Host "`n[3] Updating Node.js service to use HTTP proxy..." -ForegroundColor Yellow

        # Update src/index.js to use HTTP instead of spawn
        $serviceFile = "C:\DuBaoMatRung\microservices\services\mapserver-service\src\index.js"

        if (Test-Path $serviceFile) {
            $backup = "$serviceFile.backup-spawn"
            Copy-Item $serviceFile $backup -Force
            Write-Host "  [OK] Backed up to: $backup" -ForegroundColor Green
        }

        # Create new HTTP-based service
        $newService = @'
// mapserver-service/src/index.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const compression = require('compression');
const axios = require('axios');
const winston = require('winston');

const app = express();
const PORT = process.env.PORT || 3008;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Middleware
app.use(cors());
app.use(compression());

// MapServer Apache URL
const MAPSERVER_URL = process.env.MAPSERVER_URL || 'http://localhost/cgi-bin/mapserv.exe';
const MAPFILE_PATH = process.env.MAPFILE_PATH || 'C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map';

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mapserver-service',
    mapserver: MAPSERVER_URL,
    mapfile: MAPFILE_PATH
  });
});

const handleMapServerRequest = async (req, res) => {
  logger.info('--- NEW MAPSERVER REQUEST ---', { path: req.path, query: req.query });

  try {
    // Build query string
    const queryParams = new URLSearchParams(req.query);
    queryParams.set('map', MAPFILE_PATH);

    const url = `${MAPSERVER_URL}?${queryParams.toString()}`;

    logger.info('Proxying to Apache', { url });

    // Make HTTP request to Apache
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'arraybuffer',
      timeout: 30000,
      validateStatus: () => true // Accept any status
    });

    // Forward response
    Object.keys(response.headers).forEach(key => {
      res.setHeader(key, response.headers[key]);
    });

    res.status(response.status).send(response.data);
    logger.info('Successfully proxied MapServer response');

  } catch (error) {
    logger.error('Error proxying to MapServer', { error: error.message });
    res.status(500).json({
      error: 'Failed to proxy to MapServer',
      details: error.message
    });
  }
};

// WMS endpoint
app.get('/wms', handleMapServerRequest);

// WFS endpoint
app.get('/wfs', handleMapServerRequest);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`MapServer Service running on port ${PORT}`);
  logger.info(`Proxying to: ${MAPSERVER_URL}`);
  logger.info(`Mapfile: ${MAPFILE_PATH}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
'@

        $newService | Out-File $serviceFile -Encoding UTF8 -Force
        Write-Host "  [OK] Updated service to use HTTP proxy" -ForegroundColor Green

        # Update .env
        Write-Host "`n[4] Updating .env file..." -ForegroundColor Yellow
        $envContent = @"
# MapServer Service Environment - Windows Configuration
NODE_ENV=production
PORT=3008

# MapServer through Apache HTTP
MAPSERVER_URL=http://localhost/cgi-bin/mapserv.exe
MAPFILE_PATH=C:/ms4w/apps/dubao-matrung/mapfiles/laocai-windows.map

# Logging
LOG_LEVEL=info
"@

        $envFile = "C:\DuBaoMatRung\microservices\services\mapserver-service\.env"
        $envContent | Out-File $envFile -Encoding ASCII -Force
        Write-Host "  [OK] Updated .env" -ForegroundColor Green

        # Install axios if needed
        Write-Host "`n[5] Checking dependencies..." -ForegroundColor Yellow
        $packageJson = "C:\DuBaoMatRung\microservices\services\mapserver-service\package.json"

        if (Test-Path $packageJson) {
            $pkg = Get-Content $packageJson -Raw | ConvertFrom-Json

            if (!$pkg.dependencies.axios) {
                Write-Host "  Installing axios..." -ForegroundColor Gray
                Push-Location "C:\DuBaoMatRung\microservices\services\mapserver-service"
                npm install axios --save
                Pop-Location
                Write-Host "  [OK] Axios installed" -ForegroundColor Green
            } else {
                Write-Host "  [OK] Axios already installed" -ForegroundColor Green
            }
        }

        Write-Host "`n========================================" -ForegroundColor Cyan
        Write-Host "  SETUP COMPLETE!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan

        Write-Host "`nNow start the service:" -ForegroundColor Yellow
        Write-Host "  cd C:\DuBaoMatRung\microservices\services\mapserver-service" -ForegroundColor Gray
        Write-Host "  node src\index.js" -ForegroundColor Gray

        Write-Host "`nTest URLs:" -ForegroundColor Yellow
        Write-Host "  http://localhost:3008/health" -ForegroundColor Gray
        Write-Host "  http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities" -ForegroundColor Gray

    } else {
        Write-Host "`n[FAILED] MapServer response invalid" -ForegroundColor Red
        Write-Host "Response:" -ForegroundColor Yellow
        Write-Host $response.Content.Substring(0, [Math]::Min(500, $response.Content.Length)) -ForegroundColor Gray
    }

} catch {
    Write-Host "`n[ERROR] Cannot connect to Apache" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Gray

    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure Apache is running" -ForegroundColor White
    Write-Host "  2. Try accessing in browser: http://localhost" -ForegroundColor White
    Write-Host "  3. Check Windows Firewall" -ForegroundColor White
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
