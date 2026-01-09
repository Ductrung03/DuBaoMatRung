/**
 * Hook mới để quản lý feature-based permissions theo cấu trúc trang và chức năng
 */

import { useAuth } from '../dashboard/contexts/AuthContext';
import { usePermissionContext } from '../dashboard/contexts/PermissionContext';

export const useFeaturePermissionsNew = () => {
  const { isAdmin } = useAuth();
  const { accessiblePages, permissions, loading, error, refresh } = usePermissionContext();

  /**
   * Kiểm tra xem user có quyền truy cập trang không
   * @param {string} pageKey - Key của trang (vd: 'forecast', 'data_management')
   * @returns {boolean}
   */
  const hasPageAccess = (pageKey) => {
    if (isAdmin()) return true;

    // Priority 1: Check structured data
    if (Array.isArray(accessiblePages) && accessiblePages.some(page => page.key === pageKey)) return true;

    // Priority 2: Fallback to flat permissions list (fastest for initial load)
    return Array.isArray(permissions) && permissions.some(code => code.startsWith(`${pageKey}.`));
  };

  /**
   * Kiểm tra xem user có quyền trên một feature cụ thể không
   * @param {string} featureCode - Code của feature (vd: 'forecast.auto', 'data_management.verification')
   * @returns {boolean}
   */
  const hasFeatureAccess = (featureCode) => {
    if (isAdmin()) return true;

    // Check flat permissions list which is faster and populated from cache/token
    return Array.isArray(permissions) && permissions.includes(featureCode);
  };

  /**
   * Lấy danh sách features mà user có quyền trên một trang
   * @param {string} pageKey - Key của trang
   * @returns {Array} Array of feature objects
   */
  const getPageFeatures = (pageKey) => {
    if (isAdmin()) {
      return [];
    }

    // Priority 1: Check structured data
    if (Array.isArray(accessiblePages)) {
      const page = accessiblePages.find(p => p.key === pageKey);
      if (page) return page.features;
    }

    // Priority 2: Fallback to flat permissions list
    if (Array.isArray(permissions) && permissions.length > 0) {
      return permissions
        .filter(code => code.startsWith(`${pageKey}.`))
        .map(code => ({ code })); // Minimal object for compatibility
    }

    return [];
  };

  /**
   * Lấy danh sách tất cả pages mà user có quyền truy cập (dùng cho sidebar)
   * @returns {Array} Array of page objects
   */
  const getAccessiblePages = () => {
    return Array.isArray(accessiblePages) ? accessiblePages : [];
  };

  /**
   * Kiểm tra xem sidebar có nên hiển thị trang không
   * @param {string} pageKey - Key của trang
   * @returns {boolean}
   */
  const shouldShowInSidebar = (pageKey) => {
    return hasPageAccess(pageKey);
  };

  /**
   * Kiểm tra xem có nên hiển thị một chức năng trong trang không
   * @param {string} featureCode - Code của feature
   * @returns {boolean}
   */
  const shouldShowFeature = (featureCode) => {
    return hasFeatureAccess(featureCode);
  };

  /**
   * Lấy thông tin chi tiết của một trang
   * @param {string} pageKey - Key của trang
   * @returns {Object|null} Page object hoặc null nếu không có quyền
   */
  const getPageInfo = (pageKey) => {
    if (isAdmin()) return null; // Admin cần xử lý riêng

    return Array.isArray(accessiblePages) ? (accessiblePages.find(p => p.key === pageKey) || null) : null;
  };

  /**
   * Kiểm tra xem user có ít nhất một quyền trong danh sách không
   * @param {Array} featureCodes - Danh sách feature codes
   * @returns {boolean}
   */
  const hasAnyFeatureAccess = (featureCodes) => {
    if (isAdmin()) return true;

    return Array.isArray(featureCodes) && featureCodes.some(code => hasFeatureAccess(code));
  };

  /**
   * Kiểm tra xem user có tất cả quyền trong danh sách không
   * @param {Array} featureCodes - Danh sách feature codes
   * @returns {boolean}
   */
  const hasAllFeatureAccess = (featureCodes) => {
    if (isAdmin()) return true;

    return Array.isArray(featureCodes) && featureCodes.every(code => hasFeatureAccess(code));
  };

  /**
   * Lấy danh sách tất cả feature codes mà user có quyền
   * @returns {Array} Array of feature codes
   */
  const getAllAccessibleFeatures = () => {
    if (isAdmin()) return [];
    return Array.isArray(permissions) ? permissions : [];
  };


  return {
    accessiblePages,
    loading,
    error,
    hasPageAccess,
    hasFeatureAccess,
    getPageFeatures,
    getAccessiblePages,
    shouldShowInSidebar,
    shouldShowFeature,
    getPageInfo,
    hasAnyFeatureAccess,
    hasAllFeatureAccess,
    getAllAccessibleFeatures,
    isAdmin: isAdmin(),
    refresh
  };
};

export default useFeaturePermissionsNew;
