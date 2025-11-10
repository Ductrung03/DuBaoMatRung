# ===================================================================
# Du Bao Mat Rung - Docker Deployment Script for Windows
# PostgreSQL 17 + PostGIS 17 + MongoDB 7 + Redis 7
# ===================================================================

param(
    [switch]$FirstTime,
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Rebuild,
    [switch]$Logs,
    [string]$Service = "",
    [switch]$CleanAll,
    [switch]$ExportDB,
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
Du Bao Mat Rung - Docker Deployment Script
PostgreSQL 17 + PostGIS 17 + MongoDB 7 + Redis 7
===================================================================

Usage:
  .\deploy.ps1 [OPTIONS]

Options:
  -FirstTime        First time setup (import database, build everything)
  -Stop             Stop all services
  -Restart          Restart all services (no rebuild)
  -Rebuild          Rebuild and restart all services
  -Logs             Show logs (follow mode)
  -Service <name>   Target specific service (use with -Rebuild, -Restart, -Logs)
  -ExportDB         Export all databases to docker-init folders
  -CleanAll         Remove all containers, volumes, and images (DANGEROUS!)
  -Help             Show this help message

Examples:
  # First time deployment (automatically imports databases)
  .\deploy.ps1 -FirstTime

  # Stop all services
  .\deploy.ps1 -Stop

  # Quick restart (no rebuild)
  .\deploy.ps1 -Restart

  # Full rebuild and restart
  .\deploy.ps1 -Rebuild

  # Rebuild specific service
  .\deploy.ps1 -Rebuild -Service "client"

  # View logs
  .\deploy.ps1 -Logs
  .\deploy.ps1 -Logs -Service "auth-service"

  # Export all databases
  .\deploy.ps1 -ExportDB

  # Clean everything (CAUTION!)
  .\deploy.ps1 -CleanAll

===================================================================
"@
    exit 0
}

# Check if Docker is running
Write-Info "Checking Docker status..."
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running! Please start Docker Desktop first."
    exit 1
}

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Warning ".env file not found! Creating default .env file..."
    @"
# Database Password (change this in production!)
DB_PASSWORD=postgres123

# JWT Secret (change this in production!)
JWT_SECRET=$(([guid]::NewGuid().ToString()) -replace '-','')

# Environment
NODE_ENV=production

# Frontend URL (change to your domain in production)
FRONTEND_URL=http://localhost:5173
"@ | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "Created .env file with default values"
    Write-Warning "IMPORTANT: Please review and update .env file before production deployment!"
}

# Stop services
if ($Stop) {
    Write-Info "Stopping all services..."
    docker-compose down
    Write-Success "All services stopped"
    exit 0
}

# Export databases
if ($ExportDB) {
    Write-Info "====================================================================="
    Write-Info "EXPORTING ALL DATABASES"
    Write-Info "====================================================================="

    # Check if containers are running
    $running = docker-compose ps --services --filter "status=running" 2>&1
    if ($LASTEXITCODE -ne 0 -or $running.Count -eq 0) {
        Write-Error "No services are running! Please start services first."
        exit 1
    }

    # Create export directories
    New-Item -ItemType Directory -Force -Path "docker-init/postgres" | Out-Null
    New-Item -ItemType Directory -Force -Path "docker-init/postgis" | Out-Null
    New-Item -ItemType Directory -Force -Path "docker-init/admin-postgis" | Out-Null
    New-Item -ItemType Directory -Force -Path "docker-init/mongodb" | Out-Null

    # Export auth_db (PostgreSQL)
    Write-Info "Exporting auth_db..."
    docker exec dubaomatrung-postgres pg_dump -U postgres -d auth_db --clean --if-exists | Out-File -FilePath "docker-init/postgres/01-auth-db.sql" -Encoding UTF8
    Write-Success "auth_db exported to docker-init/postgres/01-auth-db.sql"

    # Export gis_db (PostGIS)
    Write-Info "Exporting gis_db..."
    docker exec dubaomatrung-postgis pg_dump -U postgres -d gis_db --clean --if-exists | Out-File -FilePath "docker-init/postgis/01-gis-db.sql" -Encoding UTF8
    Write-Success "gis_db exported to docker-init/postgis/01-gis-db.sql"

    # Export admin_db (PostGIS) - This may take several minutes
    Write-Info "Exporting admin_db (this may take 5-10 minutes for large database)..."
    $startTime = Get-Date
    docker exec dubaomatrung-admin-postgis pg_dump -U postgres -d admin_db --clean --if-exists | Out-File -FilePath "docker-init/admin-postgis/01-admin-db.sql" -Encoding UTF8
    $duration = ((Get-Date) - $startTime).TotalSeconds
    Write-Success "admin_db exported to docker-init/admin-postgis/01-admin-db.sql (took $([math]::Round($duration, 1))s)"

    # Export MongoDB
    Write-Info "Exporting MongoDB logging_db..."
    docker exec dubaomatrung-mongodb mongodump --db=logging_db --archive | Out-File -FilePath "docker-init/mongodb/logging_db.archive" -Encoding Byte
    Write-Success "MongoDB logging_db exported to docker-init/mongodb/logging_db.archive"

    # Show file sizes
    Write-Info "`nExported file sizes:"
    Get-ChildItem -Path "docker-init" -Recurse -File | Select-Object FullName, @{Name="Size";Expression={"{0:N2} MB" -f ($_.Length / 1MB)}} | Format-Table -AutoSize

    Write-Success "`n====================================================================="
    Write-Success "DATABASE EXPORT COMPLETED!"
    Write-Success "====================================================================="
    exit 0
}

