# Hệ thống Dự báo Mất Rừng - Forest Monitoring System

## Mô tả
Hệ thống phát hiện sớm và dự báo mất rừng sử dụng React frontend và Node.js microservices backend.

## Cấu trúc Project
```
DuBaoMatRung/
├── client/          # React frontend
├── microservices/   # Node.js backend services
├── mapserver/       # Map server configuration
└── server/          # Additional server components
```

## Deploy lên Windows Server (103.56.161.239)

### Bước 1: Chuẩn bị Windows Server

#### 1.1 Cài đặt Node.js
```powershell
# Tải và cài đặt Node.js LTS từ https://nodejs.org
# Kiểm tra cài đặt
node --version
npm --version
```

#### 1.2 Cài đặt Git
```powershell
# Tải và cài đặt Git từ https://git-scm.com/download/win
git --version
```

#### 1.3 Cài đặt PM2 (Process Manager)
```powershell
npm install -g pm2
npm install -g pm2-windows-service
pm2-service-install
```

### Bước 2: Clone và Setup Project

#### 2.1 Clone repository
```powershell
# Tạo thư mục project
mkdir C:\inetpub\wwwroot\dubaomatrung
cd C:\inetpub\wwwroot\dubaomatrung

# Clone code
git clone https://github.com/luckyboiz/dubaomatrung.git .
```

#### 2.2 Cài đặt dependencies
```powershell
# Cài đặt root dependencies
npm install

# Cài đặt frontend dependencies
cd client
npm install
cd ..

# Cài đặt backend dependencies
cd microservices
npm install
cd ..
```

### Bước 3: Build Project

#### 3.1 Build Frontend
```powershell
cd client
npm run build
cd ..
```

#### 3.2 Build Backend (nếu có Docker)
```powershell
cd microservices
# Nếu có Docker
docker-compose build
# Hoặc build thông thường
npm run build
cd ..
```

### Bước 4: Cấu hình Environment

#### 4.1 Tạo file .env cho backend
```powershell
# Tạo file .env trong thư mục microservices
cd microservices
echo "NODE_ENV=production" > .env
echo "PORT=3001" >> .env
echo "DB_HOST=localhost" >> .env
echo "DB_PORT=5432" >> .env
echo "DB_NAME=dubaomatrung" >> .env
echo "DB_USER=<your_db_user>" >> .env
echo "DB_PASS=<your_db_password>" >> .env
cd ..
```

#### 4.2 Tạo file .env cho frontend
```powershell
cd client
echo "VITE_API_URL=http://103.56.161.239:3001" > .env.production
cd ..
```

### Bước 5: Cấu hình IIS (Internet Information Services)

#### 5.1 Cài đặt IIS
```powershell
# Mở PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-HttpErrors, IIS-HttpLogging, IIS-RequestFiltering, IIS-StaticContent, IIS-DefaultDocument
```

#### 5.2 Cài đặt URL Rewrite Module
- Tải và cài đặt từ: https://www.iis.net/downloads/microsoft/url-rewrite

#### 5.3 Tạo web.config cho React app
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="React Routes" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <staticContent>
      <mimeMap fileExtension=".json" mimeType="application/json" />
    </staticContent>
  </system.webServer>
</configuration>
```

### Bước 6: Deploy và Chạy Services

#### 6.1 Copy frontend build files
```powershell
# Copy build files to IIS wwwroot
xcopy /E /I client\dist C:\inetpub\wwwroot\dubaomatrung-frontend
copy web.config C:\inetpub\wwwroot\dubaomatrung-frontend\
```

#### 6.2 Tạo PM2 ecosystem file
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'dubaomatrung-api',
      script: './microservices/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

#### 6.3 Chạy backend với PM2
```powershell
# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### Bước 7: Cấu hình Firewall

```powershell
# Mở port cho API
New-NetFirewallRule -DisplayName "DuBaoMatRung API" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow

# Mở port cho HTTP/HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow
```

### Bước 8: Kiểm tra Deploy

#### 8.1 Kiểm tra services
```powershell
# Kiểm tra PM2 processes
pm2 status

# Kiểm tra logs
pm2 logs dubaomatrung-api

# Kiểm tra API endpoint
curl http://localhost:3001/health
```

#### 8.2 Kiểm tra website
- Truy cập: http://103.56.161.239
- Kiểm tra API: http://103.56.161.239:3001

### Bước 9: Maintenance Commands

```powershell
# Update code
git pull origin main
npm run build
pm2 restart dubaomatrung-api

# View logs
pm2 logs

# Monitor processes
pm2 monit

# Stop services
pm2 stop all

# Restart services
pm2 restart all
```

### Bước 10: Backup và Monitoring

#### 10.1 Tạo backup script
```powershell
# backup.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = "C:\Backups\dubaomatrung_$date"
mkdir $backupPath
xcopy /E /I C:\inetpub\wwwroot\dubaomatrung $backupPath
```

#### 10.2 Setup monitoring
```powershell
# Cài đặt PM2 monitoring
pm2 install pm2-server-monit
```

## Troubleshooting

### Lỗi thường gặp:
1. **Port đã được sử dụng**: Thay đổi PORT trong .env
2. **Permission denied**: Chạy PowerShell as Administrator
3. **Module not found**: Chạy `npm install` trong thư mục tương ứng
4. **Database connection**: Kiểm tra thông tin database trong .env

### Logs location:
- PM2 logs: `C:\Users\<user>\.pm2\logs\`
- IIS logs: `C:\inetpub\logs\LogFiles\`

## Liên hệ
- Author: LuckyBoiz
- Repository: https://github.com/luckyboiz/dubaomatrung
