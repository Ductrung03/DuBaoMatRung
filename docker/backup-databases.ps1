# =====================================
# Database Backup Script for Windows
# =====================================

$ErrorActionPreference = "Stop"

$BACKUP_DIR = "backups\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Force -Path $BACKUP_DIR | Out-Null

$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "4" }
$CONTAINER_NAME = "dubaomatrung-postgres"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "DuBaoMatRung - Database Backup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Backup directory: $BACKUP_DIR"
Write-Host ""

# Check if container is running
$containerRunning = docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}"
if ($containerRunning -ne $CONTAINER_NAME) {
    Write-Host "Error: PostgreSQL container is not running!" -ForegroundColor Red
    exit 1
}

# Backup auth_db
Write-Host "[1/3] Backing up auth_db..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME pg_dump -U postgres -d auth_db --clean --if-exists | Out-File -FilePath "$BACKUP_DIR\auth_db.sql" -Encoding UTF8
Write-Host "✓ auth_db backed up successfully" -ForegroundColor Green

# Backup gis_db
Write-Host "[2/3] Backing up gis_db..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME pg_dump -U postgres -d gis_db --clean --if-exists | Out-File -FilePath "$BACKUP_DIR\gis_db.sql" -Encoding UTF8
Write-Host "✓ gis_db backed up successfully" -ForegroundColor Green

# Backup admin_db
Write-Host "[3/3] Backing up admin_db..." -ForegroundColor Yellow
docker exec $CONTAINER_NAME pg_dump -U postgres -d admin_db --clean --if-exists | Out-File -FilePath "$BACKUP_DIR\admin_db.sql" -Encoding UTF8
Write-Host "✓ admin_db backed up successfully" -ForegroundColor Green

# Create backup info file
@"
Backup Information
==================
Date: $(Get-Date)
PostgreSQL Version: $(docker exec $CONTAINER_NAME psql -U postgres -t -c "SELECT version();")
Databases: auth_db, gis_db, admin_db

Files:
- auth_db.sql
- gis_db.sql
- admin_db.sql
"@ | Out-File -FilePath "$BACKUP_DIR\backup_info.txt"

# Create compressed archive
Write-Host ""
Write-Host "Creating compressed archive..." -ForegroundColor Yellow
Compress-Archive -Path $BACKUP_DIR -DestinationPath "$BACKUP_DIR.zip"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✓ Backup completed successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Location: $BACKUP_DIR"
Write-Host "Archive: $BACKUP_DIR.zip"
Write-Host ""
