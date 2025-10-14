#!/bin/bash
# migrations/run-migration.sh
# Migration script from OLD database (port 5432) to NEW databases (port 5433)

set -e  # Exit on error

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
LOG_FILE="${LOG_DIR}/migration-$(date +%Y%m%d-%H%M%S).log"

# ==================================================
# Docker Container Names
# ==================================================
OLD_CONTAINER="${OLD_CONTAINER:-postgres-postgis-17}"
NEW_CONTAINER="${NEW_CONTAINER:-QuanLyMatRungPostgres17}"

# ==================================================
# Database Configuration
# ==================================================
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-4}"

# Database names
AUTH_DB_NAME="${AUTH_DB_NAME:-auth_db}"
GIS_DB_NAME="${GIS_DB_NAME:-gis_db}"
ADMIN_DB_NAME="${ADMIN_DB_NAME:-admin_db}"
OLD_DB_NAME="${OLD_DB_NAME:-geodb}"

# Create log directory
mkdir -p "${LOG_DIR}"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "${LOG_FILE}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "${LOG_FILE}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "${LOG_FILE}"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "${LOG_FILE}"
}

# Execute SQL on NEW database (using docker exec)
execute_sql_new() {
    local db_name=$1
    local sql_file=$2

    log_info "Executing ${sql_file} on NEW database ${db_name} (container: ${NEW_CONTAINER})..."

    docker exec -i "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${db_name}" \
        < "${sql_file}" \
        2>&1 | tee -a "${LOG_FILE}"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "✅ Successfully executed ${sql_file}"
        return 0
    else
        log_error "❌ Failed to execute ${sql_file}"
        return 1
    fi
}

# Check connection to OLD database (using docker exec)
check_old_db() {
    log_info "Checking connection to OLD database (container: ${OLD_CONTAINER}/${OLD_DB_NAME})..."

    docker exec "${OLD_CONTAINER}" psql -U "${DB_USER}" -d "${OLD_DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "✅ Connected to OLD database"
        return 0
    else
        log_error "❌ Cannot connect to OLD database"
        return 1
    fi
}

# Check connection to NEW database server (using docker exec)
check_new_db_server() {
    log_info "Checking connection to NEW database server (container: ${NEW_CONTAINER})..."

    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -c "SELECT version();" > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        log "✅ Connected to NEW database server"
        return 0
    else
        log_error "❌ Cannot connect to NEW database server"
        return 1
    fi
}

# Create database on NEW server (using docker exec)
create_database() {
    local db_name=$1

    log_info "Checking if database ${db_name} exists on NEW server..."

    # Check if database exists
    local exists=$(docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -tAc "SELECT 1 FROM pg_database WHERE datname = '${db_name}'")

    if [ -z "$exists" ]; then
        log_info "Creating database ${db_name} on NEW server..."
        docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -c "CREATE DATABASE ${db_name};" 2>&1 | tee -a "${LOG_FILE}"
        log "✅ Database ${db_name} created"
    else
        log "ℹ️  Database ${db_name} already exists"
    fi
}

# Backup OLD database (using docker exec)
backup_old_database() {
    local backup_file="${LOG_DIR}/backup-${OLD_DB_NAME}-$(date +%Y%m%d-%H%M%S).sql"

    log_info "Creating backup of OLD database ${OLD_DB_NAME}..."

    docker exec "${OLD_CONTAINER}" pg_dump -U "${DB_USER}" -d "${OLD_DB_NAME}" \
        > "${backup_file}" 2>&1 | tee -a "${LOG_FILE}"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "✅ Backup created: ${backup_file}"
        return 0
    else
        log_error "❌ Backup failed"
        return 1
    fi
}

# Validate migration (using docker exec)
validate_migration() {
    local db_name=$1

    log_info "Validating migration for ${db_name}..."

    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${db_name}" \
        -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        " 2>&1 | tee -a "${LOG_FILE}"
}

