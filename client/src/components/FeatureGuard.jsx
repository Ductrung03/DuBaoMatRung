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
  const { hasFeatureAccess, isAdmin, loading, permissions } = useFeaturePermissions();

  // Tối ưu: Nếu có permissions (từ cache/token) thì check luôn, không cần đợi loading
  // Nếu đang loading mà chưa có data thì mới return null
  /* 
  if (loading && permissions.length === 0) { 
     // Chỉ return null khi thực sự chưa load được gì và không có cache
     return null; 
  }
  */
  // Thực tế: PermissionContext đã handle việc init từ cache, nên khi loading=true có thể permissions đã có data.
  // Tuy nhiên để UX tốt nhất (instant show), ta check quyền luôn.
  // Nếu loading=true nhưng permissions=[], thì hasFeatureAccess sẽ false -> fallback -> ok.
  // Nhưng nếu đang thực sự fetching lần đầu, có thể user sẽ thấy fallback xong mới thấy content?
  // Tốt nhất là: Nếu admin -> show luôn. Nếu không -> check quyền.

  if (isAdmin) {
    return <>{children}</>;
  }

  // Nếu đang loading MÀ chưa có permission nào hết -> chờ (tránh flash "Không có quyền")
  // NHƯNG với fix ở Context, ta đã load từ token/cache nên permissions thường sẽ có ngay.
  if (loading && !hasFeatureAccess(featureCode) && permissions.length === 0) {
    return null;
  }

  // Kiểm tra quyền
  if (hasFeatureAccess(featureCode)) {
    return <>{children}</>;
  }

  // Không có quyền
  return fallback;
};

export default FeatureGuard;
