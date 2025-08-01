// server/controllers/user.controller.js - UPDATED WITH NEW FIELDS
const pool = require("../db");
const bcrypt = require("bcryptjs");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// Hàm băm mật khẩu
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// ✅ UPDATED: Lấy danh sách tất cả người dùng với các field mới
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, username, full_name, position, organization, 
        permission_level, district_id, is_active, 
        created_at, last_login,
        -- Backward compatibility
        CASE 
          WHEN permission_level = 'admin' THEN 'admin'
          ELSE 'user'
        END as role
      FROM users 
      ORDER BY created_at DESC
    `);

    // Thêm xử lý để hiển thị tên huyện Unicode nếu cần
    const usersWithDistrictName = result.rows.map(user => ({
      ...user,
      district_name: user.district_id ? convertTcvn3ToUnicode(user.district_id) : null
    }));

    res.json({
      success: true,
      data: usersWithDistrictName
    });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách người dùng:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi server khi lấy danh sách người dùng" 
    });
  }
};

// ✅ UPDATED: Tạo người dùng mới với các field mới
exports.createUser = async (req, res) => {
  const {
    username,
    password,
    full_name,
    position,
    organization,
    permission_level = "district",
    district_id = null,
  } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!username || !password || !full_name || !position || !organization) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin người dùng",
    });
  }

  console.log("📋 Dữ liệu tạo người dùng:", {
    username,
    full_name,
    position,
    organization,
    permission_level,
    district_id: district_id || "null",
  });

  try {
    // Kiểm tra xem username đã tồn tại chưa
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập đã được sử dụng",
      });
    }

    // Băm mật khẩu
    const password_hash = await hashPassword(password);

    // ✅ UPDATED: Thêm người dùng với các field mới
    const query = `
      INSERT INTO users (
        username, password_hash, full_name, position, organization, 
        permission_level, district_id,
        role
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, username, full_name, position, organization, 
                permission_level, district_id, is_active, created_at
    `;

    // Set role for backward compatibility
    const role = permission_level === 'admin' ? 'admin' : 'user';

    const result = await pool.query(query, [
      username,
      password_hash,
      full_name,
      position,
      organization,
      permission_level,
      district_id,
      role
    ]);

    console.log("✅ Kết quả tạo người dùng:", result.rows[0]);

    res.status(201).json({
      success: true,
      message: "Tạo người dùng thành công",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi tạo người dùng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo người dùng",
      error: err.message,
    });
  }
};

// ✅ UPDATED: Cập nhật thông tin người dùng với các field mới
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { 
    full_name, 
    position, 
    organization, 
    permission_level, 
    district_id, 
    is_active = true, 
    password 
  } = req.body;

  try {
    console.log("📋 Dữ liệu cập nhật người dùng:", {
      id,
      full_name,
      position,
      organization,
      permission_level,
      district_id,
      is_active,
      password: password ? "***" : undefined,
    });

    let query, params;

    // Set role for backward compatibility
    const role = permission_level === 'admin' ? 'admin' : 'user';

    if (password) {
      // Nếu có mật khẩu mới, cập nhật cả mật khẩu
      const password_hash = await hashPassword(password);
      query = `
        UPDATE users 
        SET full_name = $1, position = $2, organization = $3, 
            permission_level = $4, district_id = $5, is_active = $6, 
            password_hash = $7, role = $8
        WHERE id = $9 
        RETURNING id, username, full_name, position, organization, 
                  permission_level, district_id, is_active, created_at, last_login
      `;
      params = [full_name, position, organization, permission_level, district_id, is_active, password_hash, role, id];
    } else {
      // Không cập nhật mật khẩu
      query = `
        UPDATE users 
        SET full_name = $1, position = $2, organization = $3, 
            permission_level = $4, district_id = $5, is_active = $6, role = $7
        WHERE id = $8 
        RETURNING id, username, full_name, position, organization, 
                  permission_level, district_id, is_active, created_at, last_login
      `;
      params = [full_name, position, organization, permission_level, district_id, is_active, role, id];
    }

    console.log("📋 Query cập nhật:", query);
    console.log("📋 Params:", params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    console.log("✅ Kết quả cập nhật:", result.rows[0]);

    res.json({
      success: true,
      message: "Cập nhật người dùng thành công",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Lỗi cập nhật người dùng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật người dùng",
      error: err.message,
    });
  }
};

// ✅ CHANGED: Xóa người dùng thật sự (thay vì vô hiệu hóa)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Xóa người dùng thật sự
    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id, username, full_name",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const deletedUser = result.rows[0];
    console.log("✅ Đã xóa người dùng:", deletedUser);

    res.json({
      success: true,
      message: `Đã xóa người dùng: ${deletedUser.full_name}`,
      data: deletedUser
    });
  } catch (err) {
    console.error("❌ Lỗi xóa người dùng:", err);
    
    // Kiểm tra nếu lỗi do ràng buộc khóa ngoại
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa người dùng này vì đang có dữ liệu liên quan trong hệ thống",
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa người dùng",
    });
  }
};

// Kích hoạt lại người dùng đã bị vô hiệu hóa (giữ nguyên)
exports.activateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "UPDATE users SET is_active = TRUE WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      message: "Kích hoạt người dùng thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi kích hoạt người dùng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi kích hoạt người dùng",
    });
  }
};

// Đổi mật khẩu (giữ nguyên)
exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới",
    });
  }

  try {
    // Kiểm tra xem user có tồn tại không
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    const user = userResult.rows[0];

    // Kiểm tra mật khẩu cũ
    const isPasswordValid = await bcrypt.compare(
      old_password,
      user.password_hash
    );
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu cũ không đúng",
      });
    }

    // Băm mật khẩu mới
    const password_hash = await hashPassword(new_password);

    // Cập nhật mật khẩu
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      password_hash,
      id,
    ]);

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi đổi mật khẩu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi đổi mật khẩu",
    });
  }
};