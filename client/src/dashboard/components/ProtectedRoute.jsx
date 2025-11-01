// client/src/dashboard/components/ProtectedRoute.jsx - WITH RBAC SUPPORT
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';

const ProtectedRoute = ({
  children,
  adminOnly = false,
  requiredPermission = null // { action: 'read', subject: 'users' }
}) => {
  const { user, loading, isAdmin, hasPermission } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <ClipLoader color="#027e02" size={50} />
          <p className="ml-2 text-lg text-forest-green-primary mt-4">
            Đang kiểm tra quyền truy cập...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin permission if required
  if (adminOnly && !isAdmin()) {
    toast.error("Bạn không có quyền truy cập trang này. Yêu cầu quyền Admin.");
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission.action, requiredPermission.subject)) {
    toast.error(`Bạn không có quyền ${requiredPermission.action} ${requiredPermission.subject}`);
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;