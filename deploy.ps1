# Deploy script for Windows Server
param(
    [string]$ServerIP = "103.56.161.239",
    [string]$ProjectPath = "C:\inetpub\wwwroot\dubaomatrung"
)

Write-Host "Starting deployment to Windows Server..." -ForegroundColor Green

# Step 1: Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
Set-Location client
npm install
Set-Location ..
Set-Location microservices
npm install
Set-Location ..

# Step 2: Build project
Write-Host "Building project..." -ForegroundColor Yellow
Set-Location client
npm run build
Set-Location ..

# Step 3: Copy files to IIS
Write-Host "Copying files to IIS..." -ForegroundColor Yellow
if (Test-Path "C:\inetpub\wwwroot\dubaomatrung-frontend") {
    Remove-Item -Recurse -Force "C:\inetpub\wwwroot\dubaomatrung-frontend"
}
xcopy /E /I "client\dist" "C:\inetpub\wwwroot\dubaomatrung-frontend"
Copy-Item "web.config" "C:\inetpub\wwwroot\dubaomatrung-frontend\"

# Step 4: Start PM2 services
Write-Host "Starting PM2 services..." -ForegroundColor Yellow
pm2 delete dubaomatrung-api -s
pm2 start ecosystem.config.js
pm2 save

Write-Host "Deployment completed successfully!" -ForegroundColor Green
Write-Host "Frontend: http://$ServerIP" -ForegroundColor Cyan
Write-Host "Backend API: http://$ServerIP:3001" -ForegroundColor Cyan
