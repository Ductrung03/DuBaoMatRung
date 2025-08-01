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
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  console.log("🔍 API URL từ config:", config.API_URL);

  // ✅ FIXED: Setup axios interceptor để handle token và 401 tự động
  useEffect(() => {
    // Request interceptor để thêm token vào mọi request
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = localStorage.getItem("token");
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        console.log(`📤 Request: ${config.method?.toUpperCase()} ${config.url}`, {
          hasToken: !!currentToken,
          tokenPreview: currentToken ? currentToken.substring(0, 20) + '...' : 'none'
        });
        return config;
      },
      (error) => {
        console.error("❌ Request interceptor error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor để handle 401 và các lỗi khác
    const responseInterceptor = axios.interceptors.response.use(
      (response) => {
        console.log(`✅ Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`❌ Response error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          status: error.response?.status,
          message: error.response?.data?.message,
          hasToken: !!error.config?.headers?.Authorization
        });

        if (error.response?.status === 401) {
          console.log("🚨 401 Unauthorized - Clearing auth data and redirecting to login");
          
          // Clear all auth data
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

    // Cleanup interceptors khi component unmount
    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [navigate]);

  // ✅ FIXED: Kiểm tra token khi component mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      const currentToken = localStorage.getItem("token");
      
      if (currentToken) {
        try {
          console.log("🔍 Verifying existing token...");
          
          // Set token vào state trước khi verify
          setToken(currentToken);
          
          const res = await axios.get(`${config.API_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${currentToken}`
            }
          });
          
          console.log("✅ Token valid, user data:", res.data.user);
          setUser(res.data.user);
          
          // Lưu user data vào localStorage
          localStorage.setItem("user", JSON.stringify(res.data.user));
          
        } catch (err) {
          console.error("❌ Token verification failed:", err);
          
          // Clear invalid token
          setToken(null);
          setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          
          // Only show error if it's not a network issue
          if (err.response?.status === 401) {
            console.log("🔄 Token invalid, will redirect to login");
          } else {
            console.error("🌐 Network or server error during token verification");
          }
        }
      } else {
        console.log("📝 No token found in localStorage");
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // ✅ FIXED: Đăng nhập with better error handling
  const login = async (username, password) => {
    try {
      setLoading(true);
      
      console.log(`🔄 Attempting login for: ${username}`);
      
      const res = await axios.post(`${config.API_URL}/api/auth/login`, {
        username,
        password,
      });

      console.log("✅ Login successful:", res.data);
      
      // Lưu token và user data
      const { token: newToken, user: userData } = res.data;
      
      setToken(newToken);
      setUser(userData);
      
      // Lưu vào localStorage
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
      } else if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      }
      
      toast.error(errorMessage);
      return false;
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Đăng xuất with cleanup
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
  const isAdmin = () => {
    return user && (user.role === "admin" || user.permission_level === "admin");
  };
  
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