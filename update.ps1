# ===================================================================
# Quick Update Script - Fast code update for Windows
# ===================================================================

param(
    [string[]]$Services = @(),
    [switch]$AutoDetect,
    [switch]$All,
    [switch]$Help
)

# Colors for output
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Show help
if ($Help) {
    Write-Info @"

===================================================================
Quick Update Script - Fast Code Update
===================================================================

Usage:
  .\update.ps1 [OPTIONS]

Options:
  -AutoDetect       Auto-detect changed files from git and rebuild affected services
  -All              Rebuild all services (same as deploy.ps1 -Rebuild)
  -Services <list>  Rebuild specific services
  -Help             Show this help message

Examples:
  # Auto-detect changes from git
  .\update.ps1 -AutoDetect

  # Update specific services
  .\update.ps1 -Services client,auth-service

  # Update all services
  .\update.ps1 -All

  # Interactive mode (default)
  .\update.ps1

Available Services:
  - client
  - gateway
  - auth-service
  - user-service
  - gis-service
  - report-service
  - admin-service
  - search-service
  - mapserver-service

===================================================================
"@
    exit 0
}

# Check if Docker is running
$dockerRunning = docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is not running! Please start Docker Desktop first."
    exit 1
}

# All available services
$allServices = @(
    "client",
    "gateway",
    "auth-service",
    "user-service",
    "gis-service",
    "report-service",
    "admin-service",
    "search-service",
    "mapserver-service"
)

# Auto-detect changes from git
if ($AutoDetect) {
    Write-Info "Auto-detecting changes from git..."

    # Get changed files
    $changedFiles = git diff --name-only HEAD~1 HEAD 2>$null

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Not a git repository or no changes found"
        Write-Info "Using manual selection instead..."
        $AutoDetect = $false
    } else {
        $affectedServices = @()

        foreach ($file in $changedFiles) {
            if ($file -like "client/*") {
                $affectedServices += "client"
            }
            elseif ($file -like "microservices/gateway/*") {
                $affectedServices += "gateway"
            }
            elseif ($file -like "microservices/services/auth-service/*") {
                $affectedServices += "auth-service"
            }
            elseif ($file -like "microservices/services/user-service/*") {
                $affectedServices += "user-service"
            }
            elseif ($file -like "microservices/services/gis-service/*") {
                $affectedServices += "gis-service"
            }
            elseif ($file -like "microservices/services/report-service/*") {
                $affectedServices += "report-service"
            }
            elseif ($file -like "microservices/services/admin-service/*") {
                $affectedServices += "admin-service"
            }
            elseif ($file -like "microservices/services/search-service/*") {
                $affectedServices += "search-service"
            }
            elseif ($file -like "microservices/services/mapserver-service/*") {
                $affectedServices += "mapserver-service"
            }
            elseif ($file -like "docker-compose*.yml" -or $file -like "Dockerfile*") {
                Write-Warning "Docker configuration changed - rebuilding ALL services"
                $affectedServices = $allServices
                break
            }
        }

        $Services = $affectedServices | Select-Object -Unique

        if ($Services.Count -eq 0) {
            Write-Warning "No affected services detected"
            Write-Info "Changed files:"
            $changedFiles | ForEach-Object { Write-Info "  - $_" }
            Write-Info ""
            Write-Info "You may need to rebuild manually with: .\update.ps1 -Services <service-name>"
            exit 0
        }

        Write-Info "Affected services detected:"
        $Services | ForEach-Object { Write-Info "  - $_" }
    }
}

# Rebuild all services
if ($All) {
    Write-Info "Rebuilding ALL services..."
    docker-compose build
    docker-compose up -d
    Write-Success "All services rebuilt and restarted"
    docker-compose ps
    exit 0
}

# Interactive mode if no services specified
if ($Services.Count -eq 0 -and -not $AutoDetect) {
    Write-Info "====================================================================="
    Write-Info "Interactive Update Mode"
    Write-Info "====================================================================="
    Write-Info "Select services to update (comma-separated numbers or 'all'):"
    Write-Info ""

    for ($i = 0; $i -lt $allServices.Count; $i++) {
        Write-Info "  $($i+1). $($allServices[$i])"
    }
    Write-Info ""
    Write-Info "  0. All services"
    Write-Info ""

    $selection = Read-Host "Enter selection (e.g., 1,3,5 or 'all')"

    if ($selection -eq "0" -or $selection -eq "all") {
        $Services = $allServices
    }
    else {
        $indices = $selection -split ',' | ForEach-Object { $_.Trim() }
        $Services = @()
        foreach ($idx in $indices) {
            $num = [int]$idx - 1
            if ($num -ge 0 -and $num -lt $allServices.Count) {
                $Services += $allServices[$num]
            }
        }
    }

    if ($Services.Count -eq 0) {
        Write-Error "No valid services selected"
        exit 1
    }
}

# Rebuild selected services
Write-Info "====================================================================="
Write-Info "Rebuilding services: $($Services -join ', ')"
Write-Info "====================================================================="

$startTime = Get-Date

foreach ($service in $Services) {
    Write-Info "Building $service..."
    docker-compose build $service

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build $service"
        exit 1
    }

    Write-Info "Starting $service..."
    docker-compose up -d $service

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start $service"
        exit 1
    }

    Write-Success "$service updated successfully"
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Success "====================================================================="
Write-Success "Update completed in $($duration.TotalSeconds) seconds"
Write-Success "====================================================================="

# Show status
docker-compose ps

Write-Info ""
Write-Info "View logs: .\deploy.ps1 -Logs -Service <service-name>"
