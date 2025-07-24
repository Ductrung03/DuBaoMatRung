// server/middleware/auth.middleware.js - FIXED JWT TOKEN ISSUE
const jwt = require("jsonwebtoken");
const pool = require("../db");

// ✅ FIX: Chỉ sử dụng 1 JWT_SECRET từ env để tránh confusion
const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";

console.log(`🔑 JWT_SECRET configured: "${JWT_SECRET}"`);

// Middleware xác thực JWT
exports.authenticate = async (req, res, next) => {
  try {
    console.log(`🔍 Authenticating: ${req.path}`);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ No authorization header found`);
      return res.status(401).json({ 
        success: false, 
        message: "Vui lòng đăng nhập để tiếp tục",
        action: "REQUIRE_LOGIN"
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(`🔑 Token received: ${token.substring(0, 20)}...`);

    // ✅ FIX: Chỉ thử verify với 1 secret duy nhất
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log(`✅ Token verified successfully:`, {
        user: decoded.username,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (err) {
      console.log(`❌ Token verification failed: ${err.message}`);
      
      // ✅ FIX: Nếu token invalid, force user login lại
      return res.status(401).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
        action: "FORCE_RELOGIN",
        error_type: err.name
      });
    }
    
    // ✅ FIX: Normalize role để tương thích
    if (decoded.role) {
      decoded.role = decoded.role.toLowerCase();
    }
    
    // Kiểm tra user trong database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found or inactive: ID=${decoded.id}`);
      return res.status(401).json({ 
        success: false, 
        message: "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa",
        action: "FORCE_RELOGIN"
      });
    }

    // Thêm thông tin user vào request
    req.user = decoded;
    console.log(`✅ Authentication successful for user ID: ${decoded.id}`);
    next();
    
  } catch (err) {
    console.error("❌ Authentication error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi xác thực",
      action: "RETRY"
    });
  }
};

// ✅ FIX: Middleware kiểm tra quyền admin
exports.isAdmin = (req, res, next) => {
  console.log(`🔍 Checking admin permission: user=${req.user?.username}, role=${req.user?.role}`);
  
  const userRole = req.user?.role?.toLowerCase();
  const isAdminUser = userRole === "admin";
  
  if (req.user && isAdminUser) {
    console.log(`✅ User ${req.user.username} has admin permission`);
    next();
  } else {
    console.log(`❌ User ${req.user?.username} does not have admin permission (role: ${userRole})`);
    res.status(403).json({ 
      success: false, 
      message: "Bạn không có quyền truy cập tài nguyên này"
    });
  }
};