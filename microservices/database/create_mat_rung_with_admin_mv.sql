-- Script tạo Materialized View kết hợp mat_rung với thông tin hành chính
-- Mục đích: Tối ưu hiệu năng truy vấn báo cáo bằng cách join sẵn thông tin huyện, xã, tiểu khu, khoảnh

-- Kết nối đến gis_db
\c gis_db

-- Tạo Foreign Data Wrapper để truy cập admin_db (nếu chưa có)
-- Kiểm tra xem extension postgres_fdw đã được cài chưa
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- Tạo server để kết nối đến admin_db (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'admin_db_server') THEN
        CREATE SERVER admin_db_server
        FOREIGN DATA WRAPPER postgres_fdw
        OPTIONS (host 'localhost', port '5433', dbname 'admin_db');
    END IF;
END
$$;

-- Tạo user mapping (nếu chưa có)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_user_mappings
        WHERE srvname = 'admin_db_server'
        AND usename = current_user
    ) THEN
        CREATE USER MAPPING FOR CURRENT_USER
        SERVER admin_db_server
        OPTIONS (user 'postgres', password '4');
    END IF;
END
$$;

-- Import foreign schema cho bảng laocai_ranhgioihc
DROP SCHEMA IF EXISTS admin_fdw CASCADE;
CREATE SCHEMA admin_fdw;

IMPORT FOREIGN SCHEMA public
LIMIT TO (laocai_ranhgioihc)
FROM SERVER admin_db_server
INTO admin_fdw;

-- Xóa materialized view cũ nếu tồn tại
DROP MATERIALIZED VIEW IF EXISTS mv_mat_rung_with_admin CASCADE;

-- Tạo Materialized View mới
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
LEFT JOIN admin_fdw.laocai_ranhgioihc r
    ON ST_Intersects(m.geom, r.geom)
WHERE m.geom IS NOT NULL
    AND ST_IsValid(m.geom);

-- Tạo indexes để tăng tốc truy vấn
CREATE INDEX idx_mv_mat_rung_admin_gid ON mv_mat_rung_with_admin(gid);
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
END;
$$ LANGUAGE plpgsql;

-- Thông báo hoàn thành
DO $$
BEGIN
    RAISE NOTICE 'Materialized View mv_mat_rung_with_admin đã được tạo thành công!';
    RAISE NOTICE 'Tổng số records: %', (SELECT COUNT(*) FROM mv_mat_rung_with_admin);
    RAISE NOTICE 'Để refresh view, chạy: SELECT refresh_mat_rung_with_admin_mv();';
END
$$;