# Main migration flow
main() {
    log "=========================================="
    log "DuBaoMatRung Database Migration"
    log "=========================================="
    log_info "OLD Container: ${OLD_CONTAINER} → Database: ${OLD_DB_NAME}"
    log_info "NEW Container: ${NEW_CONTAINER} → Databases: {auth_db,gis_db,admin_db}"
    log_info "Log file: ${LOG_FILE}"
    log ""

    # Step 1: Check OLD database connection
    log "📍 Step 1: Checking OLD database..."
    if ! check_old_db; then
        log_error "Cannot connect to OLD database. Please check Docker container '${OLD_CONTAINER}' is running."
        exit 1
    fi

    # Step 2: Check NEW database server
    log "\n📍 Step 2: Checking NEW database server..."
    if ! check_new_db_server; then
        log_error "Cannot connect to NEW database server. Please check Docker container '${NEW_CONTAINER}' is running."
        exit 1
    fi

    # Step 3: Backup OLD database
    log "\n📍 Step 3: Backup OLD database..."
    read -p "Do you want to backup OLD database? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        backup_old_database
    else
        log_warning "Skipping backup. Continue at your own risk!"
    fi

    # Step 4: Create NEW databases
    log "\n📍 Step 4: Creating NEW databases..."
    create_database "${AUTH_DB_NAME}"
    create_database "${GIS_DB_NAME}"
    create_database "${ADMIN_DB_NAME}"

    # Step 5: Initialize auth_db schema
    log "\n📍 Step 5: Initializing auth_db schema..."
    if execute_sql_new "${AUTH_DB_NAME}" "${SCRIPT_DIR}/001_auth_db.sql"; then
        validate_migration "${AUTH_DB_NAME}"
    else
        log_error "Failed to initialize auth_db"
        exit 1
    fi

    # Step 6: Initialize gis_db schema
    log "\n📍 Step 6: Initializing gis_db schema..."
    if execute_sql_new "${GIS_DB_NAME}" "${SCRIPT_DIR}/002_gis_db.sql"; then
        validate_migration "${GIS_DB_NAME}"
    else
        log_error "Failed to initialize gis_db"
        exit 1
    fi

    # Step 7: Initialize admin_db schema
    log "\n📍 Step 7: Initializing admin_db schema..."
    if execute_sql_new "${ADMIN_DB_NAME}" "${SCRIPT_DIR}/003_admin_db.sql"; then
        validate_migration "${ADMIN_DB_NAME}"
    else
        log_error "Failed to initialize admin_db"
        exit 1
    fi

    # Step 8: Migrate data from OLD to NEW (using docker exec)
    log "\n📍 Step 8: Migrating data from OLD to NEW databases..."

    log_info "Copying users table to auth_db..."
    docker exec "${OLD_CONTAINER}" pg_dump -U "${DB_USER}" -t users --data-only "${OLD_DB_NAME}" | \
        docker exec -i "${NEW_CONTAINER}" psql -U "${DB_USER}" "${AUTH_DB_NAME}" \
        2>&1 | tee -a "${LOG_FILE}"

    log_info "Copying mat_rung tables to gis_db..."

    # Disable triggers during data import to avoid geography cast errors
    log_info "Disabling triggers for data import..."
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${GIS_DB_NAME}" \
        -c "ALTER TABLE mat_rung DISABLE TRIGGER set_area_in_hectares;" 2>&1 | tee -a "${LOG_FILE}"

    # Migrate data (removed laocai_tieukhu - doesn't exist, removed laocai_ranhgioihc - no schema in gis_db)
    docker exec "${OLD_CONTAINER}" pg_dump -U "${DB_USER}" \
        -t mat_rung \
        -t mat_rung_verification_log \
        -t mat_rung_monthly_summary \
        --data-only "${OLD_DB_NAME}" | \
        docker exec -i "${NEW_CONTAINER}" psql -U "${DB_USER}" "${GIS_DB_NAME}" \
        2>&1 | tee -a "${LOG_FILE}"

    # Re-enable triggers
    log_info "Re-enabling triggers..."
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${GIS_DB_NAME}" \
        -c "ALTER TABLE mat_rung ENABLE TRIGGER set_area_in_hectares;" 2>&1 | tee -a "${LOG_FILE}"

    log_info "Copying admin tables to admin_db..."

    # First, create schema for tables that might not exist
    log_info "Creating schema for additional admin tables..."
    docker exec "${OLD_CONTAINER}" pg_dump -U "${DB_USER}" \
        -t laocai_nendiahinh_line \
        -t laocai_chuquanly_clustered \
        -t laocai_rg3lr_clustered \
        --schema-only "${OLD_DB_NAME}" | \
        docker exec -i "${NEW_CONTAINER}" psql -U "${DB_USER}" "${ADMIN_DB_NAME}" \
        2>&1 | tee -a "${LOG_FILE}"

    # Migrate all admin data
    log_info "Migrating admin data (385,358 records)..."
    docker exec "${OLD_CONTAINER}" pg_dump -U "${DB_USER}" \
        -t tlaocai_tkk_3lr_cru \
        -t laocai_huyen \
        -t laocai_rg3lr \
        -t laocai_chuquanly \
        -t laocai_ranhgioihc \
        -t laocai_nendiahinh \
        -t laocai_nendiahinh_line \
        -t laocai_chuquanly_clustered \
        -t laocai_rg3lr_clustered \
        --data-only "${OLD_DB_NAME}" | \
        docker exec -i "${NEW_CONTAINER}" psql -U "${DB_USER}" "${ADMIN_DB_NAME}" \
        2>&1 | tee -a "${LOG_FILE}"

    log "✅ Data migration completed"

    # Step 9: Final validation
    log "\n📍 Step 9: Final validation..."

    # Auth DB stats (using docker exec)
    log_info "Auth DB Statistics:"
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${AUTH_DB_NAME}" \
        -c "SELECT 'users' as table_name, COUNT(*) as count FROM users;" 2>&1 | tee -a "${LOG_FILE}"

    # GIS DB stats (using docker exec)
    log_info "GIS DB Statistics:"
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${GIS_DB_NAME}" \
        -c "
        SELECT 'mat_rung' as table_name, COUNT(*) as count FROM mat_rung
        UNION ALL
        SELECT 'verification_log', COUNT(*) FROM mat_rung_verification_log
        UNION ALL
        SELECT 'monthly_summary', COUNT(*) FROM mat_rung_monthly_summary;
        " 2>&1 | tee -a "${LOG_FILE}"

    # Admin DB stats (using docker exec)
    log_info "Admin DB Statistics:"
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${ADMIN_DB_NAME}" \
        -c "
        SELECT 'laocai_rg3lr' as table_name, COUNT(*) as count FROM laocai_rg3lr
        UNION ALL
        SELECT 'tlaocai_tkk_3lr_cru', COUNT(*) FROM tlaocai_tkk_3lr_cru
        UNION ALL
        SELECT 'laocai_chuquanly', COUNT(*) FROM laocai_chuquanly
        UNION ALL
        SELECT 'laocai_nendiahinh_line', COUNT(*) FROM laocai_nendiahinh_line
        UNION ALL
        SELECT 'laocai_ranhgioihc', COUNT(*) FROM laocai_ranhgioihc
        UNION ALL
        SELECT 'laocai_nendiahinh', COUNT(*) FROM laocai_nendiahinh
        UNION ALL
        SELECT 'laocai_huyen', COUNT(*) FROM laocai_huyen
        ORDER BY count DESC;
        " 2>&1 | tee -a "${LOG_FILE}"

    # Check PostGIS (using docker exec)
    log_info "PostGIS Version:"
    docker exec "${NEW_CONTAINER}" psql -U "${DB_USER}" -d "${GIS_DB_NAME}" \
        -c "SELECT PostGIS_version();" 2>&1 | tee -a "${LOG_FILE}"

    # Summary
    log "\n=========================================="
    log "✅ Migration completed successfully!"
    log "=========================================="
    log_info "OLD Container: ${OLD_CONTAINER} → ${OLD_DB_NAME}"
    log_info "NEW Container: ${NEW_CONTAINER}"
    log_info "  - ${AUTH_DB_NAME}"
    log_info "  - ${GIS_DB_NAME}"
    log_info "  - ${ADMIN_DB_NAME}"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Review log: ${LOG_FILE}"
    log_info "  2. Update .env file"
    log_info "  3. Start microservices: docker-compose up -d"
    log_info "  4. Test API connections"
    log "=========================================="
}

# Run main
main "$@"
