-- ========================================
-- Migration: Admin/Reference Database Schema
-- Database: admin_db
-- Version: 1.0
-- Description: Administrative boundaries and reference data
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ========================================
-- Table: tlaocai_tkk_3lr_cru (Main administrative data)
-- ========================================
CREATE TABLE IF NOT EXISTS tlaocai_tkk_3lr_cru (
    gid SERIAL PRIMARY KEY,
    matinh DOUBLE PRECISION,
    mahuyen DOUBLE PRECISION,
    maxa DOUBLE PRECISION,
    tinh VARCHAR(30),
    huyen VARCHAR(30),
    xa VARCHAR(20),
    tk VARCHAR(10),
    khoanh VARCHAR(5),
    malr3 DOUBLE PRECISION,
    churung VARCHAR(50),
    geom GEOMETRY(Geometry, 4326)
);

-- ========================================
-- Table: laocai_huyen (District boundaries)
-- ========================================
CREATE TABLE IF NOT EXISTS laocai_huyen (
    gid SERIAL PRIMARY KEY,
    objectid DOUBLE PRECISION,
    matinh DOUBLE PRECISION,
    tinh VARCHAR(30),
    huyen VARCHAR(30),
    sum_dtich NUMERIC,
    shape_leng NUMERIC,
    shape_area NUMERIC,
    mahuyen_1 VARCHAR(50),
    geom GEOMETRY(MultiPolygon, 4326)
);

-- ========================================
-- Table: laocai_ranhgioihc (Administrative boundaries)
-- ========================================
CREATE TABLE IF NOT EXISTS laocai_ranhgioihc (
    gid SERIAL PRIMARY KEY,
    huyen VARCHAR(20),
    xa VARCHAR(20),
    tieukhu VARCHAR(10),
    khoanh VARCHAR(5),
    geom GEOMETRY(MultiPolygon, 4326),
    geom_low GEOMETRY(MultiPolygon, 4326),
    geom_high GEOMETRY(MultiPolygon, 4326)
);

-- ========================================
-- Table: laocai_chuquanly (Management units)
-- ========================================
CREATE TABLE IF NOT EXISTS laocai_chuquanly (
    gid SERIAL PRIMARY KEY,
    tt INTEGER,
    chuquanly VARCHAR(50),
    geom GEOMETRY(MultiPolygon, 4326),
    geom_simplified GEOMETRY(MultiPolygon, 4326)
);

-- ========================================
-- Table: laocai_nendiahinh (Terrain/topography)
-- ========================================
CREATE TABLE IF NOT EXISTS laocai_nendiahinh (
    gid SERIAL PRIMARY KEY,
    id DOUBLE PRECISION,
    ma DOUBLE PRECISION,
    ten VARCHAR(30),
    geom GEOMETRY(MultiPolygon, 4326)
);

-- ========================================
-- Table: laocai_rg3lr (Forest classification - 3LR)
-- ========================================
CREATE TABLE IF NOT EXISTS laocai_rg3lr (
    gid SERIAL PRIMARY KEY,
    tt NUMERIC,
    id NUMERIC,
    matinh DOUBLE PRECISION,
    mahuyen DOUBLE PRECISION,
    maxa DOUBLE PRECISION,
    xa VARCHAR(100),
    tk VARCHAR(10),
    khoanh VARCHAR(10),
    lo VARCHAR(10),
    thuad DOUBLE PRECISION,
    tobando VARCHAR(9),
    diadanh VARCHAR(50),
    dtich DOUBLE PRECISION,
    nggocr SMALLINT,
    ldlr VARCHAR(10),
    maldlr SMALLINT,
    sldlr VARCHAR(254),
    namtr SMALLINT,
    captuoi SMALLINT,
    ktan SMALLINT,
    nggocrt SMALLINT,
    thanhrung SMALLINT,
    mgo DOUBLE PRECISION,
    mtr DOUBLE PRECISION,
    mgolo DOUBLE PRECISION,
    mtnlo DOUBLE PRECISION,
    lapdia SMALLINT,
    malr3 SMALLINT,
    mdsd VARCHAR(10),
    mamdsd SMALLINT,
    dtuong SMALLINT,
    churung VARCHAR(100),
    machur DOUBLE PRECISION,
    trchap SMALLINT,
    quyensd SMALLINT,
    thoihansd INTEGER,
    khoan SMALLINT,
    nqh SMALLINT,
    nguoink VARCHAR(100),
    nguoitrch VARCHAR(100),
    mangnk DOUBLE PRECISION,
    mangtrch DOUBLE PRECISION,
    ngsinh SMALLINT,
    kd NUMERIC,
    vd NUMERIC,
    capkd VARCHAR(254),
    capvd VARCHAR(254),
    locu VARCHAR(6),
    vitrithua DOUBLE PRECISION,
    tinh VARCHAR(100),
    huyen VARCHAR(100),
    geom GEOMETRY(MultiPolygon, 4326),
    geom_simplified_low GEOMETRY(MultiPolygon, 4326),
    geom_simplified_medium GEOMETRY(MultiPolygon, 4326),
    geom_simplified_high GEOMETRY(MultiPolygon, 4326)
);

