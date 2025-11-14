# ============================================
# MAPSERVER DIAGNOSTIC SCRIPT
# ============================================
# Script này kiểm tra và chẩn đoán tất cả vấn đề có thể xảy ra với MapServer

param(
    [string]$ProjectPath = "C:\DuBaoMatRung",
    [string]$MS4WPath = "C:\ms4w\Apache\cgi-bin\mapserv.exe"
)

$ErrorActionPreference = "Continue"
$issuesFound = @()
$warnings = @()

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          MAPSERVER DIAGNOSTIC & HEALTH CHECK               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============================================
# CHECK 1: Project Structure
# ============================================
Write-Host "[CHECK 1] Project Structure" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$requiredPaths = @{
    "Project Root" = $ProjectPath
    "MapServer Service" = "$ProjectPath\microservices\services\mapserver-service"
    "MapServer Source" = "$ProjectPath\microservices\services\mapserver-service\src\index.js"
    "MapFile Directory" = "$ProjectPath\mapserver\mapfiles"
    "Temp Directory" = "$ProjectPath\mapserver\tmp"
    "Shapefiles Directory" = "$ProjectPath\mapserver\shapefiles"
}

foreach ($name in $requiredPaths.Keys) {
    $path = $requiredPaths[$name]
    if (Test-Path $path) {
        Write-Host "   ✓ $name" -ForegroundColor Green
        Write-Host "     $path" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ $name" -ForegroundColor Red
        Write-Host "     $path" -ForegroundColor Gray
        $issuesFound += "Missing: $name at $path"
    }
}

# ============================================
# CHECK 2: MS4W Installation
# ============================================
Write-Host ""
Write-Host "[CHECK 2] MS4W Installation" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

