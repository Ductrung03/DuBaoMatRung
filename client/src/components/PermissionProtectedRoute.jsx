import { useState, useEffect } from 'react';
import { useAuth } from '../dashboard/contexts/AuthContext';

const PermissionProtectedRoute = ({ children, requiredPermission, fallback = null }) => {
  const { user, isAdmin } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, [user, requiredPermission]);

  const checkPermission = () => {
    if (!user || !requiredPermission) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    // Admin có tất cả quyền
    if (isAdmin()) {
      console.log('✅ User is admin, granting access to:', requiredPermission);
      setHasPermission(true);
      setLoading(false);
      return;
    }

    // Kiểm tra permission trong JWT token (đã được decode trong user object)
    // JWT token có field "permissions" chứa array các permission codes
    const userPermissions = user.permissions || [];

    // Kiểm tra xem user có bất kỳ permission nào bắt đầu với prefix này không
    // Ví dụ: requiredPermission = "forecast" sẽ match với "forecast.auto", "forecast.custom", etc.
    const hasAccess = userPermissions.some(perm => perm.startsWith(requiredPermission + '.'));

    console.log(`🔍 Checking permission "${requiredPermission}":`, {
      userPermissions,
      hasAccess,
      isAdmin: isAdmin()
    });

    setHasPermission(hasAccess);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!hasPermission) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-500">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default PermissionProtectedRoute;
