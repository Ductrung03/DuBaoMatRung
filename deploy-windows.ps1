# ===================================================================
# SCRIPT DEPLOYMENT FOR WINDOWS SERVER
# Du Bao Mat Rung System
# ===================================================================

param(
    [switch]$FirstTime,
    [switch]$UpdateOnly
)

$ErrorActionPreference = "Stop"

# ===================================================================
# CONFIGURATION
# ===================================================================
$PROJECT_NAME = "DuBaoMatRung"
$DEPLOY_PATH = "C:\Projects\$PROJECT_NAME"

# Database config
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "dubaomatrung"
$DB_USER = "postgres"
$DB_PASSWORD = "your_password_here"

# Service ports
$GATEWAY_PORT = 3000
$AUTH_PORT = 3001
$USER_PORT = 3002
$GIS_PORT = 3003
$REPORT_PORT = 3004
$ADMIN_PORT = 3005
$SEARCH_PORT = 3006
$MAPSERVER_PORT = 3007
$CLIENT_PORT = 5173

# ===================================================================
# FUNCTIONS
# ===================================================================

function Check-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Check-Prerequisites {
    Write-Host ""
    Write-Host "=== Checking system requirements ===" -ForegroundColor Yellow

    if (Check-Command "node") {
        $nodeVersion = node --version
        Write-Host "  Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  Node.js not installed!" -ForegroundColor Red
        Write-Host "  Download from: https://nodejs.org" -ForegroundColor Yellow
        exit 1
    }

    if (Check-Command "npm") {
        $npmVersion = npm --version
        Write-Host "  npm: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  npm not installed!" -ForegroundColor Red
        exit 1
    }

    if (Check-Command "git") {
        $gitVersion = git --version
        Write-Host "  Git: $gitVersion" -ForegroundColor Green
    } else {
        Write-Host "  Git not installed!" -ForegroundColor Red
        Write-Host "  Download from: https://git-scm.com" -ForegroundColor Yellow
        exit 1
    }

    if (Check-Command "psql") {
        Write-Host "  PostgreSQL: Installed" -ForegroundColor Green
    } else {
        Write-Host "  PostgreSQL not installed!" -ForegroundColor Red
        Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
        exit 1
    }

    if (Check-Command "pm2") {
        Write-Host "  PM2: Installed" -ForegroundColor Green
    } else {
        Write-Host "  PM2 not installed. Installing..." -ForegroundColor Yellow
        npm install -g pm2
        npm install -g pm2-windows-startup
        pm2-startup install
        Write-Host "  PM2 installed successfully" -ForegroundColor Green
    }
}

function Stop-Services {
    Write-Host ""
    Write-Host "=== Stopping services ===" -ForegroundColor Yellow

    if (Check-Command "pm2") {
        pm2 stop all 2>$null
        pm2 delete all 2>$null
    }

    $ports = @($GATEWAY_PORT, $AUTH_PORT, $USER_PORT, $GIS_PORT, $REPORT_PORT, $ADMIN_PORT, $SEARCH_PORT, $MAPSERVER_PORT, $CLIENT_PORT)

    foreach ($port in $ports) {
        $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connection) {
            $processId = $connection.OwningProcess
            Write-Host "  Stopping process on port $port (PID: $processId)" -ForegroundColor Cyan
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }

    Write-Host "  All services stopped" -ForegroundColor Green
}

