-- Add UI category field for grouping permissions in UI
-- This helps organize permissions by page/feature for better UX

ALTER TABLE "Permission" ADD COLUMN IF NOT EXISTS "ui_category" TEXT;

-- Add comment to explain the field
COMMENT ON COLUMN "Permission"."ui_category" IS 'UI category for grouping permissions (e.g., "Trang chính", "Báo cáo", "Người dùng")';
COMMENT ON COLUMN "Permission"."ui_path" IS 'UI path where this permission is used (e.g., "/dashboard", "/dashboard/baocao")';
COMMENT ON COLUMN "Permission"."icon" IS 'Icon name for UI display (e.g., "FaEye", "FaEdit")';