-- ========================================
-- Spatial Indexes
-- ========================================

-- tlaocai_tkk_3lr_cru indexes
CREATE INDEX idx_tkk_geom ON tlaocai_tkk_3lr_cru USING gist(geom);
CREATE INDEX idx_tkk_huyen ON tlaocai_tkk_3lr_cru(huyen);
CREATE INDEX idx_tkk_xa ON tlaocai_tkk_3lr_cru(xa);
CREATE INDEX idx_tkk_tk ON tlaocai_tkk_3lr_cru(tk);
CREATE INDEX idx_tkk_khoanh ON tlaocai_tkk_3lr_cru(khoanh);
CREATE INDEX idx_tkk_churung ON tlaocai_tkk_3lr_cru(churung);
CREATE INDEX idx_tkk_composite ON tlaocai_tkk_3lr_cru(huyen, xa);
CREATE INDEX idx_tkk_tk_khoanh ON tlaocai_tkk_3lr_cru(tk, khoanh);

-- laocai_huyen indexes
CREATE INDEX idx_laocai_huyen_geom ON laocai_huyen USING gist(geom);

-- laocai_ranhgioihc indexes
CREATE INDEX idx_ranhgioihc_geom ON laocai_ranhgioihc USING gist(geom);
CREATE INDEX idx_ranhgioihc_geom_low ON laocai_ranhgioihc USING gist(geom_low);
CREATE INDEX idx_ranhgioihc_geom_high ON laocai_ranhgioihc USING gist(geom_high);
CREATE INDEX idx_ranhgioihc_hierarchy ON laocai_ranhgioihc(huyen, xa, tieukhu, khoanh);

-- laocai_chuquanly indexes
CREATE INDEX idx_chuquanly_geom ON laocai_chuquanly USING gist(geom);
CREATE INDEX idx_chuquanly_geom_simplified ON laocai_chuquanly USING gist(geom_simplified);

-- laocai_nendiahinh indexes
CREATE INDEX idx_nendiahinh_geom ON laocai_nendiahinh USING gist(geom);
CREATE INDEX idx_nendiahinh_ten ON laocai_nendiahinh(ten);

-- laocai_rg3lr indexes
CREATE INDEX idx_rg3lr_geom ON laocai_rg3lr USING gist(geom);
CREATE INDEX idx_rg3lr_geom_low ON laocai_rg3lr USING gist(geom_simplified_low);
CREATE INDEX idx_rg3lr_geom_medium ON laocai_rg3lr USING gist(geom_simplified_medium);
CREATE INDEX idx_rg3lr_geom_high ON laocai_rg3lr USING gist(geom_simplified_high);
CREATE INDEX idx_rg3lr_ldlr ON laocai_rg3lr(ldlr) WHERE ldlr IS NOT NULL;

-- ========================================
-- Materialized Views - Dropdown Cache
-- ========================================

-- Huyen dropdown
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dropdown_huyen AS
SELECT DISTINCT huyen
FROM tlaocai_tkk_3lr_cru
WHERE huyen IS NOT NULL AND TRIM(huyen) <> ''
ORDER BY huyen;

CREATE INDEX idx_mv_huyen ON mv_dropdown_huyen(huyen);

-- Khoanh dropdown
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dropdown_khoanh AS
SELECT DISTINCT khoanh
FROM tlaocai_tkk_3lr_cru
WHERE khoanh IS NOT NULL AND TRIM(khoanh) <> ''
ORDER BY khoanh;

CREATE INDEX idx_mv_khoanh ON mv_dropdown_khoanh(khoanh);

-- Churung dropdown
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dropdown_churung AS
SELECT DISTINCT churung
FROM tlaocai_tkk_3lr_cru
WHERE churung IS NOT NULL AND TRIM(churung) <> ''
ORDER BY churung;

CREATE INDEX idx_mv_churung ON mv_dropdown_churung(churung);

-- ========================================
-- Functions - Dropdown Data
-- ========================================