function Update-Code {
    Write-Host ""
    Write-Host "=== Updating code from Git ===" -ForegroundColor Yellow

    if (-not (Test-Path $DEPLOY_PATH)) {
        Write-Host "  ERROR: Project directory not found: $DEPLOY_PATH" -ForegroundColor Red
        Write-Host "  Please make sure you have cloned the repository to $DEPLOY_PATH" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  Updating code..." -ForegroundColor Cyan
    Set-Location $DEPLOY_PATH
    git fetch origin
    git reset --hard origin/main
    git pull origin main

    Write-Host "  Code updated successfully" -ForegroundColor Green
}

function Setup-Environment {
    Write-Host ""
    Write-Host "=== Setting up environment variables ===" -ForegroundColor Yellow

    $microservicesEnv = @"
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# JWT Secret
JWT_SECRET=$(New-Guid)
JWT_REFRESH_SECRET=$(New-Guid)
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Services Ports
GATEWAY_PORT=$GATEWAY_PORT
AUTH_SERVICE_PORT=$AUTH_PORT
USER_SERVICE_PORT=$USER_PORT
GIS_SERVICE_PORT=$GIS_PORT
REPORT_SERVICE_PORT=$REPORT_PORT
ADMIN_SERVICE_PORT=$ADMIN_PORT
SEARCH_SERVICE_PORT=$SEARCH_PORT
MAPSERVER_SERVICE_PORT=$MAPSERVER_PORT

# Environment
NODE_ENV=production

# CORS
CORS_ORIGIN=http://localhost:$CLIENT_PORT,http://103.56.161.239
"@

    $microservicesEnv | Out-File -FilePath "$DEPLOY_PATH\microservices\.env" -Encoding UTF8
    Write-Host "  Created .env for microservices" -ForegroundColor Green

    $clientEnv = @"
VITE_API_URL=http://localhost:$GATEWAY_PORT
VITE_API_TIMEOUT=30000
"@

    $clientEnv | Out-File -FilePath "$DEPLOY_PATH\client\.env" -Encoding UTF8
    Write-Host "  Created .env for client" -ForegroundColor Green
}

function Install-Dependencies {
    Write-Host ""
    Write-Host "=== Installing dependencies ===" -ForegroundColor Yellow

    Set-Location $DEPLOY_PATH

    Write-Host "  Installing root dependencies..." -ForegroundColor Cyan
    npm install

    Write-Host "  Installing microservices dependencies..." -ForegroundColor Cyan
    Set-Location "$DEPLOY_PATH\microservices"
    npm install

    Write-Host "  Installing client dependencies..." -ForegroundColor Cyan
    Set-Location "$DEPLOY_PATH\client"
    npm install

    Write-Host "  All dependencies installed" -ForegroundColor Green
}

function Setup-Database {
    Write-Host ""
    Write-Host "=== Setting up database ===" -ForegroundColor Yellow

    $env:PGPASSWORD = $DB_PASSWORD
    $dbExists = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | Select-String -Pattern $DB_NAME

    if (-not $dbExists) {
        Write-Host "  Creating new database..." -ForegroundColor Cyan
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    } else {
        Write-Host "  Database already exists" -ForegroundColor Cyan
    }

    if (Test-Path "$DEPLOY_PATH\microservices\migrations") {
        Write-Host "  Running database migrations..." -ForegroundColor Cyan
        Set-Location "$DEPLOY_PATH\microservices"
    }

    Write-Host "  Database ready" -ForegroundColor Green
}

function Build-Frontend {
    Write-Host ""
    Write-Host "=== Building frontend ===" -ForegroundColor Yellow

    Set-Location "$DEPLOY_PATH\client"
    npm run build

    Write-Host "  Frontend built successfully" -ForegroundColor Green
}

function Start-Services {
    Write-Host ""
    Write-Host "=== Starting services ===" -ForegroundColor Yellow

    Set-Location "$DEPLOY_PATH\microservices"

    $services = @(
        @{Name="gateway"; Path="gateway"; Script="src/index.js"; Port=$GATEWAY_PORT},
        @{Name="auth-service"; Path="services/auth-service"; Script="src/index.js"; Port=$AUTH_PORT},
        @{Name="user-service"; Path="services/user-service"; Script="src/index.js"; Port=$USER_PORT},
        @{Name="gis-service"; Path="services/gis-service"; Script="src/index.js"; Port=$GIS_PORT},
        @{Name="report-service"; Path="services/report-service"; Script="src/index.js"; Port=$REPORT_PORT},
        @{Name="admin-service"; Path="services/admin-service"; Script="src/index.js"; Port=$ADMIN_PORT},
        @{Name="search-service"; Path="services/search-service"; Script="src/index.js"; Port=$SEARCH_PORT},
        @{Name="mapserver-service"; Path="services/mapserver-service"; Script="src/index.js"; Port=$MAPSERVER_PORT}
    )

    foreach ($service in $services) {
        $serviceName = $service.Name
        $servicePort = $service.Port
        $servicePath = "$DEPLOY_PATH\microservices\$($service.Path)\$($service.Script)"
        Write-Host "  Starting $serviceName on port $servicePort..." -ForegroundColor Cyan
        pm2 start $servicePath --name $serviceName --node-args="--max-old-space-size=2048"
    }

    Write-Host "  Starting frontend on port $CLIENT_PORT..." -ForegroundColor Cyan
    pm2 serve "$DEPLOY_PATH\client\dist" $CLIENT_PORT --name "client" --spa

    pm2 save

    Write-Host "  All services started" -ForegroundColor Green
}

function Show-Status {
    Write-Host ""
    Write-Host "=== System Status ===" -ForegroundColor Yellow

    pm2 status

    Write-Host ""
    Write-Host "=== Access Information ===" -ForegroundColor Green
    Write-Host "  Frontend: http://103.56.161.239:$CLIENT_PORT" -ForegroundColor Cyan
    Write-Host "  API Gateway: http://103.56.161.239:$GATEWAY_PORT" -ForegroundColor Cyan
    Write-Host "  Swagger Docs: http://103.56.161.239:$GATEWAY_PORT/api-docs" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "=== Management Commands ===" -ForegroundColor Yellow
    Write-Host "  View logs:      pm2 logs" -ForegroundColor White
    Write-Host "  Stop services:  pm2 stop all" -ForegroundColor White
    Write-Host "  Restart:        pm2 restart all" -ForegroundColor White
    Write-Host "  Delete:         pm2 delete all" -ForegroundColor White
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT SYSTEM - DU BAO MAT RUNG" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    Check-Prerequisites

    if ($UpdateOnly) {
        Write-Host ""
        Write-Host "=== QUICK UPDATE MODE ===" -ForegroundColor Green
        Stop-Services
        Update-Code
        Install-Dependencies
        Build-Frontend
        Start-Services
    } else {
        if ($FirstTime) {
            Write-Host ""
            Write-Host "=== FIRST TIME DEPLOYMENT ===" -ForegroundColor Green
            Setup-Database
        }

        Stop-Services
        Update-Code
        Setup-Environment
        Install-Dependencies
        Build-Frontend
        Start-Services
    }

    Show-Status

    Write-Host ""
    Write-Host "=== DEPLOYMENT SUCCESSFUL! ===" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "=== DEPLOYMENT ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
}
