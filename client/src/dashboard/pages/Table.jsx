import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaCheck, FaTimes } from "react-icons/fa";
import config from "../../config";

const Table = ({ data, tableName = "unknown" }) => {
  const { isAdmin } = useAuth();
  const [editMode, setEditMode] = useState({ rowIndex: -1, columnName: null });
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  // Bắt đầu chỉnh sửa một ô
  const startEdit = (rowIndex, columnName, currentValue) => {
    setEditMode({ rowIndex, columnName });
    setEditValue(currentValue !== null ? String(currentValue) : "");
  };

  // Hủy chỉnh sửa
  const cancelEdit = () => {
    setEditMode({ rowIndex: -1, columnName: null });
    setEditValue("");
  };

  // Lưu chỉnh sửa
  const saveEdit = async (featureId) => {
    try {
      setLoading(true);
      
      // Thực hiện API call để cập nhật dữ liệu
      await axios.put(
        `${config.API_URL}/api/data/${tableName}/${featureId}/${editMode.columnName}`,
        { value: editValue }
      );
      
      // Hiển thị thông báo thành công
      toast.success("Cập nhật dữ liệu thành công!");
      
      // Cập nhật lại dữ liệu hiển thị (bằng cách reload trang hoặc cập nhật state)
      // Ở đây để đơn giản, ta sẽ reload trang
      window.location.reload();
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu:", error);
      toast.error("Lỗi khi cập nhật dữ liệu: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
      cancelEdit();
    }
  };

  return (
    <div className="font-sans">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-center text-xl font-bold">Bảng dữ liệu</h2>
        {isAdmin() && (
          <div className="text-sm text-gray-600 italic">
            <span className="text-forest-green-primary mr-1">Lưu ý:</span>
            Nhấp vào biểu tượng <FaEdit className="inline text-blue-600" /> để chỉnh sửa dữ liệu
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
          <thead style={{ backgroundColor: "#4CAF50", color: "white" }}>
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
                  style={{ padding: "10px", border: "1px solid #ddd" }}
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
                    {editMode.rowIndex === rowIndex && editMode.columnName === col ? (
                      <div className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          value={editValue} 
                          onChange={(e) => setEditValue(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 w-full"
                          autoFocus
                        />
                        <button 
                          onClick={() => saveEdit(row.gid || row.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-900"
                          title="Lưu"
                        >
                          <FaCheck />
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
                    <div className="flex justify-center space-x-2">
                      {columns.map((col, colIndex) => {
                        // Bỏ qua các cột không nên chỉnh sửa như id, geom, gid
                        const skipColumns = ['id', 'gid', 'geom', 'geometry'];
                        if (skipColumns.includes(col.toLowerCase())) return null;
                        
                        return (
                          <button 
                            key={colIndex}
                            onClick={() => startEdit(rowIndex, col, row[col])}
                            className="text-blue-600 hover:text-blue-900"
                            title={`Chỉnh sửa ${col}`}
                            disabled={editMode.rowIndex !== -1}
                          >
                            <FaEdit />
                            <span className="sr-only">Sửa {col}</span>
                          </button>
                        );
                      })}
                    </div>
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