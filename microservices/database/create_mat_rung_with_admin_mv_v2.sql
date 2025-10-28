-- Script tạo Materialized View kết hợp mat_rung với thông tin hành chính
-- Phiên bản 2: Sử dụng dblink để kết nối giữa gis_db và admin_db

-- Kết nối đến gis_db
\c gis_db

-- Cài đặt extension dblink nếu chưa có
CREATE EXTENSION IF NOT EXISTS dblink;
CREATE EXTENSION IF NOT EXISTS postgis;

-- Xóa materialized view cũ nếu tồn tại
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_with_admin CASCADE;

-- Tạo Materialized View mới kết hợp với admin_db
-- Sử dụng dblink để query cross-database
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

    -- Thông tin từ admin_db.laocai_ranhgioihc
    admin_info.huyen as huyen_name,
    admin_info.xa as xa_name,
    admin_info.tieukhu as tk,
    admin_info.khoanh,

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
LEFT JOIN LATERAL (
    SELECT *
    FROM dblink(
        'host=localhost port=5433 dbname=admin_db user=postgres password=4',
        format('SELECT huyen, xa, tieukhu, khoanh
                FROM laocai_ranhgioihc
                WHERE ST_Intersects(geom, ST_GeomFromEWKT(''%s''))
                LIMIT 1',
               ST_AsEWKT(m.geom))
    ) AS admin(
        huyen character varying,
        xa character varying,
        tieukhu character varying,
        khoanh character varying
    )
) AS admin_info ON true
WHERE m.geom IS NOT NULL
    AND ST_IsValid(m.geom);

-- Tạo unique index cho CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_mat_rung_admin_gid ON mv_mat_rung_with_admin(gid);

-- Tạo các indexes khác để tăng tốc truy vấn
CREATE INDEX idx_mv_mat_rung_admin_mahuyen ON mv_mat_rung_with_admin(mahuyen);
CREATE INDEX idx_mv_mat_rung_admin_huyen_name ON mv_mat_rung_with_admin(huyen_name);
CREATE INDEX idx_mv_mat_rung_admin_xa_name ON mv_mat_rung_with_admin(xa_name);
CREATE INDEX idx_mv_mat_rung_admin_detection_date ON mv_mat_rung_with_admin(detection_date);
CREATE INDEX idx_mv_mat_rung_admin_detection_status ON mv_mat_rung_with_admin(detection_status);
CREATE INDEX idx_mv_mat_rung_admin_xacminh ON mv_mat_rung_with_admin(xacminh);
CREATE INDEX idx_mv_mat_rung_admin_geom ON mv_mat_rung_with_admin USING GIST(geom);

-- Tạo function để refresh materialized view
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
BEGIN
    SELECT COUNT(*) INTO record_count FROM mv_mat_rung_with_admin;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Materialized View mv_mat_rung_with_admin đã được tạo thành công!';
    RAISE NOTICE 'Tổng số records: %', record_count;
    RAISE NOTICE 'Để refresh view, chạy: SELECT refresh_mat_rung_with_admin_mv();';
    RAISE NOTICE '==============================================';
END
$$;
