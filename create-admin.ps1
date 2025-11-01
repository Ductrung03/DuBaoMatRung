# Create admin user script
Write-Host "=== CREATING ADMIN USER ===" -ForegroundColor Green

# Create admin user in auth_db
$createUserSQL = @"
INSERT INTO users (id, username, email, password, role, created_at, updated_at) 
VALUES (
    'admin-001', 
    'admin', 
    'admin@dubaomatrung.com', 
    '\$2b\$10\$rQZ8kHWKtGXGvKWGz4oJ4eJ4kQZ8kHWKtGXGvKWGz4oJ4eJ4kQZ8k', 
    'admin', 
    NOW(), 
    NOW()
) ON CONFLICT (username) DO NOTHING;
"@

Write-Host "Creating admin user..." -ForegroundColor Yellow
docker-compose exec -T postgres psql -U postgres -d auth_db -c $createUserSQL

Write-Host "✓ Admin user created" -ForegroundColor Green
Write-Host "Login: admin / password: admin123" -ForegroundColor Cyan
