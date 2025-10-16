-- Cleanup script for removing Foreign Data Wrapper (FDW) configurations
-- Run this on gis_db to remove all FDW-related objects
-- This is part of the migration to the new "Self-Host" architecture using Kysely

-- Drop materialized views first (they depend on foreign tables)
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_admin_lookup CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_huyen CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_xa_by_huyen CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_tieukhu_by_xa CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_khoanh_by_tieukhu CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_churung CASCADE;

-- Drop the refresh function
DROP FUNCTION IF EXISTS refresh_admin_materialized_views();

-- Drop foreign schema and tables
DROP SCHEMA IF EXISTS admin_foreign CASCADE;

-- Drop user mapping
DROP USER MAPPING IF EXISTS FOR postgres SERVER admin_db_server;
DROP USER MAPPING IF EXISTS FOR CURRENT_USER SERVER admin_db_server;

-- Drop foreign server
DROP SERVER IF EXISTS admin_db_server CASCADE;

-- Optionally, drop the postgres_fdw extension if no longer needed
-- Uncomment the following line only if you're sure no other services use FDW
-- DROP EXTENSION IF EXISTS postgres_fdw CASCADE;

-- Verification queries
SELECT 'Cleanup completed!' as status;

-- Show remaining foreign servers (should be empty)
SELECT srvname, srvowner::regrole, fdwname
FROM pg_foreign_server
JOIN pg_foreign_data_wrapper ON pg_foreign_server.srvfdw = pg_foreign_data_wrapper.oid;

-- Show remaining user mappings (should be empty)
SELECT um.umuser::regrole::text as user_name,
       srv.srvname as server_name
FROM pg_user_mapping um
JOIN pg_foreign_server srv ON um.umserver = srv.oid;
