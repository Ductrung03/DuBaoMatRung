#!/bin/bash

# ===== EXPORT ADMIN_DB FROM POSTGRES 17 COMPATIBLE WITH POSTGRES 15 =====

# Default parameters
OUTPUT_FILE="docker-init/admin-postgis/01-admin-db.sql"
DB_HOST="localhost"
DB_PORT="5433"
DB_USER="postgres"
DB_NAME="admin_db"
DB_PASSWORD="4"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== EXPORT ADMIN_DB (COMPATIBLE WITH POSTGRES 15) ===${NC}"
echo -e "${YELLOW}Script nay se tao file SQL tuan thu voi Postgres 15${NC}"

# Check pg_dump
echo -e "\n${YELLOW}[1] Kiem tra pg_dump...${NC}"
if command -v pg_dump &> /dev/null; then
    PG_VERSION=$(pg_dump --version)
    echo -e "  ${GREEN}[OK] $PG_VERSION${NC}"
else
    echo -e "  ${RED}[ERROR] Khong tim thay pg_dump!${NC}"
    echo -e "  ${CYAN}Cai dat: sudo pacman -S postgresql${NC}"
    exit 1
fi

# Check database connection
echo -e "\n${YELLOW}[2] Kiem tra ket noi database...${NC}"
export PGPASSWORD="$DB_PASSWORD"

DB_VERSION=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version();" 2>&1)
if [[ $? -eq 0 ]]; then
    echo -e "  ${GREEN}[OK] Ket noi thanh cong!${NC}"
    echo -e "  ${CYAN}- $(echo $DB_VERSION | xargs)${NC}"
else
    echo -e "  ${RED}[ERROR] Loi ket noi: $DB_VERSION${NC}"
    echo -e "  ${YELLOW}Kiem tra lai:${NC}"
    echo -e "    ${CYAN}- Host: $DB_HOST${NC}"
    echo -e "    ${CYAN}- Port: $DB_PORT${NC}"
    echo -e "    ${CYAN}- User: $DB_USER${NC}"
    echo -e "    ${CYAN}- Database: $DB_NAME${NC}"
    exit 1
fi

# Create output directory
echo -e "\n${YELLOW}[3] Tao thu muc output...${NC}"
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
    echo -e "  ${GREEN}[OK] Tao thu muc: $OUTPUT_DIR${NC}"
else
    echo -e "  ${GREEN}[OK] Thu muc da ton tai: $OUTPUT_DIR${NC}"
fi

# Export database
echo -e "\n${YELLOW}[4] Export database (co the mat 5-10 phut)...${NC}"
echo -e "  ${CYAN}[WAIT] Dang xu ly...${NC}"

TEMP_FILE=$(mktemp --suffix=.sql)

# Export with compatible options
echo -e "  ${CYAN}[PROCESS] Dang chay pg_dump...${NC}"
pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=plain \
    --encoding=UTF8 \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    --create \
    --inserts \
    --column-inserts \
    --disable-dollar-quoting \
    --no-tablespaces \
    --no-comments \
    -f "$TEMP_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}[OK] Export thanh cong!${NC}"
    TEMP_SIZE=$(du -h "$TEMP_FILE" | cut -f1)
    echo -e "  ${CYAN}- Kich thuoc: $TEMP_SIZE${NC}"
else
    echo -e "  ${RED}[ERROR] Export that bai!${NC}"
    rm -f "$TEMP_FILE"
    exit 1
fi

# Process file for compatibility
echo -e "\n${YELLOW}[5] Xu ly compatibility Postgres 15...${NC}"

# Fix 1: Remove incompatible SET statements
echo -e "  ${CYAN}[PROCESS] Loai bo SET statements khong can thiet...${NC}"
sed -i '/^SET search_path/d' "$TEMP_FILE"
sed -i '/^SET default_table_access_method/d' "$TEMP_FILE"
sed -i '/^SET xmloption/d' "$TEMP_FILE"
sed -i '/^SET row_security/d' "$TEMP_FILE"
sed -i '/^SET default_tablespace/d' "$TEMP_FILE"

# Fix 2: Add necessary SET statements at the beginning
echo -e "  ${CYAN}[PROCESS] Them cac SET statement can thiet...${NC}"
HEADER="-- PostgreSQL database dump (Compatible with PostgreSQL 15)
-- Exported from: $DB_HOST:$DB_PORT/$DB_NAME
-- Export date: $(date '+%Y-%m-%d %H:%M:%S')

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

"

# Create temp file with header
TEMP_FILE_2=$(mktemp --suffix=.sql)
echo "$HEADER" > "$TEMP_FILE_2"
cat "$TEMP_FILE" >> "$TEMP_FILE_2"
mv "$TEMP_FILE_2" "$TEMP_FILE"

# Fix 3: Handle PostGIS extensions
echo -e "  ${CYAN}[PROCESS] Xu ly PostGIS extensions...${NC}"
sed -i 's/CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA [a-z_]*;/CREATE EXTENSION IF NOT EXISTS postgis;/g' "$TEMP_FILE"
sed -i 's/CREATE EXTENSION IF NOT EXISTS postgis_topology WITH SCHEMA [a-z_]*;/CREATE EXTENSION IF NOT EXISTS postgis_topology;/g' "$TEMP_FILE"

# Fix 4: Remove OIDS options
echo -e "  ${CYAN}[PROCESS] Loai bo OIDS options...${NC}"
sed -i 's/WITH (oids = \(true\|false\))//g' "$TEMP_FILE"
sed -i 's/WITHOUT OIDS//g' "$TEMP_FILE"

# Save to output file
echo -e "\n${YELLOW}[6] Luu file output...${NC}"
cp "$TEMP_FILE" "$OUTPUT_FILE"
OUTPUT_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo -e "  ${GREEN}[OK] File da luu: $(readlink -f "$OUTPUT_FILE")${NC}"
echo -e "  ${CYAN}- Kich thuoc: $OUTPUT_SIZE${NC}"

# Clean up
rm -f "$TEMP_FILE"

# Verify output file
echo -e "\n${YELLOW}[7] Kiem tra file output...${NC}"

LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
echo -e "  ${CYAN}- So dong: $LINE_COUNT${NC}"

CREATE_TABLE_COUNT=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" || true)
INSERT_COUNT=$(grep -c "INSERT INTO" "$OUTPUT_FILE" || true)

echo -e "  ${CYAN}- So bang (CREATE TABLE): $CREATE_TABLE_COUNT${NC}"
echo -e "  ${CYAN}- So dong du lieu (INSERT): $INSERT_COUNT${NC}"

if [ "$CREATE_TABLE_COUNT" -eq 0 ] && [ "$INSERT_COUNT" -eq 0 ]; then
    echo -e "\n  ${YELLOW}[WARNING] File co the trong hoac khong co du lieu!${NC}"
else
    echo -e "\n  ${GREEN}[OK] File hop le va co du lieu!${NC}"
fi

# Unset password
unset PGPASSWORD

echo -e "\n${GREEN}=== HOAN THANH EXPORT ===${NC}"
echo -e "${GREEN}File da san sang de import vao PostgreSQL 15!${NC}"
echo -e "\n${YELLOW}De import vao Docker container tren Windows, chay:${NC}"
echo -e "  ${CYAN}.\\import-admin-db-full.ps1 -Force${NC}"