if (Test-Path $MS4WPath) {
    Write-Host "   ✓ MapServer binary found" -ForegroundColor Green
    Write-Host "     $MS4WPath" -ForegroundColor Gray

    # Get file info
    $fileInfo = Get-Item $MS4WPath
    Write-Host "     Size: $($fileInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "     Modified: $($fileInfo.LastWriteTime)" -ForegroundColor Gray

    # Test execution
    try {
        $output = & $MS4WPath 2>&1 | Out-String
        Write-Host "   ✓ Binary is executable" -ForegroundColor Green

        # Check for version info in output
        if ($output -match "MapServer version") {
            $version = ($output -match "MapServer version [\d\.]+").Matches[0].Value
            Write-Host "     $version" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ✗ Binary cannot be executed" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
        $issuesFound += "MapServer binary cannot be executed"
    }
} else {
    Write-Host "   ✗ MapServer binary NOT found" -ForegroundColor Red
    Write-Host "     Expected: $MS4WPath" -ForegroundColor Gray
    $issuesFound += "MS4W not installed at $MS4WPath"
}

# ============================================
# CHECK 3: Configuration Files
# ============================================
Write-Host ""
Write-Host "[CHECK 3] Configuration Files" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Check .env file
$envPath = "$ProjectPath\microservices\services\mapserver-service\.env"
if (Test-Path $envPath) {
    Write-Host "   ✓ .env file found" -ForegroundColor Green
    Write-Host "     $envPath" -ForegroundColor Gray

    $envContent = Get-Content $envPath -Raw
    if ($envContent -match "MAPSERV_BIN=(.+)") {
        $configuredBinary = $matches[1].Trim()
        Write-Host "     MAPSERV_BIN: $configuredBinary" -ForegroundColor Gray

        if (!(Test-Path $configuredBinary)) {
            Write-Host "   ⚠ Configured MapServer binary not found!" -ForegroundColor Yellow
            $warnings += "MapServer binary path in .env does not exist: $configuredBinary"
        }
    } else {
        Write-Host "   ⚠ MAPSERV_BIN not configured in .env" -ForegroundColor Yellow
        $warnings += "MAPSERV_BIN not set in .env file"
    }

    if ($envContent -match "MAPFILE_PATH=(.+)") {
        $configuredMapfile = $matches[1].Trim()
        Write-Host "     MAPFILE_PATH: $configuredMapfile" -ForegroundColor Gray

        if (!(Test-Path $configuredMapfile)) {
            Write-Host "   ⚠ Configured MapFile not found!" -ForegroundColor Yellow
            $warnings += "MapFile path in .env does not exist: $configuredMapfile"
        }
    } else {
        Write-Host "   ⚠ MAPFILE_PATH not configured in .env" -ForegroundColor Yellow
        $warnings += "MAPFILE_PATH not set in .env file"
    }
} else {
    Write-Host "   ✗ .env file NOT found" -ForegroundColor Red
    Write-Host "     Expected: $envPath" -ForegroundColor Gray
    $issuesFound += ".env file missing for mapserver-service"
}

# Check MapFile
$mapFilePath = "$ProjectPath\mapserver\mapfiles\laocai.map"
if (Test-Path $mapFilePath) {
    Write-Host "   ✓ MapFile found" -ForegroundColor Green
    Write-Host "     $mapFilePath" -ForegroundColor Gray

    $mapContent = Get-Content $mapFilePath -Raw
    $fileSize = (Get-Item $mapFilePath).Length

    Write-Host "     Size: $fileSize bytes" -ForegroundColor Gray

    # Basic validation
    if ($mapContent -match "^MAP" -and $mapContent -match "END\s*$") {
        Write-Host "   ✓ MapFile structure appears valid" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ MapFile structure may be invalid" -ForegroundColor Yellow
        $warnings += "MapFile structure validation failed"
    }

    # Check for layer definitions
    $layerMatches = [regex]::Matches($mapContent, "LAYER")
    if ($layerMatches.Count -gt 0) {
        Write-Host "     Layers defined: $($layerMatches.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ⚠ No layers found in MapFile" -ForegroundColor Yellow
        $warnings += "MapFile contains no layer definitions"
    }

    # Check for database connections
    if ($mapContent -match "CONNECTION") {
        Write-Host "   ✓ Database connections configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ No database connections found" -ForegroundColor Yellow
    }

    # Check for Windows vs Unix paths
    if ($mapContent -match "/usr/|/home/|/opt/") {
        Write-Host "   ⚠ Unix-style paths detected in MapFile" -ForegroundColor Yellow
        $warnings += "MapFile contains Unix paths, may need Windows paths"
    }
} else {
    Write-Host "   ✗ MapFile NOT found" -ForegroundColor Red
    Write-Host "     Expected: $mapFilePath" -ForegroundColor Gray
    $issuesFound += "MapFile not found at $mapFilePath"
}

# ============================================
# CHECK 4: Node.js Environment
# ============================================
Write-Host ""
Write-Host "[CHECK 4] Node.js Environment" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Check Node.js
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ Node.js not found" -ForegroundColor Red
    $issuesFound += "Node.js not installed or not in PATH"
}

# Check NPM
$npmVersion = npm --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ NPM: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "   ✗ NPM not found" -ForegroundColor Red
    $issuesFound += "NPM not found"
}

# Check dependencies
$packageJsonPath = "$ProjectPath\microservices\services\mapserver-service\package.json"
$nodeModulesPath = "$ProjectPath\microservices\services\mapserver-service\node_modules"

if (Test-Path $packageJsonPath) {
    Write-Host "   ✓ package.json found" -ForegroundColor Green

    if (Test-Path $nodeModulesPath) {
        Write-Host "   ✓ node_modules installed" -ForegroundColor Green

        # Check key dependencies
        $requiredPackages = @("express", "dotenv", "winston", "cors", "compression")
        foreach ($pkg in $requiredPackages) {
            $pkgPath = "$nodeModulesPath\$pkg"
            if (Test-Path $pkgPath) {
                Write-Host "     ✓ $pkg" -ForegroundColor Gray
            } else {
                Write-Host "     ✗ $pkg missing" -ForegroundColor Red
                $issuesFound += "Required package missing: $pkg"
            }
        }
    } else {
        Write-Host "   ✗ node_modules NOT found" -ForegroundColor Red
        Write-Host "     Run: npm install" -ForegroundColor Gray
        $issuesFound += "Dependencies not installed (node_modules missing)"
    }
} else {
    Write-Host "   ✗ package.json NOT found" -ForegroundColor Red
    $issuesFound += "package.json not found for mapserver-service"
}

