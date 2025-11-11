-- Create Materialized Views for Dropdown Data
-- This script creates optimized materialized views for dropdown queries

-- Drop existing views if they exist
DROP MATERIALIZED VIEW IF EXISTS mv_huyen CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_xa CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_churung CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_loairung CASCADE;

-- Create materialized view for Huyen (Districts)
CREATE MATERIALIZED VIEW mv_huyen AS
SELECT DISTINCT
    huyen as value,
    huyen as label
FROM mat_rung
WHERE huyen IS NOT NULL AND huyen != ''
ORDER BY huyen;

-- Create unique index for faster queries
CREATE UNIQUE INDEX idx_mv_huyen_value ON mv_huyen(value);

-- Create materialized view for Xa (Communes)
CREATE MATERIALIZED VIEW mv_xa AS
SELECT DISTINCT
    huyen,
    xa as value,
    xa as label
FROM mat_rung
WHERE xa IS NOT NULL AND xa != ''
ORDER BY huyen, xa;

-- Create index for faster queries
CREATE INDEX idx_mv_xa_huyen ON mv_xa(huyen);
CREATE INDEX idx_mv_xa_value ON mv_xa(value);

-- Create materialized view for Chu Rung (Forest Owners)
CREATE MATERIALIZED VIEW mv_churung AS
SELECT DISTINCT
    chu_rung as value,
    chu_rung as label
FROM mat_rung
WHERE chu_rung IS NOT NULL AND chu_rung != ''
ORDER BY chu_rung;

-- Create unique index for faster queries
CREATE UNIQUE INDEX idx_mv_churung_value ON mv_churung(value);

-- Create materialized view for Loai Rung (Forest Types)
CREATE MATERIALIZED VIEW mv_loairung AS
SELECT DISTINCT
    loai_rung as value,
    loai_rung as label
FROM mat_rung
WHERE loai_rung IS NOT NULL AND loai_rung != ''
ORDER BY loai_rung;

-- Create unique index for faster queries
CREATE UNIQUE INDEX idx_mv_loairung_value ON mv_loairung(value);

-- Grant permissions
GRANT SELECT ON mv_huyen TO PUBLIC;
GRANT SELECT ON mv_xa TO PUBLIC;
GRANT SELECT ON mv_churung TO PUBLIC;
GRANT SELECT ON mv_loairung TO PUBLIC;

-- Verify creation
SELECT 'mv_huyen' as view_name, COUNT(*) as row_count FROM mv_huyen
UNION ALL
SELECT 'mv_xa', COUNT(*) FROM mv_xa
UNION ALL
SELECT 'mv_churung', COUNT(*) FROM mv_churung
UNION ALL
SELECT 'mv_loairung', COUNT(*) FROM mv_loairung;
