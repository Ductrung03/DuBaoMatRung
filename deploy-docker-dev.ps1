# ===================================================================
# DOCKER DEPLOYMENT SCRIPT - DEVELOPMENT MODE
# Hot reload enabled - No rebuild needed for code changes
# ===================================================================

param(
    [switch]$FirstTime,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$PROJECT_PATH = "C:\DuBaoMatRung"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  DOCKER DEPLOYMENT - DEV MODE (Hot Reload)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

function Stop-Containers {
    Write-Host "=== Stopping containers ===" -ForegroundColor Yellow
    Set-Location $PROJECT_PATH

    try {
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
        Write-Host "  All containers stopped" -ForegroundColor Green
    } catch {
        Write-Host "  No containers running" -ForegroundColor Cyan
    }
}

function Start-DevMode {
    Write-Host "=== Starting services in DEV mode ===" -ForegroundColor Yellow
    Set-Location $PROJECT_PATH

    Write-Host "  Starting with hot reload enabled..." -ForegroundColor Cyan
    docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

    Write-Host ""
    Write-Host "✅ DEV MODE ACTIVE" -ForegroundColor Green
    Write-Host "  Code changes will auto-reload (no rebuild needed!)" -ForegroundColor Green
    Write-Host ""
}

function Show-DevStatus {
    Write-Host "=== Development Access ===" -ForegroundColor Green
    Write-Host "  Frontend:    http://103.56.161.239:5173 (Vite dev server)" -ForegroundColor Cyan
    Write-Host "  API Gateway: http://103.56.161.239:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=== Hot Reload Info ===" -ForegroundColor Yellow
    Write-Host "  ✓ Backend: Edit files in microservices/*/src -> Auto reload" -ForegroundColor White
    Write-Host "  ✓ Frontend: Edit files in client/src -> Auto reload" -ForegroundColor White
    Write-Host "  ✓ No docker rebuild needed!" -ForegroundColor White
    Write-Host ""
    Write-Host "=== Useful Commands ===" -ForegroundColor Yellow
    Write-Host "  View logs:       docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f [service]" -ForegroundColor White
    Write-Host "  Restart service: docker-compose -f docker-compose.yml -f docker-compose.dev.yml restart [service]" -ForegroundColor White
    Write-Host "  Stop all:        .\deploy-docker-dev.ps1 -Stop" -ForegroundColor White
}

try {
    if (-not (Test-Path $PROJECT_PATH)) {
        Write-Host "  ERROR: Project directory not found: $PROJECT_PATH" -ForegroundColor Red
        exit 1
    }

    if ($Stop) {
        Stop-Containers
        Write-Host "=== SERVICES STOPPED ===" -ForegroundColor Green
        exit 0
    }

    if ($FirstTime) {
        Write-Host "=== FIRST TIME - Building images ===" -ForegroundColor Yellow
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml build
    }

    Start-DevMode
    Show-DevStatus

    Write-Host ""
    Write-Host "=== DEV MODE STARTED! ===" -ForegroundColor Green
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "=== DEPLOYMENT ERROR ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    exit 1
}
