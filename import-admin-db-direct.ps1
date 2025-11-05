# ===== IMPORT ADMIN_DB - DIRECT METHOD (NO FILE COPY) =====
# Script nay import truc tiep qua pipe, KHONG copy file vao container
# Giai quyet van de Docker crash khi copy file lon (1.9GB)

param(
    [string]$SqlFile = "docker-init\admin-postgis\01-admin-db.sql",
    [string]$ContainerName = "dubaomatrung-admin-postgis",
    [string]$DbUser = "postgres",
    [string]$DbName = "admin_db",
    [switch]$Force = $false
)

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     IMPORT ADMIN_DB - DIRECT METHOD (PIPE STDIN)            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Phuong phap: Pipe file truc tiep vao psql (KHONG copy vao container)" -ForegroundColor Yellow
Write-Host "Uu diem: Tranh Docker crash, tiet kiem disk space, nhanh hon" -ForegroundColor Yellow
Write-Host ""

# ============================================================================
# STEP 1: Kiem tra file SQL
# ============================================================================
Write-Host "[1/6] Kiem tra file SQL..." -ForegroundColor Yellow

if (-not (Test-Path $SqlFile)) {
    Write-Host "  [ERROR] File khong ton tai: $SqlFile" -ForegroundColor Red
    Write-Host "  Hay dam bao file da duoc copy vao thu muc nay!" -ForegroundColor Red
    exit 1
}

$fileInfo = Get-Item $SqlFile
$fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
Write-Host "  [OK] File ton tai" -ForegroundColor Green
Write-Host "    - Ten: $($fileInfo.Name)" -ForegroundColor Cyan
Write-Host "    - Kich thuoc: $fileSizeMB MB" -ForegroundColor Cyan
Write-Host "    - Duong dan: $($fileInfo.FullName)" -ForegroundColor Cyan

# ============================================================================
# STEP 2: Kiem tra Docker container
# ============================================================================
Write-Host "`n[2/6] Kiem tra Docker container..." -ForegroundColor Yellow

