# AUTO_DEPLOY_ON_SERVER.ps1
# Script tự động deploy - CHẠY TRÊN SERVER

param(
    [string]$SourcePath = "C:\DuBaoMatRung",
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"

Write-Host @"

╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                     TỰ ĐỘNG DEPLOY FRONTEND + FIX DATABASE                ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Cyan

$startTime = Get-Date

# ============================================================================
# BƯỚC 1: KIỂM TRA MÔI TRƯỜNG
# ============================================================================

Write-Host "`n[1/6] Kiểm tra môi trường..." -ForegroundColor Yellow

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "  ⚠ Khuyến nghị chạy với quyền Administrator" -ForegroundColor DarkYellow
}

# Check PM2
try {
    $pm2Version = pm2 --version 2>&1
    Write-Host "  ✓ PM2 installed: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "  ✗ PM2 not found! Install: npm install -g pm2" -ForegroundColor Red
    exit 1
}

# Check PostgreSQL
$psqlPaths = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
)

$psqlPath = $null
foreach ($path in $psqlPaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        Write-Host "  ✓ PostgreSQL found: $path" -ForegroundColor Green
        break
    }
}

if (-not $psqlPath) {
    Write-Host "  ⚠ PostgreSQL not found at default paths" -ForegroundColor DarkYellow
}

# ============================================================================
# BƯỚC 2: DOWNLOAD FRONTEND MỚI TỪ LOCAL BUILD
# ============================================================================

Write-Host "`n[2/6] Chuẩn bị frontend mới..." -ForegroundColor Yellow

$packagePath = Join-Path $SourcePath "server-fix-package\frontend-deploy.zip"

if (-not (Test-Path $packagePath)) {
    Write-Host "  ✗ Không tìm thấy $packagePath" -ForegroundColor Red
    Write-Host "  ℹ Hãy chắc chắn bạn đã copy folder 'server-fix-package' vào $SourcePath" -ForegroundColor Cyan
    exit 1
}

Write-Host "  ✓ Found frontend package: $packagePath" -ForegroundColor Green
$size = (Get-Item $packagePath).Length / 1MB
Write-Host "  📦 Size: $([math]::Round($size, 2)) MB" -ForegroundColor Cyan

# ============================================================================
# BƯỚC 3: BACKUP BẢN CŨ
# ============================================================================

Write-Host "`n[3/6] Backup frontend cũ..." -ForegroundColor Yellow

$distPath = Join-Path $SourcePath "client\dist"
$backupPath = Join-Path $SourcePath "client\dist_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

if (Test-Path $distPath) {
    if (-not $SkipBackup) {
        try {
            Copy-Item -Path $distPath -Destination $backupPath -Recurse -Force
            Write-Host "  ✓ Backed up to: $backupPath" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ Backup failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  ⊘ Backup skipped" -ForegroundColor DarkGray
    }

    # Remove old dist
    Remove-Item -Path $distPath -Recurse -Force
    Write-Host "  ✓ Removed old dist" -ForegroundColor Green
} else {
    Write-Host "  ℹ No existing dist folder" -ForegroundColor Cyan
}

# ============================================================================
# BƯỚC 4: DEPLOY FRONTEND MỚI
# ============================================================================

Write-Host "`n[4/6] Deploy frontend mới..." -ForegroundColor Yellow

try {
    # Create dist directory
    New-Item -ItemType Directory -Force -Path $distPath | Out-Null

    # Extract package
    Expand-Archive -Path $packagePath -DestinationPath $distPath -Force

    Write-Host "  ✓ Frontend deployed successfully" -ForegroundColor Green

    # Count files
    $fileCount = (Get-ChildItem -Path $distPath -Recurse -File).Count
    Write-Host "  📁 Total files: $fileCount" -ForegroundColor Cyan

} catch {
    Write-Host "  ✗ Deploy failed: $($_.Exception.Message)" -ForegroundColor Red

    # Restore backup if exists
    if (Test-Path $backupPath) {
        Write-Host "  ↩ Restoring backup..." -ForegroundColor Yellow
        Copy-Item -Path $backupPath -Destination $distPath -Recurse -Force
        Write-Host "  ✓ Backup restored" -ForegroundColor Green
    }

    exit 1
}

# ============================================================================
# BƯỚC 5: FIX DATABASE
# ============================================================================

Write-Host "`n[5/6] Fix database..." -ForegroundColor Yellow

if ($psqlPath) {
    $sqlFile = Join-Path $SourcePath "server-fix-package\fix-database-server.sql"

    if (Test-Path $sqlFile) {
        Write-Host "  ℹ Chạy SQL fix script..." -ForegroundColor Cyan
        Write-Host "  ⚠ Nhập password PostgreSQL nếu được hỏi" -ForegroundColor DarkYellow

        try {
            & $psqlPath -U postgres -d gis_db -f $sqlFile -q

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Database fixed successfully" -ForegroundColor Green

                # Verify
                $count = & $psqlPath -U postgres -d gis_db -t -c "SELECT COUNT(*) FROM nguyen_nhan;" 2>&1
                $count = $count.Trim()
                Write-Host "  📊 nguyen_nhan table has $count records" -ForegroundColor Cyan
            } else {
                Write-Host "  ⚠ SQL execution returned code: $LASTEXITCODE" -ForegroundColor DarkYellow
            }
        } catch {
            Write-Host "  ⚠ Database fix skipped: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    } else {
        Write-Host "  ⚠ SQL file not found: $sqlFile" -ForegroundColor DarkYellow
    }
} else {
    Write-Host "  ⊘ PostgreSQL not configured, skipping database fix" -ForegroundColor DarkGray
}

# ============================================================================
# BƯỚC 6: RESTART SERVICES
# ============================================================================

Write-Host "`n[6/6] Restart PM2 services..." -ForegroundColor Yellow

try {
    # Get current PM2 status
    Write-Host "  ℹ Current PM2 status:" -ForegroundColor Cyan
    pm2 status

    Write-Host "`n  ↻ Restarting all services..." -ForegroundColor Yellow
    pm2 restart all

    Start-Sleep -Seconds 3

    Write-Host "`n  ✓ Services restarted" -ForegroundColor Green
    pm2 status

} catch {
    Write-Host "  ✗ PM2 restart failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  ℹ Try manually: pm2 restart all" -ForegroundColor Cyan
}

# ============================================================================
# HOÀN THÀNH
# ============================================================================

$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

Write-Host @"

╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║                           ✅ DEPLOY COMPLETED                              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝

"@ -ForegroundColor Green

Write-Host "  ⏱ Duration: $([math]::Round($duration, 1)) seconds" -ForegroundColor Cyan

Write-Host @"

📋 KIỂM TRA:

  1. Mở browser: http://103.56.160.66:3000
  2. Login vào hệ thống
  3. Vào trang "Quản lý người dùng"
  4. Kiểm tra các dropdown có load dữ liệu
  5. Refresh page (Ctrl+F5) để clear cache

🔧 TROUBLESHOOTING (nếu còn lỗi):

  pm2 logs gateway --lines 50
  pm2 logs admin-service --lines 50
  pm2 monit

"@ -ForegroundColor Cyan

Write-Host "✨ Deploy hoàn tất! Hãy test trên browser." -ForegroundColor Green