-- Get distinct huyen
CREATE OR REPLACE FUNCTION get_distinct_huyen()
RETURNS TABLE(huyen TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.huyen
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.huyen IS NOT NULL AND t.huyen <> ''
    ORDER BY t.huyen;
END;
$$ LANGUAGE plpgsql;

-- Get xa by huyen
CREATE OR REPLACE FUNCTION get_xa_by_huyen(p_huyen TEXT)
RETURNS TABLE(xa TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.xa
    FROM tlaocai_tkk_3lr_cru t
    WHERE TRIM(t.huyen) = TRIM(p_huyen)
        AND t.xa IS NOT NULL AND t.xa <> ''
    ORDER BY t.xa;
END;
$$ LANGUAGE plpgsql;

-- Get tk by xa
CREATE OR REPLACE FUNCTION get_tk_by_xa(p_xa TEXT)
RETURNS TABLE(tk TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.tk
    FROM tlaocai_tkk_3lr_cru t
    WHERE TRIM(t.xa) ILIKE '%' || TRIM(p_xa) || '%'
    ORDER BY t.tk;
END;
$$ LANGUAGE plpgsql;

-- Get all khoanh
CREATE OR REPLACE FUNCTION get_all_khoanh()
RETURNS TABLE(khoanh TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.khoanh
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.khoanh IS NOT NULL AND t.khoanh <> ''
    ORDER BY t.khoanh;
END;
$$ LANGUAGE plpgsql;

-- Get all churung
CREATE OR REPLACE FUNCTION get_all_churung()
RETURNS TABLE(churung TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT t.churung
    FROM tlaocai_tkk_3lr_cru t
    WHERE t.churung IS NOT NULL AND t.churung <> ''
    ORDER BY t.churung;
END;
$$ LANGUAGE plpgsql;

-- Get district codes
CREATE OR REPLACE FUNCTION get_district_codes()
RETURNS TABLE(district_id VARCHAR, district_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        mahuyen::VARCHAR AS district_id,
        huyen AS district_name
    FROM tlaocai_tkk_3lr_cru
    WHERE mahuyen IS NOT NULL
    ORDER BY mahuyen;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Functions - Spatial Intersect
-- ========================================

-- Optimized spatial intersect (for mat_rung + admin boundaries)
CREATE OR REPLACE FUNCTION optimized_spatial_intersect(
    p_from_date DATE,
    p_to_date DATE,
    p_huyen TEXT DEFAULT NULL,
    p_xa TEXT DEFAULT NULL,
    p_tk TEXT DEFAULT NULL,
    p_khoanh TEXT DEFAULT NULL,
    p_churung TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 500,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(
    gid INTEGER,
    start_dau VARCHAR,
    end_sau VARCHAR,
    area DOUBLE PRECISION,
    mahuyen VARCHAR,
    huyen VARCHAR,
    xa VARCHAR,
    tk VARCHAR,
    khoanh VARCHAR,
    churung VARCHAR,
    geometry TEXT
) AS $$
BEGIN
    -- Note: This function needs to query gis_db.mat_rung
    -- Use dblink or call from application layer
    RAISE NOTICE 'This function should be called from application layer with cross-database join';
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Functions - Maintenance
-- ========================================

-- Refresh dropdown cache
CREATE OR REPLACE FUNCTION refresh_dropdown_cache()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_huyen;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_khoanh;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dropdown_churung;

    RAISE NOTICE 'Dropdown cache refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Coordinate Conversion
-- ========================================

-- WGS84 to VN2000 Lao Cai
CREATE OR REPLACE FUNCTION wgs84_to_vn2000_laocai(
    longitude DOUBLE PRECISION,
    latitude DOUBLE PRECISION
) RETURNS TABLE(x DOUBLE PRECISION, y DOUBLE PRECISION) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), 3405)),
        ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326), 3405));
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Comments
-- ========================================
COMMENT ON TABLE tlaocai_tkk_3lr_cru IS 'Administrative boundaries for Lao Cai with forest management units';
COMMENT ON TABLE laocai_huyen IS 'District-level administrative boundaries';
COMMENT ON TABLE laocai_ranhgioihc IS 'Administrative boundaries with multiple detail levels';
COMMENT ON TABLE laocai_chuquanly IS 'Forest management units';
COMMENT ON TABLE laocai_rg3lr IS 'Detailed forest classification (3LR system)';

COMMENT ON MATERIALIZED VIEW mv_dropdown_huyen IS 'Cached list of districts for dropdown menus';
COMMENT ON MATERIALIZED VIEW mv_dropdown_khoanh IS 'Cached list of forest compartments for dropdown menus';
COMMENT ON MATERIALIZED VIEW mv_dropdown_churung IS 'Cached list of forest types for dropdown menus';
