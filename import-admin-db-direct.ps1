# IMPORT ADMIN_DB - DIRECT METHOD (NO FILE COPY)
# Script import truc tiep qua pipe, KHONG copy file vao container

param(
    [string]$SqlFile = "docker-init\admin-postgis\01-admin-db.sql",
    [string]$ContainerName = "dubaomatrung-admin-postgis",
    [string]$DbUser = "postgres",
    [string]$DbName = "admin_db",
    [switch]$Force = $false
)

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "   IMPORT ADMIN_DB - DIRECT METHOD (PIPE STDIN)" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phuong phap: Pipe file truc tiep vao psql" -ForegroundColor Yellow
Write-Host "Uu diem: Tranh Docker crash, nhanh hon" -ForegroundColor Yellow
Write-Host ""

# STEP 1: Check file
Write-Host "[1/6] Kiem tra file SQL..." -ForegroundColor Yellow

if (-not (Test-Path $SqlFile)) {
    Write-Host "  [ERROR] File khong ton tai: $SqlFile" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $SqlFile
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host "  [OK] File ton tai" -ForegroundColor Green
Write-Host "    - Ten: $($fileInfo.Name)" -ForegroundColor Cyan
Write-Host "    - Kich thuoc: $fileSizeMB MB" -ForegroundColor Cyan

# STEP 2: Check container
Write-Host "`n[2/6] Kiem tra Docker container..." -ForegroundColor Yellow

try {
    $containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>&1

    if ($LASTEXITCODE -ne 0 -or -not $containerStatus) {
        Write-Host "  [ERROR] Container khong chay!" -ForegroundColor Red
        Write-Host "  Start container: docker start $ContainerName" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "  [OK] Container dang chay: $containerStatus" -ForegroundColor Green

} catch {
    Write-Host "  [ERROR] Loi kiem tra container" -ForegroundColor Red
    exit 1
}

# STEP 3: Drop & Create database
Write-Host "`n[3/6] Xu ly database..." -ForegroundColor Yellow

try {
    $dbExists = docker exec $ContainerName psql -U $DbUser -lqt 2>$null | Select-String -Pattern "^\s*$DbName\s+"

    if ($dbExists) {
        Write-Host "  [WARNING] Database da ton tai!" -ForegroundColor Yellow

        if ($Force) {
            Write-Host "  [ACTION] Xoa database cu (Force mode)..." -ForegroundColor Cyan
            docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null
            Write-Host "  [OK] Da xoa database" -ForegroundColor Green
        } else {
            $confirm = Read-Host "  Ban co muon xoa va tao lai? (y/N)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null
                Write-Host "  [OK] Da xoa database" -ForegroundColor Green
            } else {
                Write-Host "  [INFO] Se import vao database hien co" -ForegroundColor Yellow
            }
        }
    }

    # Create database
    $dbCheck = docker exec $ContainerName psql -U $DbUser -lqt 2>$null | Select-String -Pattern "^\s*$DbName\s+"
    if (-not $dbCheck) {
        Write-Host "  [ACTION] Tao database moi..." -ForegroundColor Cyan
        docker exec $ContainerName psql -U $DbUser -c "CREATE DATABASE $DbName;" 2>&1 | Out-Null
        Write-Host "  [OK] Database da tao" -ForegroundColor Green
    }

} catch {
    Write-Host "  [ERROR] Loi xu ly database" -ForegroundColor Red
    exit 1
}

# STEP 4: Test connection
Write-Host "`n[4/6] Kiem tra ket noi..." -ForegroundColor Yellow

try {
    $testQuery = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Ket noi thanh cong" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Khong the ket noi database" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Loi kiem tra ket noi" -ForegroundColor Red
    exit 1
}

# STEP 5: IMPORT DATA (PIPE DIRECTLY)
Write-Host "`n[5/6] Import du lieu..." -ForegroundColor Yellow
Write-Host "  [INFO] File: $fileSizeMB MB" -ForegroundColor Cyan
Write-Host "  [INFO] Thoi gian: 10-30 phut" -ForegroundColor Cyan
Write-Host "  [WAIT] Dang import... XIN KIEM NHAN!" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

try {
    Write-Host "  [PROCESS] Dang doc file va pipe vao PostgreSQL..." -ForegroundColor Cyan

    # Pipe file truc tiep vao psql
    Get-Content -Path $SqlFile -ReadCount 1000 | `
        ForEach-Object { $_ -join "`n" } | `
        docker exec -i $ContainerName psql -U $DbUser -d $DbName -v ON_ERROR_STOP=0 2>&1 | Out-Null

    $endTime = Get-Date
    $duration = $endTime - $startTime

    Write-Host ""
    Write-Host "  [TIME] Thoi gian: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan
    Write-Host "  [OK] Import hoan tat!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "  [ERROR] Loi import: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# STEP 6: VERIFY
Write-Host "`n[6/6] Kiem tra ket qua..." -ForegroundColor Yellow

try {
    Write-Host ""
    Write-Host "  Danh sach cac bang:" -ForegroundColor Cyan
    $tables = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>$null

    if ($tables) {
        $tableList = $tables | Where-Object { $_.Trim() -ne "" }
        $tableCount = ($tableList | Measure-Object).Count

        Write-Host "  [OK] Tim thay $tableCount bang" -ForegroundColor Green
        $tableList | ForEach-Object { Write-Host "    - $($_.Trim())" -ForegroundColor Cyan }

        # Count records in first 3 tables
        Write-Host ""
        Write-Host "  So luong records (mau):" -ForegroundColor Cyan
        $sampleTables = $tableList | Select-Object -First 3
        foreach ($table in $sampleTables) {
            $tableName = $table.Trim()
            if ($tableName) {
                $count = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM $tableName;" 2>$null
                if ($count) {
                    Write-Host "    - $tableName : $($count.Trim()) rows" -ForegroundColor Cyan
                }
            }
        }

    } else {
        Write-Host "  [WARNING] Khong tim thay bang nao!" -ForegroundColor Yellow
    }

} catch {
    Write-Host "  [ERROR] Loi kiem tra ket qua" -ForegroundColor Red
}

# DONE
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Green
Write-Host "              IMPORT HOAN TAT THANH CONG!" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database da san sang su dung!" -ForegroundColor Green
Write-Host ""
Write-Host "Ket noi database:" -ForegroundColor Yellow
Write-Host "  docker exec -it $ContainerName psql -U $DbUser -d $DbName" -ForegroundColor Cyan
Write-Host ""
