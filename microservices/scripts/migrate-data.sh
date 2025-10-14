#!/bin/bash

# migrate-data.sh - Migrate data from monolith to microservices

echo "🔄 Database Migration Script"
echo "============================"

# Configuration
MONOLITH_DB="dubaomatrung"
MONOLITH_HOST="${MONOLITH_HOST:-localhost}"
MONOLITH_PORT="${MONOLITH_PORT:-5432}"
MONOLITH_USER="${MONOLITH_USER:-postgres}"

NEW_DB_HOST="${NEW_DB_HOST:-localhost}"
NEW_DB_PORT="${NEW_DB_PORT:-5432}"
NEW_DB_USER="${NEW_DB_USER:-postgres}"

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo ""
echo "📦 Step 1: Backup monolith database"
echo "-----------------------------------"

pg_dump -h "$MONOLITH_HOST" -p "$MONOLITH_PORT" -U "$MONOLITH_USER" \
  -d "$MONOLITH_DB" -F c -f "$BACKUP_DIR/monolith_backup.dump"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_DIR/monolith_backup.dump"
else
    echo "❌ Backup failed!"
    exit 1
fi

echo ""
echo "🗄️  Step 2: Create new databases"
echo "--------------------------------"

# Auth database
psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USER" -c "CREATE DATABASE auth_db;"
echo "✅ auth_db created"

# GIS database with PostGIS
psql -h "$NEW_DB_HOST" -p 5433 -U "$NEW_DB_USER" -c "CREATE DATABASE gis_db;"
psql -h "$NEW_DB_HOST" -p 5433 -U "$NEW_DB_USER" -d gis_db -c "CREATE EXTENSION postgis;"
echo "✅ gis_db created with PostGIS extension"

echo ""
echo "📊 Step 3: Migrate tables"
echo "-------------------------"

# Migrate users table to auth_db
pg_dump -h "$MONOLITH_HOST" -p "$MONOLITH_PORT" -U "$MONOLITH_USER" \
  -d "$MONOLITH_DB" -t users --data-only | \
  psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USER" -d auth_db
echo "✅ users table migrated to auth_db"

# Migrate GIS tables to gis_db
tables=("mat_rung" "laocai_ranhgioihc" "laocai_rg3lr")

for table in "${tables[@]}"; do
    pg_dump -h "$MONOLITH_HOST" -p "$MONOLITH_PORT" -U "$MONOLITH_USER" \
      -d "$MONOLITH_DB" -t "$table" | \
      psql -h "$NEW_DB_HOST" -p 5433 -U "$NEW_DB_USER" -d gis_db
    echo "✅ $table migrated to gis_db"
done

echo ""
echo "🔍 Step 4: Verify migration"
echo "---------------------------"

# Count records in auth_db
AUTH_COUNT=$(psql -h "$NEW_DB_HOST" -p "$NEW_DB_PORT" -U "$NEW_DB_USER" \
  -d auth_db -t -c "SELECT COUNT(*) FROM users;")
echo "Users in auth_db: $AUTH_COUNT"

# Count records in gis_db
MATRUNG_COUNT=$(psql -h "$NEW_DB_HOST" -p 5433 -U "$NEW_DB_USER" \
  -d gis_db -t -c "SELECT COUNT(*) FROM mat_rung;")
echo "Mat rung records in gis_db: $MATRUNG_COUNT"

echo ""
echo "✅ Migration completed!"
echo "Backup location: $BACKUP_DIR"
echo ""
echo "⚠️  Next steps:"
echo "1. Verify data integrity"
echo "2. Update application configuration"
echo "3. Test all services"
echo "4. Monitor performance"
