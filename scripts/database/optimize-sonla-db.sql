-- Script tối ưu hóa database cho dữ liệu Sơn La
-- Chạy bằng lệnh: psql -U postgres -d admin_db -f scripts/optimize-sonla-db.sql

-- 1. Bật PostGIS extension (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Tạo Spatial Index cho các bảng Sơn La
-- Bảng Ranh giới xã
DROP INDEX IF EXISTS sonla_rgx_geom_idx;
CREATE INDEX sonla_rgx_geom_idx ON sonla_rgx USING GIST (geom);

-- Bảng Tiểu khu khoảnh lô
DROP INDEX IF EXISTS sonla_tkkl_geom_idx;
CREATE INDEX sonla_tkkl_geom_idx ON sonla_tkkl USING GIST (geom);

-- Bảng Hiện trạng rừng
DROP INDEX IF EXISTS sonla_hientrangrung_geom_idx;
CREATE INDEX sonla_hientrangrung_geom_idx ON sonla_hientrangrung USING GIST (geom);

-- 3. Tạo Attribute Index cho các cột thường xuyên query/filter
-- Index cho ldlr_23 của bảng hiện trạng rừng (dùng trong CLASSITEM)
DROP INDEX IF EXISTS sonla_hientrangrung_ldlr23_idx;
CREATE INDEX sonla_hientrangrung_ldlr23_idx ON sonla_hientrangrung (ldlr_23);

-- 4. Vacuum Analyze để update statistics cho query planner
VERBOSE VACUUM ANALYZE sonla_rgx;
VERBOSE VACUUM ANALYZE sonla_tkkl;
VERBOSE VACUUM ANALYZE sonla_hientrangrung;

-- 5. Kiểm tra kết quả
SELECT relname, reltuples, relpages FROM pg_class WHERE relname IN ('sonla_rgx', 'sonla_tkkl', 'sonla_hientrangrung');
