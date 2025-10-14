# Backup script for DuBaoMatRung project
param(
    [string]$BackupPath = "C:\Backups"
)

$date = Get-Date -Format "yyyyMMdd_HHmmss"
$projectBackupPath = "$BackupPath\dubaomatrung_$date"

Write-Host "Creating backup..." -ForegroundColor Green

# Create backup directory
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath
}

# Backup project files
xcopy /E /I "C:\inetpub\wwwroot\dubaomatrung" $projectBackupPath

# Backup frontend files
xcopy /E /I "C:\inetpub\wwwroot\dubaomatrung-frontend" "$projectBackupPath\frontend"

# Backup PM2 configuration
pm2 save --force

Write-Host "Backup completed: $projectBackupPath" -ForegroundColor Green

# Clean old backups (keep only last 5)
$oldBackups = Get-ChildItem $BackupPath -Directory | Where-Object {$_.Name -like "dubaomatrung_*"} | Sort-Object CreationTime -Descending | Select-Object -Skip 5
if ($oldBackups) {
    Write-Host "Cleaning old backups..." -ForegroundColor Yellow
    $oldBackups | Remove-Item -Recurse -Force
}
