# ============================================================================
# MapServer Debug Script - Comprehensive Diagnostic Tool
# ============================================================================
# Muc dich: Tim nguyen nhan MapServer khong xuat duoc du lieu len map
# Cach dung: powershell -ExecutionPolicy Bypass -File debug-mapserver.ps1
# ============================================================================

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   MapServer Debug Script - LuckyBoiz" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$SuccessCount = 0
$FailCount = 0

# ============================================================================
# 1. Kiem tra MS4W Installation
# ============================================================================
Write-Host "[1/10] Checking MS4W Installation..." -ForegroundColor Yellow

$mapservPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
if (Test-Path $mapservPath) {
    Write-Host "   [OK] mapserv.exe found at: $mapservPath" -ForegroundColor Green
    $SuccessCount++

    # Kiem tra version
    Write-Host "   Testing MapServer version..." -ForegroundColor Gray
    try {
        $versionOutput = & $mapservPath -v 2>&1
        Write-Host "   $versionOutput" -ForegroundColor Gray
    } catch {
        Write-Host "   [WARN] Could not get version: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [ERROR] mapserv.exe NOT FOUND!" -ForegroundColor Red
    Write-Host "   Expected path: $mapservPath" -ForegroundColor Red
    Write-Host "   ACTION REQUIRED: Install MS4W from https://ms4w.com/" -ForegroundColor Yellow
    $FailCount++
}

# ============================================================================
# 2. Kiem tra MapFile
# ============================================================================
Write-Host "`n[2/10] Checking MapFile..." -ForegroundColor Yellow

$mapfilePath = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"
if (Test-Path $mapfilePath) {
    Write-Host "   [OK] laocai-windows.map found" -ForegroundColor Green
    $fileSize = (Get-Item $mapfilePath).Length
    Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
    $SuccessCount++

    # Kiem tra noi dung file
    $content = Get-Content $mapfilePath -Raw
    if ($content -match 'port=(\d+)') {
        Write-Host "   PostgreSQL Port in mapfile: $($Matches[1])" -ForegroundColor Gray
    }
    if ($content -match 'password=(\S+)') {
        Write-Host "   PostgreSQL Password in mapfile: [DETECTED]" -ForegroundColor Gray
    }
} else {
    Write-Host "   [ERROR] laocai-windows.map NOT FOUND!" -ForegroundColor Red
    Write-Host "   Expected path: $mapfilePath" -ForegroundColor Red

    # Kiem tra file laocai.map co khong
    $altMapfile = "C:\DuBaoMatRung\mapserver\mapfiles\laocai.map"
    if (Test-Path $altMapfile) {
        Write-Host "   [INFO] Found laocai.map instead" -ForegroundColor Yellow
        Write-Host "   ACTION REQUIRED: Create laocai-windows.map or update .env to use laocai.map" -ForegroundColor Yellow
    }
    $FailCount++
}

# ============================================================================
# 3. Kiem tra Directories
# ============================================================================
Write-Host "`n[3/10] Checking Required Directories..." -ForegroundColor Yellow

$dirs = @(
    "C:\DuBaoMatRung\mapserver\tmp",
    "C:\DuBaoMatRung\mapserver\mapfiles",
    "C:\DuBaoMatRung\mapserver\logs"
)

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "   [OK] $dir exists" -ForegroundColor Green
        $SuccessCount++
    } else {
        Write-Host "   [WARN] $dir NOT FOUND, creating..." -ForegroundColor Yellow
        try {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            Write-Host "   [OK] Created: $dir" -ForegroundColor Green
            $SuccessCount++
        } catch {
            Write-Host "   [ERROR] Failed to create: $dir" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor Red
            $FailCount++
        }
    }
}

# ============================================================================
# 4. Kiem tra PostgreSQL Service
# ============================================================================
Write-Host "`n[4/10] Checking PostgreSQL Service..." -ForegroundColor Yellow

try {
    $pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($pgService) {
        if ($pgService.Status -eq "Running") {
            Write-Host "   [OK] PostgreSQL service is running" -ForegroundColor Green
            Write-Host "   Service: $($pgService.Name)" -ForegroundColor Gray
            $SuccessCount++
        } else {
            Write-Host "   [ERROR] PostgreSQL service is NOT running" -ForegroundColor Red
            Write-Host "   Status: $($pgService.Status)" -ForegroundColor Red
            Write-Host "   ACTION REQUIRED: Start PostgreSQL service" -ForegroundColor Yellow
            $FailCount++
        }
    } else {
        Write-Host "   [WARN] PostgreSQL service not found via Get-Service" -ForegroundColor Yellow
        Write-Host "   Will test connection in next step..." -ForegroundColor Gray
    }
} catch {
    Write-Host "   [WARN] Could not check service status: $_" -ForegroundColor Yellow
}

