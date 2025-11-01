#!/bin/bash

# Export Databases Script
# This script exports all databases to SQL files for Docker deployment

set -e

echo "=========================================="
echo "Exporting Databases"
echo "=========================================="

# Create exports directory
mkdir -p docker-init/postgres
mkdir -p docker-init/postgis
mkdir -p docker-init/mongodb

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database credentials from .env files
POSTGRES_USER="postgres"
POSTGRES_PASSWORD="4"
POSTGRES_HOST="localhost"
POSTGRES_PORT="5433"

# Export auth_db (dubaomatrung database)
echo ""
echo -e "${YELLOW}[1/3] Exporting auth_db (dubaomatrung)...${NC}"
export PGPASSWORD="$POSTGRES_PASSWORD"

if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "dubaomatrung" \
    --clean --if-exists --create \
    -f docker-init/postgres/01-auth-db.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully exported auth_db${NC}"
    echo "  File: docker-init/postgres/01-auth-db.sql"
    echo "  Size: $(du -h docker-init/postgres/01-auth-db.sql | cut -f1)"
else
    echo -e "${RED}✗ Failed to export auth_db${NC}"
    echo "  Trying alternative database name: auth_db"
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "auth_db" \
        --clean --if-exists --create \
        -f docker-init/postgres/01-auth-db.sql 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully exported auth_db${NC}"
    else
        echo -e "${RED}✗ Could not find auth_db or dubaomatrung database${NC}"
        echo "Available databases:"
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -l
    fi
fi

# Export gis_db (gis_data database)
echo ""
echo -e "${YELLOW}[2/3] Exporting gis_db (gis_data) with PostGIS...${NC}"

if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "gis_db" \
    --clean --if-exists --create \
    -f docker-init/postgis/01-gis-db.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully exported gis_db${NC}"
    echo "  File: docker-init/postgis/01-gis-db.sql"
    echo "  Size: $(du -h docker-init/postgis/01-gis-db.sql | cut -f1)"
else
    echo -e "${RED}✗ Failed to export gis_db${NC}"
    echo "  Trying alternative database name: gis_data"
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "gis_data" \
        --clean --if-exists --create \
        -f docker-init/postgis/01-gis-db.sql 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully exported gis_data${NC}"
    else
        echo -e "${RED}✗ Could not find gis_db or gis_data database${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}[2/3] Exporting admin_db (gis_data) with PostGIS...${NC}"

if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "admin_db" \
    --clean --if-exists --create \
    -f docker-init/postgis/01-admin-db.sql 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully exported admin_db${NC}"
    echo "  File: docker-init/postgis/01-gis-db.sql"
    echo "  Size: $(du -h docker-init/postgis/01-gis-db.sql | cut -f1)"
else
    echo -e "${RED}✗ Failed to export admin_db${NC}"
    echo "  Trying alternative database name: gis_data"
    if pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "gis_data" \
        --clean --if-exists --create \
        -f docker-init/postgis/01-gis-db.sql 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully exported gis_data${NC}"
    else
        echo -e "${RED}✗ Could not find admin_db or gis_data database${NC}"
    fi
fi


# Export MongoDB logging_db
echo ""
echo -e "${YELLOW}[3/3] Exporting MongoDB logging_db...${NC}"

if command -v mongodump &> /dev/null; then
    if mongodump --uri="mongodb://localhost:27017/logging_db" \
        --out=docker-init/mongodb/dump 2>/dev/null; then
        echo -e "${GREEN}✓ Successfully exported logging_db${NC}"
        echo "  Directory: docker-init/mongodb/dump/logging_db"
        echo "  Size: $(du -sh docker-init/mongodb/dump/logging_db 2>/dev/null | cut -f1 || echo '0')"
    else
        echo -e "${YELLOW}⚠ MongoDB export failed or database is empty${NC}"
        echo "  This is OK if you don't have logging data yet"
    fi
else
    echo -e "${YELLOW}⚠ mongodump not installed, skipping MongoDB export${NC}"
    echo "  Install with: sudo pacman -S mongodb-tools"
    echo "  This is OK if you don't need logging data"
fi

unset PGPASSWORD

echo ""
echo "=========================================="
echo -e "${GREEN}Export Complete!${NC}"
echo "=========================================="
echo ""
echo "Exported files:"
echo "  1. docker-init/postgres/01-auth-db.sql"
echo "  2. docker-init/postgis/01-gis-db.sql"
echo "  3. docker-init/mongodb/dump/ (if available)"
echo ""
echo "Next steps:"
echo "  1. Review the SQL files to ensure they contain data"
echo "  2. Run docker-compose up to import into containers"
echo ""
