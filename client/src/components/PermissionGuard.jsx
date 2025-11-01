import React from 'react';
import { usePermission } from '../hooks/usePermission';

/**
 * PermissionGuard Component
 * Wrapper component để ẩn/hiện UI elements dựa trên permission
 *
 * @example
 * // Chỉ hiển thị button nếu có quyền
 * <PermissionGuard permission="user.list.button.add">
 *   <button>Thêm người dùng</button>
 * </PermissionGuard>
 *
 * @example
 * // Hiển thị fallback nếu không có quyền
 * <PermissionGuard
 *   permission="user.detail.view"
 *   fallback={<div>Bạn không có quyền xem</div>}
 * >
 *   <UserDetailPage />
 * </PermissionGuard>
 *
 * @example
 * // Check nhiều permissions (OR logic)
 * <PermissionGuard permissions={['user.list.button.add', 'user.list.button.import']}>
 *   <div>Có ít nhất 1 trong 2 quyền</div>
 * </PermissionGuard>
 *
 * @example
 * // Require tất cả permissions (AND logic)
 * <PermissionGuard
 *   permissions={['user.detail.view', 'user.detail.button.edit']}
 *   requireAll={true}
 * >
 *   <EditUserForm />
 * </PermissionGuard>
 */
export const PermissionGuard = ({
  permission,      // Single permission code
  permissions,     // Multiple permission codes
  requireAll = false, // true = AND logic, false = OR logic (default)
  children,
  fallback = null, // Element to show when no permission
  roles,           // Check by role instead of permission
  requireAllRoles = false
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, hasRole, hasAnyRole } = usePermission();

  // Check by roles
  if (roles) {
    const hasRequiredRole = requireAllRoles
      ? roles.every(role => hasRole(role))
      : hasAnyRole(roles);

    if (!hasRequiredRole) {
      return fallback;
    }

    return children;
  }

  // Check by single permission
  if (permission) {
    if (!hasPermission(permission)) {
      return fallback;
    }

    return children;
  }

  // Check by multiple permissions
  if (permissions && Array.isArray(permissions)) {
    const hasRequiredPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermission) {
      return fallback;
    }

    return children;
  }

  // No permission check provided, show children by default
  return children;
};

/**
 * PermissionButton Component
 * Button wrapper với permission check built-in
 *
 * @example
 * <PermissionButton
 *   permission="user.list.button.add"
 *   onClick={handleAdd}
 *   className="btn btn-primary"
 * >
 *   Thêm người dùng
 * </PermissionButton>
 */
export const PermissionButton = ({
  permission,
  permissions,
  requireAll = false,
  children,
  disabled = false,
  onClick,
  className = '',
  style = {},
  type = 'button',
  title,
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let hasRequiredPermission = false;

  if (permission) {
    hasRequiredPermission = hasPermission(permission);
  } else if (permissions && Array.isArray(permissions)) {
    hasRequiredPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    hasRequiredPermission = true; // No permission check
  }

  if (!hasRequiredPermission) {
    return null; // Don't render button if no permission
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={style}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * PermissionLink Component
 * Link/anchor wrapper với permission check
 *
 * @example
 * <PermissionLink
 *   permission="user.detail.view"
 *   to={`/users/${userId}`}
 *   className="text-blue-500"
 * >
 *   Xem chi tiết
 * </PermissionLink>
 */
export const PermissionLink = ({
  permission,
  permissions,
  requireAll = false,
  children,
  to,
  href,
  className = '',
  onClick,
  ...props
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  let hasRequiredPermission = false;

  if (permission) {
    hasRequiredPermission = hasPermission(permission);
  } else if (permissions && Array.isArray(permissions)) {
    hasRequiredPermission = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    hasRequiredPermission = true;
  }

  if (!hasRequiredPermission) {
    return null;
  }

  return (
    <a
      href={to || href}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
};

export default PermissionGuard;