# ============================================================================
# 5. Kiem tra PostgreSQL Connection
# ============================================================================
Write-Host "`n[5/10] Testing PostgreSQL Connection..." -ForegroundColor Yellow

# Test psql command
$psqlExists = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlExists) {
    Write-Host "   [OK] psql command found" -ForegroundColor Green

    # Test connection
    Write-Host "   Testing connection to admin_db..." -ForegroundColor Gray
    $env:PGPASSWORD = "4"

    $testQuery = "SELECT version()"
    $result = psql -U postgres -d admin_db -t -c $testQuery 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] Connected to PostgreSQL successfully" -ForegroundColor Green
        $resultStr = $result.ToString().Trim()
        if ($resultStr.Length -gt 80) {
            $resultStr = $resultStr.Substring(0, 80) + "..."
        }
        Write-Host "   $resultStr" -ForegroundColor Gray
        $SuccessCount++
    } else {
        Write-Host "   [ERROR] Failed to connect to PostgreSQL" -ForegroundColor Red
        Write-Host "   Error: $result" -ForegroundColor Red
        Write-Host "   ACTION REQUIRED: Check PostgreSQL password and credentials" -ForegroundColor Yellow
        $FailCount++
    }
} else {
    Write-Host "   [ERROR] psql command NOT FOUND" -ForegroundColor Red
    Write-Host "   ACTION REQUIRED: Add PostgreSQL bin directory to PATH" -ForegroundColor Yellow
    $FailCount++
}

# ============================================================================
# 6. Kiem tra PostGIS Extension
# ============================================================================
Write-Host "`n[6/10] Checking PostGIS Extension..." -ForegroundColor Yellow

if ($psqlExists -and $LASTEXITCODE -eq 0) {
    $env:PGPASSWORD = "4"
    $postgisQuery = "SELECT PostGIS_Version()"
    $postgisResult = psql -U postgres -d admin_db -t -c $postgisQuery 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "   [OK] PostGIS is installed" -ForegroundColor Green
        Write-Host "   Version: $($postgisResult.ToString().Trim())" -ForegroundColor Gray
        $SuccessCount++
    } else {
        Write-Host "   [ERROR] PostGIS is NOT installed" -ForegroundColor Red
        Write-Host "   ACTION REQUIRED: Install PostGIS extension" -ForegroundColor Yellow
        Write-Host "   Run: CREATE EXTENSION postgis;" -ForegroundColor Yellow
        $FailCount++
    }
} else {
    Write-Host "   [SKIP] Skipped (PostgreSQL not available)" -ForegroundColor Gray
}

# ============================================================================
# 7. Kiem tra GIS Tables
# ============================================================================
Write-Host "`n[7/10] Checking GIS Tables..." -ForegroundColor Yellow

if ($psqlExists) {
    $tables = @("laocai_huyen", "laocai_ranhgioihc", "laocai_rg3lr", "laocai_nendiahinh", "laocai_nendiahinh_line", "laocai_chuquanly")

    foreach ($table in $tables) {
        $env:PGPASSWORD = "4"
        $countQuery = "SELECT COUNT(*) FROM $table"
        $count = psql -U postgres -d admin_db -t -c $countQuery 2>&1

        if ($LASTEXITCODE -eq 0) {
            $count = $count.ToString().Trim()
            if ([int]$count -gt 0) {
                Write-Host "   [OK] $table : $count records" -ForegroundColor Green
                $SuccessCount++
            } else {
                Write-Host "   [WARN] $table : 0 records (EMPTY!)" -ForegroundColor Yellow
                $FailCount++
            }
        } else {
            Write-Host "   [ERROR] $table : NOT FOUND or ERROR" -ForegroundColor Red
            Write-Host "     $count" -ForegroundColor Gray
            $FailCount++
        }
    }
} else {
    Write-Host "   [SKIP] Skipped (PostgreSQL not available)" -ForegroundColor Gray
}

# ============================================================================
# 8. Kiem tra MapServer Service (PM2)
# ============================================================================
Write-Host "`n[8/10] Checking MapServer Service (PM2)..." -ForegroundColor Yellow

