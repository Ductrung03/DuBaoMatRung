// client/src/dashboard/contexts/AuthContext.jsx - FIXED TOKEN HANDLING
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../../services/api"; // ✅ FIX: Use api instance instead of axios
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import config from "../../config";

// Tạo context
const AuthContext = createContext();

// Hook tùy chỉnh để sử dụng context
export const useAuth = () => useContext(AuthContext);

// Provider để bọc quanh app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Lazy initialization from localStorage to prevent flash of null state
    const savedUser = localStorage.getItem("user");
    const savedToken = localStorage.getItem("token");
    if (savedUser && savedToken) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();


  // ✅ REMOVED: axios interceptor không cần thiết vì api instance đã có sẵn trong api.js

  // ✅ SIMPLIFIED: Restore auth từ localStorage
  useEffect(() => {
    const initAuth = async () => {
      const currentToken = localStorage.getItem("token");
      const savedUserData = localStorage.getItem("user");
      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/register', '/'];

      // Nếu không có token
      if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
        setLoading(false);
        // Redirect về login nếu đang ở protected route
        if (!publicPaths.includes(currentPath)) {
          navigate("/login", { replace: true });
        }
        return;
      }

      // Decode JWT để kiểm tra expiration
      try {
        const decodedToken = jwtDecode(currentToken);

        // Kiểm tra token đã hết hạn chưa
        const currentTime = Date.now() / 1000;
        if (decodedToken.exp && decodedToken.exp < currentTime) {
          // Token expired, clearing...
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setLoading(false);
          if (!publicPaths.includes(currentPath)) {
            navigate("/login", { replace: true });
          }
          return;
        }

        // Set token vào state
        setToken(currentToken);

        // Lấy user data từ localStorage (đã lưu khi login)
        let userData;
        if (savedUserData) {
          try {
            userData = JSON.parse(savedUserData);
            // Auth restored from localStorage
          } catch (parseError) {
            console.error("❌ User data parse failed:", parseError);
            userData = {
              id: decodedToken.id,
              username: decodedToken.username,
              full_name: decodedToken.full_name,
              email: decodedToken.email,
              permissions: decodedToken.permissions || [],
              roles: decodedToken.roles || []
            };
          }
        } else {
          userData = {
            id: decodedToken.id,
            username: decodedToken.username,
            full_name: decodedToken.full_name,
            email: decodedToken.email,
            permissions: decodedToken.permissions || [],
            roles: decodedToken.roles || []
          };
        }

        setUser(userData);

        // Fetch fresh user data from API to ensure roles are up-to-date
        try {
          // Use a short timeout to not block UI if offline/slow
          const response = await api.get('/auth/me'); // Ensure this endpoint exists and works
          if (response.data && response.data.user) {
            const freshUser = response.data.user;

            // Merge permissions from token if not present in API response
            if (!freshUser.permissions) {
              freshUser.permissions = decodedToken.permissions || [];
            }

            // If backend returns userRoles but not roles (simple array), we might want to standardize
            // But Header.jsx handles both, so it's fine.

            // User profile updated from server
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
          }
        } catch (fetchError) {
          console.warn("⚠️ Could not fetch fresh user profile:", fetchError.message);
          // Continue with data from localStorage/token
        }

      } catch (err) {
        console.error("❌ Auth init failed:", err.message);
        // Clear invalid token
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);

        if (!publicPaths.includes(currentPath)) {
          navigate("/login", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  // ✅ FIXED: Đăng nhập with better error handling
  const login = async (username, password) => {
    try {
      setLoading(true);


      const res = await api.post(`/auth/login`, {
        username,
        password,
      });


      // Lưu token và user data
      const { token: newToken, user: userData } = res.data;

      // Validate token before decoding
      if (!newToken || typeof newToken !== 'string') {
        throw new Error('Invalid token received from server');
      }

      // Decode JWT to get permissions - với error handling
      let decodedToken;
      try {
        decodedToken = jwtDecode(newToken);
        // Login - Decoded JWT token
      } catch (decodeError) {
        console.error("❌ Login JWT decode error:", decodeError);
        throw new Error('Invalid token format received from server');
      }

      // Merge user data with permissions from JWT
      const userDataWithPermissions = {
        ...userData,
        permissions: decodedToken.permissions || []
      };

      setToken(newToken);
      setUser(userDataWithPermissions);

      // Lưu vào localStorage
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userDataWithPermissions));

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

      // Call logout API if token exists
      if (token) {
        try {
          await api.post(`/auth/logout`);
        } catch (err) {
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

  // Kiểm tra vai trò - hỗ trợ cả format mới (roles) và format cũ (userRoles)
  const isAdmin = () => {
    if (!user) return false;

    // Format mới: API trả về 'roles' array với các role objects có 'name' trực tiếp
    if (user.roles && user.roles.some(role =>
      role.name === "super_admin" || role.name === "admin"
    )) {
      return true;
    }

    // Format cũ: 'userRoles' với nested 'role' object
    if (user.userRoles && user.userRoles.some(userRole =>
      userRole.role && (userRole.role.name === "super_admin" || userRole.role.name === "admin")
    )) {
      return true;
    }

    // Fallback: kiểm tra permission_level hoặc role field trực tiếp
    return user.permission_level === 'admin' || user.role === 'admin';
  };

  // Kiểm tra permission cụ thể
  const hasPermission = (action, subject) => {
    if (!user) return false;

    // Admin có tất cả quyền
    if (isAdmin()) return true;

    // Format mới: 'roles' array với mỗi role có 'permissions' array
    if (user.roles) {
      return user.roles.some(role =>
        role.permissions && role.permissions.some(perm =>
          (perm.action === action && perm.subject === subject) ||
          (perm.action === 'manage' && perm.subject === 'all')
        )
      );
    }

    // Format cũ: 'userRoles' với nested role và rolePermissions
    if (user.userRoles) {
      return user.userRoles.some(userRole =>
        userRole.role && userRole.role.rolePermissions && userRole.role.rolePermissions.some(rp =>
          (rp.permission.action === action && rp.permission.subject === subject) ||
          (rp.permission.action === 'manage' && rp.permission.subject === 'all')
        )
      );
    }

    return false;
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
        hasPermission,
        getUserDistrictId,
        canAccessDistrict
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};