// client/src/dashboard/components/UserRoleDisplay.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component hiển thị vai trò và quyền của user
 * Có thể dùng trong header, sidebar, hoặc profile page
 */
const UserRoleDisplay = ({ compact = false }) => {
  const { user, isAdmin } = useAuth();

  if (!user) return null;

  // Compact mode - chỉ hiển thị role badge
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{user.full_name}</span>
        {user.roles && user.roles.length > 0 && (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            isAdmin()
              ? 'bg-red-100 text-red-800'
              : user.roles[0].name === 'gis_specialist'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {user.roles[0].name === 'admin' && 'Quản trị viên'}
            {user.roles[0].name === 'gis_specialist' && 'Chuyên viên GIS'}
            {user.roles[0].name === 'viewer' && 'Người xem'}
            {!['admin', 'gis_specialist', 'viewer'].includes(user.roles[0].name) && user.roles[0].name}
          </span>
        )}
      </div>
    );
  }

  // Full mode - hiển thị chi tiết
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Thông tin người dùng</h3>

      <div className="space-y-2">
        <div>
          <span className="text-sm text-gray-600">Tên đăng nhập:</span>
          <span className="ml-2 font-medium">{user.username}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600">Họ tên:</span>
          <span className="ml-2 font-medium">{user.full_name}</span>
        </div>

        {user.roles && user.roles.length > 0 && (
          <div>
            <span className="text-sm text-gray-600">Vai trò:</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {user.roles.map((role, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${
                    role.name === 'admin'
                      ? 'bg-red-100 text-red-800'
                      : role.name === 'gis_specialist'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {role.name === 'admin' && 'Quản trị viên'}
                  {role.name === 'gis_specialist' && 'Chuyên viên GIS'}
                  {role.name === 'viewer' && 'Người xem'}
                  {!['admin', 'gis_specialist', 'viewer'].includes(role.name) && role.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {user.roles && user.roles[0]?.permissions && (
          <div>
            <span className="text-sm text-gray-600">Quyền hạn:</span>
            <div className="mt-1 max-h-40 overflow-y-auto">
              <ul className="text-sm space-y-1">
                {user.roles.flatMap(role => role.permissions || [])
                  .filter((perm, index, self) =>
                    index === self.findIndex(p => p.id === perm.id)
                  )
                  .map((perm, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-gray-700">
                        {perm.action === 'manage' && 'Quản lý toàn bộ'}
                        {perm.action === 'read' && 'Xem'}
                        {perm.action === 'create' && 'Tạo'}
                        {perm.action === 'update' && 'Cập nhật'}
                        {perm.action === 'delete' && 'Xóa'}
                        {perm.action === 'verify' && 'Xác minh'}
                        {' '}
                        {perm.subject === 'all' && 'tất cả'}
                        {perm.subject === 'users' && 'người dùng'}
                        {perm.subject === 'deforestation_events' && 'sự kiện mất rừng'}
                        {perm.subject === 'reports' && 'báo cáo'}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Component để ẩn/hiện nội dung dựa trên permission
 * Usage: <PermissionGate action="create" subject="users">...</PermissionGate>
 */
export const PermissionGate = ({ action, subject, children, fallback = null }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(action, subject)) {
    return fallback;
  }

  return children;
};

/**
 * Component để ẩn/hiện nội dung chỉ cho admin
 * Usage: <AdminOnly>...</AdminOnly>
 */
export const AdminOnly = ({ children, fallback = null }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return fallback;
  }

  return children;
};

export default UserRoleDisplay;
