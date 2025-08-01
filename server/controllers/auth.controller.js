// server/controllers/auth.controller.js - UPDATED WITH NEW PERMISSION SYSTEM
const pool = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";
const JWT_EXPIRES_IN = "24h";

console.log(`🔑 Auth Controller JWT_SECRET: "${JWT_SECRET}"`);

// ✅ UPDATED: Đăng nhập với hệ thống phân quyền mới
exports.login = async (req, res) => {
  const { username, password } = req.body;

  console.log(`👤 Processing login for username: ${username}`);

  try {
    // ✅ UPDATED: Kiểm tra username tồn tại với các field mới
    const userQuery = `
      SELECT 
        id, username, password_hash, full_name, position, organization,
        permission_level, district_id, is_active, created_at, last_login,
        -- Backward compatibility
        CASE 
          WHEN permission_level = 'admin' THEN 'admin'
          ELSE 'user'
        END as role
      FROM users 
      WHERE username = $1 AND is_active = TRUE
    `;
    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: "Tên đăng nhập hoặc mật khẩu không đúng" 
      });
    }

    const user = userResult.rows[0];
    console.log(`✅ User found: ID=${user.id}, Permission=${user.permission_level}`);

    // Password validation
    let isPasswordValid = false;
    
    try {
      isPasswordValid = await bcrypt.compare(password, user.password_hash);
      console.log(`🔐 Password validation result: ${isPasswordValid}`);
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

    // ✅ UPDATED: Tạo token với payload mới
    const tokenPayload = { 
      id: user.id, 
      username: user.username, 
      role: user.role.toLowerCase(), // Backward compatibility
      permission_level: user.permission_level,
      full_name: user.full_name,
      position: user.position,
      organization: user.organization,
      district_id: user.district_id,
      iat: Math.floor(Date.now() / 1000)
    };
    
    console.log(`🔐 Creating token with payload:`, tokenPayload);
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    console.log(`🎟️ Token created successfully for user: ${username}`);
    
    // Verify token ngay sau khi tạo
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      console.log(`✅ Token verification test passed`);
    } catch (verifyError) {
      console.log(`❌ Token verification test failed:`, verifyError.message);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo token"
      });
    }

    // ✅ UPDATED: Trả về token và thông tin user mới
    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.role = userWithoutPassword.role.toLowerCase();
    
    res.json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: userWithoutPassword
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

// ✅ UPDATED: Lấy thông tin người dùng hiện tại với các field mới
exports.getCurrentUser = async (req, res) => {
  try {
    console.log(`🔍 Getting current user info for ID: ${req.user.id}`);
    
    const userResult = await pool.query(`
      SELECT 
        id, username, full_name, position, organization,
        permission_level, district_id, is_active, created_at, last_login,
        -- Backward compatibility
        CASE 
          WHEN permission_level = 'admin' THEN 'admin'
          ELSE 'user'
        END as role
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      console.log(`❌ User not found with ID: ${req.user.id}`);
      return res.status(404).json({ 
        success: false, 
        message: "Không tìm thấy người dùng" 
      });
    }

    const userData = userResult.rows[0];
    userData.role = userData.role.toLowerCase();
    
    console.log(`✅ Retrieved user info for ID: ${req.user.id}, permission: ${userData.permission_level}`);
    
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

// Đăng xuất (giữ nguyên)
exports.logout = (req, res) => {
  console.log(`👋 User logged out successfully`);
  
  res.json({ 
    success: true, 
    message: "Đăng xuất thành công" 
  });
};