# ============================================
# CHECK 5: PM2 Process Manager
# ============================================
Write-Host ""
Write-Host "[CHECK 5] PM2 Process Manager" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$pm2Version = pm2 --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✓ PM2 installed: $pm2Version" -ForegroundColor Green

    # Check PM2 process list
    try {
        $pm2List = pm2 jlist | ConvertFrom-Json
        $mapserverProcess = $pm2List | Where-Object { $_.name -eq "mapserver-service" }

        if ($mapserverProcess) {
            Write-Host "   ✓ mapserver-service found in PM2" -ForegroundColor Green
            Write-Host "     PID: $($mapserverProcess.pid)" -ForegroundColor Gray
            Write-Host "     Status: $($mapserverProcess.pm2_env.status)" -ForegroundColor Gray
            Write-Host "     Uptime: $($mapserverProcess.pm2_env.pm_uptime)" -ForegroundColor Gray
            Write-Host "     Restarts: $($mapserverProcess.pm2_env.restart_time)" -ForegroundColor Gray

            if ($mapserverProcess.pm2_env.status -ne "online") {
                Write-Host "   ⚠ Service is not running!" -ForegroundColor Yellow
                $warnings += "MapServer service is not online in PM2"
            }

            # Check for high restart count
            if ($mapserverProcess.pm2_env.restart_time -gt 10) {
                Write-Host "   ⚠ High restart count detected!" -ForegroundColor Yellow
                $warnings += "Service has been restarted $($mapserverProcess.pm2_env.restart_time) times"
            }
        } else {
            Write-Host "   ⚠ mapserver-service NOT found in PM2" -ForegroundColor Yellow
            $warnings += "MapServer service not registered in PM2"
        }

        # Show all PM2 processes
        Write-Host ""
        Write-Host "   All PM2 processes:" -ForegroundColor Gray
        pm2 list
    } catch {
        Write-Host "   ⚠ Could not retrieve PM2 process list" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ PM2 not installed" -ForegroundColor Red
    $issuesFound += "PM2 not installed"
}

