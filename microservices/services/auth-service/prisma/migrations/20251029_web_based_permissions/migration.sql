-- Xóa dữ liệu cũ
DELETE FROM "RolePermission";
DELETE FROM "Permission";

-- Tạo lại permissions theo cấu trúc web
INSERT INTO "Permission" (code, name, description, module, resource, action, parent_id, ui_path, ui_category, ui_element, "order", icon) VALUES

-- 1. DỰ BÁO MẤT RỪNG (Parent)
('forecast', 'Dự báo mất rừng', 'Truy cập module dự báo mất rừng', 'forecast', 'forecast', 'access', NULL, '/dashboard/dubaomatrung', 'main_menu', 'page', 1, 'trending-up'),
('forecast.auto', 'Dự báo tự động', 'Sử dụng dự báo mất rừng tự động', 'forecast', 'auto_forecast', 'use', 1, '/dashboard/dubaomatrung/auto', 'forecast', 'feature', 1, 'cpu'),
('forecast.custom', 'Dự báo tùy biến', 'Sử dụng dự báo mất rừng tùy biến', 'forecast', 'custom_forecast', 'use', 1, '/dashboard/dubaomatrung/custom', 'forecast', 'feature', 2, 'settings'),

-- 2. QUẢN LÝ DỮ LIỆU (Parent)
('data_management', 'Quản lý dữ liệu', 'Truy cập module quản lý dữ liệu', 'data', 'data_management', 'access', NULL, '/dashboard/quanlydulieu', 'main_menu', 'page', 2, 'database'),
('data_management.view', 'Xem dữ liệu', 'Xem dữ liệu mất rừng', 'data', 'forest_data', 'read', 2, '/dashboard/quanlydulieu/view', 'data', 'action', 1, 'eye'),
('data_management.edit', 'Chỉnh sửa dữ liệu', 'Chỉnh sửa dữ liệu mất rừng', 'data', 'forest_data', 'update', 2, '/dashboard/quanlydulieu/edit', 'data', 'action', 2, 'edit'),
('data_management.delete', 'Xóa dữ liệu', 'Xóa dữ liệu mất rừng', 'data', 'forest_data', 'delete', 2, '/dashboard/quanlydulieu/delete', 'data', 'action', 3, 'trash'),
('data_management.export', 'Xuất dữ liệu', 'Xuất dữ liệu ra file', 'data', 'forest_data', 'export', 2, '/dashboard/quanlydulieu/export', 'data', 'action', 4, 'download'),
('data_management.import', 'Nhập dữ liệu', 'Nhập dữ liệu từ file', 'data', 'forest_data', 'import', 2, '/dashboard/quanlydulieu/import', 'data', 'action', 5, 'upload'),

-- 3. BÁO CÁO (Parent)
('reports', 'Báo cáo', 'Truy cập module báo cáo', 'reports', 'reports', 'access', NULL, '/dashboard/baocao', 'main_menu', 'page', 3, 'bar-chart'),
('reports.view', 'Xem báo cáo', 'Xem các báo cáo thống kê', 'reports', 'report_data', 'read', 3, '/dashboard/baocao/view', 'reports', 'action', 1, 'eye'),
('reports.create', 'Tạo báo cáo', 'Tạo báo cáo mới', 'reports', 'report_data', 'create', 3, '/dashboard/baocao/create', 'reports', 'action', 2, 'plus'),
('reports.export', 'Xuất báo cáo', 'Xuất báo cáo ra file', 'reports', 'report_data', 'export', 3, '/dashboard/baocao/export', 'reports', 'action', 3, 'download'),
('reports.statistics', 'Thống kê chi tiết', 'Xem thống kê chi tiết', 'reports', 'statistics', 'read', 3, '/dashboard/baocao/statistics', 'reports', 'feature', 4, 'pie-chart'),

