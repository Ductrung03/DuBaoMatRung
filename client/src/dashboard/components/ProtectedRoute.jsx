import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipLoader } from 'react-spinners';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <ClipLoader color="#027e02" size={50} />
        <p className="ml-2 text-lg text-forest-green-primary">Đang tải...</p>
      </div>
    );
  }

  if (!user) {
    // Lưu lại trang hiện tại để sau khi đăng nhập có thể quay lại
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;