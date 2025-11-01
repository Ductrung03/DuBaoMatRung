# ===================================================================
# QUICK UPDATE SCRIPT
# Pull latest code and restart only changed services
# ===================================================================

param(
    [string[]]$Services = @()
)

$ErrorActionPreference = "Stop"
$PROJECT_PATH = "C:\DuBaoMatRung"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "  QUICK UPDATE - Smart Restart" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PROJECT_PATH

# Pull latest code
Write-Host "=== Pulling latest code ===" -ForegroundColor Yellow
try {
    git fetch origin
    $gitStatus = git status -sb
    Write-Host "  $gitStatus" -ForegroundColor Cyan

    git pull origin main
    Write-Host "  ✓ Code updated" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Git pull failed: $_" -ForegroundColor Red
    exit 1
}

# Determine which services to restart
if ($Services.Count -eq 0) {
    Write-Host ""
    Write-Host "=== Detecting changed files ===" -ForegroundColor Yellow

    # Get list of changed files
    $changedFiles = git diff --name-only HEAD@{1} HEAD

    $servicesToRestart = @()

    foreach ($file in $changedFiles) {
        Write-Host "  Changed: $file" -ForegroundColor Cyan

        if ($file -like "client/*") {
            if ($servicesToRestart -notcontains "client") {
                $servicesToRestart += "client"
            }
        }
        elseif ($file -like "microservices/gateway/*") {
            if ($servicesToRestart -notcontains "gateway") {
                $servicesToRestart += "gateway"
            }
        }
        elseif ($file -like "microservices/services/auth-service/*") {
            if ($servicesToRestart -notcontains "auth-service") {
                $servicesToRestart += "auth-service"
            }
        }
        elseif ($file -like "microservices/services/user-service/*") {
            if ($servicesToRestart -notcontains "user-service") {
                $servicesToRestart += "user-service"
            }
        }
        elseif ($file -like "microservices/services/gis-service/*") {
            if ($servicesToRestart -notcontains "gis-service") {
                $servicesToRestart += "gis-service"
            }
        }
        elseif ($file -like "microservices/services/report-service/*") {
            if ($servicesToRestart -notcontains "report-service") {
                $servicesToRestart += "report-service"
            }
        }
        elseif ($file -like "microservices/services/admin-service/*") {
            if ($servicesToRestart -notcontains "admin-service") {
                $servicesToRestart += "admin-service"
            }
        }
        elseif ($file -like "microservices/services/search-service/*") {
            if ($servicesToRestart -notcontains "search-service") {
                $servicesToRestart += "search-service"
            }
        }
        elseif ($file -like "docker-compose.yml" -or $file -like ".env*") {
            Write-Host "  ! Infrastructure files changed - full restart recommended" -ForegroundColor Yellow
        }
    }

    $Services = $servicesToRestart
}

if ($Services.Count -eq 0) {
    Write-Host ""
    Write-Host "  No services to restart (no code changes detected)" -ForegroundColor Green
    Write-Host ""
    exit 0
}

Write-Host ""
Write-Host "=== Restarting services ===" -ForegroundColor Yellow
foreach ($service in $Services) {
    Write-Host "  Restarting: $service" -ForegroundColor Cyan

    # Rebuild and restart the service
    docker-compose build $service
    docker-compose up -d $service

    Write-Host "  ✓ $service restarted" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Status ===" -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "=== UPDATE COMPLETE! ===" -ForegroundColor Green
Write-Host "  Restarted services: $($Services -join ', ')" -ForegroundColor Cyan
Write-Host ""
