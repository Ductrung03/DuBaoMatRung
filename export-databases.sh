#!/bin/bash
# ===================================================================
# Database Export Script
# Exports all databases from Docker containers
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

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${RED}Error: No services are running!${NC}"
    echo -e "${YELLOW}Please start services first: docker-compose up -d${NC}"
    exit 1
fi

# Create export directories
mkdir -p docker-init/postgres
mkdir -p docker-init/postgis
mkdir -p docker-init/admin-postgis
mkdir -p docker-init/mongodb

# Export auth_db (PostgreSQL 17)
echo -e "\n${CYAN}[1/4] Exporting auth_db (PostgreSQL 17)...${NC}"
docker exec dubaomatrung-postgres pg_dump -U postgres -d auth_db \
    --clean --if-exists \
    > docker-init/postgres/01-auth-db.sql
echo -e "${GREEN}✓ auth_db exported to docker-init/postgres/01-auth-db.sql${NC}"

# Export gis_db (PostGIS 17)
echo -e "\n${CYAN}[2/4] Exporting gis_db (PostGIS 17)...${NC}"
docker exec dubaomatrung-postgis pg_dump -U postgres -d gis_db \
    --clean --if-exists \
    > docker-init/postgis/01-gis-db.sql
echo -e "${GREEN}✓ gis_db exported to docker-init/postgis/01-gis-db.sql${NC}"

# Export admin_db (PostGIS 17) - This may take several minutes
echo -e "\n${CYAN}[3/4] Exporting admin_db (PostGIS 17)...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes for large database...${NC}"
START_TIME=$(date +%s)
docker exec dubaomatrung-admin-postgis pg_dump -U postgres -d admin_db \
    --clean --if-exists \
    > docker-init/admin-postgis/01-admin-db.sql
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
echo -e "${GREEN}✓ admin_db exported to docker-init/admin-postgis/01-admin-db.sql (${DURATION}s)${NC}"

# Export MongoDB
echo -e "\n${CYAN}[4/4] Exporting MongoDB logging_db...${NC}"
docker exec dubaomatrung-mongodb mongodump \
    --db=logging_db \
    --archive > docker-init/mongodb/logging_db.archive
echo -e "${GREEN}✓ MongoDB logging_db exported to docker-init/mongodb/logging_db.archive${NC}"

# Show file sizes
echo -e "\n${CYAN}Exported file sizes:${NC}"
du -h docker-init/postgres/01-auth-db.sql 2>/dev/null || echo "auth_db: Not found"
du -h docker-init/postgis/01-gis-db.sql 2>/dev/null || echo "gis_db: Not found"
du -h docker-init/admin-postgis/01-admin-db.sql 2>/dev/null || echo "admin_db: Not found"
du -h docker-init/mongodb/logging_db.archive 2>/dev/null || echo "MongoDB: Not found"

echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}DATABASE EXPORT COMPLETED!${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "${CYAN}Files are saved in docker-init/ directory${NC}"
echo -e "${CYAN}These will be automatically imported on first container start${NC}"
