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
import { AuthProvider } from "./dashboard/contexts/AuthContext";
import ProtectedRoute from "./dashboard/components/ProtectedRoute";
import QuanLyNguoiDung from "./dashboard/pages/QuanLyNguoiDung";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GeoDataProvider>
          <ReportProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="" element={<Map />} />
                <Route path="dubaomatrung" element={<Map />} />
                <Route path="quanlydulieu" element={<QuanLyDuLieu />} />
                <Route path="phathienmatrung" element={<PhatHienMatRung />} />
                <Route path="baocao" element={<ThongKeBaoCaoMatRung />} />
                <Route
                  path="quanlynguoidung"
                  element={
                    <ProtectedRoute adminOnly={true}>
                      <QuanLyNguoiDung />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </ReportProvider>
        </GeoDataProvider>
      </AuthProvider>
      <ToastContainer position="top-center" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;