const pool = require("../db");



// Cập nhật dữ liệu của một feature cụ thể bằng ID
exports.updateFeature = async (req, res) => {
  const { tableName, featureId, columnName } = req.params;
  const { value } = req.body;
  const idField = req.query.idField || 'gid'; // Mặc định là gid nếu không có tham số

  try {
    console.log(`Đang cập nhật ${tableName}, ${idField}: ${featureId}, Cột: ${columnName}, Giá trị: ${value}`);
    
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

    // Kiểm tra xem trường ID có tồn tại không
    const idFieldCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name = $2
      )`,
      [tableName, idField]
    );

    if (!idFieldCheck.rows[0].exists) {
      return res.status(400).json({
        success: false,
        message: `Trường ID '${idField}' không tồn tại trong bảng ${tableName}`
      });
    }

    console.log(`Sử dụng trường ID: ${idField} cho bảng ${tableName}`);

    // Cập nhật dữ liệu
    const query = `
      UPDATE ${tableName} 
      SET ${columnName} = $1 
      WHERE ${idField} = $2
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
      message: "Lỗi server khi cập nhật dữ liệu",
      error: err.message
    });
  }
};

// Cập nhật dữ liệu của một feature bằng composite key
exports.updateFeatureComposite = async (req, res) => {
  const { tableName } = req.params;
  const { column, value, whereClause, compositeFields, compositeValues } = req.body;

  try {
    console.log(`Đang cập nhật ${tableName}, Cột: ${column}, Giá trị: ${value}`);
    console.log(`Điều kiện: ${whereClause}`);
    console.log(`Các trường composite: ${compositeFields}, Giá trị: ${compositeValues}`);
    
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
      [tableName, column]
    );

    if (!columnCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: "Cột dữ liệu không tồn tại"
      });
    }

    // Tạo truy vấn SQL an toàn, tránh SQL Injection
    let query = `UPDATE ${tableName} SET "${column}" = $1 WHERE `;
    let params = [value];
    let paramIndex = 2;
    
    // Sử dụng một trong hai cách, ưu tiên compositeFields/Values vì an toàn hơn
    if (Array.isArray(compositeFields) && Array.isArray(compositeValues) && 
        compositeFields.length === compositeValues.length) {
      const conditions = compositeFields.map((field, index) => {
        params.push(compositeValues[index]);
        return `"${field}" = $${paramIndex++}`;
      });
      query += conditions.join(" AND ");
    } else if (whereClause) {
      // Đây là cách dễ gây SQL Injection, chỉ dùng khi thực sự cần thiết
      // và đã kiểm tra kỹ dữ liệu đầu vào
      query += whereClause;
    } else {
      return res.status(400).json({
        success: false,
        message: "Không có điều kiện WHERE hợp lệ"
      });
    }
    
    query += " RETURNING *";
    console.log("Executing query:", query, "with params:", params);

    const result = await pool.query(query, params);

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
      message: "Lỗi server khi cập nhật dữ liệu",
      error: err.message
    });
  }
};

