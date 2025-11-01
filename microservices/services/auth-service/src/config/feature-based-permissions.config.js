/**
 * =====================================================
 * HỆ THỐNG PHÂN QUYỀN THEO TRANG VÀ CHỨC NĂNG
 * =====================================================
 *
 * Cấu trúc: Pages → Features
 * - Mỗi page là một trang trong ứng dụng
 * - Mỗi feature là một chức năng cụ thể trong trang đó
 * - Permission code format: {page_key}.{feature_key}
 *
 * Nguyên tắc:
 * - Nếu user có quyền trên một feature → Hiển thị feature đó trong UI
 * - Nếu user không có quyền → Ẩn hoàn toàn feature đó
 * - Sidebar chỉ hiển thị các trang mà user có ít nhất 1 feature
 */

const FEATURE_PERMISSIONS = {
  // ============================================
  // 1. TRANG DỰ BÁO MẤT RỪNG
  // ============================================
  forecast: {
    name: 'Dự báo mất rừng',
    description: 'Trang dự báo mất rừng với các chức năng tự động và tùy biến',
    icon: 'FaChartLine',
    path: '/dashboard/dubaomatrung',
    color: '#10B981',
    features: {
      auto: {
        code: 'forecast.auto',
        name: 'Dự báo mất rừng tự động',
        description: 'Sử dụng AI/ML để dự báo tự động các khu vực có nguy cơ mất rừng',
        ui_element: 'Tab "Dự báo tự động", Form nhập tham số, Nút "Chạy dự báo", Kết quả dự báo',
        module: 'forecast',
        resource: 'auto',
        action: 'execute'
      },
      custom: {
        code: 'forecast.custom',
        name: 'Dự báo mất rừng tùy biến',
        description: 'Tùy chỉnh các tham số để dự báo theo nhu cầu cụ thể',
        ui_element: 'Tab "Dự báo tùy biến", Form cấu hình nâng cao, Nút "Tạo dự báo", Xuất báo cáo',
        module: 'forecast',
        resource: 'custom',
        action: 'execute'
      }
    }
  },

  // ============================================
  // 2. TRANG QUẢN LÝ DỮ LIỆU
  // ============================================
  data_management: {
    name: 'Quản lý dữ liệu',
    description: 'Quản lý và tra cứu các loại dữ liệu trong hệ thống',
    icon: 'FaDatabase',
    path: '/dashboard/quanlydulieu',
    color: '#3B82F6',
    features: {
      forecast_search: {
        code: 'data_management.forecast_search',
        name: 'Tra cứu dữ liệu dự báo mất rừng',
        description: 'Tra cứu, xem và tải xuống dữ liệu dự báo mất rừng',
        ui_element: 'Tab "Tra cứu dữ liệu dự báo mất rừng", Form tìm kiếm, Bảng kết quả, Nút xuất Excel/PDF',
        module: 'data_management',
        resource: 'forecast',
        action: 'search'
      },
      satellite_search: {
        code: 'data_management.satellite_search',
        name: 'Tra cứu dữ liệu ảnh vệ tinh',
        description: 'Tra cứu và xem ảnh vệ tinh theo khu vực và thời gian',
        ui_element: 'Tab "Tra cứu dữ liệu ảnh vệ tinh", Form tìm kiếm, Gallery ảnh, Nút tải xuống',
        module: 'data_management',
        resource: 'satellite',
        action: 'search'
      },
      verification: {
        code: 'data_management.verification',
        name: 'Xác minh dự báo mất rừng',
        description: 'Xác minh độ chính xác của các dự báo mất rừng',
        ui_element: 'Tab "Xác minh dự báo mất rừng", Danh sách dự báo cần xác minh, Nút phê duyệt/từ chối, Form ghi chú',
        module: 'data_management',
        resource: 'verification',
        action: 'verify'
      },
      data_update: {
        code: 'data_management.data_update',
        name: 'Cập nhật dữ liệu',
        description: 'Cập nhật và đồng bộ dữ liệu mới nhất cho hệ thống',
        ui_element: 'Tab "Cập nhật dữ liệu", Nút "Đồng bộ dữ liệu", Progress bar, Log cập nhật',
        module: 'data_management',
        resource: 'data',
        action: 'update'
      }
    }
  },

  // ============================================
  // 3. TRANG BÁO CÁO
  // ============================================
  reports: {
    name: 'Báo cáo',
    description: 'Trang báo cáo thống kê mất rừng',
    icon: 'FaFileAlt',
    path: '/dashboard/baocao',
    color: '#8B5CF6',
    features: {
      view: {
        code: 'reports.view',
        name: 'Xem báo cáo',
        description: 'Xem các báo cáo thống kê mất rừng đã có',
        ui_element: 'Danh sách báo cáo, Xem chi tiết báo cáo, Biểu đồ thống kê',
        module: 'reports',
        resource: 'reports',
        action: 'view'
      }
    }
  },

  // ============================================
  // 4. TRANG PHÁT HIỆN MẤT RỪNG
  // ============================================
  detection: {
    name: 'Phát hiện mất rừng',
    description: 'Trang phát hiện mất rừng',
    icon: 'FaExclamationTriangle',
    path: '/dashboard/phathienmatrung',
    color: '#EF4444',
    features: {
      view: {
        code: 'detection.view',
        name: 'Xem phát hiện mất rừng',
        description: 'Xem các khu vực được phát hiện mất rừng',
        ui_element: 'Bản đồ phát hiện, Danh sách khu vực mất rừng, Import shapefile',
        module: 'detection',
        resource: 'detection',
        action: 'view'
      }
    }
  },

  // ============================================
  // 5. TRANG QUẢN LÝ NGƯỜI DÙNG
  // ============================================
  user_management: {
    name: 'Quản lý người dùng',
    description: 'Trang quản lý người dùng',
    icon: 'FaUsers',
    path: '/dashboard/quanlynguoidung',
    color: '#F59E0B',
    features: {
      view: {
        code: 'user_management.view',
        name: 'Xem danh sách người dùng',
        description: 'Xem danh sách tất cả người dùng trong hệ thống',
        ui_element: 'Bảng danh sách người dùng, Form tìm kiếm, Thông tin chi tiết user',
        module: 'user_management',
        resource: 'user',
        action: 'view'
      }
    }
  },

  // ============================================
  // 6. TRANG QUẢN LÝ ROLE
  // ============================================
  role_management: {
    name: 'Quản lý vai trò',
    description: 'Trang quản lý vai trò và phân quyền',
    icon: 'FaUserShield',
    path: '/dashboard/quanlyrole',
    color: '#EC4899',
    features: {
      view: {
        code: 'role_management.view',
        name: 'Xem danh sách vai trò',
        description: 'Xem danh sách các vai trò và phân quyền trong hệ thống',
        ui_element: 'Bảng danh sách role, Form phân quyền, Checkbox permissions theo trang và chức năng',
        module: 'role_management',
        resource: 'role',
        action: 'view'
      }
    }
  }
};

