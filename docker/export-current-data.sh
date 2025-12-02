#!/bin/bash
# =====================================
# Export Current Development Database
# For initial deployment to production
# =====================================

set -e

EXPORT_DIR="./docker/initial-data"
mkdir -p "$EXPORT_DIR"

DB_PASSWORD="${DB_PASSWORD:-4}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"

echo "============================================"
echo "Export Current Development Data"
echo "============================================"
echo "Exporting from: $DB_HOST:$DB_PORT"
echo "Export directory: $EXPORT_DIR"
echo ""

# Export auth_db
echo "[1/3] Exporting auth_db..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U postgres \
    -d auth_db --clean --if-exists > "$EXPORT_DIR/auth_db.sql"
echo "✓ auth_db exported"

# Export gis_db
echo "[2/3] Exporting gis_db..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U postgres \
    -d gis_db --clean --if-exists > "$EXPORT_DIR/gis_db.sql"
echo "✓ gis_db exported"

# Export admin_db
echo "[3/3] Exporting admin_db..."
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U postgres \
    -d admin_db --clean --if-exists > "$EXPORT_DIR/admin_db.sql"
echo "✓ admin_db exported"

echo ""
echo "============================================"
echo "✓ Export completed!"
echo "============================================"
echo "Files created in: $EXPORT_DIR"
echo ""
echo "Next steps:"
echo "1. Copy entire project to Windows Server"
echo "2. Run: docker-compose up -d postgres redis"
echo "3. Wait for PostgreSQL to be ready"
echo "4. Run: docker/import-initial-data.ps1"
echo "5. Run: docker-compose up -d"
echo ""
