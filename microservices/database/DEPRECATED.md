# Deprecated Database Components

**Date**: 2025-10-16
**Migration**: 003-db-auth-optimization

This document lists database components that have been deprecated as part of the migration to the "Self-Host" architecture.

## Removed Components

### 1. Foreign Data Wrapper (FDW) Configuration

**Status**: ❌ REMOVED

The following FDW-related files have been deleted:
- `create_cross_db_materialized_views.sql` - Cross-database materialized views using FDW
- `create_simple_lookup.sql` - Simplified FDW lookup tables
- `create_materialized_views.sql` - Materialized views dependent on FDW

**Reason**: The new architecture uses Kysely Query Builder and API-based communication instead of direct cross-database connections via FDW.

**Cleanup Script**: Run `cleanup_fdw.sql` on `gis_db` to remove all FDW-related objects from the database.

### 2. Database Objects to Clean Up

Run the cleanup script to remove:
- Materialized views:
  - `mv_mat_rung_admin_lookup`
  - `mv_huyen`
  - `mv_xa_by_huyen`
  - `mv_tieukhu_by_xa`
  - `mv_khoanh_by_tieukhu`
  - `mv_churung`
- Foreign schema: `admin_foreign`
- Foreign server: `admin_db_server`
- User mappings for FDW
- Function: `refresh_admin_materialized_views()`

### 3. Deprecated Table: `user_activity_log`

**Status**: ❌ REMOVED from `auth_db`

This table has been moved to MongoDB as part of the logging service migration.

**Old Location**: `auth_db.user_activity_log`
**New Location**: MongoDB `logging_db.activity_logs` collection

**Migration**: All new activity logs are written to MongoDB. Historical logs may remain in PostgreSQL but are no longer actively used.

## Current Architecture

### Database Connections

- **auth-service**: Uses Prisma ORM to connect to `auth_db` (PostgreSQL)
- **gis-service**: Uses Kysely Query Builder to connect to `gis_db` (PostgreSQL with PostGIS)
- **admin-service**: Uses Kysely Query Builder to connect to `admin_db` (PostgreSQL with PostGIS)
- **logging-service**: Uses native MongoDB driver to connect to `logging_db` (MongoDB in Docker)

### No More FDW

All cross-database communication now happens through API calls:
- Frontend → Gateway → Individual Services
- Services communicate via REST APIs, not direct database connections
- Each service manages its own database independently

## Cleanup Instructions

### For Database Administrators

1. **Run FDW cleanup on gis_db**:
   ```bash
   psql -U postgres -d gis_db -f microservices/database/cleanup_fdw.sql
   ```

2. **Verify cleanup**:
   ```sql
   -- Should return no results
   SELECT srvname FROM pg_foreign_server;
   SELECT * FROM pg_user_mapping;
   ```

3. **Optional: Remove user_activity_log from auth_db**:
   ```sql
   -- Only if you're sure you don't need historical data
   DROP TABLE IF EXISTS user_activity_log;
   ```

### For Developers

No action required. The old FDW-based code has been replaced with:
- Kysely queries in `gis-service` and `admin-service`
- Prisma queries in `auth-service`
- MongoDB queries in `logging-service` (or gateway)

## See Also

- [Migration Guide](../specs/003-db-auth-optimization/plan.md)
- [Data Model](../specs/003-db-auth-optimization/data-model.md)
- [Quickstart](../specs/003-db-auth-optimization/quickstart.md)