/**
 * Flatten permissions to flat array for database seeding
 * @returns {Array} Array of permission objects
 */
function flattenFeaturePermissions() {
  const result = [];
  let order = 1;

  Object.entries(FEATURE_PERMISSIONS).forEach(([pageKey, pageData]) => {
    Object.entries(pageData.features).forEach(([featureKey, feature]) => {
      result.push({
        code: feature.code,
        name: feature.name,
        description: feature.description,
        module: feature.module,
        resource: feature.resource,
        action: feature.action,
        ui_path: pageData.path,
        ui_element: feature.ui_element,
        ui_category: pageData.name,
        icon: pageData.icon,
        order: order++,
        page_key: pageKey,
        feature_key: featureKey
      });
    });
  });

  return result;
}

/**
 * Get permissions tree for UI display (grouped by pages)
 * @returns {Object} Tree structure of permissions
 */
function getFeaturePermissionsTree() {
  return FEATURE_PERMISSIONS;
}

/**
 * Get all page keys
 * @returns {Array} Array of page keys
 */
function getPageKeys() {
  return Object.keys(FEATURE_PERMISSIONS);
}

/**
 * Get features for a specific page
 * @param {string} pageKey - Page key
 * @returns {Object|null} Features object or null
 */
function getPageFeatures(pageKey) {
  return FEATURE_PERMISSIONS[pageKey]?.features || null;
}

/**
 * Get permission codes for a page (all features)
 * @param {string} pageKey - Page key
 * @returns {Array} Array of permission codes
 */
function getPagePermissionCodes(pageKey) {
  const page = FEATURE_PERMISSIONS[pageKey];
  if (!page) return [];

  return Object.values(page.features).map(feature => feature.code);
}

/**
 * Check if user has access to a page (has at least 1 feature permission)
 * @param {string} pageKey - Page key
 * @param {Array} userPermissions - User's permission codes
 * @returns {boolean} True if user has access
 */
function hasPageAccess(pageKey, userPermissions) {
  const pageCodes = getPagePermissionCodes(pageKey);
  return pageCodes.some(code => userPermissions.includes(code));
}

/**
 * Get user's accessible pages
 * @param {Array} userPermissions - User's permission codes
 * @returns {Array} Array of page objects that user can access
 */
function getUserAccessiblePages(userPermissions) {
  return Object.entries(FEATURE_PERMISSIONS)
    .filter(([pageKey]) => hasPageAccess(pageKey, userPermissions))
    .map(([pageKey, pageData]) => ({
      key: pageKey,
      name: pageData.name,
      path: pageData.path,
      icon: pageData.icon,
      color: pageData.color
    }));
}

/**
 * Get user's accessible features for a specific page
 * @param {string} pageKey - Page key
 * @param {Array} userPermissions - User's permission codes
 * @returns {Array} Array of feature objects that user can access
 */
function getUserAccessibleFeatures(pageKey, userPermissions) {
  const page = FEATURE_PERMISSIONS[pageKey];
  if (!page) return [];

  return Object.entries(page.features)
    .filter(([, feature]) => userPermissions.includes(feature.code))
    .map(([featureKey, feature]) => ({
      key: featureKey,
      code: feature.code,
      name: feature.name,
      description: feature.description,
      ui_element: feature.ui_element
    }));
}

module.exports = {
  FEATURE_PERMISSIONS,
  flattenFeaturePermissions,
  getFeaturePermissionsTree,
  getPageKeys,
  getPageFeatures,
  getPagePermissionCodes,
  hasPageAccess,
  getUserAccessiblePages,
  getUserAccessibleFeatures
};
