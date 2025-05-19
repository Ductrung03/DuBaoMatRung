const pool = require("../db");
const bcrypt = require("bcryptjs");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// Hàm băm mật khẩu
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Lấy danh sách tất cả người dùng (không bao gồm mật khẩu)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, full_name, role, district_id, is_active, created_at, last_login FROM users ORDER BY created_at DESC"
    );

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

// Tạo người dùng mới
// Sửa hàm createUser trong file server/controllers/user.controller.js

exports.createUser = async (req, res) => {
  const {
    username,
    password,
    full_name,
    role = "user",
    district_id = null,
  } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!username || !password || !full_name) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng nhập đầy đủ thông tin người dùng",
    });
  }

  // In ra thông tin debug
  console.log("📋 Dữ liệu tạo người dùng:", {
    username,
    full_name,
    role,
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

    // Thêm người dùng vào database
    // Sử dụng cú pháp SQL chuẩn hơn với tên cột rõ ràng
    const query = `
      INSERT INTO users (username, password_hash, full_name, role, district_id) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id, username, full_name, role, district_id, is_active, created_at
    `;

    console.log("📋 SQL Query:", query);
    console.log("📋 Parameters:", [
      username,
      "***",
      full_name,
      role,
      district_id,
    ]);

    const result = await pool.query(query, [
      username,
      password_hash,
      full_name,
      role,
      district_id,
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

// Cập nhật thông tin người dùng
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, role, is_active, password, district_id } = req.body;

  try {
    // In ra dữ liệu nhận được để debug
    console.log("📋 Dữ liệu cập nhật người dùng:", {
      id,
      full_name,
      role,
      is_active,
      district_id,
      password: password ? "***" : undefined,
    });

    let query, params;

    if (password) {
      // Nếu có mật khẩu mới, cập nhật cả mật khẩu
      const password_hash = await hashPassword(password);
      query = `
        UPDATE users 
        SET full_name = $1, role = $2, is_active = $3, password_hash = $4, district_id = $5
        WHERE id = $6 
        RETURNING id, username, full_name, role, district_id, is_active, created_at, last_login
      `;
      params = [full_name, role, is_active, password_hash, district_id, id];
    } else {
      // Không cập nhật mật khẩu
      query = `
        UPDATE users 
        SET full_name = $1, role = $2, is_active = $3, district_id = $4
        WHERE id = $5 
        RETURNING id, username, full_name, role, district_id, is_active, created_at, last_login
      `;
      params = [full_name, role, is_active, district_id, id];
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

// Xóa người dùng
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Không xóa người dùng thật sự, chỉ đặt is_active = false
    const result = await pool.query(
      "UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id",
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
      message: "Vô hiệu hóa người dùng thành công",
    });
  } catch (err) {
    console.error("❌ Lỗi xóa người dùng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa người dùng",
    });
  }
};

// Kích hoạt lại người dùng đã bị vô hiệu hóa
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

// Đổi mật khẩu
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
