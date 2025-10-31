import React from 'react';
import { useFeaturePermissionsNew } from '../hooks/useFeaturePermissionsNew';
import { FaLock, FaExclamationTriangle } from 'react-icons/fa';

/**
 * Component để bảo vệ trang theo permissions
 */
export const PageGuardNew = ({ pageKey, children, fallback = null }) => {
  const { hasPageAccess, isAdmin, loading } = useFeaturePermissionsNew();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAdmin && !hasPageAccess(pageKey)) {
    return fallback || (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="bg-red-100 rounded-full p-4 mb-4">
          <FaLock className="text-red-600 text-2xl" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có quyền truy cập</h3>
        <p className="text-gray-600">Bạn không có quyền truy cập trang này.</p>
        <p className="text-sm text-gray-500 mt-2">Liên hệ quản trị viên để được cấp quyền.</p>
      </div>
    );
  }

  return children;
};

/**
 * Component để bảo vệ chức năng theo permissions
 */
export const FeatureGuardNew = ({ 
  featureCode, 
  children, 
  fallback = null, 
  showMessage = true,
  className = ""
}) => {
  const { hasFeatureAccess, isAdmin, loading } = useFeaturePermissionsNew();

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAdmin && !hasFeatureAccess(featureCode)) {
    if (!showMessage) {
      return fallback;
    }

    return fallback || (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <FaExclamationTriangle className="text-yellow-600 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Chức năng bị hạn chế</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Bạn không có quyền sử dụng chức năng này.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

/**
 * Component để ẩn/hiện element theo permissions
 */
export const ConditionalRenderNew = ({ 
  featureCode, 
  pageKey, 
  children, 
  requireAll = false 
}) => {
  const { hasFeatureAccess, hasPageAccess, isAdmin } = useFeaturePermissionsNew();

  if (isAdmin) {
    return children;
  }

  let hasAccess = false;

  if (featureCode && pageKey) {
    // Cần cả 2 quyền
    if (requireAll) {
      hasAccess = hasPageAccess(pageKey) && hasFeatureAccess(featureCode);
    } else {
      // Chỉ cần 1 trong 2
      hasAccess = hasPageAccess(pageKey) || hasFeatureAccess(featureCode);
    }
  } else if (featureCode) {
    hasAccess = hasFeatureAccess(featureCode);
  } else if (pageKey) {
    hasAccess = hasPageAccess(pageKey);
  }

  return hasAccess ? children : null;
};

/**
 * Hook để kiểm tra permissions trong component
 */
export const usePermissionCheck = () => {
  const { 
    hasPageAccess, 
    hasFeatureAccess, 
    hasAnyFeatureAccess,
    hasAllFeatureAccess,
    isAdmin 
  } = useFeaturePermissionsNew();

  /**
   * Kiểm tra quyền với nhiều điều kiện
   */
  const checkPermission = (conditions) => {
    if (isAdmin) return true;

    const {
      pageKey,
      featureCode,
      featureCodes,
      requireAll = false
    } = conditions;

    if (featureCodes) {
      return requireAll 
        ? hasAllFeatureAccess(featureCodes)
        : hasAnyFeatureAccess(featureCodes);
    }

    if (featureCode && pageKey) {
      return requireAll
        ? hasPageAccess(pageKey) && hasFeatureAccess(featureCode)
        : hasPageAccess(pageKey) || hasFeatureAccess(featureCode);
    }

    if (featureCode) {
      return hasFeatureAccess(featureCode);
    }

    if (pageKey) {
      return hasPageAccess(pageKey);
    }

    return false;
  };

  return {
    checkPermission,
    hasPageAccess,
    hasFeatureAccess,
    hasAnyFeatureAccess,
    hasAllFeatureAccess,
    isAdmin
  };
};

/**
 * HOC để bảo vệ component
 */
export const withPermissionNew = (WrappedComponent, permissionConfig) => {
  return function PermissionWrappedComponent(props) {
    const { checkPermission } = usePermissionCheck();

    if (!checkPermission(permissionConfig)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="bg-red-100 rounded-full p-4 mb-4">
            <FaLock className="text-red-600 text-2xl" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Không có quyền truy cập</h3>
          <p className="text-gray-600">Bạn không có quyền sử dụng chức năng này.</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default {
  PageGuardNew,
  FeatureGuardNew,
  ConditionalRenderNew,
  usePermissionCheck,
  withPermissionNew
};
