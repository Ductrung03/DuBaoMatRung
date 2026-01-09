-- ==========================================
-- MAPSERVER DATABASE CHECK & OPTIMIZATION
-- Kiểm tra và tối ưu database cho MapServer
-- ==========================================

\echo '=========================================='
\echo 'CHECKING DATABASE: admin_db'
\echo '=========================================='
\c admin_db

-- 1. Kiểm tra PostGIS extension
\echo '\n1. CHECKING POSTGIS EXTENSION...'
SELECT
    name,
    default_version,
    installed_version,
    comment
FROM pg_available_extensions
WHERE name LIKE '%postgis%';

-- Tạo PostGIS extension nếu chưa có
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

\echo '\nPostGIS version:'
SELECT PostGIS_Full_Version();

-- 2. Kiểm tra các bảng Lao Cai
\echo '\n=========================================='
\echo '2. CHECKING LAO CAI TABLES...'
\echo '=========================================='

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'laocai_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Kiểm tra geometry columns
\echo '\n=========================================='
\echo '3. CHECKING GEOMETRY COLUMNS...'
\echo '=========================================='

SELECT
    f_table_name,
    f_geometry_column,
    srid,
    type,
    coord_dimension
FROM geometry_columns
WHERE f_table_name LIKE 'laocai_%'
ORDER BY f_table_name;

-- 4. Kiểm tra spatial indexes
\echo '\n=========================================='
\echo '4. CHECKING SPATIAL INDEXES...'
\echo '=========================================='

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'laocai_%'
    AND indexdef LIKE '%USING gist%'
ORDER BY tablename;

-- 5. Đếm số records trong mỗi bảng
\echo '\n=========================================='
\echo '5. COUNTING RECORDS IN TABLES...'
\echo '=========================================='

DO $$
DECLARE
    table_rec RECORD;
    row_count INTEGER;
BEGIN
    FOR table_rec IN
        SELECT tablename
        FROM pg_tables
        WHERE tablename LIKE 'laocai_%'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_rec.tablename) INTO row_count;
        RAISE NOTICE 'Table: % - Records: %', table_rec.tablename, row_count;
    END LOOP;
END $$;

-- 6. Tạo spatial indexes nếu chưa có
\echo '\n=========================================='
\echo '6. CREATING SPATIAL INDEXES (if not exist)...'
\echo '=========================================='

-- Ranh giới hành chính
CREATE INDEX IF NOT EXISTS laocai_ranhgioihc_geom_idx
    ON laocai_ranhgioihc USING GIST (geom);

-- 3 loại rừng
CREATE INDEX IF NOT EXISTS laocai_rg3lr_geom_idx
    ON laocai_rg3lr USING GIST (geom);

-- Nền địa hình (polygon)
CREATE INDEX IF NOT EXISTS laocai_nendiahinh_geom_idx
    ON laocai_nendiahinh USING GIST (geom);

-- Nền địa hình (line)
CREATE INDEX IF NOT EXISTS laocai_nendiahinh_line_geom_idx
    ON laocai_nendiahinh_line USING GIST (geom);

-- Chủ quản lý
CREATE INDEX IF NOT EXISTS laocai_chuquanly_geom_idx
    ON laocai_chuquanly USING GIST (geom_simplified);

CREATE INDEX IF NOT EXISTS laocai_chuquanly_geom_original_idx
    ON laocai_chuquanly USING GIST (geom)
    WHERE geom IS NOT NULL;

-- Huyện
CREATE INDEX IF NOT EXISTS laocai_huyen_geom_idx
    ON laocai_huyen USING GIST (geom);

\echo '\nSpatial indexes created successfully!'

-- 7. Tạo attribute indexes cho performance
\echo '\n=========================================='
\echo '7. CREATING ATTRIBUTE INDEXES...'
\echo '=========================================='

-- Ranh giới hành chính - index theo cấp hành chính
CREATE INDEX IF NOT EXISTS laocai_ranhgioihc_huyen_idx ON laocai_ranhgioihc (huyen);
CREATE INDEX IF NOT EXISTS laocai_ranhgioihc_xa_idx ON laocai_ranhgioihc (xa);
CREATE INDEX IF NOT EXISTS laocai_ranhgioihc_tieukhu_idx ON laocai_ranhgioihc (tieukhu);
CREATE INDEX IF NOT EXISTS laocai_ranhgioihc_khoanh_idx ON laocai_ranhgioihc (khoanh);

-- 3 loại rừng - index theo loại
CREATE INDEX IF NOT EXISTS laocai_rg3lr_malr3_idx ON laocai_rg3lr (malr3);
CREATE INDEX IF NOT EXISTS laocai_rg3lr_ldlr_idx ON laocai_rg3lr (ldlr);

-- Huyện - index tên
CREATE INDEX IF NOT EXISTS laocai_huyen_ten_idx ON laocai_huyen (ten) WHERE ten IS NOT NULL;

\echo '\nAttribute indexes created successfully!'

-- 8. VACUUM và ANALYZE để optimize
\echo '\n=========================================='
\echo '8. OPTIMIZING TABLES (VACUUM ANALYZE)...'
\echo '=========================================='

VACUUM ANALYZE laocai_ranhgioihc;
VACUUM ANALYZE laocai_rg3lr;
VACUUM ANALYZE laocai_nendiahinh;
VACUUM ANALYZE laocai_nendiahinh_line;
VACUUM ANALYZE laocai_chuquanly;
VACUUM ANALYZE laocai_huyen;

\echo '\nVacuum completed!'

-- 9. Kiểm tra extent của các layer
\echo '\n=========================================='
\echo '9. CHECKING LAYER EXTENTS...'
\echo '=========================================='

SELECT
    'laocai_ranhgioihc' AS layer,
    ST_XMin(ST_Extent(geom)) AS xmin,
    ST_YMin(ST_Extent(geom)) AS ymin,
    ST_XMax(ST_Extent(geom)) AS xmax,
    ST_YMax(ST_Extent(geom)) AS ymax
FROM laocai_ranhgioihc
UNION ALL
SELECT
    'laocai_rg3lr' AS layer,
    ST_XMin(ST_Extent(geom)) AS xmin,
    ST_YMin(ST_Extent(geom)) AS ymin,
    ST_XMax(ST_Extent(geom)) AS xmax,
    ST_YMax(ST_Extent(geom)) AS ymax
FROM laocai_rg3lr
UNION ALL
SELECT
    'laocai_huyen' AS layer,
    ST_XMin(ST_Extent(geom)) AS xmin,
    ST_YMin(ST_Extent(geom)) AS ymin,
    ST_XMax(ST_Extent(geom)) AS xmax,
    ST_YMax(ST_Extent(geom)) AS ymax
FROM laocai_huyen;

-- 10. Test query performance
\echo '\n=========================================='
\echo '10. TESTING QUERY PERFORMANCE...'
\echo '=========================================='

\timing on

-- Test spatial query
EXPLAIN ANALYZE
SELECT gid, huyen, xa
FROM laocai_ranhgioihc
WHERE geom && ST_MakeEnvelope(103.5, 21.8, 104.5, 23.0, 4326)
LIMIT 100;

\timing off

\echo '\n=========================================='
\echo 'DATABASE CHECK COMPLETED!'
\echo '=========================================='
