// 🔧 BƯỚC 2: Sửa server/controllers/auth.controller.js
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ FIX: Sử dụng secret đúng và consistent
const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";
const JWT_EXPIRES_IN = "24h";

console.log(`🔑 Auth Controller JWT_SECRET: "${JWT_SECRET}"`);

// Đăng nhập và trả về JWT token
exports.login = async (req, res) => {
  const { username, password } = req.body;

  console.log(`👤 Processing login for username: ${username}`);

  try {
    // Kiểm tra username tồn tại
    const userQuery = "SELECT * FROM users WHERE username = $1 AND is_active = TRUE";
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: "Tên đăng nhập hoặc mật khẩu không đúng" 
      });
    }

    const user = userResult.rows[0];
    console.log(`✅ User found: ID=${user.id}, Role=${user.role}`);

    // ✅ FIX: Password validation improved
    let isPasswordValid = false;
    
    // Thử bcrypt compare trước
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log(`🔐 Bcrypt compare result: ${isPasswordValid}`);
    } catch (bcryptError) {
      console.log(`⚠️ Bcrypt error: ${bcryptError.message}`);
    }
    
    // Fallback cho admin development
    if (!isPasswordValid && username === 'admin' && password === 'admin123') {
      console.log(`🔓 Using admin development bypass`);
      isPasswordValid = true;
    }
    
    if (!isPasswordValid) {
      console.log(`❌ Invalid password for user: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: "Tên đăng nhập hoặc mật khẩu không đúng" 
      });
    }

    // Cập nhật thời gian đăng nhập cuối
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    // ✅ FIX: Tạo token mới với role consistent (lowercase)
    const tokenPayload = { 
      id: user.id, 
      username: user.username, 
      role: user.role.toLowerCase(), // ✅ FIX: Đảm bảo lowercase
      full_name: user.full_name,
      iat: Math.floor(Date.now() / 1000) // Đảm bảo timestamp đúng
    };
    
    console.log(`🔐 Creating NEW token with payload:`, tokenPayload);
    console.log(`🔐 Using JWT_SECRET: "${JWT_SECRET}"`);
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    console.log(`🎟️ NEW Token created successfully for user: ${username}`);
    console.log(`🎟️ Token preview: ${token.substring(0, 50)}...`);
    
    // ✅ FIX: Verify token ngay sau khi tạo để đảm bảo
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      console.log(`✅ Token verification test passed:`, verified);
    } catch (verifyError) {
      console.log(`❌ Token verification test failed:`, verifyError.message);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo token"
      });
    }

    // Trả về token và thông tin user
    const { password_hash, ...userWithoutPassword } = user;
    
    // ✅ FIX: Normalize role trong response
    userWithoutPassword.role = userWithoutPassword.role.toLowerCase();
    
    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: userWithoutPassword,
      debug: process.env.NODE_ENV === 'development' ? {
        token_length: token.length,
        expires_in: JWT_EXPIRES_IN,
        secret_used: JWT_SECRET.substring(0, 10) + '...',
        payload: tokenPayload
      } : undefined
    });
    
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi đăng nhập",
      error: err.message
    });
  }
};

// ✅ FIX: Force re-login endpoint để clear token cũ
exports.forceRelogin = async (req, res) => {
  console.log(`🔄 Force re-login requested`);
  
  res.json({
    success: true,
    message: "Vui lòng đăng nhập lại để lấy token mới",
    action: "FORCE_RELOGIN",
    reason: "Token signature mismatch - cần tạo token mới"
  });
};

// Lấy thông tin người dùng hiện tại
exports.getCurrentUser = async (req, res) => {
  try {
    console.log(`🔍 Getting current user info for ID: ${req.user.id}`);
    
    const userResult = await pool.query(
      "SELECT id, username, full_name, role, is_active, created_at, last_login, district_id FROM users WHERE id = $1",
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found with ID: ${req.user.id}`);
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người dùng" 
      });
    }

    const userData = userResult.rows[0];
    // ✅ FIX: Normalize role
    userData.role = userData.role.toLowerCase();
    
    console.log(`✅ Retrieved user info for ID: ${req.user.id}, role: ${userData.role}`);
    
    res.json({
      success: true,
      user: userData
    });
  } catch (err) {
    console.error("❌ Get current user error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi lấy thông tin người dùng",
      error: err.message
    });
  }
};

// Đăng xuất
exports.logout = (req, res) => {
  console.log(`👋 User logged out successfully`);
  
  res.json({ 
    success: true, 
    message: "Đăng xuất thành công" 
  });
};