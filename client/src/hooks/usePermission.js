import { useAuth } from '../dashboard/contexts/AuthContext';

/**
 * Custom hook để kiểm tra quyền hạn của user
 *
 * Sử dụng:
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
 *
 * if (hasPermission('user.list.button.add')) {
 *   // Hiển thị button thêm user
 * }
 */
export const usePermission = () => {
  const { user } = useAuth();

  /**
   * Kiểm tra user có permission cụ thể hay không
   * @param {string} permissionCode - Mã permission (vd: 'user.list.button.add')
   * @returns {boolean}
   */
  const hasPermission = (permissionCode) => {
    if (!user) return false;

    // Super admin có tất cả quyền
    if (user.roles?.includes('super_admin')) return true;

    // Check permission trong user.permissions array
    if (!user.permissions || !Array.isArray(user.permissions)) return false;

    return user.permissions.includes(permissionCode);
  };

  /**
   * Kiểm tra user có ít nhất một trong các permissions
   * @param {string[]} permissionCodes - Mảng các mã permissions
   * @returns {boolean}
   */
  const hasAnyPermission = (permissionCodes) => {
    if (!Array.isArray(permissionCodes)) return false;
    return permissionCodes.some(code => hasPermission(code));
  };

  /**
   * Kiểm tra user có tất cả các permissions
   * @param {string[]} permissionCodes - Mảng các mã permissions
   * @returns {boolean}
   */
  const hasAllPermissions = (permissionCodes) => {
    if (!Array.isArray(permissionCodes)) return false;
    return permissionCodes.every(code => hasPermission(code));
  };

  /**
   * Kiểm tra user có role cụ thể
   * @param {string} roleName - Tên role
   * @returns {boolean}
   */
  const hasRole = (roleName) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(roleName);
  };

  /**
   * Kiểm tra user có ít nhất một trong các roles
   * @param {string[]} roleNames - Mảng các tên roles
   * @returns {boolean}
   */
  const hasAnyRole = (roleNames) => {
    if (!Array.isArray(roleNames)) return false;
    return roleNames.some(role => hasRole(role));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole
  };
};

export default usePermission;
