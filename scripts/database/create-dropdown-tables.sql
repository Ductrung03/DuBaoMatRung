-- Create dropdown reference tables for DuBaoMatRung system
-- Run this on gis_db database

-- Table: chuc_nang_rung (Forest Function)
CREATE TABLE IF NOT EXISTS chuc_nang_rung (
    id SERIAL PRIMARY KEY,
    ten_chuc_nang VARCHAR(255) NOT NULL UNIQUE,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: trang_thai_xac_minh (Verification Status)
CREATE TABLE IF NOT EXISTS trang_thai_xac_minh (
    id SERIAL PRIMARY KEY,
    ten_trang_thai VARCHAR(255) NOT NULL UNIQUE,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: nguyen_nhan (Cause/Reason)
CREATE TABLE IF NOT EXISTS nguyen_nhan (
    id SERIAL PRIMARY KEY,
    ten_nguyen_nhan VARCHAR(255) NOT NULL UNIQUE,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data for chuc_nang_rung
INSERT INTO chuc_nang_rung (ten_chuc_nang, mo_ta) VALUES
    ('Rừng phòng hộ', 'Rừng có chức năng phòng hộ đầu nguồn, chắn gió, chắn cát'),
    ('Rừng đặc dụng', 'Rừng có chức năng bảo vệ nguồn gen, nghiên cứu khoa học'),
    ('Rừng sản xuất', 'Rừng có chức năng sản xuất gỗ và lâm sản ngoài gỗ'),
    ('Rừng hỗn hợp', 'Rừng kết hợp nhiều chức năng')
ON CONFLICT (ten_chuc_nang) DO NOTHING;

-- Seed data for trang_thai_xac_minh
INSERT INTO trang_thai_xac_minh (ten_trang_thai, mo_ta) VALUES
    ('Chưa xác minh', 'Sự kiện chưa được xác minh'),
    ('Đang xác minh', 'Đang trong quá trình xác minh'),
    ('Đã xác minh', 'Đã hoàn thành xác minh'),
    ('Không xác thực', 'Xác minh cho thấy không đúng sự thật')
ON CONFLICT (ten_trang_thai) DO NOTHING;

-- Seed data for nguyen_nhan
INSERT INTO nguyen_nhan (ten_nguyen_nhan, mo_ta) VALUES
    ('Cháy rừng', 'Mất rừng do cháy tự nhiên hoặc nhân tạo'),
    ('Khai thác trái phép', 'Chặt phá rừng trái phép'),
    ('Chuyển đổi mục đích sử dụng', 'Chuyển đổi đất rừng sang mục đích khác'),
    ('Sâu bệnh hại', 'Rừng bị sâu bệnh phá hoại'),
    ('Thiên tai', 'Mất rừng do thiên tai (bão, lũ, sạt lở)'),
    ('Khác', 'Nguyên nhân khác')
ON CONFLICT (ten_nguyen_nhan) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chuc_nang_rung_ten ON chuc_nang_rung(ten_chuc_nang);
CREATE INDEX IF NOT EXISTS idx_trang_thai_xac_minh_ten ON trang_thai_xac_minh(ten_trang_thai);
CREATE INDEX IF NOT EXISTS idx_nguyen_nhan_ten ON nguyen_nhan(ten_nguyen_nhan);

-- Display results
SELECT 'chuc_nang_rung' as table_name, COUNT(*) as row_count FROM chuc_nang_rung
UNION ALL
SELECT 'trang_thai_xac_minh', COUNT(*) FROM trang_thai_xac_minh
UNION ALL
SELECT 'nguyen_nhan', COUNT(*) FROM nguyen_nhan;
