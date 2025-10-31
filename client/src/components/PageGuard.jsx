/**
 * Component bảo vệ trang - Chỉ cho phép truy cập nếu user có ít nhất 1 feature trong trang
 */

import React from 'react';
import { useFeaturePermissions } from '../hooks/useFeaturePermissions';

/**
 * PageGuard Component
 *
 * @param {Object} props
 * @param {string} props.pageKey - Key của trang cần bảo vệ (vd: 'forecast', 'data_management')
 * @param {React.ReactNode} props.children - Nội dung trang
 * @param {React.ReactNode} props.fallback - Hiển thị khi không có quyền (optional)
 *
 * @example
 * <PageGuard pageKey="forecast">
 *   <DuBaoMatRungPage />
 * </PageGuard>
 */
const PageGuard = ({ pageKey, children, fallback = null }) => {
  const { hasPageAccess, isAdmin, loading } = useFeaturePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Admin có toàn quyền
  if (isAdmin) {
    return <>{children}</>;
  }

  // Kiểm tra quyền truy cập trang
  if (hasPageAccess(pageKey)) {
    return <>{children}</>;
  }

  // Không có quyền
  return (
    fallback || (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-500">
            Bạn không có quyền truy cập trang này.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Vui lòng liên hệ quản trị viên để được cấp quyền.
          </p>
        </div>
      </div>
    )
  );
};

export default PageGuard;
