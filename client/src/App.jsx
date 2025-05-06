import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./dashboard/pages/Login";
import MainLayout from "./dashboard/layout/MainLayout";
import DuBaoMatRung from "./dashboard/pages/DuBaoMatRung";
import QuanLyDuLieu from "./dashboard/pages/QuanLyDuLieu";
import Map from "./dashboard/pages/Map";
import ThongKeBaoCaoMatRung from "./dashboard/pages/ThongKeBaoCaoMatRung";
import { GeoDataProvider } from "./dashboard/contexts/GeoDataContext";
import PhatHienMatRung from "./dashboard/pages/PhatHienMatRung";
import { ReportProvider } from "./dashboard/contexts/ReportContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <GeoDataProvider>
      <ReportProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<MainLayout />}>
              {/* <Route path="" element={<Navigate to="/dashboard/admin" />}> */}
              <Route path="" element={<Map />} />
              <Route path="dubaomatrung" element={<Map />} />
              <Route path="quanlydulieu" element={<QuanLyDuLieu />} />
              <Route path="phathienmatrung" element={<PhatHienMatRung />} />
              <Route path="baocao" element={<ThongKeBaoCaoMatRung />} />
            </Route>
            {/* </Route> */}
          </Routes>
        </BrowserRouter>
      </ReportProvider>
      <ToastContainer position="top-center" autoClose={3000} />
    </GeoDataProvider>
    
  );
}

export default App;
