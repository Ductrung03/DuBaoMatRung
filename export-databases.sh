#!/bin/bash
# ===================================================================
# Database Export Script
# Exports all databases from Docker containers
# Works with: QuanLyMatRungPostgres17, mongodb
# ===================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}EXPORTING ALL DATABASES${NC}"
echo -e "${CYAN}====================================================================${NC}"

# Container names (adjust if needed)
POSTGRES_CONTAINER="QuanLyMatRungPostgres17"
MONGODB_CONTAINER="mongodb"

# Check if PostgreSQL container is running
echo -e "\n${CYAN}Checking containers...${NC}"
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo -e "${RED}Error: PostgreSQL container '${POSTGRES_CONTAINER}' is not running!${NC}"
    echo -e "${YELLOW}Please start container first: docker start ${POSTGRES_CONTAINER}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Found PostgreSQL container: ${POSTGRES_CONTAINER}${NC}"

# Check MongoDB (optional)
if docker ps --format '{{.Names}}' | grep -q "^${MONGODB_CONTAINER}$"; then
    echo -e "${GREEN}✓ Found MongoDB container: ${MONGODB_CONTAINER}${NC}"
    MONGODB_EXISTS=true
else
    echo -e "${YELLOW}⚠ MongoDB container '${MONGODB_CONTAINER}' not found (skipping)${NC}"
    MONGODB_EXISTS=false
fi

# Create export directories
mkdir -p docker-init/postgres
mkdir -p docker-init/postgis
mkdir -p docker-init/admin-postgis
mkdir -p docker-init/mongodb

echo -e "\n${CYAN}Exporting from container: ${POSTGRES_CONTAINER}${NC}"

# Export auth_db (PostgreSQL 17)
echo -e "\n${CYAN}[1/3] Exporting auth_db (PostgreSQL 17)...${NC}"
docker exec ${POSTGRES_CONTAINER} pg_dump -U postgres -d auth_db \
    --clean --if-exists \
    > docker-init/postgres/01-auth-db.sql
SIZE=$(du -h docker-init/postgres/01-auth-db.sql | cut -f1)
echo -e "${GREEN}✓ auth_db exported to docker-init/postgres/01-auth-db.sql (${SIZE})${NC}"

# Export gis_db (PostGIS 17)
echo -e "\n${CYAN}[2/3] Exporting gis_db (PostGIS 17)...${NC}"
docker exec ${POSTGRES_CONTAINER} pg_dump -U postgres -d gis_db \
    --clean --if-exists \
    > docker-init/postgis/01-gis-db.sql
SIZE=$(du -h docker-init/postgis/01-gis-db.sql | cut -f1)
echo -e "${GREEN}✓ gis_db exported to docker-init/postgis/01-gis-db.sql (${SIZE})${NC}"

# Export admin_db (PostGIS 17) - This may take several minutes
echo -e "\n${CYAN}[3/3] Exporting admin_db (PostGIS 17)...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes for large database...${NC}"
START_TIME=$(date +%s)
docker exec ${POSTGRES_CONTAINER} pg_dump -U postgres -d admin_db \
    --clean --if-exists \
    > docker-init/admin-postgis/01-admin-db.sql
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
SIZE=$(du -h docker-init/admin-postgis/01-admin-db.sql | cut -f1)
echo -e "${GREEN}✓ admin_db exported to docker-init/admin-postgis/01-admin-db.sql (${SIZE}, ${DURATION}s)${NC}"

# Export MongoDB (if exists)
if [ "$MONGODB_EXISTS" = true ]; then
    echo -e "\n${CYAN}[4/4] Exporting MongoDB logging_db...${NC}"
    docker exec ${MONGODB_CONTAINER} mongodump \
        --db=logging_db \
        --archive > docker-init/mongodb/logging_db.archive
    SIZE=$(du -h docker-init/mongodb/logging_db.archive | cut -f1)
    echo -e "${GREEN}✓ MongoDB logging_db exported to docker-init/mongodb/logging_db.archive (${SIZE})${NC}"
else
    echo -e "\n${YELLOW}[4/4] Skipping MongoDB export (container not running)${NC}"
fi

# Show summary
echo -e "\n${CYAN}====================================================================${NC}"
echo -e "${CYAN}Exported file summary:${NC}"
echo -e "${CYAN}====================================================================${NC}"

if [ -f "docker-init/postgres/01-auth-db.sql" ]; then
    SIZE=$(du -h docker-init/postgres/01-auth-db.sql | cut -f1)
    LINES=$(wc -l < docker-init/postgres/01-auth-db.sql)
    echo -e "  ${GREEN}auth_db:${NC}    ${SIZE} (${LINES} lines)"
fi

if [ -f "docker-init/postgis/01-gis-db.sql" ]; then
    SIZE=$(du -h docker-init/postgis/01-gis-db.sql | cut -f1)
    LINES=$(wc -l < docker-init/postgis/01-gis-db.sql)
    echo -e "  ${GREEN}gis_db:${NC}     ${SIZE} (${LINES} lines)"
fi

if [ -f "docker-init/admin-postgis/01-admin-db.sql" ]; then
    SIZE=$(du -h docker-init/admin-postgis/01-admin-db.sql | cut -f1)
    LINES=$(wc -l < docker-init/admin-postgis/01-admin-db.sql)
    echo -e "  ${GREEN}admin_db:${NC}   ${SIZE} (${LINES} lines)"
fi

if [ -f "docker-init/mongodb/logging_db.archive" ]; then
    SIZE=$(du -h docker-init/mongodb/logging_db.archive | cut -f1)
    echo -e "  ${GREEN}MongoDB:${NC}    ${SIZE}"
fi

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}DATABASE EXPORT COMPLETED!${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "${CYAN}Files are saved in docker-init/ directory${NC}"
echo -e "${CYAN}These will be automatically imported on first container start${NC}"
echo -e "\n${YELLOW}Container info:${NC}"
echo -e "  PostgreSQL: ${POSTGRES_CONTAINER} (all 3 databases)"
echo -e "  MongoDB:    ${MONGODB_CONTAINER}"