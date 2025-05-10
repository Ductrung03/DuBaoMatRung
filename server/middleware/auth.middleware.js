const jwt = require("jsonwebtoken");
const pool = require("../db");

// Secret key cho JWT, trong thực tế nên lưu ở biến môi trường
const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_jwt_secret";

// Middleware xác thực JWT
exports.authenticate = async (req, res, next) => {
  try {
    // Log để debug
    console.log(`🔍 Kiểm tra xác thực: ${req.path}`);
    console.log(`🔑 Authorization header: ${req.headers.authorization ? 'Có' : 'Không có'}`);
    
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`❌ Không tìm thấy token xác thực trong header`);
      return res.status(401).json({ 
        success: false, 
        message: "Không tìm thấy token xác thực" 
      });
    }

    const token = authHeader.split(" ")[1];
    console.log(`🔑 Token: ${token.substring(0, 10)}...`);

    // Xác thực token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(`✅ Token hợp lệ cho user: ${decoded.username}, role: ${decoded.role}`);
      
      // Kiểm tra user trong database để đảm bảo user vẫn còn active
      const userResult = await pool.query(
        "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        console.log(`❌ Người dùng không tồn tại hoặc đã bị vô hiệu hóa: ID=${decoded.id}`);
        return res.status(401).json({ 
          success: false, 
          message: "Người dùng không tồn tại hoặc đã bị vô hiệu hóa" 
        });
      }

      // Thêm thông tin user vào request
      req.user = decoded;
      console.log(`✅ Xác thực thành công cho user ID: ${decoded.id}`);
      next();
    } catch (err) {
      console.log(`❌ Token không hợp lệ: ${err.message}`);
      return res.status(401).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn",
        error: err.message
      });
    }
  } catch (err) {
    console.error("❌ Lỗi xác thực:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi xác thực",
      error: err.message
    });
  }
};

// Middleware kiểm tra quyền admin
exports.isAdmin = (req, res, next) => {
  console.log(`🔍 Kiểm tra quyền admin: user=${req.user?.username}, role=${req.user?.role}`);
  
  if (req.user && req.user.role === "admin") {
    console.log(`✅ User ${req.user.username} có quyền admin`);
    next();
  } else {
    console.log(`❌ User ${req.user?.username} không có quyền admin`);
    res.status(403).json({ 
      success: false, 
      message: "Bạn không có quyền truy cập tài nguyên này" 
    });
  }
};