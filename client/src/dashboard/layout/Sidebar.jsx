import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import DuBaoMatRungTuDong from "../components/sidebars/dubaomatrung/DuBaoMatRungTuDong";
import DuBaoMatRungTuyBien from "../components/sidebars/dubaomatrung/DuBaoMatRungTuyBien";
import CapNhatDuLieu from "../components/sidebars/quanlydulieu/CapNhatDuLieu";
import TraCuuAnhVeTinh from "../components/sidebars/quanlydulieu/TraCuuAnhVeTinh";
import TraCuuDuLieuDuBaoMatRung from "../components/sidebars/quanlydulieu/TraCuuDuLieuDuBaoMatRung";
import XacMinhDuBaoMatRung from "../components/sidebars/quanlydulieu/XacMinhDuBaoMatRung";
import Dashboard from "../components/sidebars/Dashboard";
import BaoCaoDuBaoMatRung from "../components/sidebars/baocao/BaoCaoDuBaoMatRung";
import ImportShapefile from "../components/sidebars/phathienmatrung/ImportShapefile";
import FeatureGuard from "../../components/FeatureGuard";
import { useIsMobile, useIsMobileOrTablet } from "../../hooks/useMediaQuery";
import { useAuth } from "../contexts/AuthContext";
import { FaHome, FaChartLine, FaDatabase, FaFileAlt, FaSatellite, FaUsers, FaUserShield, FaChevronDown, FaChevronRight } from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [, setGeoData] = useState(null);
  const isMobile = useIsMobile();
  const isMobileOrTablet = useIsMobileOrTablet();
  const [activeTab, setActiveTab] = useState(0);
  const [showNavigation, setShowNavigation] = useState(true);
  const { user, isAdmin } = useAuth();

  const pathAfterDashboard = currentPath.replace("/dashboard", "").replace(/^\//, "");
  // Lấy phần đầu tiên của path để xác định module (ví dụ: quanlydulieu/abc -> quanlydulieu)
  const rootPath = pathAfterDashboard.split('/')[0];

  // Kiểm tra quyền truy cập page
  const hasPagePermission = (pageKey) => {
    if (isAdmin()) return true;
    if (!user || !user.permissions) return false;
    const pagePermissionPrefixes = {
      'forecast': 'forecast.',
      'data_management': 'data_management.',
      'reports': 'reports.',
      'detection': 'detection.',
      'user_management': 'user_management.',
      'role_management': 'role_management.'
    };
    const prefix = pagePermissionPrefixes[pageKey];
    if (!prefix) return false;
    return user.permissions.some(p => p.startsWith(prefix));
  };

  // Navigation config cho mobile
  const navigationItems = [
    { path: '/dashboard', label: 'Trang chủ', icon: FaHome, pageKey: null },
    { path: '/dashboard/dubaomatrung', label: 'Giám sát mất rừng', icon: FaChartLine, pageKey: 'forecast' },
    { path: '/dashboard/quanlydulieu', label: 'Tra cứu dữ liệu', icon: FaDatabase, pageKey: 'data_management' },
    { path: '/dashboard/baocao', label: 'Báo cáo', icon: FaFileAlt, pageKey: 'reports' },
    { path: '/dashboard/phathienmatrung', label: 'Xử lý ảnh viễn thám', icon: FaSatellite, pageKey: 'detection' },
    { path: '/dashboard/quanlynguoidung', label: 'Quản lý người dùng', icon: FaUsers, pageKey: 'user_management' },
    { path: '/dashboard/quanlyrole', label: 'Quản lý phân quyền', icon: FaUserShield, pageKey: 'role_management' },
  ];

  // Filter navigation items based on permissions
  const visibleNavigationItems = navigationItems.filter(item =>
    item.pageKey === null || hasPagePermission(item.pageKey)
  );

  // Logic để ánh xạ đường dẫn với component - ĐÃ ĐƯỢC BẢO VỆ BỞI FEATURE PERMISSIONS
  const getComponentByPath = () => {
    switch (rootPath) {
      case "dubaomatrung":
        return [
          <FeatureGuard key="tuDong" featureCode="forecast.auto">
            <DuBaoMatRungTuDong />
          </FeatureGuard>,
          <FeatureGuard key="tuyBien" featureCode="forecast.custom">
            <DuBaoMatRungTuyBien />
          </FeatureGuard>
        ];
      case "quanlydulieu":
        return [
          <FeatureGuard key="traCuu" featureCode="data_management.forecast_search">
            <TraCuuDuLieuDuBaoMatRung />
          </FeatureGuard>,
          <FeatureGuard key="anhVeTinh" featureCode="data_management.satellite_search">
            <TraCuuAnhVeTinh />
          </FeatureGuard>,
          <FeatureGuard key="xacMinh" featureCode="data_management.verification">
            <XacMinhDuBaoMatRung />
          </FeatureGuard>,
          <FeatureGuard key="capNhat" featureCode="data_management.data_update">
            <CapNhatDuLieu onGeoDataLoaded={setGeoData} />
          </FeatureGuard>
        ];
      case "baocao":
        // Trang báo cáo không cần FeatureGuard ở sidebar vì toàn trang đã được bảo vệ bởi PermissionProtectedRoute
        return [<BaoCaoDuBaoMatRung key="baoCao" />];
      case "phathienmatrung":
        // Trang phát hiện không cần FeatureGuard ở sidebar vì toàn trang đã được bảo vệ bởi PermissionProtectedRoute
        return [<ImportShapefile key="importShapefile" />];
      case "":
      default:
        return <Dashboard key="dashboard" />;
    }
  };

  // Special mobile layout for QuanLyDuLieu page
  if (rootPath === "quanlydulieu" && isMobile) {
    return (
      <div className="p-3 flex flex-col h-full overflow-y-auto">
        {/* Mobile Navigation Menu - Same as other pages */}
        <div className="mb-4">
          <button
            onClick={() => setShowNavigation(!showNavigation)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-forest-green-primary to-forest-green-secondary text-white rounded-lg shadow-md mb-3"
          >
            <span className="font-semibold text-sm">📌 Điều hướng trang</span>
            {showNavigation ? (
              <FaChevronDown className="w-4 h-4" />
            ) : (
              <FaChevronRight className="w-4 h-4" />
            )}
          </button>

          {showNavigation && (
            <nav className="space-y-1 bg-gray-50 rounded-lg p-2 border border-gray-200 mb-3">
              {visibleNavigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPath === item.path ||
                  (item.path !== '/dashboard' && currentPath.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                        ? 'bg-forest-green-primary text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-forest-green-primary'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="border-t border-gray-300 my-3"></div>
          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
            📋 Chức năng trang hiện tại
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-2 gap-2 mb-4 sticky top-0 bg-white pb-2 z-10">
          <button
            onClick={() => setActiveTab(0)}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${activeTab === 0
              ? 'bg-forest-green-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            🔍 Tra cứu
          </button>
          <button
            onClick={() => setActiveTab(1)}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${activeTab === 1
              ? 'bg-forest-green-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            🛰️ Ảnh vệ tinh
          </button>
          <button
            onClick={() => setActiveTab(2)}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${activeTab === 2
              ? 'bg-forest-green-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            ✅ Xác minh
          </button>
          <button
            onClick={() => setActiveTab(3)}
            className={`py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${activeTab === 3
              ? 'bg-forest-green-primary text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            📊 Cập nhật
          </button>
        </div>

        {/* Tab Content - Show only active tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 0 && (
            <FeatureGuard featureCode="data_management.forecast_search">
              <TraCuuDuLieuDuBaoMatRung />
            </FeatureGuard>
          )}
          {activeTab === 1 && (
            <FeatureGuard featureCode="data_management.satellite_search">
              <TraCuuAnhVeTinh />
            </FeatureGuard>
          )}
          {activeTab === 2 && (
            <FeatureGuard featureCode="data_management.verification">
              <XacMinhDuBaoMatRung />
            </FeatureGuard>
          )}
          {activeTab === 3 && (
            <FeatureGuard featureCode="data_management.data_update">
              <CapNhatDuLieu onGeoDataLoaded={setGeoData} />
            </FeatureGuard>
          )}
        </div>
      </div>
    );
  }

  // Desktop: Original vertical stack for all pages
  // Mobile/Tablet: Show navigation links first, then page-specific content
  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
      {/* Mobile Navigation Menu - Only show on mobile/tablet */}
      {isMobileOrTablet && (
        <div className="mb-4">
          {/* Toggle Navigation Section */}
          <button
            onClick={() => setShowNavigation(!showNavigation)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-forest-green-primary to-forest-green-secondary text-white rounded-lg shadow-md mb-3"
          >
            <span className="font-semibold text-sm">📌 Điều hướng trang</span>
            {showNavigation ? (
              <FaChevronDown className="w-4 h-4" />
            ) : (
              <FaChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Navigation Links */}
          {showNavigation && (
            <nav className="space-y-1 bg-gray-50 rounded-lg p-2 border border-gray-200">
              {visibleNavigationItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = currentPath === item.path ||
                  (item.path !== '/dashboard' && currentPath.startsWith(item.path));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                        ? 'bg-forest-green-primary text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                      }`}
                  >
                    <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-forest-green-primary'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Divider */}
          <div className="border-t border-gray-300 my-4"></div>

          {/* Current page indicator */}
          <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
            📋 Chức năng trang hiện tại
          </div>
        </div>
      )}

      {/* Page-specific sidebar content */}
      {Array.isArray(getComponentByPath()) ? (
        getComponentByPath().map((component) => component)
      ) : (
        getComponentByPath()
      )}
    </div>
  );
};

export default Sidebar;