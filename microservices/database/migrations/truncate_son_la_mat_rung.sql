-- Truncate son_la_mat_rung table
-- This will delete all data but keep the table structure

BEGIN;

-- Show current record count
SELECT COUNT(*) as current_records FROM son_la_mat_rung;

-- Truncate table (delete all data)
TRUNCATE TABLE son_la_mat_rung RESTART IDENTITY CASCADE;

-- Verify table is empty
SELECT COUNT(*) as records_after_truncate FROM son_la_mat_rung;

COMMIT;

-- Success message
SELECT 'Bảng son_la_mat_rung đã được xóa sạch dữ liệu. Bạn có thể import lại dữ liệu mới.' as message;
