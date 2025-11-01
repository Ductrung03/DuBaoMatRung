/**
 * Hook để quản lý feature-based permissions
 * Sử dụng để kiểm tra quyền truy cập trang và chức năng
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../dashboard/contexts/AuthContext';
import axios from 'axios';

export const useFeaturePermissions = () => {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState([]);
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
      const response = await axios.get('/api/auth/permissions/my-access');

      if (response.data.success) {
        setAccessiblePages(response.data.data.pages);

        // Flatten all permissions from all pages
        const allPermissions = response.data.data.pages.flatMap(page =>
          page.features.map(feature => feature.code)
        );
        setPermissions(allPermissions);
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
    return permissions.includes(featureCode);
  };

  /**
   * Lấy danh sách features mà user có quyền trên một trang
   * @param {string} pageKey - Key của trang
   * @returns {Array} Array of feature objects
   */
  const getPageFeatures = (pageKey) => {
    if (isAdmin()) return [];

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

  return {
    permissions,
    accessiblePages,
    loading,
    error,
    hasPageAccess,
    hasFeatureAccess,
    getPageFeatures,
    getAccessiblePages,
    shouldShowInSidebar,
    isAdmin: isAdmin()
  };
};

export default useFeaturePermissions;
