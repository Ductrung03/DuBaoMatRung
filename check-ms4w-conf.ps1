# Check và sửa ms4w.conf
Write-Host "Checking C:\ms4w\ms4w.conf..." -ForegroundColor Yellow

$ms4wConf = "C:\ms4w\ms4w.conf"

if (Test-Path $ms4wConf) {
    Write-Host "Current content:" -ForegroundColor Gray
    Get-Content $ms4wConf

    Write-Host "`nReplacing with minimal config..." -ForegroundColor Yellow

    # Create proper config with Windows line endings
    $newConfig = @"
CONFIG
END
"@

    # Write với CRLF và ASCII encoding
    $newConfig | Out-File -FilePath $ms4wConf -Encoding ASCII -Force

    Write-Host "[OK] Updated ms4w.conf" -ForegroundColor Green
} else {
    Write-Host "Creating new ms4w.conf..." -ForegroundColor Yellow
    "CONFIG`r`nEND`r`n" | Out-File -FilePath $ms4wConf -Encoding ASCII -Force
    Write-Host "[OK] Created ms4w.conf" -ForegroundColor Green
}

# Test
Write-Host "`nTesting MapServer..." -ForegroundColor Yellow
$env:QUERY_STRING = "map=C:\DuBaoMatRung\mapserver\mapfiles\laocai-windows.map&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetCapabilities"
$env:REQUEST_METHOD = "GET"

$result = C:\ms4w\Apache\cgi-bin\mapserv.exe 2>&1 | Out-String

if ($result -match "WMS_Capabilities") {
    Write-Host "`n[SUCCESS] IT WORKS!" -ForegroundColor Green
} else {
    Write-Host "`n[FAILED] Still error:" -ForegroundColor Red
    Write-Host $result
}
