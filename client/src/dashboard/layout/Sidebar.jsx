import React, { useState } from "react";
import { useLocation } from "react-router-dom"; // Import useLocation từ React Router
import DuBaoMatRungTuDong from "../components/sidebars/dubaomatrung/DuBaoMatRungTuDong";
import DuBaoMatRungTuyBien from "../components/sidebars/dubaomatrung/DuBaoMatRungTuyBien";
import CapNhatDuLieu from "../components/sidebars/quanlydulieu/CapNhatDuLieu";
import TraCuuAnhVeTinh from "../components/sidebars/quanlydulieu/TraCuuAnhVeTinh";
import TraCuuDuLieuDuBaoMatRung from "../components/sidebars/quanlydulieu/TraCuuDuLieuDuBaoMatRung";
import XacMinhDuBaoMatRung from "../components/sidebars/quanlydulieu/XacMinhDuBaoMatRung";
import Dashboard from "../components/sidebars/Dashboard";
import BaoCaoDuBaoMatRung from "../components/sidebars/baocao/BaoCaoDuBaoMatRung";
import ImportShapefile from "../components/sidebars/phathienmatrung/ImportShapefile";

const Sidebar = () => {
  // Lấy đường dẫn hiện tại từ React Router
  const location = useLocation();
  const currentPath = location.pathname;
  const [geoData, setGeoData] = useState(null); // ✅
  // Lấy phần đường dẫn sau "/dashboard"
  
  const pathAfterDashboard = currentPath.replace("/dashboard", "").replace(/^\//, "");
  console.log("pathAfterDashboard:", pathAfterDashboard); // Debug

  // Logic để ánh xạ đường dẫn với component
  const getComponentByPath = () => {
    switch (pathAfterDashboard) {
      case "dubaomatrung":
        return [<DuBaoMatRungTuDong />, <DuBaoMatRungTuyBien />]; // Trả về mảng hai component
      case "quanlydulieu":
        return [
          <TraCuuDuLieuDuBaoMatRung />,
          <TraCuuAnhVeTinh />,
          <XacMinhDuBaoMatRung />,
          <CapNhatDuLieu onGeoDataLoaded={setGeoData} /> // ✅ truyền dữ liệu
        ];
      case "baocao":
        return [<BaoCaoDuBaoMatRung/>]
      case "phathienmatrung":
        return [<ImportShapefile/>]
      case "":
        return <Dashboard/>; // Mặc định khi ở "/dashboard"
      default:
        return <Dashboard/>; // Mặc định nếu không khớp
    }
  };

  return (
    <div className="h-full w-1/5 bg-gray-50 p-4 flex flex-col gap-4 overflow-y-auto sidebar">
      {/* Hiển thị tất cả các component trong mảng */}
      {Array.isArray(getComponentByPath()) ? (
        getComponentByPath().map((component, index) => (
          <React.Fragment key={index}>{component}</React.Fragment>
        ))
      ) : (
        getComponentByPath()
      )}
    </div>
  );
};

export default Sidebar;