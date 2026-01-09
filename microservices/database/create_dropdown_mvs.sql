-- Script tạo Materialized Views cho dropdown data
-- Database: gis_db
-- Nguồn: son_la_ranhgioihc

\c gis_db

-- 1. MV cho danh sách Huyện
DROP MATERIALIZED VIEW IF EXISTS mv_huyen CASCADE;
CREATE MATERIALIZED VIEW mv_huyen AS
SELECT DISTINCT huyen
FROM son_la_ranhgioihc
WHERE huyen IS NOT NULL
ORDER BY huyen;

CREATE UNIQUE INDEX idx_mv_huyen ON mv_huyen(huyen);

-- 2. MV cho danh sách Xã theo Huyện
DROP MATERIALIZED VIEW IF EXISTS mv_xa_by_huyen CASCADE;
CREATE MATERIALIZED VIEW mv_xa_by_huyen AS
SELECT DISTINCT huyen, xa
FROM son_la_ranhgioihc
WHERE huyen IS NOT NULL AND xa IS NOT NULL
ORDER BY huyen, xa;

CREATE UNIQUE INDEX idx_mv_xa_by_huyen ON mv_xa_by_huyen(huyen, xa);
CREATE INDEX idx_mv_xa_by_huyen_huyen ON mv_xa_by_huyen(huyen);

-- 3. MV cho danh sách Tiểu Khu theo Xã
DROP MATERIALIZED VIEW IF EXISTS mv_tieukhu_by_xa CASCADE;
CREATE MATERIALIZED VIEW mv_tieukhu_by_xa AS
SELECT DISTINCT huyen, xa, tieukhu
FROM son_la_ranhgioihc
WHERE huyen IS NOT NULL
  AND xa IS NOT NULL
  AND tieukhu IS NOT NULL
ORDER BY huyen, xa, tieukhu;

CREATE UNIQUE INDEX idx_mv_tieukhu_by_xa ON mv_tieukhu_by_xa(huyen, xa, tieukhu);
CREATE INDEX idx_mv_tieukhu_by_xa_huyen ON mv_tieukhu_by_xa(huyen);
CREATE INDEX idx_mv_tieukhu_by_xa_xa ON mv_tieukhu_by_xa(xa);

-- 4. MV cho danh sách Khoảnh theo Tiểu Khu
DROP MATERIALIZED VIEW IF EXISTS mv_khoanh_by_tieukhu CASCADE;
CREATE MATERIALIZED VIEW mv_khoanh_by_tieukhu AS
SELECT DISTINCT khoanh
FROM son_la_ranhgioihc
WHERE khoanh IS NOT NULL
ORDER BY khoanh;

CREATE UNIQUE INDEX idx_mv_khoanh_by_tieukhu ON mv_khoanh_by_tieukhu(khoanh);

-- 5. MV cho danh sách Chủ Rừng
DROP MATERIALIZED VIEW IF EXISTS mv_churung CASCADE;
CREATE MATERIALIZED VIEW mv_churung AS
SELECT DISTINCT churung
FROM son_la_ranhgioihc
WHERE churung IS NOT NULL
ORDER BY churung;

CREATE UNIQUE INDEX idx_mv_churung ON mv_churung(churung);

-- Function để refresh tất cả MVs
CREATE OR REPLACE FUNCTION refresh_dropdown_mvs()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_huyen;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xa_by_huyen;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tieukhu_by_xa;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_khoanh_by_tieukhu;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_churung;

    RAISE NOTICE 'All dropdown materialized views refreshed successfully!';
END;
$$ LANGUAGE plpgsql;

-- Thông báo kết quả
DO $$
DECLARE
    huyen_count int;
    xa_count int;
    tieukhu_count int;
    khoanh_count int;
    churung_count int;
BEGIN
    SELECT COUNT(*) INTO huyen_count FROM mv_huyen;
    SELECT COUNT(*) INTO xa_count FROM mv_xa_by_huyen;
    SELECT COUNT(*) INTO tieukhu_count FROM mv_tieukhu_by_xa;
    SELECT COUNT(*) INTO khoanh_count FROM mv_khoanh_by_tieukhu;
    SELECT COUNT(*) INTO churung_count FROM mv_churung;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Dropdown Materialized Views Created Successfully!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'mv_huyen: % districts', huyen_count;
    RAISE NOTICE 'mv_xa_by_huyen: % communes', xa_count;
    RAISE NOTICE 'mv_tieukhu_by_xa: % sub-compartments', tieukhu_count;
    RAISE NOTICE 'mv_khoanh_by_tieukhu: % compartments', khoanh_count;
    RAISE NOTICE 'mv_churung: % forest owners', churung_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'To refresh all views: SELECT refresh_dropdown_mvs();';
    RAISE NOTICE '================================================';
END
$$;
