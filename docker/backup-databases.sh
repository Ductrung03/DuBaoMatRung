#!/bin/bash
# =====================================
# Database Backup Script
# Backup all PostgreSQL databases
# =====================================

set -e

BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

DB_PASSWORD="${DB_PASSWORD:-4}"
CONTAINER_NAME="dubaomatrung-postgres"

echo "============================================"
echo "DuBaoMatRung - Database Backup"
echo "============================================"
echo "Backup directory: $BACKUP_DIR"
echo ""

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
    echo "Error: PostgreSQL container is not running!"
    exit 1
fi

# Backup auth_db
echo "[1/3] Backing up auth_db..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    pg_dump -U postgres -d auth_db --clean --if-exists \
    > "$BACKUP_DIR/auth_db.sql"
echo "✓ auth_db backed up successfully"

# Backup gis_db
echo "[2/3] Backing up gis_db..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    pg_dump -U postgres -d gis_db --clean --if-exists \
    > "$BACKUP_DIR/gis_db.sql"
echo "✓ gis_db backed up successfully"

# Backup admin_db
echo "[3/3] Backing up admin_db..."
docker exec -e PGPASSWORD="$DB_PASSWORD" "$CONTAINER_NAME" \
    pg_dump -U postgres -d admin_db --clean --if-exists \
    > "$BACKUP_DIR/admin_db.sql"
echo "✓ admin_db backed up successfully"

# Create backup info file
cat > "$BACKUP_DIR/backup_info.txt" << EOF
Backup Information
==================
Date: $(date)
PostgreSQL Version: $(docker exec "$CONTAINER_NAME" psql -U postgres -t -c "SELECT version();")
Databases: auth_db, gis_db, admin_db

Files:
- auth_db.sql
- gis_db.sql
- admin_db.sql
EOF

# Create compressed archive
echo ""
echo "Creating compressed archive..."
cd "$BACKUP_DIR/.."
tar -czf "$(basename $BACKUP_DIR).tar.gz" "$(basename $BACKUP_DIR)"
cd - > /dev/null

echo ""
echo "============================================"
echo "✓ Backup completed successfully!"
echo "============================================"
echo "Location: $BACKUP_DIR"
echo "Archive: $BACKUP_DIR.tar.gz"
echo ""
