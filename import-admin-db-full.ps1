# ===== IMPORT ADMIN_DB FROM POSTGRES 17 DUMP TO POSTGRES 15 =====

param(
    [string]$SqlFile = "docker-init\admin-postgis\01-admin-db.sql",
    [string]$ContainerName = "dubaomatrung-admin-postgis",
    [string]$DbUser = "postgres",
    [string]$DbName = "admin_db",
    [switch]$Force = $false
)

Write-Host "=== IMPORT ADMIN_DB (POSTGRES 17 -> POSTGRES 15) ===" -ForegroundColor Cyan
Write-Host "Luu y: Script nay se xu ly compatibility giua Postgres 17 va Postgres 15" -ForegroundColor Yellow

# Kiem tra file SQL co ton tai
Write-Host "`n[1] Kiem tra file SQL..." -ForegroundColor Yellow
if (-not (Test-Path $SqlFile)) {
    Write-Host "  [ERROR] Khong tim thay file: $SqlFile" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $SqlFile
Write-Host "  [OK] File: $($fileInfo.Name)" -ForegroundColor Green
Write-Host "  - Kich thuoc: $([math]::Round($fileInfo.Length/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "  - Duong dan: $($fileInfo.FullName)" -ForegroundColor Cyan

# Kiem tra container
Write-Host "`n[2] Kiem tra container Docker..." -ForegroundColor Yellow
try {
    $containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
    if ($containerStatus -like "*Up*") {
        Write-Host "  [OK] Container dang chay: $containerStatus" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Container khong chay" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Loi kiem tra container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiem tra va tao database neu can
Write-Host "`n[3] Kiem tra database $DbName..." -ForegroundColor Yellow
try {
    $dbExists = docker exec $ContainerName psql -U $DbUser -lqt | Select-String $DbName

    if ($dbExists) {
        Write-Host "  [WARNING] Database $DbName da ton tai!" -ForegroundColor Yellow

        if ($Force) {
            Write-Host "  [INFO] Dang xoa database cu (Force mode)..." -ForegroundColor Cyan
            docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;"
            Write-Host "  [OK] Da xoa database cu" -ForegroundColor Green
        } else {
            $confirm = Read-Host "  Ban co muon xoa va tao lai? (y/N)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;"
                Write-Host "  [OK] Da xoa database cu" -ForegroundColor Green
            } else {
                Write-Host "  [INFO] Se import vao database hien co (chi them data moi)" -ForegroundColor Yellow
            }
        }
    }

    # Tao database neu khong ton tai
    $dbCheck = docker exec $ContainerName psql -U $DbUser -lqt | Select-String $DbName
    if (-not $dbCheck) {
        Write-Host "  [INFO] Tao database $DbName..." -ForegroundColor Cyan
        docker exec $ContainerName psql -U $DbUser -c "CREATE DATABASE $DbName;"
        Write-Host "  [OK] Database tao thanh cong" -ForegroundColor Green
    }

} catch {
    Write-Host "  [ERROR] Loi kiem tra database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Kiem tra va xu ly compatibility (neu can)
Write-Host "`n[4] Kiem tra file SQL..." -ForegroundColor Yellow

$fileSize = (Get-Item $SqlFile).Length / 1MB

# Neu file > 500MB, skip xu ly (gia su da xu ly tu truoc)
if ($fileSize -gt 500) {
    Write-Host "  [INFO] File lon ($([math]::Round($fileSize, 2)) MB), su dung truc tiep (da xu ly compatibility)" -ForegroundColor Cyan
    Write-Host "  [SKIP] Bo qua buoc xu ly de tranh Out Of Memory" -ForegroundColor Yellow
    $tempSqlFile = $SqlFile
} else {
    Write-Host "  [PROCESS] Xu ly compatibility Postgres 17 -> Postgres 15..." -ForegroundColor Cyan
    $tempSqlFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.sql'

    try {
        $sqlContent = Get-Content -Path $SqlFile -Encoding UTF8 -Raw

        # Fix 1: Loai bo SET statements khong ho tro trong Postgres 15
        Write-Host "    - Loai bo SET statements khong ho tro..." -ForegroundColor Gray
        $sqlContent = $sqlContent -replace "(?m)^SET search_path.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET default_table_access_method.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET xmloption.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET client_encoding.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET row_security.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET default_tablespace.*$", ""
        $sqlContent = $sqlContent -replace "(?m)^SET transaction_timeout.*$", ""

        # Fix 2: Xu ly PostGIS extensions
        Write-Host "    - Xu ly PostGIS extensions..." -ForegroundColor Gray
        $sqlContent = $sqlContent -replace "(?m)^CREATE EXTENSION IF NOT EXISTS.*postgis.*WITH SCHEMA.*$", "CREATE EXTENSION IF NOT EXISTS postgis;"
        $sqlContent = $sqlContent -replace "(?m)^CREATE EXTENSION IF NOT EXISTS.*postgis_topology.*WITH SCHEMA.*$", "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

        # Fix 3: Xu ly OID references
        Write-Host "    - Xu ly OID references..." -ForegroundColor Gray
        $sqlContent = $sqlContent -replace "WITH \(oids = (true|false)\)", ""
        $sqlContent = $sqlContent -replace "WITHOUT OIDS", ""

        # Ghi vao temp file
        Set-Content -Path $tempSqlFile -Value $sqlContent -Encoding UTF8
        Write-Host "  [OK] File da xu ly" -ForegroundColor Green

    } catch {
        Write-Host "  [ERROR] Loi xu ly file SQL: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  [INFO] Se thu import truc tiep file goc..." -ForegroundColor Yellow
        $tempSqlFile = $SqlFile
    }
}

# Import du lieu
Write-Host "`n[5] Import du lieu vao database (co the mat 5-10 phut)..." -ForegroundColor Yellow
Write-Host "  [WAIT] Dang xu ly..." -ForegroundColor Cyan

try {
    # Copy file vao container
    Write-Host "  [PROCESS] Copy file vao container..." -ForegroundColor Cyan
    docker cp $tempSqlFile "${ContainerName}:/tmp/admin_db_import.sql"

    # Kiem tra version Postgres trong container
    Write-Host "  [INFO] Kiem tra PostgreSQL version..." -ForegroundColor Cyan
    $pgVersion = docker exec $ContainerName psql -U $DbUser -t -c "SELECT version();" 2>$null
    Write-Host "  - $($pgVersion.Trim())" -ForegroundColor Gray

    # Import voi error handling va logging
    Write-Host "  [PROCESS] Dang import du lieu (se hien thi warnings neu co)..." -ForegroundColor Cyan
    $importLog = docker exec $ContainerName psql -U $DbUser -d $DbName -v ON_ERROR_STOP=0 -f "/tmp/admin_db_import.sql" 2>&1

    # Phan tich ket qua
    $errors = $importLog | Where-Object { $_ -match "ERROR:" }
    $warnings = $importLog | Where-Object { $_ -match "WARNING:|NOTICE:" }

    if ($errors.Count -gt 0) {
        Write-Host "`n  [WARNING] Co $($errors.Count) loi khi import:" -ForegroundColor Yellow
        $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    }

    if ($warnings.Count -gt 0) {
        Write-Host "`n  [INFO] Co $($warnings.Count) canh bao (binh thuong):" -ForegroundColor Cyan
        $warnings | Select-Object -First 5 | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
        if ($warnings.Count -gt 5) {
            Write-Host "    ... va $($warnings.Count - 5) canh bao khac" -ForegroundColor Gray
        }
    }

    # Xoa temp file trong container
    docker exec $ContainerName rm -f "/tmp/admin_db_import.sql" 2>$null

    Write-Host "`n  [OK] Import hoan tat!" -ForegroundColor Green

} catch {
    Write-Host "  [ERROR] Loi import: $($_.Exception.Message)" -ForegroundColor Red
    docker exec $ContainerName rm -f "/tmp/admin_db_import.sql" -ErrorAction SilentlyContinue
    exit 1
} finally {
    # Xoa temp file local (chi xoa neu khac file goc)
    if ($tempSqlFile -ne $SqlFile) {
        Remove-Item -Path $tempSqlFile -Force -ErrorAction SilentlyContinue
    }
}

# Kiem tra ket qua
Write-Host "`n[6] Kiem tra ket qua import..." -ForegroundColor Yellow

# Kiem tra cac bang
Write-Host "`n  Danh sach cac bang da import:" -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d $DbName -c "
SELECT
    table_schema as schema,
    table_name as bang,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=t.table_schema AND table_name=t.table_name) as cot_so
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
" 2>$null

# Kiem tra materialized views
Write-Host "`n  Danh sach Materialized Views:" -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d $DbName -c "
SELECT schemaname, matviewname, matviewowner
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;
" 2>$null

# Kiem tra regular views
Write-Host "`n  Danh sach Views:" -ForegroundColor Cyan
docker exec $ContainerName psql -U $DbUser -d $DbName -c "
SELECT table_schema, table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
" 2>$null

Write-Host "`n=== HOAN THANH IMPORT ===" -ForegroundColor Green
Write-Host "Database admin_db da san sang su dung!" -ForegroundColor Green
Write-Host "`nGhi chu: Neu gap loi tu Postgres 17, hay:" -ForegroundColor Yellow
Write-Host "  1. Tao dump file voi pg_dump -h localhost -U postgres -d admin_db > 01-admin-db.sql" -ForegroundColor Cyan
Write-Host "  2. Sau do chay: .\import-admin-db-full.ps1 -Force" -ForegroundColor Cyan
