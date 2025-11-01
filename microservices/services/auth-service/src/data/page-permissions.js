/**
 * Cấu trúc phân quyền theo trang và chức năng
 * Mỗi trang có các chức năng con, người dùng chỉ thấy những gì được phân quyền
 */

const PAGE_PERMISSIONS = {
  // Trang Dự báo mất rừng
  forecast: {
    name: 'Dự báo mất rừng',
    key: 'forecast',
    icon: 'FaChartLine',
    path: '/dashboard/dubao-matrung',
    features: [
      {
        code: 'forecast.auto',
        name: 'Dự báo mất rừng tự động',
        description: 'Xem và sử dụng tính năng dự báo tự động',
        path: '/dashboard/dubao-matrung/auto'
      },
      {
        code: 'forecast.custom',
        name: 'Dự báo mất rừng tùy biến',
        description: 'Tạo và chỉnh sửa dự báo tùy biến',
        path: '/dashboard/dubao-matrung/custom'
      }
    ]
  },

  // Trang Quản lý dữ liệu
  data_management: {
    name: 'Quản lý dữ liệu',
    key: 'data_management',
    icon: 'FaDatabase',
    path: '/dashboard/quanly-dulieu',
    features: [
      {
        code: 'data_management.forecast_lookup',
        name: 'Tra cứu dữ liệu dự báo mất rừng',
        description: 'Tra cứu và xem dữ liệu dự báo',
        path: '/dashboard/quanly-dulieu/forecast-lookup'
      },
      {
        code: 'data_management.satellite_lookup',
        name: 'Tra cứu dữ liệu ảnh vệ tinh',
        description: 'Tra cứu và xem ảnh vệ tinh',
        path: '/dashboard/quanly-dulieu/satellite-lookup'
      },
      {
        code: 'data_management.verification',
        name: 'Xác minh dự báo mất rừng',
        description: 'Xác minh và đánh giá độ chính xác dự báo',
        path: '/dashboard/quanly-dulieu/verification'
      },
      {
        code: 'data_management.update',
        name: 'Cập nhật dữ liệu',
        description: 'Cập nhật và chỉnh sửa dữ liệu hệ thống',
        path: '/dashboard/quanly-dulieu/update'
      }
    ]
  },

  // Trang báo cáo
  reports: {
    name: 'Báo cáo',
    key: 'reports',
    icon: 'FaFileAlt',
    path: '/dashboard/baocao',
    features: [
      {
        code: 'reports.view',
        name: 'Xem báo cáo',
        description: 'Xem các báo cáo thống kê',
        path: '/dashboard/baocao/view'
      },
      {
        code: 'reports.create',
        name: 'Tạo báo cáo',
        description: 'Tạo báo cáo mới',
        path: '/dashboard/baocao/create'
      },
      {
        code: 'reports.export',
        name: 'Xuất báo cáo',
        description: 'Xuất báo cáo ra file',
        path: '/dashboard/baocao/export'
      }
    ]
  },

  // Trang phát hiện mất rừng
  detection: {
    name: 'Phát hiện mất rừng',
    key: 'detection',
    icon: 'FaSearch',
    path: '/dashboard/phathien-matrung',
    features: [
      {
        code: 'detection.view',
        name: 'Xem phát hiện mất rừng',
        description: 'Xem kết quả phát hiện mất rừng',
        path: '/dashboard/phathien-matrung/view'
      },
      {
        code: 'detection.analyze',
        name: 'Phân tích phát hiện',
        description: 'Phân tích chi tiết các vùng mất rừng',
        path: '/dashboard/phathien-matrung/analyze'
      }
    ]
  },

  // Trang quản lý người dùng
  user_management: {
    name: 'Quản lý người dùng',
    key: 'user_management',
    icon: 'FaUsers',
    path: '/dashboard/quanly-nguoidung',
    features: [
      {
        code: 'user_management.view',
        name: 'Xem danh sách người dùng',
        description: 'Xem thông tin người dùng',
        path: '/dashboard/quanly-nguoidung/view'
      },
      {
        code: 'user_management.create',
        name: 'Tạo người dùng',
        description: 'Tạo tài khoản người dùng mới',
        path: '/dashboard/quanly-nguoidung/create'
      },
      {
        code: 'user_management.edit',
        name: 'Chỉnh sửa người dùng',
        description: 'Chỉnh sửa thông tin người dùng',
        path: '/dashboard/quanly-nguoidung/edit'
      },
      {
        code: 'user_management.delete',
        name: 'Xóa người dùng',
        description: 'Xóa tài khoản người dùng',
        path: '/dashboard/quanly-nguoidung/delete'
      }
    ]
  },

  // Trang quản lý role
  role_management: {
    name: 'Quản lý vai trò',
    key: 'role_management',
    icon: 'FaUserShield',
    path: '/dashboard/quanly-role',
    features: [
      {
        code: 'role_management.view',
        name: 'Xem danh sách vai trò',
        description: 'Xem thông tin vai trò',
        path: '/dashboard/quanly-role/view'
      },
      {
        code: 'role_management.create',
        name: 'Tạo vai trò',
        description: 'Tạo vai trò mới',
        path: '/dashboard/quanly-role/create'
      },
      {
        code: 'role_management.edit',
        name: 'Chỉnh sửa vai trò',
        description: 'Chỉnh sửa thông tin vai trò',
        path: '/dashboard/quanly-role/edit'
      },
      {
        code: 'role_management.assign_permissions',
        name: 'Phân quyền vai trò',
        description: 'Phân quyền cho vai trò',
        path: '/dashboard/quanly-role/permissions'
      }
    ]
  }
};

/**
 * Lấy tất cả permissions dạng flat array để insert vào database
 */
const getAllPermissions = () => {
  const permissions = [];
  
  Object.values(PAGE_PERMISSIONS).forEach(page => {
    // Thêm permission cho trang
    permissions.push({
      code: `page.${page.key}`,
      name: `Truy cập ${page.name}`,
      description: `Quyền truy cập trang ${page.name}`,
      module: 'page',
      resource: page.key,
      action: 'access',
      ui_path: page.path,
      ui_category: 'page',
      ui_element: 'navigation',
      icon: page.icon,
      order: permissions.length
    });

    // Thêm permissions cho các features
    page.features.forEach(feature => {
      permissions.push({
        code: feature.code,
        name: feature.name,
        description: feature.description,
        module: page.key,
        resource: feature.code.split('.')[1],
        action: 'access',
        ui_path: feature.path,
        ui_category: 'feature',
        ui_element: 'function',
        order: permissions.length
      });
    });
  });

  return permissions;
};

/**
 * Lấy cấu trúc trang để sử dụng trong frontend
 */
const getPageStructure = () => {
  return PAGE_PERMISSIONS;
};

/**
 * Kiểm tra xem một permission code có hợp lệ không
 */
const isValidPermissionCode = (code) => {
  const allPermissions = getAllPermissions();
  return allPermissions.some(p => p.code === code);
};

module.exports = {
  PAGE_PERMISSIONS,
  getAllPermissions,
  getPageStructure,
  isValidPermissionCode
};
