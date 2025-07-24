// client/src/dashboard/contexts/AuthContext.jsx - FIXED TOKEN HANDLING
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import config from "../../config";

// Tạo context
const AuthContext = createContext();

// Hook tùy chỉnh để sử dụng context
export const useAuth = () => useContext(AuthContext);

// Provider để bọc quanh app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token")); // ✅ FIX: Dùng localStorage thay vì sessionStorage
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Log API URL for debugging
  console.log("🔍 API URL từ config:", config.API_URL);

  // ✅ FIX: Setup axios interceptor để handle 401 tự động
  useEffect(() => {
    // Request interceptor để thêm token
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor để handle 401
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log("🚨 401 Unauthorized - Token invalid, logging out...");
          
          // Clear token và user data
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          // Navigate to login
          navigate("/login");
          
          // Show toast
          toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptors
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token, navigate]);

  // ✅ FIX: Kiểm tra token khi component mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      if (token) {
        try {
          console.log("🔍 Verifying existing token...");
          const res = await axios.get(`${config.API_URL}/api/auth/me`);
          
          console.log("✅ Token valid, user data:", res.data.user);
          setUser(res.data.user);
          
          // ✅ FIX: Lưu user data vào localStorage
          localStorage.setItem("user", JSON.stringify(res.data.user));
          
        } catch (err) {
          console.error("❌ Token verification failed:", err);
          
          // Clear invalid token
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          // Don't show error toast here to avoid spam
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, [token]);

  // ✅ FIX: Đăng nhập with better error handling
  const login = async (username, password) => {
    try {
      setLoading(true);
      
      console.log(`🔄 Attempting login for: ${username}`);
      
      const res = await axios.post(`${config.API_URL}/api/auth/login`, {
        username,
        password,
      });

      console.log("✅ Login successful:", res.data);
      
      // ✅ FIX: Lưu token và user data
      const { token: newToken, user: userData } = res.data;
      
      setToken(newToken);
      setUser(userData);
      
      // ✅ FIX: Lưu vào localStorage
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userData));
      
      toast.success("Đăng nhập thành công!");
      navigate("/dashboard");
      return true;
      
    } catch (err) {
      console.error("❌ Login error:", err);
      
      let errorMessage = "Lỗi khi đăng nhập";
      
      if (err.response?.status === 401) {
        errorMessage = "Tên đăng nhập hoặc mật khẩu không đúng";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      toast.error(errorMessage);
      return false;
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIX: Đăng xuất with cleanup
  const logout = async () => {
    try {
      console.log("👋 Logging out user...");
      
      // Call logout API if token exists
      if (token) {
        try {
          await axios.post(`${config.API_URL}/api/auth/logout`);
        } catch (err) {
          console.warn("⚠️ Logout API call failed (may be token invalid):", err);
        }
      }
      
    } catch (err) {
      console.error("❌ Logout API error:", err);
    } finally {
      // Always clear local data
      setToken(null);
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      
      navigate("/login");
      toast.info("Đã đăng xuất khỏi hệ thống");
    }
  };

  // Kiểm tra vai trò
  const isAdmin = () => user && user.role === "admin";
  
  // Lấy mã huyện của người dùng (TCVN3)
  const getUserDistrictId = () => user?.district_id || null;
  
  // Kiểm tra quyền truy cập huyện
  const canAccessDistrict = (districtId) => {
    if (isAdmin()) return true;
    if (!districtId) return true;
    if (!user?.district_id) return false;
    return user.district_id === districtId;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
        getUserDistrictId,
        canAccessDistrict
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};