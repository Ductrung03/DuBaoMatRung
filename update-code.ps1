# ===================================================================
# QUICK UPDATE SCRIPT FOR WINDOWS SERVER
# Du Bao Mat Rung System
# ===================================================================

$ErrorActionPreference = "Stop"
$PROJECT_PATH = "C:\DuBaoMatRung"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  QUICK CODE UPDATE - DU BAO MAT RUNG" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

try {
    if (-not (Test-Path $PROJECT_PATH)) {
        Write-Host "  Project directory not found: $PROJECT_PATH" -ForegroundColor Red
        exit 1
    }

    Set-Location $PROJECT_PATH

    Write-Host "[1/7] Saving PM2 configuration..." -ForegroundColor Yellow
    pm2 save

    Write-Host "[2/7] Stopping services..." -ForegroundColor Yellow
    pm2 stop all

    Write-Host "[3/7] Pulling code from Git..." -ForegroundColor Yellow
    git fetch origin
    $currentBranch = git branch --show-current
    Write-Host "  Current branch: $currentBranch" -ForegroundColor Cyan
    git pull origin $currentBranch

    Write-Host "[4/7] Updating dependencies..." -ForegroundColor Yellow

    if (Test-Path "package.json") {
        npm install --production
    }

    if (Test-Path "microservices/package.json") {
        Set-Location "$PROJECT_PATH\microservices"
        npm install --production
    }

    if (Test-Path "$PROJECT_PATH\client\package.json") {
        Set-Location "$PROJECT_PATH\client"
        npm install
    }

    Write-Host "[5/7] Building frontend..." -ForegroundColor Yellow
    Set-Location "$PROJECT_PATH\client"
    npm run build

    Write-Host "[6/7] Restarting services..." -ForegroundColor Yellow
    pm2 restart all

    Write-Host "[7/7] Reloading PM2..." -ForegroundColor Yellow
    pm2 reload all

    Write-Host ""
    Write-Host "=== System Status ===" -ForegroundColor Green
    pm2 status

    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL! ===" -ForegroundColor Green
    Write-Host "  Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "=== UPDATE ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    Write-Host ""
    Write-Host "Trying to restart services..." -ForegroundColor Yellow
    pm2 restart all

    exit 1
}