-- 4. PHÁT HIỆN MẤT RỪNG (Parent)
('detection', 'Phát hiện mất rừng', 'Truy cập module phát hiện mất rừng', 'detection', 'detection', 'access', NULL, '/dashboard/phathienmatrung', 'main_menu', 'page', 4, 'search'),
('detection.view', 'Xem phát hiện', 'Xem các sự kiện phát hiện', 'detection', 'detection_events', 'read', 4, '/dashboard/phathienmatrung/view', 'detection', 'action', 1, 'eye'),
('detection.verify', 'Xác minh', 'Xác minh sự kiện mất rừng', 'detection', 'detection_events', 'verify', 4, '/dashboard/phathienmatrung/verify', 'detection', 'action', 2, 'check'),
('detection.reject', 'Từ chối', 'Từ chối sự kiện mất rừng', 'detection', 'detection_events', 'reject', 4, '/dashboard/phathienmatrung/reject', 'detection', 'action', 3, 'x'),
('detection.analyze', 'Phân tích', 'Phân tích chi tiết sự kiện', 'detection', 'detection_events', 'analyze', 4, '/dashboard/phathienmatrung/analyze', 'detection', 'feature', 4, 'zoom-in'),

-- 5. QUẢN LÝ NGƯỜI DÙNG (Parent)
('user_management', 'Quản lý người dùng', 'Truy cập module quản lý người dùng', 'admin', 'user_management', 'access', NULL, '/dashboard/quanlynguoidung', 'main_menu', 'page', 5, 'users'),
('user_management.view', 'Xem người dùng', 'Xem danh sách người dùng', 'admin', 'users', 'read', 5, '/dashboard/quanlynguoidung/view', 'user_management', 'action', 1, 'eye'),
('user_management.create', 'Tạo người dùng', 'Tạo người dùng mới', 'admin', 'users', 'create', 5, '/dashboard/quanlynguoidung/create', 'user_management', 'action', 2, 'user-plus'),
('user_management.edit', 'Sửa người dùng', 'Chỉnh sửa thông tin người dùng', 'admin', 'users', 'update', 5, '/dashboard/quanlynguoidung/edit', 'user_management', 'action', 3, 'edit'),
('user_management.delete', 'Xóa người dùng', 'Xóa người dùng', 'admin', 'users', 'delete', 5, '/dashboard/quanlynguoidung/delete', 'user_management', 'action', 4, 'user-minus'),
('user_management.assign_roles', 'Phân quyền', 'Gán role cho người dùng', 'admin', 'users', 'assign_roles', 5, '/dashboard/quanlynguoidung/roles', 'user_management', 'action', 5, 'shield'),

-- 6. QUẢN LÝ ROLES (Parent)
('role_management', 'Quản lý roles', 'Truy cập module quản lý roles', 'admin', 'role_management', 'access', NULL, '/dashboard/quanlyrole', 'main_menu', 'page', 6, 'shield'),
('role_management.view', 'Xem roles', 'Xem danh sách roles', 'admin', 'roles', 'read', 6, '/dashboard/quanlyrole/view', 'role_management', 'action', 1, 'eye'),
('role_management.create', 'Tạo role', 'Tạo role mới', 'admin', 'roles', 'create', 6, '/dashboard/quanlyrole/create', 'role_management', 'action', 2, 'plus'),
('role_management.edit', 'Sửa role', 'Chỉnh sửa role', 'admin', 'roles', 'update', 6, '/dashboard/quanlyrole/edit', 'role_management', 'action', 3, 'edit'),
('role_management.delete', 'Xóa role', 'Xóa role', 'admin', 'roles', 'delete', 6, '/dashboard/quanlyrole/delete', 'role_management', 'action', 4, 'trash'),
('role_management.assign_permissions', 'Phân quyền chi tiết', 'Gán permissions cho role', 'admin', 'roles', 'assign_permissions', 6, '/dashboard/quanlyrole/permissions', 'role_management', 'action', 5, 'settings');

-- Cập nhật parent_id dựa trên ID thực tế
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'forecast') WHERE code IN ('forecast.auto', 'forecast.custom');
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'data_management') WHERE code IN ('data_management.view', 'data_management.edit', 'data_management.delete', 'data_management.export', 'data_management.import');
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'reports') WHERE code IN ('reports.view', 'reports.create', 'reports.export', 'reports.statistics');
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'detection') WHERE code IN ('detection.view', 'detection.verify', 'detection.reject', 'detection.analyze');
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'user_management') WHERE code IN ('user_management.view', 'user_management.create', 'user_management.edit', 'user_management.delete', 'user_management.assign_roles');
UPDATE "Permission" SET parent_id = (SELECT id FROM "Permission" WHERE code = 'role_management') WHERE code IN ('role_management.view', 'role_management.create', 'role_management.edit', 'role_management.delete', 'role_management.assign_permissions');
