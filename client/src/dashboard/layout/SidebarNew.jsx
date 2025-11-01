import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaChartLine, FaDatabase, FaFileAlt, FaSearch, 
  FaUsers, FaUserShield, FaChevronDown, FaChevronRight,
  FaHome, FaCog, FaSignOutAlt
} from 'react-icons/fa';
import { useFeaturePermissionsNew } from '../../hooks/useFeaturePermissionsNew';
import { useAuth } from '../contexts/AuthContext';

const SidebarNew = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { 
    hasPageAccess, 
    hasFeatureAccess, 
    getPageFeatures, 
    isAdmin, 
    loading 
  } = useFeaturePermissionsNew();
  
  const [expandedPages, setExpandedPages] = useState(new Set(['forecast', 'data_management']));

  // Cấu hình menu với icons và paths
  const menuConfig = {
    forecast: {
      name: 'Dự báo mất rừng',
      icon: FaChartLine,
      path: '/dashboard/dubao-matrung',
      features: [
        {
          code: 'forecast.auto',
          name: 'Dự báo tự động',
          path: '/dashboard/dubao-matrung/auto'
        },
        {
          code: 'forecast.custom',
          name: 'Dự báo tùy biến',
          path: '/dashboard/dubao-matrung/custom'
        }
      ]
    },
    data_management: {
      name: 'Quản lý dữ liệu',
      icon: FaDatabase,
      path: '/dashboard/quanly-dulieu',
      features: [
        {
          code: 'data_management.forecast_lookup',
          name: 'Tra cứu dự báo',
          path: '/dashboard/quanly-dulieu/forecast-lookup'
        },
        {
          code: 'data_management.satellite_lookup',
          name: 'Tra cứu ảnh vệ tinh',
          path: '/dashboard/quanly-dulieu/satellite-lookup'
        },
        {
          code: 'data_management.verification',
          name: 'Xác minh dự báo',
          path: '/dashboard/quanly-dulieu/verification'
        },
        {
          code: 'data_management.update',
          name: 'Cập nhật dữ liệu',
          path: '/dashboard/quanly-dulieu/update'
        }
      ]
    },
    reports: {
      name: 'Báo cáo',
      icon: FaFileAlt,
      path: '/dashboard/baocao',
      features: [
        {
          code: 'reports.view',
          name: 'Xem báo cáo',
          path: '/dashboard/baocao/view'
        },
        {
          code: 'reports.create',
          name: 'Tạo báo cáo',
          path: '/dashboard/baocao/create'
        },
        {
          code: 'reports.export',
          name: 'Xuất báo cáo',
          path: '/dashboard/baocao/export'
        }
      ]
    },
    detection: {
      name: 'Phát hiện mất rừng',
      icon: FaSearch,
      path: '/dashboard/phathien-matrung',
      features: [
        {
          code: 'detection.view',
          name: 'Xem phát hiện',
          path: '/dashboard/phathien-matrung/view'
        },
        {
          code: 'detection.analyze',
          name: 'Phân tích',
          path: '/dashboard/phathien-matrung/analyze'
        }
      ]
    },
    user_management: {
      name: 'Quản lý người dùng',
      icon: FaUsers,
      path: '/dashboard/quanly-nguoidung',
      features: [
        {
          code: 'user_management.view',
          name: 'Danh sách người dùng',
          path: '/dashboard/quanly-nguoidung'
        },
        {
          code: 'user_management.create',
          name: 'Thêm người dùng',
          path: '/dashboard/quanly-nguoidung/create'
        }
      ]
    },
    role_management: {
      name: 'Quản lý vai trò',
      icon: FaUserShield,
      path: '/dashboard/quanly-role',
      features: [
        {
          code: 'role_management.view',
          name: 'Danh sách vai trò',
          path: '/dashboard/quanly-role'
        },
        {
          code: 'role_management.assign_permissions',
          name: 'Phân quyền',
          path: '/dashboard/quanly-role/permissions'
        }
      ]
    }
  };

  const togglePageExpansion = (pageKey) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageKey)) {
      newExpanded.delete(pageKey);
    } else {
      newExpanded.add(pageKey);
    }
    setExpandedPages(newExpanded);
  };

  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getVisibleFeatures = (pageKey) => {
    if (isAdmin) {
      return menuConfig[pageKey]?.features || [];
    }
    
    const pageFeatures = getPageFeatures(pageKey);
    const configFeatures = menuConfig[pageKey]?.features || [];
    
    // Lọc features theo permissions
    return configFeatures.filter(configFeature => 
      pageFeatures.some(permFeature => permFeature.code === configFeature.code)
    );
  };

  if (loading) {
    return (
      <div className="w-64 bg-white shadow-lg h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white shadow-lg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="bg-green-100 rounded-lg p-2 mr-3">
            <FaChartLine className="text-green-600 text-xl" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dự báo mất rừng</h1>
            <p className="text-xs text-gray-500">Hệ thống quản lý</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FaHome className="mr-3" />
            Trang chủ
          </Link>

          {/* Dynamic Menu Items */}
          {Object.entries(menuConfig).map(([pageKey, pageConfig]) => {
            // Kiểm tra quyền truy cập trang
            if (!isAdmin && !hasPageAccess(pageKey)) {
              return null;
            }

            const IconComponent = pageConfig.icon;
            const isExpanded = expandedPages.has(pageKey);
            const visibleFeatures = getVisibleFeatures(pageKey);
            const hasVisibleFeatures = visibleFeatures.length > 0;
            const isPageActive = isActivePath(pageConfig.path);

            return (
              <div key={pageKey} className="space-y-1">
                {/* Page Header */}
                <div
                  className={`flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                    isPageActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => hasVisibleFeatures && togglePageExpansion(pageKey)}
                >
                  <div className="flex items-center">
                    <IconComponent className="mr-3" />
                    <span>{pageConfig.name}</span>
                  </div>
                  {hasVisibleFeatures && (
                    <div className="text-gray-400">
                      {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                    </div>
                  )}
                </div>

                {/* Features */}
                {hasVisibleFeatures && isExpanded && (
                  <div className="ml-6 space-y-1">
                    {visibleFeatures.map((feature) => (
                      <Link
                        key={feature.code}
                        to={feature.path}
                        className={`flex items-center px-4 py-2 text-sm rounded-lg transition-colors ${
                          isActivePath(feature.path)
                            ? 'bg-green-50 text-green-600 border-l-2 border-green-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                        }`}
                      >
                        <div className="w-2 h-2 bg-current rounded-full mr-3 opacity-50"></div>
                        {feature.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="bg-gray-100 rounded-full p-2 mr-3">
              <FaUsers className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.position || 'Người dùng'}</p>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link
            to="/dashboard/settings"
            className="flex-1 flex items-center justify-center px-3 py-2 text-xs text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FaCog className="mr-1" />
            Cài đặt
          </Link>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center px-3 py-2 text-xs text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
          >
            <FaSignOutAlt className="mr-1" />
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarNew;