// Xóa một feature bằng ID
exports.deleteFeature = async (req, res) => {
  const { tableName, featureId } = req.params;
  const idField = req.query.idField || 'gid'; // Mặc định là gid nếu không có tham số

  try {
    console.log(`Đang xóa từ ${tableName}, ${idField}: ${featureId}`);
    
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

    // Kiểm tra xem trường ID có tồn tại không
    const idFieldCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        AND column_name = $2
      )`,
      [tableName, idField]
    );

    if (!idFieldCheck.rows[0].exists) {
      return res.status(400).json({
        success: false,
        message: `Trường ID '${idField}' không tồn tại trong bảng ${tableName}`
      });
    }

    // Xóa dữ liệu
    const query = `
      DELETE FROM ${tableName} 
      WHERE ${idField} = $1
      RETURNING ${idField}
    `;

    const result = await pool.query(query, [featureId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu cần xóa"
      });
    }

    res.json({
      success: true,
      message: "Xóa dữ liệu thành công",
      id: result.rows[0][idField]
    });
  } catch (err) {
    console.error("❌ Lỗi xóa dữ liệu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa dữ liệu",
      error: err.message
    });
  }
};

// Xóa một feature bằng composite key
exports.deleteFeatureComposite = async (req, res) => {
  const { tableName } = req.params;
  const { whereClause, compositeFields, compositeValues } = req.body;

  try {
    console.log(`Đang xóa từ ${tableName}`);
    console.log(`Điều kiện: ${whereClause}`);
    console.log(`Các trường composite: ${compositeFields}, Giá trị: ${compositeValues}`);
    
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

    // Tạo truy vấn SQL an toàn, tránh SQL Injection
    let query = `DELETE FROM ${tableName} WHERE `;
    let params = [];
    let paramIndex = 1;
    
    // Sử dụng một trong hai cách, ưu tiên compositeFields/Values vì an toàn hơn
    if (Array.isArray(compositeFields) && Array.isArray(compositeValues) && 
        compositeFields.length === compositeValues.length) {
      const conditions = compositeFields.map((field, index) => {
        params.push(compositeValues[index]);
        return `"${field}" = $${paramIndex++}`;
      });
      query += conditions.join(" AND ");
    } else if (whereClause) {
      // Đây là cách dễ gây SQL Injection, chỉ dùng khi thực sự cần thiết
      // và đã kiểm tra kỹ dữ liệu đầu vào
      query += whereClause;
    } else {
      return res.status(400).json({
        success: false,
        message: "Không có điều kiện WHERE hợp lệ"
      });
    }
    
    query += " RETURNING *";
    console.log("Executing query:", query, "with params:", params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu cần xóa"
      });
    }

    res.json({
      success: true,
      message: "Xóa dữ liệu thành công",
      count: result.rows.length
    });
  } catch (err) {
    console.error("❌ Lỗi xóa dữ liệu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa dữ liệu",
      error: err.message
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

// Thêm các phương thức này vào data.controller.js:

// Cập nhật dữ liệu bằng điều kiện WHERE
exports.updateWithWhere = async (req, res) => {
  const { table, column, value, whereClause } = req.body;

  if (!table || !column || value === undefined || !whereClause) {
    return res.status(400).json({
      success: false,
      message: "Thiếu thông tin bắt buộc (table, column, value, whereClause)"
    });
  }

  try {
    console.log(`Đang cập nhật ${table}.${column} = ${value}`);
    console.log(`Điều kiện WHERE: ${whereClause}`);
    
    // Kiểm tra xem bảng có tồn tại không
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [table]
    );

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: `Bảng dữ liệu ${table} không tồn tại`
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
      [table, column]
    );

    if (!columnCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: `Cột ${column} không tồn tại trong bảng ${table}`
      });
    }

    // Cập nhật dữ liệu
    const query = `
      UPDATE ${table} 
      SET "${column}" = $1 
      WHERE ${whereClause}
      RETURNING *
    `;

    console.log("Executing query:", query.replace('$1', `'${value}'`));

    const result = await pool.query(query, [value]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu cần cập nhật"
      });
    }

    res.json({
      success: true,
      message: `Cập nhật ${result.rows.length} bản ghi thành công`,
      data: result.rows[0]
    });
  } catch (err) {
    console.error("❌ Lỗi cập nhật dữ liệu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật dữ liệu",
      error: err.message
    });
  }
};

// Xóa dữ liệu bằng điều kiện WHERE
exports.deleteWithWhere = async (req, res) => {
  const { table, whereClause } = req.body;

  if (!table || !whereClause) {
    return res.status(400).json({
      success: false,
      message: "Thiếu thông tin bắt buộc (table, whereClause)"
    });
  }

  try {
    console.log(`Đang xóa từ ${table}`);
    console.log(`Điều kiện WHERE: ${whereClause}`);
    
    // Kiểm tra xem bảng có tồn tại không
    const tableCheck = await pool.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )`,
      [table]
    );

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({
        success: false,
        message: `Bảng dữ liệu ${table} không tồn tại`
      });
    }

    // Xóa dữ liệu
    const query = `
      DELETE FROM ${table} 
      WHERE ${whereClause}
      RETURNING *
    `;

    console.log("Executing query:", query);

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu cần xóa"
      });
    }

    res.json({
      success: true,
      message: `Xóa ${result.rows.length} bản ghi thành công`
    });
  } catch (err) {
    console.error("❌ Lỗi xóa dữ liệu:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa dữ liệu",
      error: err.message
    });
  }
};