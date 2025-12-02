# =====================================
# Docker Quick Commands Helper
# Common Docker operations for DuBaoMatRung
# =====================================

function Show-Menu {
    Clear-Host
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  DuBaoMatRung - Docker Quick Commands" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1.  View all services status" -ForegroundColor White
    Write-Host "2.  View logs (all services)" -ForegroundColor White
    Write-Host "3.  View logs (specific service)" -ForegroundColor White
    Write-Host "4.  Restart all services" -ForegroundColor White
    Write-Host "5.  Restart specific service" -ForegroundColor White
    Write-Host "6.  Stop all services" -ForegroundColor White
    Write-Host "7.  Start all services" -ForegroundColor White
    Write-Host "8.  Backup databases" -ForegroundColor White
    Write-Host "9.  View resource usage" -ForegroundColor White
    Write-Host "10. Clean unused Docker data" -ForegroundColor White
    Write-Host "11. Rebuild and restart service" -ForegroundColor White
    Write-Host "12. Database shell (PostgreSQL)" -ForegroundColor White
    Write-Host "13. Redis CLI" -ForegroundColor White
    Write-Host "14. Export logs to file" -ForegroundColor White
    Write-Host "15. Health check all services" -ForegroundColor White
    Write-Host ""
    Write-Host "0.  Exit" -ForegroundColor Red
    Write-Host ""
}

function View-Status {
    docker compose ps
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function View-Logs {
    docker compose logs -f
}

function View-ServiceLogs {
    Write-Host "Available services:"
    Write-Host "gateway, auth-service, user-service, gis-service,"
    Write-Host "report-service, admin-service, search-service,"
    Write-Host "mapserver-service, frontend, postgres, redis"
    Write-Host ""
    $service = Read-Host "Enter service name"
    docker compose logs -f $service
}

function Restart-All {
    Write-Host "Restarting all services..." -ForegroundColor Yellow
    docker compose restart
    Write-Host "✓ All services restarted" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Restart-Service {
    $service = Read-Host "Enter service name"
    Write-Host "Restarting $service..." -ForegroundColor Yellow
    docker compose restart $service
    Write-Host "✓ $service restarted" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Stop-All {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    docker compose down
    Write-Host "✓ All services stopped" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Start-All {
    Write-Host "Starting all services..." -ForegroundColor Yellow
    docker compose up -d
    Write-Host "✓ All services started" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Backup-Databases {
    .\docker\backup-databases.ps1
    Read-Host "Press Enter to continue"
}

function View-Resources {
    docker stats --no-stream
    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Clean-Docker {
    Write-Host "⚠ This will remove unused images, containers, networks" -ForegroundColor Yellow
    $confirm = Read-Host "Continue? (yes/no)"
    if ($confirm -eq "yes") {
        docker system prune -a
    }
    Read-Host "Press Enter to continue"
}

function Rebuild-Service {
    $service = Read-Host "Enter service name"
    Write-Host "Rebuilding $service..." -ForegroundColor Yellow
    docker compose build $service
    docker compose up -d $service
    Write-Host "✓ $service rebuilt and restarted" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Database-Shell {
    Write-Host "Connecting to PostgreSQL..." -ForegroundColor Yellow
    Write-Host "Available databases: auth_db, gis_db, admin_db" -ForegroundColor Cyan
    $db = Read-Host "Enter database name (default: auth_db)"
    if ([string]::IsNullOrWhiteSpace($db)) { $db = "auth_db" }
    docker compose exec postgres psql -U postgres -d $db
}

function Redis-Shell {
    Write-Host "Connecting to Redis..." -ForegroundColor Yellow
    docker compose exec redis redis-cli
}

function Export-Logs {
    $filename = "logs_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
    Write-Host "Exporting logs to $filename..." -ForegroundColor Yellow
    docker compose logs > $filename
    Write-Host "✓ Logs exported to $filename" -ForegroundColor Green
    Read-Host "Press Enter to continue"
}

function Health-Check {
    Write-Host "Checking service health..." -ForegroundColor Yellow
    Write-Host ""

    $services = @(
        @{Name="Gateway"; Container="dubaomatrung-gateway"; Port=3000},
        @{Name="Auth"; Container="dubaomatrung-auth"; Port=3001},
        @{Name="User"; Container="dubaomatrung-user"; Port=3002},
        @{Name="GIS"; Container="dubaomatrung-gis"; Port=3003},
        @{Name="Report"; Container="dubaomatrung-report"; Port=3004},
        @{Name="Admin"; Container="dubaomatrung-admin"; Port=3005},
        @{Name="Search"; Container="dubaomatrung-search"; Port=3006},
        @{Name="MapServer"; Container="dubaomatrung-mapserver"; Port=3007},
        @{Name="Frontend"; Container="dubaomatrung-frontend"; Port=80}
    )

    foreach ($service in $services) {
        $status = docker inspect --format='{{.State.Status}}' $service.Container 2>$null
        $health = docker inspect --format='{{.State.Health.Status}}' $service.Container 2>$null

        if ($status -eq "running") {
            if ($health -eq "healthy" -or $health -eq "") {
                Write-Host "✓ $($service.Name) - Running (Port: $($service.Port))" -ForegroundColor Green
            } else {
                Write-Host "⚠ $($service.Name) - Running but unhealthy" -ForegroundColor Yellow
            }
        } else {
            Write-Host "✗ $($service.Name) - Not running" -ForegroundColor Red
        }
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

# Main loop
do {
    Show-Menu
    $choice = Read-Host "Select option (0-15)"

    switch ($choice) {
        "1" { View-Status }
        "2" { View-Logs }
        "3" { View-ServiceLogs }
        "4" { Restart-All }
        "5" { Restart-Service }
        "6" { Stop-All }
        "7" { Start-All }
        "8" { Backup-Databases }
        "9" { View-Resources }
        "10" { Clean-Docker }
        "11" { Rebuild-Service }
        "12" { Database-Shell }
        "13" { Redis-Shell }
        "14" { Export-Logs }
        "15" { Health-Check }
        "0" {
            Write-Host "Goodbye!" -ForegroundColor Cyan
            break
        }
        default {
            Write-Host "Invalid option!" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
} while ($choice -ne "0")
