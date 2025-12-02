#!/bin/bash
# =====================================
# Database Restore Script
# Restore PostgreSQL databases from backup
# =====================================

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_directory>"
    echo "Example: $0 ./backups/20250101_120000"
    exit 1
fi

BACKUP_DIR="$1"
DB_PASSWORD="${DB_PASSWORD:-4}"
CONTAINER_NAME="dubaomatrung-postgres"

echo "============================================"
echo "DuBaoMatRung - Database Restore"
echo "============================================"
echo "Backup directory: $BACKUP_DIR"
echo ""

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found!"
    exit 1
fi

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: PostgreSQL container is not running!"
    exit 1
fi

# Confirm restore
read -p "This will overwrite existing databases. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""

# Restore auth_db
if [ -f "$BACKUP_DIR/auth_db.sql" ]; then
    echo "[1/3] Restoring auth_db..."
    docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U postgres -d auth_db < "$BACKUP_DIR/auth_db.sql"
    echo "✓ auth_db restored successfully"
else
    echo "⚠ Warning: auth_db.sql not found, skipping..."
fi

# Restore gis_db
if [ -f "$BACKUP_DIR/gis_db.sql" ]; then
    echo "[2/3] Restoring gis_db..."
    docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U postgres -d gis_db < "$BACKUP_DIR/gis_db.sql"
    echo "✓ gis_db restored successfully"
else
    echo "⚠ Warning: gis_db.sql not found, skipping..."
fi

# Restore admin_db
if [ -f "$BACKUP_DIR/admin_db.sql" ]; then
    echo "[3/3] Restoring admin_db..."
    docker exec -i -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
        psql -U postgres -d admin_db < "$BACKUP_DIR/admin_db.sql"
    echo "✓ admin_db restored successfully"
else
    echo "⚠ Warning: admin_db.sql not found, skipping..."
fi

echo ""
echo "============================================"
echo "✓ Restore completed successfully!"
echo "============================================"
echo ""