$pm2Exists = Get-Command pm2 -ErrorAction SilentlyContinue
if ($pm2Exists) {
    Write-Host "   [OK] PM2 command found" -ForegroundColor Green

    try {
        # Get service status
        $pm2Json = pm2 jlist 2>&1 | Out-String
        $pm2List = $pm2Json | ConvertFrom-Json
        $pm2Status = $pm2List | Where-Object { $_.name -eq "mapserver-service" }

        if ($pm2Status) {
            if ($pm2Status.pm2_env.status -eq "online") {
                Write-Host "   [OK] mapserver-service is online" -ForegroundColor Green
                Write-Host "   PID: $($pm2Status.pid)" -ForegroundColor Gray
                Write-Host "   Restarts: $($pm2Status.pm2_env.restart_time)" -ForegroundColor Gray
                $SuccessCount++

                # Check environment variables
                if ($pm2Status.pm2_env.MAPFILE_PATH) {
                    Write-Host "   MAPFILE_PATH: $($pm2Status.pm2_env.MAPFILE_PATH)" -ForegroundColor Gray
                }
            } else {
                Write-Host "   [ERROR] mapserver-service is NOT online" -ForegroundColor Red
                Write-Host "   Status: $($pm2Status.pm2_env.status)" -ForegroundColor Red
                $FailCount++
            }
        } else {
            Write-Host "   [ERROR] mapserver-service NOT FOUND in PM2" -ForegroundColor Red
            Write-Host "   ACTION REQUIRED: Start mapserver-service with PM2" -ForegroundColor Yellow
            $FailCount++
        }
    } catch {
        Write-Host "   [ERROR] Failed to parse PM2 output: $_" -ForegroundColor Red
        $FailCount++
    }
} else {
    Write-Host "   [ERROR] PM2 command NOT FOUND" -ForegroundColor Red
    Write-Host "   ACTION REQUIRED: Install PM2 (npm install -g pm2)" -ForegroundColor Yellow
    $FailCount++
}

# ============================================================================
# 9. Test MapServer HTTP Endpoint
# ============================================================================
Write-Host "`n[9/10] Testing MapServer HTTP Endpoint..." -ForegroundColor Yellow

# Test health endpoint
try {
    $healthUrl = "http://localhost:3008/health"
    $healthResponse = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5

    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "   [OK] Health endpoint OK" -ForegroundColor Green
        $healthData = $healthResponse.Content | ConvertFrom-Json
        Write-Host "   Service: $($healthData.service)" -ForegroundColor Gray
        Write-Host "   Mapfile: $($healthData.mapfile)" -ForegroundColor Gray
        $SuccessCount++
    } else {
        Write-Host "   [ERROR] Health endpoint returned status: $($healthResponse.StatusCode)" -ForegroundColor Red
        $FailCount++
    }
} catch {
    Write-Host "   [ERROR] Failed to connect to health endpoint" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "   ACTION REQUIRED: Check if mapserver-service is running on port 3008" -ForegroundColor Yellow
    $FailCount++
}

# Test WMS GetCapabilities
Write-Host "`n   Testing WMS GetCapabilities..." -ForegroundColor Gray
try {
    $wmsUrl = "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $wmsResponse = Invoke-WebRequest -Uri $wmsUrl -UseBasicParsing -TimeoutSec 10

    if ($wmsResponse.Content -match "WMS_Capabilities") {
        Write-Host "   [OK] GetCapabilities returned valid WMS response" -ForegroundColor Green

        # Count layers
        $layerMatches = [regex]::Matches($wmsResponse.Content, "<Layer")
        Write-Host "   Found $($layerMatches.Count) <Layer> tags" -ForegroundColor Gray

        # Save to file
        $outputPath = "C:\DuBaoMatRung\debug_wms_capabilities.xml"
        $wmsResponse.Content | Out-File -FilePath $outputPath -Encoding UTF8
        Write-Host "   [OK] Saved response to: $outputPath" -ForegroundColor Green

        # Extract layer names
        $layerNames = [regex]::Matches($wmsResponse.Content, "<Name>([^<]+)</Name>") | ForEach-Object { $_.Groups[1].Value }
        if ($layerNames.Count -gt 0) {
            Write-Host "   Layer names found:" -ForegroundColor Cyan
            foreach ($layerName in $layerNames) {
                Write-Host "     - $layerName" -ForegroundColor Cyan
            }
            $SuccessCount++
        } else {
            Write-Host "   [WARN] No layer names found in response!" -ForegroundColor Yellow
            $FailCount++
        }
    } else {
        Write-Host "   [ERROR] GetCapabilities returned invalid response" -ForegroundColor Red
        $previewLen = [Math]::Min(200, $wmsResponse.Content.Length)
        Write-Host "   Response preview: $($wmsResponse.Content.Substring(0, $previewLen))" -ForegroundColor Gray

        # Save error response
        $errorPath = "C:\DuBaoMatRung\debug_wms_error.txt"
        $wmsResponse.Content | Out-File -FilePath $errorPath -Encoding UTF8
        Write-Host "   [ERROR] Saved error response to: $errorPath" -ForegroundColor Red
        $FailCount++
    }
} catch {
    Write-Host "   [ERROR] WMS GetCapabilities failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red

    # Save exception
    $exceptionPath = "C:\DuBaoMatRung\debug_wms_exception.txt"
    $_.ToString() | Out-File -FilePath $exceptionPath -Encoding UTF8
    Write-Host "   [ERROR] Saved exception to: $exceptionPath" -ForegroundColor Red
    $FailCount++
}

