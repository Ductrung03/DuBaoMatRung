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

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [, setGeoData] = useState(null);
  
  const pathAfterDashboard = currentPath.replace("/dashboard", "").replace(/^\//, "");

  // Logic để ánh xạ đường dẫn với component
  const getComponentByPath = () => {
    switch (pathAfterDashboard) {
      case "dubaomatrung":
        return [<DuBaoMatRungTuDong key="tuDong" />, <DuBaoMatRungTuyBien key="tuyBien" />];
      case "quanlydulieu":
        return [
          <TraCuuDuLieuDuBaoMatRung key="traCuu" />,
          <TraCuuAnhVeTinh key="anhVeTinh" />,
          <XacMinhDuBaoMatRung key="xacMinh" />,
          <CapNhatDuLieu key="capNhat" onGeoDataLoaded={setGeoData} />
        ];
      case "baocao":
        return [<BaoCaoDuBaoMatRung key="baoCao" />];
      case "phathienmatrung":
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