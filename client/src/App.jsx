// client/src/App.jsx - CẬP NHẬT VỚI ERROR BOUNDARY
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./dashboard/pages/Login";
import MainLayout from "./dashboard/layout/MainLayout";
import QuanLyDuLieu from "./dashboard/pages/QuanLyDuLieu";
import ThongKeBaoCaoMatRung from "./dashboard/pages/ThongKeBaoCaoMatRung";
import { GeoDataProvider } from "./dashboard/contexts/GeoDataContext";
import PhatHienMatRung from "./dashboard/pages/PhatHienMatRung";
import { ReportProvider } from "./dashboard/contexts/ReportContext";
import { AuthProvider } from "./dashboard/contexts/AuthContext";
import ProtectedRoute from "./dashboard/components/ProtectedRoute";
import PermissionProtectedRoute from "./components/PermissionProtectedRoute";
import QuanLyNguoiDung from "./dashboard/pages/QuanLyNguoiDung";
import QuanLyRole from "./dashboard/pages/QuanLyRole";
import ErrorBoundary from "./dashboard/components/ErrorBoundary";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Map from "./dashboard/pages/Map";
import DuBaoMatRung from "./dashboard/pages/DuBaoMatRung";
import Dashboard from "./dashboard/pages/Dashboard";

import { PermissionProvider } from "./dashboard/contexts/PermissionContext";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <PermissionProvider>
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
                    <Route path="" element={<Dashboard />} />
                    <Route
                      path="dubaomatrung/*"
                      element={
                        <PermissionProtectedRoute requiredPermission="forecast">
                          <DuBaoMatRung />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="quanlydulieu/*"
                      element={
                        <PermissionProtectedRoute requiredPermission="data_management">
                          <QuanLyDuLieu />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="phathienmatrung/*"
                      element={
                        <PermissionProtectedRoute requiredPermission="detection">
                          <ErrorBoundary>
                            <PhatHienMatRung />
                          </ErrorBoundary>
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="baocao"
                      element={
                        <PermissionProtectedRoute requiredPermission="reports">
                          <ThongKeBaoCaoMatRung />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="quanlynguoidung"
                      element={
                        <PermissionProtectedRoute requiredPermission="user_management">
                          <QuanLyNguoiDung />
                        </PermissionProtectedRoute>
                      }
                    />
                    <Route
                      path="quanlyrole"
                      element={
                        <PermissionProtectedRoute requiredPermission="role_management">
                          <QuanLyRole />
                        </PermissionProtectedRoute>
                      }
                    />
                  </Route>
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </ReportProvider>
            </GeoDataProvider>
          </PermissionProvider>
        </AuthProvider>

        {/* ToastContainer với z-index cao nhất và cấu hình tối ưu */}
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick={true}
          rtl={false}
          pauseOnFocusLoss={true}
          draggable={true}
          pauseOnHover={true}
          style={{
            zIndex: 99999,
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'auto',
            maxWidth: '500px'
          }}
          toastStyle={{
            zIndex: 100000,
            position: 'relative',
            backgroundColor: 'white',
            color: '#333',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb'
          }}
          bodyStyle={{
            fontSize: '14px',
            lineHeight: '1.5'
          }}
          progressStyle={{
            background: 'linear-gradient(to right, #10b981, #059669)'
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;