# Clean all
if ($CleanAll) {
    Write-Warning "WARNING: This will remove ALL containers, volumes, and images!"
    $confirm = Read-Host "Are you sure? Type 'YES' to confirm"
    if ($confirm -ne "YES") {
        Write-Info "Cancelled"
        exit 0
    }

    Write-Info "Stopping all containers..."
    docker-compose down -v

    Write-Info "Removing all project images..."
    docker images | Select-String "dubaomatrung" | ForEach-Object {
        $line = $_.Line
        if ($line -match '\s+([a-f0-9]{12})\s+') {
            $imageId = $matches[1]
            Write-Info "  Removing image $imageId"
            docker rmi -f $imageId
        }
    }

    Write-Success "Clean completed"
    exit 0
}

# First time setup
if ($FirstTime) {
    Write-Info "====================================================================="
    Write-Info "FIRST TIME SETUP - PostgreSQL 17 + PostGIS 17 Edition"
    Write-Info "This will take 10-20 minutes depending on database size"
    Write-Info "====================================================================="

    # Check if docker-init folder exists
    if (-not (Test-Path "docker-init")) {
        Write-Error "docker-init folder not found!"
        Write-Error "Please make sure database dumps are in docker-init/ folder:"
        Write-Error "  - docker-init/postgres/01-auth-db.sql"
        Write-Error "  - docker-init/postgis/01-gis-db.sql"
        Write-Error "  - docker-init/admin-postgis/01-admin-db.sql"
        exit 1
    }

    Write-Info "Checking database dumps..."
    $authDump = Test-Path "docker-init/postgres/01-auth-db.sql"
    $gisDump = Test-Path "docker-init/postgis/01-gis-db.sql"
    $adminDump = Test-Path "docker-init/admin-postgis/01-admin-db.sql"

    if (-not $authDump) { Write-Warning "  auth_db dump not found - database will be empty" }
    if (-not $gisDump) { Write-Warning "  gis_db dump not found - database will be empty" }
    if (-not $adminDump) { Write-Warning "  admin_db dump not found - database will be empty" }

    if ($authDump -and $gisDump -and $adminDump) {
        Write-Success "All database dumps found"
    }

    Write-Info "`nStep 1/4: Pulling Docker images (PostgreSQL 17, PostGIS 17, MongoDB 7, Redis 7)..."
    docker-compose pull

    Write-Info "`nStep 2/4: Building services (this may take 10-15 minutes)..."
    docker-compose build --no-cache

    Write-Info "`nStep 3/4: Starting services..."
    docker-compose up -d

    Write-Info "`nStep 4/4: Waiting for services to initialize..."
    Write-Info "Database import happens automatically on first start..."
    Write-Info "Large databases (like admin_db 2.5GB) may take 5-10 minutes to import..."
    Start-Sleep -Seconds 15

    # Monitor database initialization
    Write-Info "`nMonitoring database initialization:"

    $maxWait = 300 # 5 minutes
    $waited = 0
    $interval = 5

    while ($waited -lt $maxWait) {
        $postgres = docker exec dubaomatrung-postgres pg_isready -U postgres 2>&1
        $postgis = docker exec dubaomatrung-postgis pg_isready -U postgres 2>&1
        $adminPostgis = docker exec dubaomatrung-admin-postgis pg_isready -U postgres 2>&1

        $allReady = ($postgres -like "*accepting connections*") -and
                    ($postgis -like "*accepting connections*") -and
                    ($adminPostgis -like "*accepting connections*")

        if ($allReady) {
            Write-Success "All databases are ready!"
            break
        }

        Write-Info "  Waiting for databases to be ready... ($waited/$maxWait seconds)"
        Start-Sleep -Seconds $interval
        $waited += $interval
    }

    if ($waited -ge $maxWait) {
        Write-Warning "Database initialization taking longer than expected."
        Write-Warning "Check logs with: .\deploy.ps1 -Logs -Service admin-postgis"
    }

    # Show status
    Write-Info "`nService Status:"
    docker-compose ps

    Write-Success "`n====================================================================="
    Write-Success "DEPLOYMENT COMPLETED!"
    Write-Success "====================================================================="
    Write-Info "Frontend:      http://localhost:5173"
    Write-Info "API Gateway:   http://localhost:3000"
    Write-Info "Auth Service:  http://localhost:3001"
    Write-Info "User Service:  http://localhost:3002"
    Write-Info "GIS Service:   http://localhost:3003"
    Write-Info "Report Serv:   http://localhost:3004"
    Write-Info "Admin Serv:    http://localhost:3005"
    Write-Info "Search Serv:   http://localhost:3006"
    Write-Info "MapServer:     http://localhost:3007"
    Write-Info ""
    Write-Info "PostgreSQL:    localhost:5432 (auth_db)"
    Write-Info "PostGIS:       localhost:5433 (gis_db)"
    Write-Info "Admin PostGIS: localhost:5434 (admin_db)"
    Write-Info "MongoDB:       localhost:27017"
    Write-Info "Redis:         localhost:6379"
    Write-Info ""
    Write-Info "Useful commands:"
    Write-Info "  .\deploy.ps1 -Logs              # View all logs"
    Write-Info "  .\deploy.ps1 -Restart           # Restart services"
    Write-Info "  .\deploy.ps1 -ExportDB          # Export all databases"
    Write-Info "  .\deploy.ps1 -Stop              # Stop all services"
    exit 0
}

