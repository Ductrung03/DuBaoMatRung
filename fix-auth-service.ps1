Write-Host "🔍 Bước 1: Kiểm tra trạng thái containers..." -ForegroundColor Cyan
  docker-compose ps

  Write-Host "`n📋 Bước 2: Kiểm tra logs auth-service (20 dòng cuối)..." -ForegroundColor Cyan
  docker-compose logs auth-service --tail=20

  Write-Host "`n📋 Bước 3: Kiểm tra logs gateway (20 dòng cuối)..." -ForegroundColor Cyan
  docker-compose logs gateway --tail=20

  Write-Host "`n📋 Bước 4: Kiểm tra logs postgres..." -ForegroundColor Cyan
  docker-compose logs postgres --tail=20

  Write-Host "`n🩺 Bước 5: Test kết nối trực tiếp đến auth-service..." -ForegroundColor Cyan
  docker exec dubaomatrung-auth node -e "require('http').get('http://localhost:3001/health', (r) => { let data = ''; r.on('data', chunk => data += chunk); r.on('end', () => 
  console.log(data)); });"

  Write-Host "`n🔧 Bước 6: Restart auth-service và gateway..." -ForegroundColor Cyan
  docker-compose restart auth-service gateway

  Write-Host "`n⏳ Đợi 10 giây để services khởi động..." -ForegroundColor Yellow
  Start-Sleep -Seconds 10

  Write-Host "`n✅ Bước 7: Kiểm tra lại trạng thái..." -ForegroundColor Cyan
  docker-compose ps

  Write-Host "`n🧪 Bước 8: Test API login từ host..." -ForegroundColor Cyan
  $loginBody = @{
      username = "admin"
      password = "Admin@123"
  } | ConvertTo-Json

  try {
      $response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" `
          -Method POST `
          -ContentType "application/json" `
          -Body $loginBody `
          -UseBasicParsing

      Write-Host "✅ Login thành công!" -ForegroundColor Green
      Write-Host "Status: $($response.StatusCode)"
      Write-Host "Response: $($response.Content)"
  } catch {
      Write-Host "❌ Login thất bại!" -ForegroundColor Red
      Write-Host "Error: $($_.Exception.Message)"

      if ($_.Exception.Response) {
          $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
          $responseBody = $reader.ReadToEnd()
          Write-Host "Response Body: $responseBody"
      }
  }

  Write-Host "`n📊 Tổng kết:" -ForegroundColor Cyan
  Write-Host "- Nếu vẫn lỗi 503, chạy: docker-compose logs auth-service --tail=50" -ForegroundColor Yellow
  Write-Host "- Có thể cần chờ database import xong (5-10 phút)" -ForegroundColor Yellow
  Write-Host "- Kiểm tra file .env trong container: docker exec dubaomatrung-auth cat .env" -ForegroundColor Yellow