#!/bin/bash
# migrations/rollback.sh
# Rollback script for DuBaoMatRung microservices migration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${SCRIPT_DIR}/logs"
BACKUP_DIR="${LOG_DIR}"

POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

AUTH_DB_NAME="${AUTH_DB_NAME:-auth_db}"
GIS_DB_NAME="${GIS_DB_NAME:-gis_db}"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Function to list available backups
list_backups() {
    local db_name=$1

    log_info "Available backups for ${db_name}:"

    if [ -d "${BACKUP_DIR}" ]; then
        ls -lht "${BACKUP_DIR}"/backup-${db_name}-*.sql 2>/dev/null | head -10 || echo "No backups found"
    else
        log_warning "Backup directory not found"
    fi
}

# Function to restore from backup
restore_backup() {
    local db_name=$1
    local backup_file=$2

    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        return 1
    fi

    log_warning "This will DROP and RECREATE database ${db_name}"
    read -p "Are you sure you want to continue? (yes/no) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Rollback cancelled"
        return 1
    fi

    # Terminate existing connections
    log_info "Terminating existing connections to ${db_name}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "postgres" \
        -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${db_name}' AND pid <> pg_backend_pid();
        " 2>/dev/null || true

    # Drop database
    log_info "Dropping database ${db_name}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "postgres" \
        -c "DROP DATABASE IF EXISTS ${db_name};"

    # Create database
    log_info "Creating database ${db_name}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "postgres" \
        -c "CREATE DATABASE ${db_name};"

    # Restore from backup
    log_info "Restoring from backup: ${backup_file}..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${db_name}" \
        -f "${backup_file}"

    if [ $? -eq 0 ]; then
        log "✅ Successfully restored ${db_name} from backup"
        return 0
    else
        log_error "❌ Failed to restore ${db_name}"
        return 1
    fi
}

# Function to drop and recreate empty databases
reset_databases() {
    log_warning "This will DROP all microservices databases and recreate them empty"
    read -p "Are you sure? This cannot be undone! (yes/no) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Reset cancelled"
        return 1
    fi

    for db_name in "${AUTH_DB_NAME}" "${GIS_DB_NAME}"; do
        log_info "Resetting ${db_name}..."

        # Terminate connections
        PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            -h "${POSTGRES_HOST}" \
            -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" \
            -d "postgres" \
            -c "
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '${db_name}' AND pid <> pg_backend_pid();
            " 2>/dev/null || true

        # Drop and recreate
        PGPASSWORD="${POSTGRES_PASSWORD}" psql \
            -h "${POSTGRES_HOST}" \
            -p "${POSTGRES_PORT}" \
            -U "${POSTGRES_USER}" \
            -d "postgres" \
            -c "DROP DATABASE IF EXISTS ${db_name}; CREATE DATABASE ${db_name};"

        log "✅ ${db_name} reset successfully"
    done

    log_info "All databases have been reset. Run ./run-migration.sh to reinitialize."
}

# Function to rollback specific table data
rollback_table_data() {
    local db_name=$1
    local table_name=$2

    log_warning "This will TRUNCATE table ${table_name} in ${db_name}"
    read -p "Continue? (yes/no) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log "Rollback cancelled"
        return 1
    fi

    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${db_name}" \
        -c "TRUNCATE TABLE ${table_name} CASCADE;"

    if [ $? -eq 0 ]; then
        log "✅ Table ${table_name} truncated successfully"
    else
        log_error "❌ Failed to truncate ${table_name}"
    fi
}

# Main menu
show_menu() {
    echo "=========================================="
    echo "DuBaoMatRung Rollback Options"
    echo "=========================================="
    echo "1. List available backups"
    echo "2. Restore auth_db from backup"
    echo "3. Restore gis_db from backup"
    echo "4. Reset all databases (empty)"
    echo "5. Rollback specific table data"
    echo "6. Exit"
    echo "=========================================="
}

main() {
    log "DuBaoMatRung Rollback Script"
    log "Current time: $(date)"
    echo ""

    while true; do
        show_menu
        read -p "Select option (1-6): " choice

        case $choice in
            1)
                echo ""
                log_info "=== Auth DB Backups ==="
                list_backups "${AUTH_DB_NAME}"
                echo ""
                log_info "=== GIS DB Backups ==="
                list_backups "${GIS_DB_NAME}"
                echo ""
                ;;
            2)
                echo ""
                list_backups "${AUTH_DB_NAME}"
                echo ""
                read -p "Enter backup filename: " backup_file
                if [ -n "$backup_file" ]; then
                    restore_backup "${AUTH_DB_NAME}" "${backup_file}"
                fi
                echo ""
                ;;
            3)
                echo ""
                list_backups "${GIS_DB_NAME}"
                echo ""
                read -p "Enter backup filename: " backup_file
                if [ -n "$backup_file" ]; then
                    restore_backup "${GIS_DB_NAME}" "${backup_file}"
                fi
                echo ""
                ;;
            4)
                echo ""
                reset_databases
                echo ""
                ;;
            5)
                echo ""
                log_info "Select database:"
                echo "1. ${AUTH_DB_NAME}"
                echo "2. ${GIS_DB_NAME}"
                read -p "Choice: " db_choice

                case $db_choice in
                    1) selected_db="${AUTH_DB_NAME}" ;;
                    2) selected_db="${GIS_DB_NAME}" ;;
                    *) log_error "Invalid choice"; continue ;;
                esac

                read -p "Enter table name: " table_name
                if [ -n "$table_name" ]; then
                    rollback_table_data "${selected_db}" "${table_name}"
                fi
                echo ""
                ;;
            6)
                log "Exiting..."
                exit 0
                ;;
            *)
                log_error "Invalid option"
                echo ""
                ;;
        esac

        read -p "Press Enter to continue..."
        clear
    done
}

# Run main
main "$@"
