/**
 * Component bảo vệ feature - Chỉ render children nếu user có quyền
 * Sử dụng để ẩn/hiện các chức năng trong trang theo permissions
 */

import React from 'react';
import { useFeaturePermissions } from '../hooks/useFeaturePermissions';

/**
 * FeatureGuard Component
 *
 * @param {Object} props
 * @param {string} props.featureCode - Code của feature cần kiểm tra (vd: 'forecast.auto')
 * @param {React.ReactNode} props.children - Nội dung sẽ được render nếu có quyền
 * @param {React.ReactNode} props.fallback - Nội dung hiển thị nếu không có quyền (optional)
 *
 * @example
 * <FeatureGuard featureCode="forecast.auto">
 *   <button>Dự báo tự động</button>
 * </FeatureGuard>
 *
 * @example
 * <FeatureGuard
 *   featureCode="data_management.verification"
 *   fallback={<div>Bạn không có quyền xác minh</div>}
 * >
 *   <VerificationPanel />
 * </FeatureGuard>
 */
const FeatureGuard = ({ featureCode, children, fallback = null }) => {
  const { hasFeatureAccess, isAdmin, loading } = useFeaturePermissions();

  // Trong lúc loading, không hiển thị gì
  if (loading) {
    return null;
  }

  // Admin có tất cả quyền
  if (isAdmin) {
    return <>{children}</>;
  }

  // Kiểm tra quyền
  if (hasFeatureAccess(featureCode)) {
    return <>{children}</>;
  }

  // Không có quyền
  return fallback;
};

export default FeatureGuard;
