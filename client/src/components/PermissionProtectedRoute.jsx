import { useState, useEffect } from 'react';
import { useAuth } from '../dashboard/contexts/AuthContext';
import api from '../services/api';

const PermissionProtectedRoute = ({ children, requiredPermission, fallback = null }) => {
  const { user, isAdmin } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPermission();
  }, [user, requiredPermission]);

  const checkPermission = async () => {
    if (!user || !requiredPermission) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    // Admin có tất cả quyền
    if (isAdmin()) {
      setHasPermission(true);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/auth/permissions/check/${requiredPermission}`);
      setHasPermission(response.data.success && response.data.hasAccess);
    } catch (error) {
      console.error('Error checking permission:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
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