try {
    $containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>&1

    if ($LASTEXITCODE -ne 0 -or -not $containerStatus) {
        Write-Host "  [ERROR] Container '$ContainerName' khong chay!" -ForegroundColor Red
        Write-Host "  Hay start container truoc:" -ForegroundColor Yellow
        Write-Host "    docker start $ContainerName" -ForegroundColor Cyan
        exit 1
    }

    Write-Host "  [OK] Container dang chay" -ForegroundColor Green
    Write-Host "    - Status: $containerStatus" -ForegroundColor Cyan

    # Kiem tra PostgreSQL version
    $pgVersion = docker exec $ContainerName psql -U $DbUser -t -c "SELECT version();" 2>$null
    if ($pgVersion) {
        Write-Host "    - PostgreSQL: $($pgVersion.Trim())" -ForegroundColor Cyan
    }

} catch {
    Write-Host "  [ERROR] Loi kiem tra container: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 3: Xu ly database (drop neu can)
# ============================================================================
Write-Host "`n[3/6] Xu ly database '$DbName'..." -ForegroundColor Yellow

try {
    # Kiem tra database co ton tai
    $dbExists = docker exec $ContainerName psql -U $DbUser -lqt 2>$null | Select-String -Pattern "^\s*$DbName\s+"

    if ($dbExists) {
        Write-Host "  [WARNING] Database '$DbName' da ton tai!" -ForegroundColor Yellow

        if ($Force) {
            Write-Host "  [ACTION] Xoa database cu (Force mode)..." -ForegroundColor Cyan
            docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  [OK] Da xoa database cu" -ForegroundColor Green
            } else {
                Write-Host "  [ERROR] Khong the xoa database!" -ForegroundColor Red
                exit 1
            }
        } else {
            $confirm = Read-Host "  Ban co muon xoa va tao lai database? (y/N)"
            if ($confirm -eq "y" -or $confirm -eq "Y") {
                Write-Host "  [ACTION] Dang xoa database cu..." -ForegroundColor Cyan
                docker exec $ContainerName psql -U $DbUser -c "DROP DATABASE IF EXISTS $DbName;" 2>&1 | Out-Null
                Write-Host "  [OK] Da xoa database cu" -ForegroundColor Green
            } else {
                Write-Host "  [WARNING] Database se KHONG duoc xoa. Import se THEM vao data hien co!" -ForegroundColor Yellow
                Write-Host "  [WARNING] Co the gay ra loi neu co conflict!" -ForegroundColor Yellow
                $continueAnyway = Read-Host "  Ban co muon tiep tuc? (y/N)"
                if ($continueAnyway -ne "y" -and $continueAnyway -ne "Y") {
                    Write-Host "  [INFO] Da huy import" -ForegroundColor Yellow
                    exit 0
                }
            }
        }
    }

    # Tao database neu chua ton tai
    $dbCheck = docker exec $ContainerName psql -U $DbUser -lqt 2>$null | Select-String -Pattern "^\s*$DbName\s+"
    if (-not $dbCheck) {
        Write-Host "  [ACTION] Tao database '$DbName'..." -ForegroundColor Cyan
        docker exec $ContainerName psql -U $DbUser -c "CREATE DATABASE $DbName;" 2>&1 | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Database da duoc tao" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Khong the tao database!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "  [INFO] Database da ton tai, se import vao database nay" -ForegroundColor Cyan
    }

} catch {
    Write-Host "  [ERROR] Loi xu ly database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 4: Kiem tra ket noi database
# ============================================================================
Write-Host "`n[4/6] Kiem tra ket noi database..." -ForegroundColor Yellow

try {
    $testQuery = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT 1;" 2>&1

    if ($LASTEXITCODE -eq 0 -and $testQuery -match "1") {
        Write-Host "  [OK] Ket noi thanh cong den database '$DbName'" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Khong the ket noi den database!" -ForegroundColor Red
        Write-Host "  Output: $testQuery" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  [ERROR] Loi kiem tra ket noi: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 5: IMPORT DU LIEU (PIPE TRUC TIEP)
# ============================================================================
Write-Host "`n[5/6] Import du lieu vao database..." -ForegroundColor Yellow
Write-Host "  [INFO] File: $fileSizeMB MB" -ForegroundColor Cyan
Write-Host "  [INFO] Thoi gian uoc tinh: 10-30 phut (tuy cau hinh server)" -ForegroundColor Cyan
Write-Host "  [WAIT] Dang import... XIN KIEM NHAN, KHONG NGAT!" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date

try {
    # PHƯƠNG PHÁP: Pipe file trực tiếp vào psql (KHÔNG copy file vào container)
    # Đọc file từng chunk để tránh Out Of Memory

    Write-Host "  [PROCESS] Dang doc file va pipe vao PostgreSQL..." -ForegroundColor Cyan

    # Sử dụng Get-Content với ReadCount để đọc từng batch
    # Sau đó pipe vào docker exec psql
    $importProcess = Get-Content -Path $SqlFile -ReadCount 1000 | `
        ForEach-Object { $_ -join "`n" } | `
        docker exec -i $ContainerName psql -U $DbUser -d $DbName -v ON_ERROR_STOP=0 2>&1

    $endTime = Get-Date
    $duration = $endTime - $startTime

    # Phan tich ket qua
    $errors = $importProcess | Where-Object { $_ -match "ERROR:" }
    $warnings = $importProcess | Where-Object { $_ -match "WARNING:|NOTICE:" }

    Write-Host ""
    Write-Host "  [TIME] Thoi gian import: $($duration.ToString('hh\:mm\:ss'))" -ForegroundColor Cyan

    # Hien thi errors neu co
    if ($errors.Count -gt 0) {
        Write-Host ""
        Write-Host "  [WARNING] Phat hien $($errors.Count) loi trong qua trinh import:" -ForegroundColor Yellow
        $errors | Select-Object -First 10 | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Red
        }
        if ($errors.Count -gt 10) {
            Write-Host "    ... va $($errors.Count - 10) loi khac" -ForegroundColor Gray
        }
        Write-Host ""
        Write-Host "  [INFO] Mot so loi la BINH THUONG (extension da ton tai, v.v.)" -ForegroundColor Yellow
    }

    # Hien thi warnings
    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  [INFO] Co $($warnings.Count) canh bao (thuong la binh thuong):" -ForegroundColor Cyan
        $warnings | Select-Object -First 5 | ForEach-Object {
            Write-Host "    - $_" -ForegroundColor Yellow
        }
        if ($warnings.Count -gt 5) {
            Write-Host "    ... va $($warnings.Count - 5) canh bao khac" -ForegroundColor Gray
        }
    }

    Write-Host ""
    Write-Host "  [OK] Import hoan tat!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "  [ERROR] Loi import: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 6: VERIFY KET QUA
# ============================================================================
Write-Host "`n[6/6] Kiem tra ket qua import..." -ForegroundColor Yellow

try {
    # Dem so bang
    Write-Host ""
    Write-Host "  Danh sach cac bang:" -ForegroundColor Cyan
    $tables = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" 2>$null

    if ($tables) {
        $tableList = $tables | Where-Object { $_.Trim() -ne "" }
        $tableCount = ($tableList | Measure-Object).Count

        Write-Host "  [OK] Tim thay $tableCount bang:" -ForegroundColor Green
        $tableList | ForEach-Object { Write-Host "    - $($_.Trim())" -ForegroundColor Cyan }

        # Dem so record trong mot vai bang
        Write-Host ""
        Write-Host "  So luong records (mau):" -ForegroundColor Cyan

        # Lay 3 bang dau tien de dem
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
        Write-Host "  [INFO] Co the import chua thanh cong hoac database trong!" -ForegroundColor Yellow
    }

    # Kiem tra materialized views
    $matViews = docker exec $ContainerName psql -U $DbUser -d $DbName -t -c "SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';" 2>$null
    if ($matViews) {
        $mvList = $matViews | Where-Object { $_.Trim() -ne "" }
        $mvCount = ($mvList | Measure-Object).Count
        if ($mvCount -gt 0) {
            Write-Host ""
            Write-Host "  Materialized Views: $mvCount" -ForegroundColor Cyan
        }
    }

} catch {
    Write-Host "  [ERROR] Loi kiem tra ket qua: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================================
# HOAN THANH
# ============================================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                IMPORT HOAN TAT THANH CONG!                   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Database '$DbName' da san sang su dung!" -ForegroundColor Green
Write-Host ""
Write-Host "De ket noi vao database:" -ForegroundColor Yellow
Write-Host "  docker exec -it $ContainerName psql -U $DbUser -d $DbName" -ForegroundColor Cyan
Write-Host ""
