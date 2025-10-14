#!/bin/bash
# migrations/validate-migration.sh
# Validation and integrity checker for migrated data

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
AUTH_DB_NAME="${AUTH_DB_NAME:-auth_db}"
GIS_DB_NAME="${GIS_DB_NAME:-gis_db}"

ERRORS=0
WARNINGS=0

# Logging functions
log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

# Function to execute SQL and return result
execute_query() {
    local db_name=$1
    local query=$2

    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
        -h "${POSTGRES_HOST}" \
        -p "${POSTGRES_PORT}" \
        -U "${POSTGRES_USER}" \
        -d "${db_name}" \
        -t \
        -c "${query}" 2>/dev/null
}

# Validation tests
echo "=========================================="
echo "DuBaoMatRung Migration Validation"
echo "=========================================="
echo ""

# Test 1: Check database connections
log_info "Test 1: Checking database connections..."
if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${AUTH_DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    log "auth_db connection successful"
else
    log_error "Cannot connect to auth_db"
fi

if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${GIS_DB_NAME}" -c "SELECT 1;" > /dev/null 2>&1; then
    log "gis_db connection successful"
else
    log_error "Cannot connect to gis_db"
fi

echo ""

# Test 2: Check auth_db schema
log_info "Test 2: Validating auth_db schema..."

# Check users table
user_count=$(execute_query "${AUTH_DB_NAME}" "SELECT COUNT(*) FROM users;")
if [ "$user_count" -gt 0 ]; then
    log "Users table exists with ${user_count} records"
else
    log_warning "Users table is empty"
fi

# Check required columns
required_columns=("id" "username" "password_hash" "full_name" "permission_level")
for col in "${required_columns[@]}"; do
    if execute_query "${AUTH_DB_NAME}" "SELECT ${col} FROM users LIMIT 1;" > /dev/null 2>&1; then
        log "Column '${col}' exists in users table"
    else
        log_error "Column '${col}' missing in users table"
    fi
done

# Check for admin user
admin_exists=$(execute_query "${AUTH_DB_NAME}" "SELECT COUNT(*) FROM users WHERE username = 'admin';")
if [ "$admin_exists" -gt 0 ]; then
    log "Admin user exists"
else
    log_error "Admin user not found"
fi

echo ""

# Test 3: Check gis_db schema
log_info "Test 3: Validating gis_db schema..."

# Check PostGIS extension
postgis_version=$(execute_query "${GIS_DB_NAME}" "SELECT PostGIS_version();" 2>/dev/null || echo "NOT INSTALLED")
if [[ "$postgis_version" != "NOT INSTALLED" ]]; then
    log "PostGIS extension installed: ${postgis_version}"
else
    log_error "PostGIS extension not installed"
fi

# Check required tables
gis_tables=("mat_rung" "laocai_ranhgioihc" "laocai_tieukhu" "verification_history")
for table in "${gis_tables[@]}"; do
    table_exists=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${table}';")
    if [ "$table_exists" -gt 0 ]; then
        record_count=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM ${table};")
        log "Table '${table}' exists with ${record_count} records"
    else
        log_error "Table '${table}' not found"
    fi
done

echo ""

# Test 4: Check spatial data integrity
log_info "Test 4: Checking spatial data integrity..."

# Check for invalid geometries in mat_rung
invalid_geom=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM mat_rung WHERE geom IS NOT NULL AND NOT ST_IsValid(geom);")
if [ "$invalid_geom" -eq 0 ]; then
    log "All mat_rung geometries are valid"
else
    log_warning "${invalid_geom} invalid geometries found in mat_rung"
fi

# Check for NULL geometries
null_geom=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM mat_rung WHERE geom IS NULL;")
if [ "$null_geom" -eq 0 ]; then
    log "No NULL geometries in mat_rung"
else
    log_warning "${null_geom} NULL geometries found in mat_rung"
fi

# Check SRID consistency
mat_rung_srid=$(execute_query "${GIS_DB_NAME}" "SELECT DISTINCT ST_SRID(geom) FROM mat_rung WHERE geom IS NOT NULL LIMIT 1;" | xargs)
if [ "$mat_rung_srid" == "3857" ]; then
    log "mat_rung SRID is correct (3857)"
else
    log_warning "mat_rung SRID is ${mat_rung_srid}, expected 3857"
fi

ranhgioihc_srid=$(execute_query "${GIS_DB_NAME}" "SELECT DISTINCT ST_SRID(geom) FROM laocai_ranhgioihc WHERE geom IS NOT NULL LIMIT 1;" | xargs)
if [ "$ranhgioihc_srid" == "4326" ]; then
    log "laocai_ranhgioihc SRID is correct (4326)"
else
    log_warning "laocai_ranhgioihc SRID is ${ranhgioihc_srid}, expected 4326"
fi

echo ""

# Test 5: Check indexes
log_info "Test 5: Checking database indexes..."

# Check spatial indexes
spatial_indexes=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE '%geom%';")
if [ "$spatial_indexes" -gt 0 ]; then
    log "${spatial_indexes} spatial indexes found"
else
    log_warning "No spatial indexes found"
fi

# Check users username index
username_index=$(execute_query "${AUTH_DB_NAME}" "SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'users' AND indexname LIKE '%username%';")
if [ "$username_index" -gt 0 ]; then
    log "Username index exists"
else
    log_warning "Username index not found"
fi

echo ""

# Test 6: Check foreign key relationships
log_info "Test 6: Checking foreign key constraints..."

# Check verification_history -> mat_rung FK
fk_violations=$(execute_query "${GIS_DB_NAME}" "
    SELECT COUNT(*)
    FROM verification_history vh
    LEFT JOIN mat_rung m ON vh.mat_rung_gid = m.gid
    WHERE m.gid IS NULL;
")
if [ "$fk_violations" -eq 0 ]; then
    log "No foreign key violations in verification_history"
else
    log_error "${fk_violations} foreign key violations in verification_history"
fi

# Check mat_rung.verified_by -> users.id
# Note: This requires cross-database query or application-level validation
log_info "Note: Cross-database FK validation (mat_rung.verified_by -> users.id) should be tested at application level"

echo ""

# Test 7: Check triggers and functions
log_info "Test 7: Checking triggers and functions..."

# Check updated_at trigger
update_trigger=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%updated_at%';")
if [ "$update_trigger" -gt 0 ]; then
    log "updated_at triggers found"
else
    log_warning "No updated_at triggers found"
fi

# Check custom functions
custom_functions=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('calculate_area_hectares', 'get_admin_location');")
if [ "$custom_functions" -eq 2 ]; then
    log "Custom GIS functions exist"
else
    log_warning "Some custom functions may be missing"
fi

echo ""

# Test 8: Data integrity checks
log_info "Test 8: Running data integrity checks..."

# Check for users with NULL usernames
null_usernames=$(execute_query "${AUTH_DB_NAME}" "SELECT COUNT(*) FROM users WHERE username IS NULL;")
if [ "$null_usernames" -eq 0 ]; then
    log "No NULL usernames"
else
    log_error "${null_usernames} users with NULL username"
fi

# Check for duplicate usernames
duplicate_usernames=$(execute_query "${AUTH_DB_NAME}" "SELECT COUNT(*) FROM (SELECT username FROM users GROUP BY username HAVING COUNT(*) > 1) AS dups;")
if [ "$duplicate_usernames" -eq 0 ]; then
    log "No duplicate usernames"
else
    log_error "${duplicate_usernames} duplicate usernames found"
fi

# Check date consistency in mat_rung
invalid_dates=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM mat_rung WHERE start_dau > end_sau;")
if [ "$invalid_dates" -eq 0 ]; then
    log "All date ranges are valid in mat_rung"
else
    log_warning "${invalid_dates} invalid date ranges in mat_rung"
fi

echo ""

# Test 9: Performance checks
log_info "Test 9: Running performance checks..."

# Check table sizes
mat_rung_size=$(execute_query "${GIS_DB_NAME}" "SELECT pg_size_pretty(pg_total_relation_size('mat_rung'));")
log_info "mat_rung table size: ${mat_rung_size}"

users_size=$(execute_query "${AUTH_DB_NAME}" "SELECT pg_size_pretty(pg_total_relation_size('users'));")
log_info "users table size: ${users_size}"

# Check for missing statistics
missing_stats=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' AND (n_tup_ins + n_tup_upd + n_tup_del) = 0;")
if [ "$missing_stats" -eq 0 ]; then
    log "Table statistics are up to date"
else
    log_warning "${missing_stats} tables may need ANALYZE"
fi

echo ""

# Test 10: View and materialized view checks
log_info "Test 10: Checking views..."

view_count=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM pg_views WHERE viewname = 'v_mat_rung_with_admin';")
if [ "$view_count" -gt 0 ]; then
    log "View v_mat_rung_with_admin exists"

    # Test view query
    view_test=$(execute_query "${GIS_DB_NAME}" "SELECT COUNT(*) FROM v_mat_rung_with_admin;" 2>/dev/null || echo "ERROR")
    if [ "$view_test" != "ERROR" ]; then
        log "View v_mat_rung_with_admin is queryable (${view_test} records)"
    else
        log_error "View v_mat_rung_with_admin has errors"
    fi
else
    log_warning "View v_mat_rung_with_admin not found"
fi

echo ""

# Summary
echo "=========================================="
echo "Validation Summary"
echo "=========================================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo "Migration is valid and ready for production."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Tests completed with ${WARNINGS} warnings${NC}"
    echo "Migration is mostly valid. Review warnings before production deployment."
    exit 0
else
    echo -e "${RED}❌ Tests completed with ${ERRORS} errors and ${WARNINGS} warnings${NC}"
    echo "Migration has issues that need to be fixed before deployment."
    exit 1
fi
