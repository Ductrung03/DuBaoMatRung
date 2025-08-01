// client/src/dashboard/components/ProtectedRoute.jsx - IMPROVED ERROR HANDLING
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ClipLoader } from 'react-spinners';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useAuth();
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
    console.log("🔒 No user found, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check admin permission if required
  if (adminOnly && !isAdmin()) {
    console.log("🚫 User is not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("✅ User authenticated, rendering protected content");
  return children;
};

export default ProtectedRoute;