# Restart services
if ($Restart) {
    if ($Service) {
        Write-Info "Restarting service: $Service"
        docker-compose restart $Service
        Write-Success "Service $Service restarted"
    } else {
        Write-Info "Restarting all services..."
        docker-compose restart
        Write-Success "All services restarted"
    }
    docker-compose ps
    exit 0
}

# Rebuild services
if ($Rebuild) {
    if ($Service) {
        Write-Info "Rebuilding service: $Service"
        docker-compose build $Service
        docker-compose up -d $Service
        Write-Success "Service $Service rebuilt and restarted"
    } else {
        Write-Info "Rebuilding all services..."
        docker-compose build
        docker-compose up -d
        Write-Success "All services rebuilt and restarted"
    }
    docker-compose ps
    exit 0
}

# Show logs
if ($Logs) {
    if ($Service) {
        Write-Info "Showing logs for: $Service (Ctrl+C to exit)"
        docker-compose logs -f $Service
    } else {
        Write-Info "Showing all logs (Ctrl+C to exit)"
        docker-compose logs -f
    }
    exit 0
}

# Default: Start services
Write-Info "Starting services..."
docker-compose up -d

Write-Success "Services started!"
docker-compose ps

Write-Info ""
Write-Info "Frontend: http://localhost:5173"
Write-Info "Gateway:  http://localhost:3000"
Write-Info ""
Write-Info "Useful commands:"
Write-Info "  .\deploy.ps1 -Logs              # View all logs"
Write-Info "  .\deploy.ps1 -Restart           # Restart services"
Write-Info "  .\deploy.ps1 -ExportDB          # Export databases"
Write-Info "  .\deploy.ps1 -Stop              # Stop all services"
Write-Info "  .\deploy.ps1 -Help              # Show all options"
