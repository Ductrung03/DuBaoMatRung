# ===================================================================
# Fix External Access Script
# Khắc phục vấn đề không truy cập được từ bên ngoài
# ===================================================================

param(
    [string]$PublicIP = "",
    [switch]$SkipFirewall
)

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "FIX EXTERNAL ACCESS TO DU BAO MAT RUNG" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Detect or ask for public IP
if (-not $PublicIP) {
    Write-Host "Detecting server IP addresses..." -ForegroundColor Yellow
    Write-Host ""

    $ips = Get-NetIPAddress -AddressFamily IPv4 |
           Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.IPAddress -notlike "172.*" -and $_.IPAddress -notlike "10.*" } |
           Select-Object -ExpandProperty IPAddress

    if ($ips.Count -gt 0) {
        Write-Host "Found IP addresses:" -ForegroundColor Green
        for ($i = 0; $i -lt $ips.Count; $i++) {
            Write-Host "  [$($i+1)] $($ips[$i])" -ForegroundColor White
        }
        Write-Host ""

        if ($ips.Count -eq 1) {
            $PublicIP = $ips[0]
            Write-Host "Using IP: $PublicIP" -ForegroundColor Green
        } else {
            $selection = Read-Host "Select IP (1-$($ips.Count)) or enter custom IP"

            if ($selection -match '^\d+$' -and [int]$selection -le $ips.Count) {
                $PublicIP = $ips[[int]$selection - 1]
            } else {
                $PublicIP = $selection
            }
        }
    } else {
        $PublicIP = Read-Host "Enter your server's public IP address"
    }
}

Write-Host ""
Write-Host "Using Public IP: $PublicIP" -ForegroundColor Green
Write-Host ""

# Step 1: Update .env file
Write-Host "[1/4] Updating .env configuration..." -ForegroundColor Cyan

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw

    # Update VITE_API_URL
    if ($envContent -match 'VITE_API_URL=') {
        $envContent = $envContent -replace 'VITE_API_URL=.*', "VITE_API_URL=http://${PublicIP}:3000"
        Write-Host "  Updated VITE_API_URL" -ForegroundColor Green
    } else {
        $envContent += "`nVITE_API_URL=http://${PublicIP}:3000"
        Write-Host "  Added VITE_API_URL" -ForegroundColor Green
    }

    # Update FRONTEND_URL
    if ($envContent -match 'FRONTEND_URL=') {
        $envContent = $envContent -replace 'FRONTEND_URL=.*', "FRONTEND_URL=http://${PublicIP}:5173"
        Write-Host "  Updated FRONTEND_URL" -ForegroundColor Green
    } else {
        $envContent += "`nFRONTEND_URL=http://${PublicIP}:5173"
        Write-Host "  Added FRONTEND_URL" -ForegroundColor Green
    }

    # Update CORS_ORIGINS
    if ($envContent -match 'CORS_ORIGINS=') {
        $envContent = $envContent -replace 'CORS_ORIGINS=.*', "CORS_ORIGINS=http://localhost:5173,http://${PublicIP}:5173"
        Write-Host "  Updated CORS_ORIGINS" -ForegroundColor Green
    } else {
        $envContent += "`nCORS_ORIGINS=http://localhost:5173,http://${PublicIP}:5173"
        Write-Host "  Added CORS_ORIGINS" -ForegroundColor Green
    }

    $envContent | Out-File ".env" -Encoding UTF8 -NoNewline
    Write-Host "  .env file updated successfully" -ForegroundColor Green
} else {
    Write-Host "  ERROR: .env file not found!" -ForegroundColor Red
    exit 1
}

# Step 2: Rebuild client with correct API URL
Write-Host ""
Write-Host "[2/4] Rebuilding client with new API URL..." -ForegroundColor Cyan
Write-Host "  This may take 2-3 minutes..." -ForegroundColor Yellow

docker-compose build client --build-arg VITE_API_URL=http://${PublicIP}:3000

if ($LASTEXITCODE -eq 0) {
    Write-Host "  Client rebuilt successfully" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Client rebuild failed" -ForegroundColor Red
}

# Step 3: Open firewall ports
if (-not $SkipFirewall) {
    Write-Host ""
    Write-Host "[3/4] Configuring Windows Firewall..." -ForegroundColor Cyan

    $isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

    if ($isAdmin) {
        Write-Host "  Opening required ports..." -ForegroundColor Yellow

        $ports = @(5173, 3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007)

        foreach ($port in $ports) {
            $ruleName = "DuBaoMatRung-Port-$port"
            $existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

            if (-not $existingRule) {
                New-NetFirewallRule `
                    -DisplayName $ruleName `
                    -Direction Inbound `
                    -Protocol TCP `
                    -LocalPort $port `
                    -Action Allow `
                    -Profile Any `
                    -Enabled True | Out-Null
                Write-Host "    Port $port - Opened" -ForegroundColor Green
            } else {
                Write-Host "    Port $port - Already open" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  WARNING: Not running as Administrator" -ForegroundColor Yellow
        Write-Host "  Cannot configure firewall" -ForegroundColor Yellow
        Write-Host "  Run this script as Administrator to open firewall ports" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[3/4] Skipping firewall configuration" -ForegroundColor Yellow
}

# Step 4: Restart services
Write-Host ""
Write-Host "[4/4] Restarting services..." -ForegroundColor Cyan

docker-compose restart client gateway

Write-Host "  Services restarted" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "CONFIGURATION COMPLETED!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://${PublicIP}:5173" -ForegroundColor White
Write-Host "  API:       http://${PublicIP}:3000" -ForegroundColor White
Write-Host ""

Write-Host "Testing connectivity..." -ForegroundColor Cyan
Write-Host ""

# Test ports
$testResults = @()

foreach ($port in @(5173, 3000)) {
    try {
        $test = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($test.TcpTestSucceeded) {
            Write-Host "  Port $port - OK" -ForegroundColor Green
            $testResults += "OK"
        } else {
            Write-Host "  Port $port - NOT RESPONDING" -ForegroundColor Red
            $testResults += "FAIL"
        }
    } catch {
        Write-Host "  Port $port - ERROR" -ForegroundColor Red
        $testResults += "ERROR"
    }
}

Write-Host ""

if ($testResults -contains "FAIL" -or $testResults -contains "ERROR") {
    Write-Host "WARNING: Some services are not responding" -ForegroundColor Yellow
    Write-Host "Wait 30-60 seconds for services to start, then check:" -ForegroundColor Yellow
    Write-Host "  docker-compose ps" -ForegroundColor Cyan
    Write-Host "  .\deploy.ps1 -Logs -Service client" -ForegroundColor Cyan
} else {
    Write-Host "All services are running!" -ForegroundColor Green
}

Write-Host ""
Write-Host "If you still cannot access from external network:" -ForegroundColor Yellow
Write-Host "  1. Check router/NAT port forwarding" -ForegroundColor White
Write-Host "  2. Check cloud provider security groups (AWS/Azure/GCP)" -ForegroundColor White
Write-Host "  3. Verify public IP is correct: curl ifconfig.me" -ForegroundColor White
Write-Host ""

Write-Host "Current configuration:" -ForegroundColor Cyan
Write-Host "  .env file updated with IP: $PublicIP" -ForegroundColor White
Write-Host "  Client rebuilt with API URL" -ForegroundColor White
Write-Host "  Firewall ports opened (if admin)" -ForegroundColor White
Write-Host ""