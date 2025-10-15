-- Create materialized views for optimized administrative unit lookups
-- This script creates materialized views from laocai_rg3lr table for better performance

-- 1. Materialized view for Huyen (Districts)
DROP MATERIALIZED VIEW IF EXISTS mv_huyen CASCADE;
CREATE MATERIALIZED VIEW mv_huyen AS
SELECT DISTINCT huyen
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen != ''
ORDER BY huyen;

CREATE UNIQUE INDEX idx_mv_huyen_unique ON mv_huyen (huyen);

-- 2. Materialized view for Xa by Huyen (Communes by District)
DROP MATERIALIZED VIEW IF EXISTS mv_xa_by_huyen CASCADE;
CREATE MATERIALIZED VIEW mv_xa_by_huyen AS
SELECT DISTINCT huyen, xa
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen != ''
  AND xa IS NOT NULL AND xa != ''
ORDER BY huyen, xa;

CREATE INDEX idx_mv_xa_by_huyen_huyen ON mv_xa_by_huyen (huyen);
CREATE INDEX idx_mv_xa_by_huyen_xa ON mv_xa_by_huyen (xa);
CREATE UNIQUE INDEX idx_mv_xa_by_huyen_unique ON mv_xa_by_huyen (huyen, xa);

-- 3. Materialized view for Tieu Khu by Xa (Sub-compartments by Commune)
DROP MATERIALIZED VIEW IF EXISTS mv_tieukhu_by_xa CASCADE;
CREATE MATERIALIZED VIEW mv_tieukhu_by_xa AS
SELECT DISTINCT huyen, xa, tk as tieukhu
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen != ''
  AND xa IS NOT NULL AND xa != ''
  AND tk IS NOT NULL AND tk != ''
ORDER BY huyen, xa, tk;

CREATE INDEX idx_mv_tieukhu_by_xa_huyen ON mv_tieukhu_by_xa (huyen);
CREATE INDEX idx_mv_tieukhu_by_xa_xa ON mv_tieukhu_by_xa (xa);
CREATE INDEX idx_mv_tieukhu_by_xa_tieukhu ON mv_tieukhu_by_xa (tieukhu);
CREATE UNIQUE INDEX idx_mv_tieukhu_by_xa_unique ON mv_tieukhu_by_xa (huyen, xa, tieukhu);

-- 4. Materialized view for Khoanh by Tieu Khu (Compartments by Sub-compartment)
DROP MATERIALIZED VIEW IF EXISTS mv_khoanh_by_tieukhu CASCADE;
CREATE MATERIALIZED VIEW mv_khoanh_by_tieukhu AS
SELECT DISTINCT huyen, xa, tk as tieukhu, khoanh
FROM laocai_rg3lr
WHERE huyen IS NOT NULL AND huyen != ''
  AND xa IS NOT NULL AND xa != ''
  AND tk IS NOT NULL AND tk != ''
  AND khoanh IS NOT NULL AND khoanh != ''
ORDER BY huyen, xa, tk, khoanh;

CREATE INDEX idx_mv_khoanh_by_tieukhu_huyen ON mv_khoanh_by_tieukhu (huyen);
CREATE INDEX idx_mv_khoanh_by_tieukhu_xa ON mv_khoanh_by_tieukhu (xa);
CREATE INDEX idx_mv_khoanh_by_tieukhu_tieukhu ON mv_khoanh_by_tieukhu (tieukhu);
CREATE INDEX idx_mv_khoanh_by_tieukhu_khoanh ON mv_khoanh_by_tieukhu (khoanh);
CREATE UNIQUE INDEX idx_mv_khoanh_by_tieukhu_unique ON mv_khoanh_by_tieukhu (huyen, xa, tieukhu, khoanh);

-- 5. Materialized view for Chu Rung (Forest Owners)
DROP MATERIALIZED VIEW IF EXISTS mv_churung CASCADE;
CREATE MATERIALIZED VIEW mv_churung AS
SELECT DISTINCT churung
FROM laocai_rg3lr
WHERE churung IS NOT NULL AND churung != ''
ORDER BY churung;

CREATE UNIQUE INDEX idx_mv_churung_unique ON mv_churung (churung);

-- 6. Create a comprehensive lookup materialized view for mat_rung spatial intersection
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_admin_lookup CASCADE;
CREATE MATERIALIZED VIEW mv_mat_rung_admin_lookup AS
SELECT 
  m.gid,
  r.huyen,
  r.xa,
  r.tk,
  r.khoanh,
  r.churung,
  r.ldlr,
  r.malr3,
  r.dtich as forest_area
FROM mat_rung m
LEFT JOIN laocai_rg3lr r ON ST_Intersects(
  ST_Transform(m.geom, 4326),
  ST_Transform(r.geom, 4326)
)
WHERE m.geom IS NOT NULL;

CREATE UNIQUE INDEX idx_mv_mat_rung_admin_lookup_gid ON mv_mat_rung_admin_lookup (gid);
CREATE INDEX idx_mv_mat_rung_admin_lookup_huyen ON mv_mat_rung_admin_lookup (huyen);
CREATE INDEX idx_mv_mat_rung_admin_lookup_xa ON mv_mat_rung_admin_lookup (xa);
CREATE INDEX idx_mv_mat_rung_admin_lookup_tk ON mv_mat_rung_admin_lookup (tk);
CREATE INDEX idx_mv_mat_rung_admin_lookup_khoanh ON mv_mat_rung_admin_lookup (khoanh);
CREATE INDEX idx_mv_mat_rung_admin_lookup_churung ON mv_mat_rung_admin_lookup (churung);

-- Grant permissions
GRANT SELECT ON mv_huyen TO PUBLIC;
GRANT SELECT ON mv_xa_by_huyen TO PUBLIC;
GRANT SELECT ON mv_tieukhu_by_xa TO PUBLIC;
GRANT SELECT ON mv_khoanh_by_tieukhu TO PUBLIC;
GRANT SELECT ON mv_churung TO PUBLIC;
GRANT SELECT ON mv_mat_rung_admin_lookup TO PUBLIC;

-- Create function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_admin_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_huyen;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xa_by_huyen;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tieukhu_by_xa;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_khoanh_by_tieukhu;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_churung;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mat_rung_admin_lookup;
  
  RAISE NOTICE 'All administrative materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Initial refresh
SELECT refresh_admin_materialized_views();

-- Create a scheduled job to refresh materialized views daily (optional)
-- This requires pg_cron extension
-- SELECT cron.schedule('refresh-admin-views', '0 2 * * *', 'SELECT refresh_admin_materialized_views();');

COMMENT ON MATERIALIZED VIEW mv_huyen IS 'Materialized view containing unique districts from laocai_rg3lr';
COMMENT ON MATERIALIZED VIEW mv_xa_by_huyen IS 'Materialized view containing communes grouped by districts';
COMMENT ON MATERIALIZED VIEW mv_tieukhu_by_xa IS 'Materialized view containing sub-compartments grouped by communes';
COMMENT ON MATERIALIZED VIEW mv_khoanh_by_tieukhu IS 'Materialized view containing compartments grouped by sub-compartments';
COMMENT ON MATERIALIZED VIEW mv_churung IS 'Materialized view containing unique forest owners';
COMMENT ON MATERIALIZED VIEW mv_mat_rung_admin_lookup IS 'Pre-computed spatial intersection lookup for mat_rung administrative data';
