# ===== IMPORT ADMIN_DB DATA =====

param(
    [switch]$Force = $false
)

Write-Host "=== IMPORT DU LIEU ADMIN_DB ===" -ForegroundColor Cyan

# Kiem tra file SQL co ton tai
$sqlFile = "docker-init\admin-postgis\admin_db_data_only.sql"
if (-not (Test-Path $sqlFile)) {
    Write-Host "[ERROR] Khong tim thay file: $sqlFile" -ForegroundColor Red
    Write-Host "Hay copy file admin_db_data_only.sql vao thu muc docker-init\admin-postgis\" -ForegroundColor Yellow
    exit 1
}

# Hien thi thong tin file
$fileInfo = Get-Item $sqlFile
Write-Host "[1] Thong tin file SQL:" -ForegroundColor Yellow
Write-Host "  - Duong dan: $($fileInfo.FullName)" -ForegroundColor Cyan
Write-Host "  - Kich thuoc: $([math]::Round($fileInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "  - Ngay tao: $($fileInfo.CreationTime)" -ForegroundColor Cyan

# Kiem tra container admin-postgis
Write-Host "`n[2] Kiem tra container admin-postgis..." -ForegroundColor Yellow
try {
    $containerStatus = docker ps --filter "name=dubaomatrung-admin-postgis" --format "{{.Status}}"
    if ($containerStatus -like "*Up*") {
        Write-Host "  [OK] Container dang chay: $containerStatus" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Container khong chay, dang khoi dong..." -ForegroundColor Red
        docker-compose up -d admin-postgis
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "  [ERROR] Loi kiem tra container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiem tra database co ton tai
Write-Host "`n[3] Kiem tra database admin_db..." -ForegroundColor Yellow
try {
    $dbExists = docker exec dubaomatrung-admin-postgis psql -U postgres -lqt | Select-String "admin_db"
    if ($dbExists) {
        Write-Host "  [OK] Database admin_db da ton tai" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] Database admin_db khong ton tai, dang tao..." -ForegroundColor Yellow
        docker exec dubaomatrung-admin-postgis psql -U postgres -c "CREATE DATABASE admin_db;"
        docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "CREATE EXTENSION IF NOT EXISTS postgis;"
        Write-Host "  [OK] Da tao database voi PostGIS extension" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARNING] Khong the kiem tra database, tiep tuc import..." -ForegroundColor Yellow
}

# Import du lieu
Write-Host "`n[4] Import du lieu tu file SQL..." -ForegroundColor Yellow
Write-Host "  [WAIT] Dang import du lieu... (co the mat vai phut)" -ForegroundColor Cyan

try {
    # Copy file vao container va import chi du lieu
    docker cp $sqlFile dubaomatrung-admin-postgis:/tmp/admin_db_data_only.sql
    docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -f /tmp/admin_db_data_only.sql
    docker exec dubaomatrung-admin-postgis rm /tmp/admin_db_data_only.sql

    Write-Host "  [OK] Import du lieu thanh cong!" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Loi import: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiem tra ket qua
Write-Host "`n[7] Kiem tra du lieu da import:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT schemaname, tablename, n_tup_ins as rows FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"

# Kiem tra bang laocai_ranhgioihc cu the
Write-Host "`n[8] Kiem tra bang laocai_ranhgioihc:" -ForegroundColor Yellow
docker exec dubaomatrung-admin-postgis psql -U postgres -d admin_db -c "SELECT COUNT(*) as total_rows, COUNT(geom) as rows_with_geometry, ST_SRID(geom) as srid FROM laocai_ranhgioihc GROUP BY ST_SRID(geom) LIMIT 1;" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Bang laocai_ranhgioihc co du lieu" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] Bang laocai_ranhgioihc khong ton tai hoac trong" -ForegroundColor Yellow
}

Write-Host "`n=== HOAN THANH IMPORT ===" -ForegroundColor Green
Write-Host "Bay gio hay chay: .\fix-mapserver-final.ps1" -ForegroundColor Yellow
