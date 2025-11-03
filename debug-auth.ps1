# ===== DETAILED AUTH SERVICE DEBUG SCRIPT =====

Write-Host "=== DETAILED AUTH SERVICE DEBUG ===" -ForegroundColor Cyan

# 1. Check if auth-service is running
Write-Host "`n[1] Auth-service container status:" -ForegroundColor Yellow
docker inspect dubaomatrung-auth --format='Status: {{.State.Status}} | Running: {{.State.Running}} | Started: {{.State.StartedAt}}'

# 2. Check auth-service environment variables
Write-Host "`n[2] Auth-service environment variables:" -ForegroundColor Yellow
docker exec dubaomatrung-auth env | Select-String -Pattern "PORT|DB_|JWT|NODE_ENV"

# 3. Check if auth-service can connect to postgres
Write-Host "`n[3] Test PostgreSQL connection from auth-service:" -ForegroundColor Yellow
docker exec dubaomatrung-auth node -e "const { Client } = require('pg'); const client = new Client({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}); client.connect().then(() => {console.log('SUCCESS: DB Connected'); client.end();}).catch(err => console.error('ERROR: DB Connection failed -', err.message));"

# 4. Check Prisma schema
Write-Host "`n[4] Check Prisma Client generation:" -ForegroundColor Yellow
docker exec dubaomatrung-auth npx prisma version

# 5. Test health endpoint from inside container
Write-Host "`n[5] Test health endpoint from inside auth-service container:" -ForegroundColor Yellow
docker exec dubaomatrung-auth wget -q -O- http://localhost:3001/health

# 6. Test health endpoint from gateway container
Write-Host "`n[6] Test auth-service from gateway container:" -ForegroundColor Yellow
docker exec dubaomatrung-gateway wget -q -O- --timeout=5 http://auth-service:3001/health

# 7. Check network connectivity
Write-Host "`n[7] Network connectivity:" -ForegroundColor Yellow
docker network inspect dubaomatrung-network --format='{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{println}}{{end}}'

# 8. Check ports
Write-Host "`n[8] Port bindings:" -ForegroundColor Yellow
docker port dubaomatrung-auth
docker port dubaomatrung-gateway

# 9. Recent logs
Write-Host "`n[9] Auth-service recent logs:" -ForegroundColor Yellow
docker-compose logs auth-service --tail=30

Write-Host "`n[10] Gateway recent logs:" -ForegroundColor Yellow
docker-compose logs gateway --tail=30

# 10. Database status
Write-Host "`n[11] PostgreSQL status:" -ForegroundColor Yellow
docker exec dubaomatrung-postgres pg_isready -U postgres

Write-Host "`n=== DEBUG COMPLETE ===" -ForegroundColor Green
Write-Host "If auth-service health check fails, check logs above for errors" -ForegroundColor Yellow