# ============================================================================
# 10. Test Direct MapServer Execution
# ============================================================================
Write-Host "`n[10/10] Testing Direct MapServer Execution..." -ForegroundColor Yellow

if (Test-Path $mapservPath) {
    Write-Host "   Testing direct mapserv.exe execution..." -ForegroundColor Gray

    $env:MS_MAPFILE = "C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map"
    $env:QUERY_STRING = "SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
    $env:REQUEST_METHOD = "GET"
    $env:MS_ERRORFILE = "C:\DuBaoMatRung\mapserver\logs\mapserver_debug.log"

    try {
        $directOutput = & $mapservPath 2>&1 | Out-String

        if ($directOutput -match "WMS_Capabilities") {
            Write-Host "   [OK] Direct execution returned valid WMS response" -ForegroundColor Green

            # Save output
            $directPath = "C:\DuBaoMatRung\debug_direct_mapserv.xml"
            $directOutput | Out-File -FilePath $directPath -Encoding UTF8
            Write-Host "   [OK] Saved to: $directPath" -ForegroundColor Green
            $SuccessCount++
        } else {
            Write-Host "   [ERROR] Direct execution failed or returned invalid response" -ForegroundColor Red
            $previewLen = [Math]::Min(300, $directOutput.Length)
            Write-Host "   Output preview: $($directOutput.Substring(0, $previewLen))" -ForegroundColor Gray

            # Save error
            $directErrorPath = "C:\DuBaoMatRung\debug_direct_error.txt"
            $directOutput | Out-File -FilePath $directErrorPath -Encoding UTF8
            Write-Host "   [ERROR] Saved error to: $directErrorPath" -ForegroundColor Red

            # Check error log
            if (Test-Path $env:MS_ERRORFILE) {
                Write-Host "   Checking MapServer error log..." -ForegroundColor Gray
                $errorLog = Get-Content $env:MS_ERRORFILE -Tail 20
                Write-Host "   Last 20 lines of error log:" -ForegroundColor Yellow
                $errorLog | ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
            }

            $FailCount++
        }
    } catch {
        Write-Host "   [ERROR] Exception during direct execution" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        $FailCount++
    }
} else {
    Write-Host "   [SKIP] Skipped (mapserv.exe not available)" -ForegroundColor Gray
}

# ============================================================================
# Summary Report
# ============================================================================
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   DIAGNOSTIC SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`n[OK] Successful checks: $SuccessCount" -ForegroundColor Green
Write-Host "[ERROR] Failed checks: $FailCount" -ForegroundColor Red

if ($FailCount -eq 0) {
    Write-Host "`nAll checks passed! MapServer should be working." -ForegroundColor Green
    Write-Host "If you still don't see data on map, check:" -ForegroundColor Yellow
    Write-Host "  1. Frontend is calling correct WMS URL" -ForegroundColor Yellow
    Write-Host "  2. CORS settings allow requests" -ForegroundColor Yellow
    Write-Host "  3. Check browser console for errors" -ForegroundColor Yellow
} else {
    Write-Host "`nIssues detected! Review the errors above." -ForegroundColor Yellow
    Write-Host "Common fixes:" -ForegroundColor Yellow
    Write-Host "  1. Install missing software (MS4W, PostgreSQL, PostGIS)" -ForegroundColor Yellow
    Write-Host "  2. Start required services" -ForegroundColor Yellow
    Write-Host "  3. Check database credentials in mapfile" -ForegroundColor Yellow
    Write-Host "  4. Import GIS data into PostgreSQL tables" -ForegroundColor Yellow
}

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Debug files saved to C:\DuBaoMatRung\" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Cleanup environment variables
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:MS_MAPFILE -ErrorAction SilentlyContinue
Remove-Item Env:QUERY_STRING -ErrorAction SilentlyContinue
Remove-Item Env:REQUEST_METHOD -ErrorAction SilentlyContinue
Remove-Item Env:MS_ERRORFILE -ErrorAction SilentlyContinue

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
