-- Create a simpler materialized view without complex spatial operations
-- This avoids geometry validation issues while still providing the lookup

-- First, create foreign data wrapper if not exists
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Create foreign server pointing to admin_db
DROP SERVER IF EXISTS admin_db_server CASCADE;
CREATE SERVER admin_db_server
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host 'localhost', port '5432', dbname 'admin_db');

-- Create user mapping
DROP USER MAPPING IF EXISTS FOR postgres SERVER admin_db_server;
CREATE USER MAPPING FOR postgres
SERVER admin_db_server
OPTIONS (user 'postgres', password 'postgres');

-- Import foreign tables from admin_db
DROP SCHEMA IF EXISTS admin_foreign CASCADE;
CREATE SCHEMA admin_foreign;

IMPORT FOREIGN SCHEMA public
LIMIT TO (laocai_rg3lr, laocai_ranhgioihc, laocai_huyen)
FROM SERVER admin_db_server
INTO admin_foreign;

-- Create a simple lookup table using ST_Centroid to avoid complex geometry issues
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_admin_lookup CASCADE;
CREATE MATERIALIZED VIEW mv_mat_rung_admin_lookup AS
SELECT DISTINCT
  m.gid,
  r.huyen,
  r.xa,
  r.tk,
  r.khoanh,
  r.churung
FROM mat_rung m
LEFT JOIN admin_foreign.laocai_rg3lr r ON ST_Intersects(
  ST_Centroid(ST_Transform(m.geom, 4326)),
  ST_Transform(r.geom, 4326)
)
WHERE m.geom IS NOT NULL
  AND ST_IsValid(m.geom)
  AND r.geom IS NOT NULL
  AND ST_IsValid(r.geom);

CREATE UNIQUE INDEX idx_mv_mat_rung_admin_lookup_gid ON mv_mat_rung_admin_lookup (gid);
CREATE INDEX idx_mv_mat_rung_admin_lookup_huyen ON mv_mat_rung_admin_lookup (huyen);
CREATE INDEX idx_mv_mat_rung_admin_lookup_xa ON mv_mat_rung_admin_lookup (xa);
CREATE INDEX idx_mv_mat_rung_admin_lookup_tk ON mv_mat_rung_admin_lookup (tk);
CREATE INDEX idx_mv_mat_rung_admin_lookup_khoanh ON mv_mat_rung_admin_lookup (khoanh);

-- Grant permissions
GRANT SELECT ON mv_mat_rung_admin_lookup TO PUBLIC;

-- Show results
SELECT 
  'mv_mat_rung_admin_lookup' as view_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN huyen IS NOT NULL THEN 1 END) as records_with_huyen,
  COUNT(CASE WHEN xa IS NOT NULL THEN 1 END) as records_with_xa,
  COUNT(CASE WHEN tk IS NOT NULL THEN 1 END) as records_with_tk,
  COUNT(CASE WHEN khoanh IS NOT NULL THEN 1 END) as records_with_khoanh
FROM mv_mat_rung_admin_lookup;

-- Test sample
SELECT 
  'Sample lookup data' as test_name,
  gid,
  huyen,
  xa,
  tk,
  khoanh
FROM mv_mat_rung_admin_lookup
WHERE huyen IS NOT NULL
LIMIT 5;
