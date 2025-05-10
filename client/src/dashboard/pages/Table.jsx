import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";

const Table = ({ data, tableName = "unknown" }) => {
  const { isAdmin } = useAuth();
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  
  // Các cột không được phép chỉnh sửa
  const skipColumns = ['id', 'gid', 'geom', 'geometry'];
  
  // Kiểm tra xem cột có được phép chỉnh sửa hay không
  const isEditableColumn = (col) => {
    return !skipColumns.includes(col.toLowerCase());
  };

  // Lấy ID của hàng (dùng gid nếu có, nếu không thì dùng id)
  const getRowId = (row) => {
    return row.gid || row.id;
  };

  // Bắt đầu chỉnh sửa một hàng
  const startEdit = (rowIndex, rowData) => {
    // Tạo một bản sao của dữ liệu hàng để chỉnh sửa
    const initialEditData = { ...rowData };
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
      [columnName]: value
    });
  };

  // Lưu tất cả các thay đổi
  const saveChanges = async () => {
    try {
      setLoading(true);
      
      // Lấy dữ liệu gốc để so sánh
      const originalRow = data[editRowIndex];
      const featureId = getRowId(originalRow);
      
      if (!featureId) {
        toast.error("Không thể xác định ID của bản ghi");
        cancelEdit();
        return;
      }

      // Log for debugging
      console.log("Feature ID:", featureId);
      console.log("Original row:", originalRow);
      console.log("Edit data:", editData);
      
      // Mảng chứa các promise cập nhật
      const updatePromises = [];
      
      // Kiểm tra từng cột đã thay đổi
      for (const column in editData) {
        // Chỉ cập nhật các cột được phép chỉnh sửa và có giá trị thay đổi
        if (isEditableColumn(column) && editData[column] !== originalRow[column]) {
          console.log(`Updating column ${column} from ${originalRow[column]} to ${editData[column]}`);
          
          const updatePromise = axios.put(
            `${config.API_URL}/api/data/${tableName}/${featureId}/${column}`,
            { value: editData[column] }
          );
          updatePromises.push(updatePromise);
        }
      }
      
      // Thực hiện tất cả các request cập nhật
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        toast.success("Cập nhật dữ liệu thành công!");
        
        // Cập nhật lại dữ liệu hiển thị
        window.location.reload();
      } else {
        toast.info("Không có thay đổi nào để cập nhật");
        cancelEdit();
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu:", error);
      toast.error("Lỗi khi cập nhật dữ liệu: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xóa dữ liệu
  const handleDelete = async (row) => {
    try {
      const featureId = getRowId(row);
      
      if (!featureId) {
        toast.error("Không thể xác định ID của bản ghi");
        return;
      }
      
      // Hiển thị xác nhận trước khi xóa
      if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này không? (ID: ${featureId})`)) {
        return;
      }
      
      setLoading(true);
      
      // Gọi API xóa dữ liệu
      await axios.delete(`${config.API_URL}/api/data/${tableName}/${featureId}`);
      
      toast.success("Xóa dữ liệu thành công!");
      
      // Cập nhật lại dữ liệu hiển thị
      window.location.reload();
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu:", error);
      toast.error("Lỗi khi xóa dữ liệu: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-center text-xl font-bold">Bảng dữ liệu</h2>
        {isAdmin() && (
          <div className="text-sm text-gray-600 italic">
            <span className="text-forest-green-primary mr-1">Lưu ý:</span>
            Nhấp vào biểu tượng <FaEdit className="inline text-blue-600" /> để chỉnh sửa hoặc <FaTrash className="inline text-red-600" /> để xóa dữ liệu
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
          <thead style={{ backgroundColor: "#4CAF50", color: "white", position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  style={{ padding: "10px", border: "1px solid #ddd" }}
                >
                  {col}
                </th>
              ))}
              {isAdmin() && (
                <th
                  style={{ padding: "10px", border: "1px solid #ddd", width: "100px" }}
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
                }}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    style={{ padding: "10px", border: "1px solid #ddd" }}
                  >
                    {editRowIndex === rowIndex && isEditableColumn(col) ? (
                      <input 
                        type="text" 
                        value={editData[col] !== undefined ? editData[col] : (row[col] !== null ? row[col] : "")}
                        onChange={(e) => handleInputChange(col, e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                      />
                    ) : (
                      row[col] !== null ? String(row[col]) : "NULL"
                    )}
                  </td>
                ))}
                {isAdmin() && (
                  <td 
                    style={{ 
                      padding: "10px", 
                      border: "1px solid #ddd",
                      textAlign: "center"
                    }}
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
    </div>
  );
};

export default Table;