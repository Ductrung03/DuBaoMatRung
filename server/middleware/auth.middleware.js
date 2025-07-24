// 🔧 BƯỚC 1: Sửa server/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const pool = require("../db");

// ✅ FIX: Thêm nhiều JWT_SECRET để tương thích
const JWT_SECRETS = [
  process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production",
  "dubaomatrung_jwt_secret", // Secret cũ có thể đã dùng
  "dubaomatrung_secret_key_change_this_in_production", // Backup
  "your_jwt_secret_key", // Fallback khác
];

console.log(`🔑 JWT_SECRETS configured: ${JWT_SECRETS.length} secrets`);
console.log(`🔑 Primary secret: "${JWT_SECRETS[0]}"`);

// Middleware xác thực JWT
exports.authenticate = async (req, res, next) => {
  try {
    console.log(`🔍 Authenticating: ${req.path}`);
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ No authorization header found`);
      return res.status(401).json({ 
        success: false, 
        message: "Không tìm thấy token xác thực" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(`🔑 Token received: ${token.substring(0, 20)}...`);

    // ✅ FIX: Thử verify với từng secret
    let decoded = null;
    let secretUsed = null;
    
    for (let i = 0; i < JWT_SECRETS.length; i++) {
      try {
        const secret = JWT_SECRETS[i];
        console.log(`🔐 Trying secret ${i + 1}: "${secret.substring(0, 10)}..."`);
        
        decoded = jwt.verify(token, secret);
        secretUsed = secret;
        console.log(`✅ Token verified with secret ${i + 1}`);
        break;
      } catch (err) {
        console.log(`❌ Secret ${i + 1} failed: ${err.message}`);
        continue;
      }
    }
    
    if (!decoded) {
      console.log(`❌ Token verification failed with all secrets`);
      return res.status(401).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn",
        hint: "Please login again to get a new token"
      });
    }

    console.log(`✅ Token verified successfully:`, {
      user: decoded.username,
      role: decoded.role,
      secretUsed: secretUsed.substring(0, 10) + '...'
    });
    
    // ✅ FIX: Normalize role để tương thích
    if (decoded.role) {
      // Chuyển về lowercase để consistent
      decoded.role = decoded.role.toLowerCase();
      console.log(`🔄 Normalized role to: ${decoded.role}`);
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
        message: "Người dùng không tồn tại hoặc đã bị vô hiệu hóa" 
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
      message: "Lỗi server khi xác thực" 
    });
  }
};

// ✅ FIX: Middleware kiểm tra quyền admin với role flexible
exports.isAdmin = (req, res, next) => {
  console.log(`🔍 Checking admin permission: user=${req.user?.username}, role=${req.user?.role}`);
  
  // ✅ FIX: Check cả lowercase và uppercase
  const userRole = req.user?.role?.toLowerCase();
  const isAdminUser = userRole === "admin";
  
  console.log(`🔍 Role check: "${req.user?.role}" → normalized: "${userRole}" → isAdmin: ${isAdminUser}`);
  
  if (req.user && isAdminUser) {
    console.log(`✅ User ${req.user.username} has admin permission`);
    next();
  } else {
    console.log(`❌ User ${req.user?.username} does not have admin permission (role: ${userRole})`);
    res.status(403).json({ 
      success: false, 
      message: "Bạn không có quyền truy cập tài nguyên này",
      debug: process.env.NODE_ENV === 'development' ? {
        user_role: req.user?.role,
        normalized_role: userRole,
        required: "admin"
      } : undefined
    });
  }
};