-- Script tạo Materialized View kết hợp mat_rung với thông tin hành chính
-- Phương án đơn giản: Sao chép bảng laocai_ranhgioihc vào gis_db

\c gis_db

-- Bước 1: Xóa bảng cũ nếu tồn tại
DROP TABLE IF EXISTS laocai_ranhgioihc CASCADE;

-- Bước 2: Dump và restore bảng từ admin_db sang gis_db
-- (Thực hiện bằng pg_dump/pg_restore hoặc dblink)

-- Tạo extension cần thiết
CREATE EXTENSION IF NOT EXISTS dblink;

-- Copy dữ liệu từ admin_db
SELECT *
INTO laocai_ranhgioihc
FROM dblink(
    'host=localhost port=5433 dbname=admin_db user=postgres password=4',
    'SELECT gid, huyen, xa, tieukhu, khoanh, geom, geom_low, geom_high FROM laocai_ranhgioihc'
) AS t(
    gid integer,
    huyen character varying,
    xa character varying,
    tieukhu character varying,
    khoanh character varying,
    geom geometry(MultiPolygon,32648),
    geom_low geometry(MultiPolygon,32648),
    geom_high geometry(MultiPolygon,32648)
);

-- Tạo spatial index cho bảng vừa copy
CREATE INDEX idx_laocai_ranhgioihc_geom ON laocai_ranhgioihc USING GIST(geom);
CREATE INDEX idx_laocai_ranhgioihc_huyen ON laocai_ranhgioihc(huyen);
CREATE INDEX idx_laocai_ranhgioihc_xa ON laocai_ranhgioihc(xa);

RAISE NOTICE 'Đã copy % records từ admin_db.laocai_ranhgioihc', (SELECT COUNT(*) FROM laocai_ranhgioihc);

-- Bước 3: Xóa materialized view cũ nếu tồn tại
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_with_admin CASCADE;

-- Bước 4: Tạo Materialized View mới
CREATE MATERIALIZED VIEW mv_mat_rung_with_admin AS
SELECT
    m.gid,
    m.area,
    m.start_dau,
    m.end_sau,
    m.start_sau,
    m.end_dau,
    m.mahuyen,
    m.detection_status,
    m.detection_date,
    m.verified_area as dtichXM,
    m.verified_by,
    m.verification_reason,
    m.verification_notes,
    m.created_at,
    m.updated_at,
    m.geom,
    m.geom_simplified,

    -- Thông tin từ laocai_ranhgioihc
    r.huyen as huyen_name,
    r.xa as xa_name,
    r.tieukhu as tk,
    r.khoanh,

    -- Các thông tin tính toán
    CONCAT('CB-', m.gid) as lo_canbao,
    ROUND(ST_X(ST_Centroid(m.geom))::numeric, 0) as x,
    ROUND(ST_Y(ST_Centroid(m.geom))::numeric, 0) as y,
    m.area as dtich,
    CASE WHEN m.detection_status = 'Đã xác minh' THEN 1 ELSE 0 END as xacminh,

    -- Diện tích hecta
    ROUND((m.area / 10000.0)::numeric, 2) as dtich_ha,
    ROUND((COALESCE(m.verified_area, 0) / 10000.0)::numeric, 2) as dtichXM_ha

FROM mat_rung m
LEFT JOIN laocai_ranhgioihc r
    ON ST_Intersects(m.geom, r.geom)
WHERE m.geom IS NOT NULL
    AND ST_IsValid(m.geom);

-- Bước 5: Tạo unique index cho CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_mat_rung_admin_gid ON mv_mat_rung_with_admin(gid);

-- Tạo các indexes khác để tăng tốc truy vấn
CREATE INDEX idx_mv_mat_rung_admin_mahuyen ON mv_mat_rung_with_admin(mahuyen);
CREATE INDEX idx_mv_mat_rung_admin_huyen_name ON mv_mat_rung_with_admin(huyen_name);
CREATE INDEX idx_mv_mat_rung_admin_xa_name ON mv_mat_rung_with_admin(xa_name);
CREATE INDEX idx_mv_mat_rung_admin_tk ON mv_mat_rung_with_admin(tk);
CREATE INDEX idx_mv_mat_rung_admin_khoanh ON mv_mat_rung_with_admin(khoanh);
CREATE INDEX idx_mv_mat_rung_admin_detection_date ON mv_mat_rung_with_admin(detection_date);
CREATE INDEX idx_mv_mat_rung_admin_detection_status ON mv_mat_rung_with_admin(detection_status);
CREATE INDEX idx_mv_mat_rung_admin_xacminh ON mv_mat_rung_with_admin(xacminh);
CREATE INDEX idx_mv_mat_rung_admin_geom ON mv_mat_rung_with_admin USING GIST(geom);

-- Bước 6: Tạo function để refresh materialized view
CREATE OR REPLACE FUNCTION refresh_mat_rung_with_admin_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_mat_rung_with_admin;
    RAISE NOTICE 'Materialized View đã được refresh thành công!';
END;
$$ LANGUAGE plpgsql;

-- Thông báo hoàn thành
DO $$
DECLARE
    record_count bigint;
    with_admin_info bigint;
BEGIN
    SELECT COUNT(*) INTO record_count FROM mv_mat_rung_with_admin;
    SELECT COUNT(*) INTO with_admin_info FROM mv_mat_rung_with_admin WHERE huyen_name IS NOT NULL;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Materialized View mv_mat_rung_with_admin đã được tạo thành công!';
    RAISE NOTICE 'Tổng số records: %', record_count;
    RAISE NOTICE 'Records có thông tin hành chính: % (%.1f%%)',
        with_admin_info,
        (with_admin_info::float / NULLIF(record_count, 0) * 100);
    RAISE NOTICE 'Để refresh view, chạy: SELECT refresh_mat_rung_with_admin_mv();';
    RAISE NOTICE '==============================================';
END
$$;
