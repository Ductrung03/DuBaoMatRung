-- Create missing dropdown tables for the application

-- Table: chuc_nang_rung (Forest Functions)
CREATE TABLE IF NOT EXISTS chuc_nang_rung (
    id SERIAL PRIMARY KEY,
    ten VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: trang_thai_xac_minh (Verification Status)
CREATE TABLE IF NOT EXISTS trang_thai_xac_minh (
    id SERIAL PRIMARY KEY,
    ten VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: nguyen_nhan (Causes)
CREATE TABLE IF NOT EXISTS nguyen_nhan (
    id SERIAL PRIMARY KEY,
    ten VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for chuc_nang_rung
INSERT INTO chuc_nang_rung (ten, mo_ta) VALUES
('Rừng phòng hộ', 'Rừng có chức năng chính là phòng hộ đầu nguồn'),
('Rừng đặc dụng', 'Rừng có chức năng bảo tồn thiên nhiên'),
('Rừng sản xuất', 'Rừng có chức năng chính là sản xuất gỗ và lâm sản'),
('Rừng hỗn hợp', 'Rừng có nhiều chức năng kết hợp')
ON CONFLICT DO NOTHING;

-- Insert sample data for trang_thai_xac_minh
INSERT INTO trang_thai_xac_minh (ten, mo_ta) VALUES
('Chưa xác minh', 'Chưa được kiểm tra và xác minh'),
('Đã xác minh', 'Đã được kiểm tra và xác minh'),
('Đang xác minh', 'Đang trong quá trình kiểm tra'),
('Từ chối', 'Không đạt yêu cầu xác minh')
ON CONFLICT DO NOTHING;

-- Insert sample data for nguyen_nhan
INSERT INTO nguyen_nhan (ten, mo_ta) VALUES
('Thiên tai', 'Do thiên tai gây ra'),
('Con người', 'Do hoạt động của con người'),
('Sâu bệnh', 'Do sâu bệnh hại rừng'),
('Cháy rừng', 'Do cháy rừng tự nhiên hoặc nhân tạo'),
('Khai thác', 'Do hoạt động khai thác gỗ'),
('Chuyển đổi mục đích', 'Do chuyển đổi mục đích sử dụng đất')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chuc_nang_rung_ten ON chuc_nang_rung(ten);
CREATE INDEX IF NOT EXISTS idx_trang_thai_xac_minh_ten ON trang_thai_xac_minh(ten);
CREATE INDEX IF NOT EXISTS idx_nguyen_nhan_ten ON nguyen_nhan(ten);
