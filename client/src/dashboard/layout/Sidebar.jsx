import React, { useState } from "react";
import { useLocation } from "react-router-dom";
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

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [, setGeoData] = useState(null);

  const pathAfterDashboard = currentPath.replace("/dashboard", "").replace(/^\//, "");
  // Lấy phần đầu tiên của path để xác định module (ví dụ: quanlydulieu/abc -> quanlydulieu)
  const rootPath = pathAfterDashboard.split('/')[0];

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

  return (
    <div className="p-4 flex flex-col gap-4 h-full overflow-y-auto">
      {/* Hiển thị tất cả các component trong mảng */}
      {Array.isArray(getComponentByPath()) ? (
        getComponentByPath().map((component) => component)
      ) : (
        getComponentByPath()
      )}
    </div>
  );
};

export default Sidebar;