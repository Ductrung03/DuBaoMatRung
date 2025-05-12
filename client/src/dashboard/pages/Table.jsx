import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";

const Table = ({ data, tableName = "unknown", onRowClick }) => {
  const { isAdmin } = useAuth();
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  if (!data || data.length === 0) return null;

  const formatValue = (columnName, value) => {
    if (columnName === "area" && value !== null) {
      // Chuyển đổi từ m² sang ha và làm tròn đến 1 số thập phân
      return `${(value / 10000).toFixed(1)} ha`;
    }

    // Format date fields
    if (["start_dau", "end_sau"].includes(columnName) && value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('vi-VN');
      }
    }

    return value !== null ? String(value) : "NULL";
  };

  // Lấy tất cả các cột
  const allColumns = Object.keys(data[0]);
  
  // Lọc bỏ các cột tọa độ không cần hiển thị
  const columnsToHide = ['x', 'y', 'x_vn2000', 'y_vn2000', 'geom', 'geometry', '_whereCondition', '_originalData'];
  const columns = allColumns.filter(col => !columnsToHide.includes(col));

  // Sắp xếp các cột theo một thứ tự cụ thể (để các cột quan trọng hiển thị trước)
  const sortedColumns = [
    'huyen', 'xa', 'mahuyen', 'maxa', 'area', 'start_dau', 'end_sau', 
    'tk', 'khoanh', 'lo', 'churung', 'detection_status'
  ].filter(col => columns.includes(col));

  // Thêm các cột còn lại
  columns.forEach(col => {
    if (!sortedColumns.includes(col)) {
      sortedColumns.push(col);
    }
  });

  // Các cột không được phép chỉnh sửa
  const skipColumns = ["id", "gid", "geom", "geometry"];

  // Kiểm tra xem cột có được phép chỉnh sửa hay không
  const isEditableColumn = (col) => {
    return !skipColumns.includes(col.toLowerCase());
  };

  // Tạo điều kiện WHERE để xác định duy nhất một hàng
  const createWhereCondition = (row) => {
    // Nếu có gid hoặc id, sử dụng trực tiếp
    if (row.gid !== undefined)
      return { field: "gid", value: row.gid, where: `gid = ${row.gid}` };
    if (row.id !== undefined)
      return { field: "id", value: row.id, where: `id = ${row.id}` };

    // Tạo điều kiện dựa vào dữ liệu hiện có
    if (tableName === "mat_rung" || tableName.includes("mat_rung")) {
      if (row.start_dau && row.end_sau && row.mahuyen) {
        return {
          table: "mat_rung",
          where: `start_dau = '${row.start_dau}' AND end_sau = '${row.end_sau}' AND mahuyen = '${row.mahuyen}'`,
        };
      }
    } else if (
      tableName === "tlaocai_tkk_3lr_cru" ||
      tableName.includes("tkk")
    ) {
      if (row.tk && row.khoanh && row.xa) {
        return {
          table: "tlaocai_tkk_3lr_cru",
          where: `tk = '${row.tk}' AND khoanh = '${row.khoanh}' AND xa = '${row.xa}'`,
        };
      }
    }

    // Nếu là kết quả join hoặc không xác định được bảng dữ liệu
    let joinCondition = {};

    // Thử tạo điều kiện cho mat_rung
    if (row.start_dau && row.end_sau) {
      joinCondition.mat_rung = `start_dau = '${row.start_dau}' AND end_sau = '${row.end_sau}'`;
      if (row.mahuyen)
        joinCondition.mat_rung += ` AND mahuyen = '${row.mahuyen}'`;
    }

    // Thử tạo điều kiện cho tlaocai_tkk_3lr_cru
    if (row.tk && row.khoanh) {
      joinCondition.tlaocai_tkk_3lr_cru = `tk = '${row.tk}' AND khoanh = '${row.khoanh}'`;
      if (row.xa) joinCondition.tlaocai_tkk_3lr_cru += ` AND xa = '${row.xa}'`;
    }

    return joinCondition;
  };

  // Bắt đầu chỉnh sửa một hàng
  const startEdit = (rowIndex, rowData) => {
    // Tạo một bản sao của dữ liệu hàng để chỉnh sửa
    const initialEditData = { ...rowData };

    // Lưu lại điều kiện WHERE
    initialEditData._whereCondition = createWhereCondition(rowData);
    initialEditData._originalData = { ...rowData };

    setEditData(initialEditData);
    setEditRowIndex(rowIndex);
  };

  // Hủy chỉnh sửa
  const cancelEdit = () => {
    setEditRowIndex(-1);
    setEditData({});
  };

  // Xử lý thay đổi giá trị trong form chỉnh sửa
  const handleInputChange = (columnName, value) => {
    setEditData({
      ...editData,
      [columnName]: value,
    });
  };

  // Lưu tất cả các thay đổi
  const saveChanges = async () => {
    try {
      setLoading(true);

      // Lấy dữ liệu gốc để so sánh
      const originalRow = data[editRowIndex];
      const whereCondition =
        editData._whereCondition || createWhereCondition(originalRow);

      // Kiểm tra từng cột đã thay đổi
      for (const column in editData) {
        // Bỏ qua các trường meta
        if (column.startsWith("_") || columnsToHide.includes(column)) continue;

        // Chỉ cập nhật các cột được phép chỉnh sửa và có giá trị thay đổi
        if (
          isEditableColumn(column) &&
          editData[column] !== originalRow[column]
        ) {
          console.log(
            `Cập nhật cột ${column} từ [${originalRow[column]}] thành [${editData[column]}]`
          );

          // Xác định bảng dữ liệu và điều kiện WHERE
          let targetTable, whereClause;

          // Trường hợp đơn giản: biết chính xác bảng dữ liệu
          if (whereCondition.table) {
            targetTable = whereCondition.table;
            whereClause = whereCondition.where;
          }
          // Trường hợp phức tạp: dữ liệu join
          else if (
            whereCondition.mat_rung ||
            whereCondition.tlaocai_tkk_3lr_cru
          ) {
            // Xác định bảng dựa vào cột
            if (["start_dau", "end_sau", "mahuyen", "area"].includes(column)) {
              targetTable = "mat_rung";
              whereClause = whereCondition.mat_rung;
            } else if (
              ["tk", "khoanh", "xa", "huyen", "churung"].includes(column)
            ) {
              targetTable = "tlaocai_tkk_3lr_cru";
              whereClause = whereCondition.tlaocai_tkk_3lr_cru;
            } else {
              console.warn(`Không thể xác định bảng cho cột ${column}`);
              continue;
            }
          }
          // Trường hợp đơn giản: có field và value rõ ràng
          else if (whereCondition.field && whereCondition.value !== undefined) {
            targetTable = tableName;
            whereClause = whereCondition.where;
          }
          // Không thể xác định bảng và điều kiện
          else {
            console.error(
              "Không thể xác định bảng và điều kiện WHERE cho cập nhật"
            );
            toast.error(
              `Không thể cập nhật cột ${column}: không xác định được dữ liệu`
            );
            continue;
          }

          // API endpoint mới sử dụng cập nhật với WHERE clause
          try {
            const response = await axios.post(
              `${config.API_URL}/api/data/update-with-where`,
              {
                table: targetTable,
                column: column,
                value: editData[column],
                whereClause: whereClause,
              }
            );

            if (response.data.success) {
              toast.success(`Cập nhật cột ${column} thành công!`);
            } else {
              toast.error(
                `Lỗi cập nhật cột ${column}: ${response.data.message}`
              );
            }
          } catch (error) {
            console.error(`Lỗi khi cập nhật cột ${column}:`, error);
            toast.error(`Lỗi khi cập nhật cột ${column}: ${error.message}`);
          }
        }
      }

      // Cập nhật lại dữ liệu hiển thị
      window.location.reload();
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu:", error);
      toast.error(
        "Lỗi khi cập nhật dữ liệu: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa dữ liệu
  const handleDelete = async (row) => {
    try {
      const whereCondition = createWhereCondition(row);

      if (!whereCondition || Object.keys(whereCondition).length === 0) {
        console.error("Chi tiết hàng cần xóa:", row);
        toast.error("Không thể xác định dữ liệu để xóa");
        return;
      }

      // Hiển thị xác nhận trước khi xóa
      if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này không?`)) {
        return;
      }

      setLoading(true);

      // Xác định bảng dữ liệu và điều kiện WHERE
      let targetTable, whereClause;

      // Trường hợp đơn giản: biết chính xác bảng dữ liệu
      if (whereCondition.table) {
        targetTable = whereCondition.table;
        whereClause = whereCondition.where;
      }
      // Trường hợp phức tạp: dữ liệu join
      else if (whereCondition.mat_rung || whereCondition.tlaocai_tkk_3lr_cru) {
        // Ưu tiên xóa từ bảng mat_rung vì dữ liệu joint thường liên kết với mat_rung
        if (whereCondition.mat_rung) {
          targetTable = "mat_rung";
          whereClause = whereCondition.mat_rung;
        } else {
          targetTable = "tlaocai_tkk_3lr_cru";
          whereClause = whereCondition.tlaocai_tkk_3lr_cru;
        }
      }
      // Trường hợp đơn giản: có field và value rõ ràng
      else if (whereCondition.field && whereCondition.value !== undefined) {
        targetTable = tableName;
        whereClause = whereCondition.where;
      }
      // Không thể xác định bảng và điều kiện
      else {
        console.error("Không thể xác định bảng và điều kiện WHERE cho xóa");
        toast.error("Không thể xóa dữ liệu: không xác định được bản ghi");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.post(
          `${config.API_URL}/api/data/delete-with-where`,
          {
            table: targetTable,
            whereClause: whereClause,
          }
        );

        if (response.data.success) {
          toast.success("Xóa dữ liệu thành công!");
          window.location.reload();
        } else {
          toast.error(`Lỗi xóa dữ liệu: ${response.data.message}`);
        }
      } catch (error) {
        console.error("Lỗi khi xóa dữ liệu:", error);
        toast.error(
          "Lỗi khi xóa dữ liệu: " +
            (error.response?.data?.message || error.message)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Xử lý click vào một hàng để zoom tới đối tượng
  const handleRowClick = (row, rowIndex) => {
    setSelectedRow(rowIndex);
    if (onRowClick) {
      onRowClick(row);
    }
  };

  // Hiển thị tên người dùng thân thiện cho một số cột
  const getColumnDisplayName = (columnName) => {
    const columnMap = {
      'huyen': 'Huyện',
      'xa': 'Xã',
      'mahuyen': 'Mã huyện',
      'maxa': 'Mã xã',
      'area': 'Diện tích',
      'start_dau': 'Từ ngày',
      'end_sau': 'Đến ngày',
      'tk': 'Tiểu khu',
      'khoanh': 'Khoảnh',
      'lo': 'Lô',
      'churung': 'Chủ rừng',
      'detection_status': 'Trạng thái'
    };
    
    return columnMap[columnName] || columnName;
  };

  return (
    <div className="font-sans">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-center text-xl font-bold">Bảng dữ liệu</h2>
        {isAdmin() && (
          <div className="text-sm text-gray-600 italic">
            <span className="text-forest-green-primary mr-1">Lưu ý:</span>
            Nhấp vào biểu tượng <FaEdit className="inline text-blue-600" /> để
            chỉnh sửa hoặc <FaTrash className="inline text-red-600" /> để xóa dữ
            liệu
          </div>
        )}
      </div>

      <div
        style={{
          overflowX: "auto",
          maxHeight: "400px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
          padding: "10px",
          backgroundColor: "#fff",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{
              backgroundColor: "#4CAF50",
              color: "white",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            <tr>
              {sortedColumns.map((col, index) => (
                <th
                  key={index}
                  style={{ padding: "10px", border: "1px solid #ddd" }}
                >
                  {getColumnDisplayName(col)}
                </th>
              ))}
              {isAdmin() && (
                <th
                  style={{
                    padding: "10px",
                    border: "1px solid #ddd",
                    width: "100px",
                  }}
                >
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor: rowIndex % 2 === 0 ? "#f2f2f2" : "white",
                  cursor: "pointer",
                  border:
                    selectedRow === rowIndex
                      ? "2px solid #4CAF50"
                      : "1px solid #ddd",
                }}
                onClick={() => handleRowClick(row, rowIndex)}
              >
                {sortedColumns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    style={{ padding: "10px", border: "1px solid #ddd" }}
                  >
                    {editRowIndex === rowIndex && isEditableColumn(col) ? (
                      <input
                        type="text"
                        value={
                          editData[col] !== undefined
                            ? editData[col]
                            : row[col] !== null
                            ? row[col]
                            : ""
                        }
                        onChange={(e) => handleInputChange(col, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        onClick={(e) => e.stopPropagation()} // Ngăn sự kiện click lan ra row
                      />
                    ) : (
                      formatValue(col, row[col])
                    )}
                  </td>
                ))}
                {isAdmin() && (
                  <td
                    style={{
                      padding: "10px",
                      border: "1px solid #ddd",
                      textAlign: "center",
                    }}
                     onClick={(e) => e.stopPropagation()} // Ngăn sự kiện click lan ra row
                  >
                    {editRowIndex === rowIndex ? (
                      <div className="flex justify-center space-x-3">
                        <button
                          onClick={saveChanges}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900"
                          title="Lưu"
                        >
                          <FaSave />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-600 hover:text-red-900"
                          title="Hủy"
                        >
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => startEdit(rowIndex, row)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Chỉnh sửa"
                          disabled={editRowIndex !== -1}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="text-red-600 hover:text-red-900"
                          title="Xóa"
                          disabled={editRowIndex !== -1 || loading}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Debug information */}
      {data.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Số bản ghi: {data.length}
        </div>
      )}
    </div>
  );
};

export default Table;