# ============================================
# CHECK 6: PostgreSQL Database
# ============================================
Write-Host ""
Write-Host "[CHECK 6] PostgreSQL Database" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$pgServices = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
if ($pgServices) {
    $pgService = $pgServices | Select-Object -First 1
    Write-Host "   ✓ PostgreSQL service found: $($pgService.Name)" -ForegroundColor Green

    if ($pgService.Status -eq "Running") {
        Write-Host "   ✓ PostgreSQL is running" -ForegroundColor Green
        Write-Host "     Status: $($pgService.Status)" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ PostgreSQL is NOT running" -ForegroundColor Red
        Write-Host "     Status: $($pgService.Status)" -ForegroundColor Gray
        $issuesFound += "PostgreSQL service is not running"
    }

    # Check if listening on port 5432
    $pgPort = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
    if ($pgPort) {
        Write-Host "   ✓ PostgreSQL listening on port 5432" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ PostgreSQL not listening on port 5432" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ PostgreSQL service NOT found" -ForegroundColor Red
    $issuesFound += "PostgreSQL not installed or service not found"
}

# ============================================
# CHECK 7: Network & Ports
# ============================================
Write-Host ""
Write-Host "[CHECK 7] Network & Ports" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$portsToCheck = @{
    "3008" = "MapServer Service"
    "3000" = "API Gateway"
    "5432" = "PostgreSQL"
}

foreach ($port in $portsToCheck.Keys) {
    $service = $portsToCheck[$port]
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($connection) {
        Write-Host "   ✓ Port $port ($service) is active" -ForegroundColor Green
        $owningProcess = Get-Process -Id $connection[0].OwningProcess -ErrorAction SilentlyContinue
        if ($owningProcess) {
            Write-Host "     Process: $($owningProcess.Name) (PID: $($owningProcess.Id))" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ✗ Port $port ($service) is not listening" -ForegroundColor Red
        $warnings += "Service not listening on port $port ($service)"
    }
}

# ============================================
# CHECK 8: Service Health
# ============================================
Write-Host ""
Write-Host "[CHECK 8] Service Health Check" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$endpoints = @{
    "Health" = "http://localhost:3008/health"
    "WMS GetCapabilities" = "http://localhost:3008/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
}

foreach ($name in $endpoints.Keys) {
    $url = $endpoints[$name]
    Write-Host "   Testing: $name" -ForegroundColor Gray

    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "   ✓ $name - OK (200)" -ForegroundColor Green
            Write-Host "     Content-Type: $($response.Headers['Content-Type'])" -ForegroundColor Gray

            if ($name -eq "Health") {
                Write-Host "     Response: $($response.Content)" -ForegroundColor Gray
            }
        } else {
            Write-Host "   ⚠ $name - Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ✗ $name - FAILED" -ForegroundColor Red
        Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Gray
        $issuesFound += "$name endpoint failed: $($_.Exception.Message)"
    }
}

# ============================================
# CHECK 9: Logs Analysis
# ============================================
Write-Host ""
Write-Host "[CHECK 9] Recent Logs" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

$pm2LogPath = "$env:USERPROFILE\.pm2\logs"
$mapserverLogOut = "$pm2LogPath\mapserver-service-out.log"
$mapserverLogErr = "$pm2LogPath\mapserver-service-error.log"

if (Test-Path $mapserverLogErr) {
    $errorLogs = Get-Content $mapserverLogErr -Tail 5 -ErrorAction SilentlyContinue
    if ($errorLogs) {
        Write-Host "   ⚠ Recent errors found in logs:" -ForegroundColor Yellow
        $errorLogs | ForEach-Object {
            Write-Host "     $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ✓ No recent errors in logs" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠ Error log file not found" -ForegroundColor Yellow
}

# ============================================
# FINAL REPORT
# ============================================
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    DIAGNOSTIC REPORT                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ($issuesFound.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All checks passed! MapServer appears to be configured correctly." -ForegroundColor Green
    Write-Host ""
} else {
    if ($issuesFound.Count -gt 0) {
        Write-Host "❌ CRITICAL ISSUES FOUND: $($issuesFound.Count)" -ForegroundColor Red
        Write-Host ""
        $issuesFound | ForEach-Object {
            Write-Host "   • $_" -ForegroundColor Red
        }
        Write-Host ""
    }

    if ($warnings.Count -gt 0) {
        Write-Host "⚠ WARNINGS: $($warnings.Count)" -ForegroundColor Yellow
        Write-Host ""
        $warnings | ForEach-Object {
            Write-Host "   • $_" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

Write-Host "📋 Recommended Actions:" -ForegroundColor Cyan
Write-Host ""

if ($issuesFound -match "MS4W") {
    Write-Host "1. Install MS4W from https://ms4w.com/" -ForegroundColor White
}

if ($issuesFound -match ".env") {
    Write-Host "2. Run: .\fix-mapserver-complete.ps1" -ForegroundColor White
}

if ($issuesFound -match "node_modules") {
    Write-Host "3. Install dependencies:" -ForegroundColor White
    Write-Host "   cd $ProjectPath\microservices\services\mapserver-service" -ForegroundColor Gray
    Write-Host "   npm install" -ForegroundColor Gray
}

if ($issuesFound -match "PostgreSQL" -or $warnings -match "PostgreSQL") {
    Write-Host "4. Start PostgreSQL service:" -ForegroundColor White
    Write-Host "   net start postgresql*" -ForegroundColor Gray
}

if ($warnings -match "not online" -or $warnings -match "not listening") {
    Write-Host "5. Restart MapServer service:" -ForegroundColor White
    Write-Host "   pm2 restart mapserver-service" -ForegroundColor Gray
}

Write-Host ""
Write-Host "For detailed logs: pm2 logs mapserver-service" -ForegroundColor Cyan
Write-Host "For complete fix: .\fix-mapserver-complete.ps1 -AutoRestart" -ForegroundColor Cyan
Write-Host ""
