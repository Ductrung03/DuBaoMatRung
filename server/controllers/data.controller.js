const pool = require("../db");

// Cập nhật dữ liệu của một feature cụ thể
exports.updateFeature = async (req, res) => {
  const { tableName, featureId, columnName } = req.params;
  const { value } = req.body;

  try {
    // Kiểm tra xem bảng có tồn tại không
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [tableName]
    );

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: "Bảng dữ liệu không tồn tại"
      });
    }

    // Kiểm tra xem cột có tồn tại không
    const columnCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name = $2
      )`,
      [tableName, columnName]
    );

    if (!columnCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: "Cột dữ liệu không tồn tại"
      });
    }

    // Cập nhật dữ liệu
    const query = `
      UPDATE ${tableName} 
      SET ${columnName} = $1 
      WHERE gid = $2 OR id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [value, featureId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu cần cập nhật"
      });
    }

    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công",
      data: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Lỗi cập nhật dữ liệu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật dữ liệu"
    });
  }
};

// Lấy danh sách bảng trong database
exports.getTables = async (req, res) => {
  try {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(row => row.table_name)
    });
  } catch (err) {
    console.error("❌ Lỗi lấy danh sách bảng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách bảng"
    });
  }
};

// Lấy cấu trúc của bảng (tên cột và kiểu dữ liệu)
exports.getTableStructure = async (req, res) => {
  const { tableName } = req.params;

  try {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `;

    const result = await pool.query(query, [tableName]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bảng dữ liệu"
      });
    }

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error("❌ Lỗi lấy cấu trúc bảng:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy cấu trúc bảng"
    });
  }
};