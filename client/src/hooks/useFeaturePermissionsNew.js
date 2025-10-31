/**
 * Hook mới để quản lý feature-based permissions theo cấu trúc trang và chức năng
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../dashboard/contexts/AuthContext';
import axios from 'axios';

export const useFeaturePermissionsNew = () => {
  const { user, isAdmin } = useAuth();
  const [accessiblePages, setAccessiblePages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserAccess();
  }, [user]);

  const fetchUserAccess = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Admin có toàn quyền
    if (isAdmin()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/auth/page-permissions/my-access');

      if (response.data.success) {
        setAccessiblePages(response.data.data.pages);
      }
    } catch (err) {
      console.error('Error fetching user access:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kiểm tra xem user có quyền truy cập trang không
   * @param {string} pageKey - Key của trang (vd: 'forecast', 'data_management')
   * @returns {boolean}
   */
  const hasPageAccess = (pageKey) => {
    if (isAdmin()) return true;
    return accessiblePages.some(page => page.key === pageKey);
  };

  /**
   * Kiểm tra xem user có quyền trên một feature cụ thể không
   * @param {string} featureCode - Code của feature (vd: 'forecast.auto', 'data_management.verification')
   * @returns {boolean}
   */
  const hasFeatureAccess = (featureCode) => {
    if (isAdmin()) return true;
    
    // Tìm trong tất cả các trang và features
    return accessiblePages.some(page => 
      page.features.some(feature => feature.code === featureCode)
    );
  };

  /**
   * Lấy danh sách features mà user có quyền trên một trang
   * @param {string} pageKey - Key của trang
   * @returns {Array} Array of feature objects
   */
  const getPageFeatures = (pageKey) => {
    if (isAdmin()) {
      // Admin có tất cả features, cần lấy từ API hoặc config
      return [];
    }

    const page = accessiblePages.find(p => p.key === pageKey);
    return page ? page.features : [];
  };

  /**
   * Lấy danh sách tất cả pages mà user có quyền truy cập (dùng cho sidebar)
   * @returns {Array} Array of page objects
   */
  const getAccessiblePages = () => {
    return accessiblePages;
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
    
    return accessiblePages.find(p => p.key === pageKey) || null;
  };

  /**
   * Kiểm tra xem user có ít nhất một quyền trong danh sách không
   * @param {Array} featureCodes - Danh sách feature codes
   * @returns {boolean}
   */
  const hasAnyFeatureAccess = (featureCodes) => {
    if (isAdmin()) return true;
    
    return featureCodes.some(code => hasFeatureAccess(code));
  };

  /**
   * Kiểm tra xem user có tất cả quyền trong danh sách không
   * @param {Array} featureCodes - Danh sách feature codes
   * @returns {boolean}
   */
  const hasAllFeatureAccess = (featureCodes) => {
    if (isAdmin()) return true;
    
    return featureCodes.every(code => hasFeatureAccess(code));
  };

  /**
   * Lấy danh sách tất cả feature codes mà user có quyền
   * @returns {Array} Array of feature codes
   */
  const getAllAccessibleFeatures = () => {
    if (isAdmin()) return []; // Admin cần xử lý riêng
    
    const allFeatures = [];
    accessiblePages.forEach(page => {
      page.features.forEach(feature => {
        allFeatures.push(feature.code);
      });
    });
    return allFeatures;
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
    // Refresh function để reload permissions
    refresh: fetchUserAccess
  };
};

export default useFeaturePermissionsNew;
