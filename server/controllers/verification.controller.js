// server/controllers/verification.controller.js
const pool = require("../db");

// ✅ Xác minh lô CB với logic mới
exports.verifyMatRung = async (req, res) => {
  const { gid } = req.params;
  const { 
    verification_reason,
    verified_area, // Có thể null/undefined
    verification_notes,
    detection_date // Có thể null/undefined
  } = req.body;

  // Lấy ID user từ token (đã được set bởi auth middleware)
  const verifiedBy = req.user.id;
  const verifiedByName = req.user.full_name;

  if (!gid) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã lô CB (gid)"
    });
  }

  if (!verification_reason) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn nguyên nhân xác minh"
    });
  }

  try {
    console.log(`🔍 Bắt đầu xác minh lô CB-${gid} bởi user ${verifiedByName} (ID: ${verifiedBy})`);

    // Bước 1: Kiểm tra lô CB có tồn tại không
    const checkQuery = `
      SELECT gid, area, detection_status, verified_area 
      FROM mat_rung 
      WHERE gid = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [gid]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid} trong cơ sở dữ liệu`
      });
    }

    const currentRecord = checkResult.rows[0];
    console.log(`📋 Lô CB-${gid} hiện tại:`, {
      area: currentRecord.area,
      status: currentRecord.detection_status,
      verified_area: currentRecord.verified_area
    });

    // Bước 2: Xác định giá trị cập nhật theo logic mới
    
    // 🔧 Logic diện tích thực tế:
    // - Nếu không nhập (null/undefined/empty) → giữ nguyên giá trị hiện tại
    // - Nếu có nhập → cập nhật giá trị mới
    let finalVerifiedArea;
    if (verified_area === null || verified_area === undefined || verified_area === '') {
      finalVerifiedArea = currentRecord.verified_area || currentRecord.area; // Giữ nguyên hoặc dùng area gốc
      console.log(`📏 Diện tích: Giữ nguyên = ${finalVerifiedArea}`);
    } else {
      finalVerifiedArea = parseFloat(verified_area);
      if (isNaN(finalVerifiedArea) || finalVerifiedArea < 0) {
        return res.status(400).json({
          success: false,
          message: "Diện tích thực tế phải là số hợp lệ và lớn hơn 0"
        });
      }
      console.log(`📏 Diện tích: Cập nhật mới = ${finalVerifiedArea}`);
    }

    // 🔧 Logic ngày xác minh:
    // - Nếu không nhập → lấy ngày hiện tại
    // - Nếu có nhập → dùng ngày đó
    let finalDetectionDate;
    if (!detection_date) {
      finalDetectionDate = new Date().toISOString().split('T')[0]; // Ngày hiện tại YYYY-MM-DD
      console.log(`📅 Ngày xác minh: Dùng ngày hiện tại = ${finalDetectionDate}`);
    } else {
      finalDetectionDate = detection_date;
      console.log(`📅 Ngày xác minh: Dùng ngày nhập = ${finalDetectionDate}`);
    }

    // Bước 3: Thực hiện cập nhật với transaction
    await pool.query('BEGIN');

    try {
      const updateQuery = `
        UPDATE mat_rung 
        SET 
          detection_status = 'Đã xác minh',
          verification_reason = $1,
          verified_area = $2,
          verification_notes = $3,
          detection_date = $4,
          verified_by = $5
        WHERE gid = $6
        RETURNING *
      `;

      const updateParams = [
        verification_reason,
        finalVerifiedArea,
        verification_notes || null,
        finalDetectionDate,
        verifiedBy,
        gid
      ];

      console.log(`💾 Executing update với params:`, updateParams);

      const updateResult = await pool.query(updateQuery, updateParams);

      if (updateResult.rows.length === 0) {
        throw new Error('Không thể cập nhật lô CB');
      }

      await pool.query('COMMIT');

      const updatedRecord = updateResult.rows[0];
      console.log(`✅ Xác minh thành công lô CB-${gid}`);

      // Bước 4: Lấy thông tin đầy đủ để trả về (bao gồm tên người xác minh)
      const detailQuery = `
        SELECT 
          m.*,
          u.full_name as verified_by_name,
          r.huyen,
          r.xa,
          r.tieukhu as tk,
          r.khoanh
        FROM mat_rung m
        LEFT JOIN users u ON m.verified_by = u.id  
        LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
          ST_Transform(m.geom, 4326), 
          ST_Transform(r.geom, 4326)
        )
        WHERE m.gid = $1
      `;

      const detailResult = await pool.query(detailQuery, [gid]);
      const finalRecord = detailResult.rows[0];

      res.json({
        success: true,
        message: `✅ Đã xác minh thành công lô CB-${gid}`,
        data: {
          gid: finalRecord.gid,
          detection_status: finalRecord.detection_status,
          verification_reason: finalRecord.verification_reason,
          verified_area: finalRecord.verified_area,
          original_area: finalRecord.area,
          verification_notes: finalRecord.verification_notes,
          detection_date: finalRecord.detection_date,
          verified_by: finalRecord.verified_by,
          verified_by_name: finalRecord.verified_by_name,
          updated_at: new Date().toISOString()
        },
        changes: {
          area_changed: finalVerifiedArea !== currentRecord.area,
          original_area: currentRecord.area,
          new_verified_area: finalVerifiedArea,
          verification_date_used: finalDetectionDate,
          verified_by_user: verifiedByName
        }
      });

    } catch (updateError) {
      await pool.query('ROLLBACK');
      throw updateError;
    }

  } catch (err) {
    console.error("❌ Lỗi xác minh lô CB:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xác minh lô CB",
      error: err.message
    });
  }
};

// ✅ Lấy lịch sử xác minh của một lô CB
exports.getVerificationHistory = async (req, res) => {
  const { gid } = req.params;

  try {
    const query = `
      SELECT 
        m.gid,
        m.detection_status,
        m.verification_reason,
        m.verified_area,
        m.area as original_area,
        m.verification_notes,
        m.detection_date,
        m.verified_by,
        u.full_name as verified_by_name,
        u.username as verified_by_username
      FROM mat_rung m
      LEFT JOIN users u ON m.verified_by = u.id
      WHERE m.gid = $1
    `;

    const result = await pool.query(query, [gid]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid}`
      });
    }

    const record = result.rows[0];

    res.json({
      success: true,
      data: {
        gid: record.gid,
        status: record.detection_status || 'Chưa xác minh',
        has_verification: !!record.verification_reason,
        verification: record.verification_reason ? {
          reason: record.verification_reason,
          verified_area: record.verified_area,
          original_area: record.original_area,
          area_changed: record.verified_area !== record.original_area,
          notes: record.verification_notes,
          date: record.detection_date,
          verified_by: {
            id: record.verified_by,
            name: record.verified_by_name,
            username: record.verified_by_username
          }
        } : null
      }
    });

  } catch (err) {
    console.error("❌ Lỗi lấy lịch sử xác minh:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử xác minh",
      error: err.message
    });
  }
};