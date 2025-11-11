# ===================================================================
# Windows Firewall Setup Script
# Mở các ports cần thiết để truy cập từ bên ngoài
# ===================================================================

Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "WINDOWS FIREWALL CONFIGURATION" -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Running as Administrator... OK" -ForegroundColor Green
Write-Host ""

# Ports to open
$ports = @(
    @{Port=5173; Name="Frontend-Client"; Protocol="TCP"},
    @{Port=3000; Name="API-Gateway"; Protocol="TCP"},
    @{Port=3001; Name="Auth-Service"; Protocol="TCP"},
    @{Port=3002; Name="User-Service"; Protocol="TCP"},
    @{Port=3003; Name="GIS-Service"; Protocol="TCP"},
    @{Port=3004; Name="Report-Service"; Protocol="TCP"},
    @{Port=3005; Name="Admin-Service"; Protocol="TCP"},
    @{Port=3006; Name="Search-Service"; Protocol="TCP"},
    @{Port=3007; Name="MapServer-Service"; Protocol="TCP"}
)

Write-Host "[1/3] Opening firewall ports..." -ForegroundColor Cyan
Write-Host ""

foreach ($portInfo in $ports) {
    $port = $portInfo.Port
    $name = $portInfo.Name
    $protocol = $portInfo.Protocol

    # Check if rule exists
    $existingRule = Get-NetFirewallRule -DisplayName "DuBaoMatRung-$name" -ErrorAction SilentlyContinue

    if ($existingRule) {
        Write-Host "  Port $port ($name) - Already configured" -ForegroundColor Yellow
    } else {
        # Create firewall rule
        New-NetFirewallRule `
            -DisplayName "DuBaoMatRung-$name" `
            -Direction Inbound `
            -Protocol $protocol `
            -LocalPort $port `
            -Action Allow `
            -Profile Any `
            -Enabled True | Out-Null

        Write-Host "  Port $port ($name) - Opened" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[2/3] Checking Docker network..." -ForegroundColor Cyan
Write-Host ""

# Check Docker network adapter
$dockerAdapters = Get-NetAdapter | Where-Object { $_.Name -like "*Docker*" -or $_.Name -like "*vEthernet*" }

if ($dockerAdapters) {
    Write-Host "  Docker network adapters found:" -ForegroundColor Green
    $dockerAdapters | ForEach-Object {
        Write-Host "    - $($_.Name) [$($_.Status)]" -ForegroundColor White
    }
} else {
    Write-Host "  WARNING: No Docker network adapters found" -ForegroundColor Yellow
    Write-Host "  Make sure Docker Desktop is running" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[3/3] Verifying configuration..." -ForegroundColor Cyan
Write-Host ""

# Get all IP addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" }

Write-Host "  Server IP Addresses:" -ForegroundColor White
foreach ($ip in $ipAddresses) {
    Write-Host "    - $($ip.IPAddress) [$($ip.InterfaceAlias)]" -ForegroundColor White
}

Write-Host ""
Write-Host "====================================================================" -ForegroundColor Green
Write-Host "FIREWALL CONFIGURATION COMPLETED!" -ForegroundColor Green
Write-Host "====================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verify your server's public IP address" -ForegroundColor White
Write-Host ""
Write-Host "2. Test access from external network:" -ForegroundColor White
Write-Host "   http://YOUR_PUBLIC_IP:5173" -ForegroundColor Cyan
Write-Host "   http://YOUR_PUBLIC_IP:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. If still cannot access, check:" -ForegroundColor White
Write-Host "   - Router/NAT port forwarding" -ForegroundColor White
Write-Host "   - Cloud provider security groups" -ForegroundColor White
Write-Host "   - ISP firewall" -ForegroundColor White
Write-Host ""

# Test local access
Write-Host "Testing local access..." -ForegroundColor Cyan
Write-Host ""

$testPorts = @(5173, 3000)

foreach ($port in $testPorts) {
    try {
        $result = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($result.TcpTestSucceeded) {
            Write-Host "  Port $port - Accessible" -ForegroundColor Green
        } else {
            Write-Host "  Port $port - Not responding (service may be starting)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  Port $port - Cannot test" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")