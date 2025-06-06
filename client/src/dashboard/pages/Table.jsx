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
      return `${(value / 10000).toFixed(1)} ha`;
    }

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

  // Sắp xếp các cột theo một thứ tự cụ thể
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

  const skipColumns = ["id", "gid", "geom", "geometry"];

  const isEditableColumn = (col) => {
    return !skipColumns.includes(col.toLowerCase());
  };

  const createWhereCondition = (row) => {
    if (row.gid !== undefined)
      return { field: "gid", value: row.gid, where: `gid = ${row.gid}` };
    if (row.id !== undefined)
      return { field: "id", value: row.id, where: `id = ${row.id}` };

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

    let joinCondition = {};

    if (row.start_dau && row.end_sau) {
      joinCondition.mat_rung = `start_dau = '${row.start_dau}' AND end_sau = '${row.end_sau}'`;
      if (row.mahuyen)
        joinCondition.mat_rung += ` AND mahuyen = '${row.mahuyen}'`;
    }

    if (row.tk && row.khoanh) {
      joinCondition.tlaocai_tkk_3lr_cru = `tk = '${row.tk}' AND khoanh = '${row.khoanh}'`;
      if (row.xa) joinCondition.tlaocai_tkk_3lr_cru += ` AND xa = '${row.xa}'`;
    }

    return joinCondition;
  };

  const startEdit = (rowIndex, rowData) => {
    const initialEditData = { ...rowData };
    initialEditData._whereCondition = createWhereCondition(rowData);
    initialEditData._originalData = { ...rowData };
    setEditData(initialEditData);
    setEditRowIndex(rowIndex);
  };

  const cancelEdit = () => {
    setEditRowIndex(-1);
    setEditData({});
  };

  const handleInputChange = (columnName, value) => {
    setEditData({
      ...editData,
      [columnName]: value,
    });
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const originalRow = data[editRowIndex];
      const whereCondition = editData._whereCondition || createWhereCondition(originalRow);

      for (const column in editData) {
        if (column.startsWith("_") || columnsToHide.includes(column)) continue;

        if (
          isEditableColumn(column) &&
          editData[column] !== originalRow[column]
        ) {
          let targetTable, whereClause;

          if (whereCondition.table) {
            targetTable = whereCondition.table;
            whereClause = whereCondition.where;
          }
          else if (
            whereCondition.mat_rung ||
            whereCondition.tlaocai_tkk_3lr_cru
          ) {
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
          else if (whereCondition.field && whereCondition.value !== undefined) {
            targetTable = tableName;
            whereClause = whereCondition.where;
          }
          else {
            console.error("Không thể xác định bảng và điều kiện WHERE cho cập nhật");
            toast.error(`Không thể cập nhật cột ${column}: không xác định được dữ liệu`);
            continue;
          }

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
              toast.error(`Lỗi cập nhật cột ${column}: ${response.data.message}`);
            }
          } catch (error) {
            console.error(`Lỗi khi cập nhật cột ${column}:`, error);
            toast.error(`Lỗi khi cập nhật cột ${column}: ${error.message}`);
          }
        }
      }

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

  const handleDelete = async (row) => {
    try {
      const whereCondition = createWhereCondition(row);

      if (!whereCondition || Object.keys(whereCondition).length === 0) {
        console.error("Chi tiết hàng cần xóa:", row);
        toast.error("Không thể xác định dữ liệu để xóa");
        return;
      }

      if (!window.confirm(`Bạn có chắc chắn muốn xóa bản ghi này không?`)) {
        return;
      }

      setLoading(true);

      let targetTable, whereClause;

      if (whereCondition.table) {
        targetTable = whereCondition.table;
        whereClause = whereCondition.where;
      }
      else if (whereCondition.mat_rung || whereCondition.tlaocai_tkk_3lr_cru) {
        if (whereCondition.mat_rung) {
          targetTable = "mat_rung";
          whereClause = whereCondition.mat_rung;
        } else {
          targetTable = "tlaocai_tkk_3lr_cru";
          whereClause = whereCondition.tlaocai_tkk_3lr_cru;
        }
      }
      else if (whereCondition.field && whereCondition.value !== undefined) {
        targetTable = tableName;
        whereClause = whereCondition.where;
      }
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

  const handleRowClick = (row, rowIndex) => {
    setSelectedRow(rowIndex);
    if (onRowClick) {
      onRowClick(row);
    }
  };

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

  // Inline styles
  const containerStyle = {
    width: '100%',
  };

  const headerStyle = {
    display: 'flex',
    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: window.innerWidth <= 768 ? 'flex-start' : 'center',
    marginBottom: '1rem',
    gap: '0.5rem',
  };

  const tableContainerStyle = {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  };

  const tableWrapperStyle = {
    position: 'relative',
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '60vh',
    minHeight: '300px',
    // Custom scrollbar styles for webkit browsers
    scrollbarWidth: 'thin',
    scrollbarColor: '#027e02 #f1f5f9',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  };

  const headerRowStyle = {
    background: 'linear-gradient(to right, #027e02, #15803d)',
    color: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };

  const headerCellStyle = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderRight: '1px solid #16a34a',
    whiteSpace: 'nowrap',
  };

  const getRowStyle = (rowIndex) => ({
    backgroundColor: 
      selectedRow === rowIndex 
        ? '#dbeafe' 
        : editRowIndex === rowIndex 
        ? '#fefce8'
        : rowIndex % 2 === 0 
        ? '#f9fafb' 
        : 'white',
    borderLeft: 
      selectedRow === rowIndex 
        ? '4px solid #3b82f6'
        : editRowIndex === rowIndex
        ? '4px solid #eab308'
        : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  const cellStyle = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: '#111827',
    borderRight: '1px solid #f3f4f6',
    maxWidth: '200px',
  };

  const actionsCellStyle = {
    ...cellStyle,
    textAlign: 'center',
    width: '6rem',
    backgroundColor: 'white',
    position: 'sticky',
    right: 0,
    borderLeft: '1px solid #e5e7eb',
  };

  const actionButtonStyle = {
    padding: '0.5rem',
    borderRadius: '0.5rem',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    minWidth: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    margin: '0 0.125rem',
  };

  const editInputStyle = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    transition: 'all 0.2s',
  };

  const footerStyle = {
    padding: '0.75rem 1rem',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  };

  // Add CSS for webkit scrollbar via style tag
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-table-scroll::-webkit-scrollbar {
        width: 12px;
        height: 12px;
      }
      .custom-table-scroll::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 6px;
      }
      .custom-table-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(to bottom, #027e02, #15803d);
        border-radius: 6px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      .custom-table-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(to bottom, #15803d, #166534);
      }
      .custom-table-scroll::-webkit-scrollbar-corner {
        background: #f1f5f9;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          Bảng dữ liệu
        </h2>
        {isAdmin() && (
          <div className="text-xs sm:text-sm text-gray-600 italic bg-blue-50 p-2 rounded-md border-l-4 border-blue-400">
            <span className="text-forest-green-primary font-medium">💡 Lưu ý:</span>
            <span className="ml-1">Nhấp</span>
            <FaEdit className="inline mx-1 text-blue-600" />
            <span>để chỉnh sửa hoặc</span>
            <FaTrash className="inline mx-1 text-red-600" />
            <span>để xóa</span>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div style={tableContainerStyle}>
        <div 
          style={tableWrapperStyle} 
          className="custom-table-scroll"
        >
          <table style={tableStyle}>
            {/* Header */}
            <thead>
              <tr style={headerRowStyle}>
                {sortedColumns.map((col, index) => (
                  <th key={index} style={headerCellStyle}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">
                        {getColumnDisplayName(col)}
                      </span>
                      {col === 'area' && <span className="text-green-200 ml-1">📏</span>}
                      {col === 'huyen' && <span className="text-blue-200 ml-1">🏛️</span>}
                      {col === 'xa' && <span className="text-purple-200 ml-1">🏘️</span>}
                    </div>
                  </th>
                ))}
                {isAdmin() && (
                  <th style={{...headerCellStyle, textAlign: 'center', borderRight: 'none'}}>
                    <span className="font-semibold text-sm">Thao tác</span>
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  style={getRowStyle(rowIndex)}
                  onClick={() => handleRowClick(row, rowIndex)}
                  onMouseEnter={(e) => {
                    if (selectedRow !== rowIndex && editRowIndex !== rowIndex) {
                      e.target.parentElement.style.backgroundColor = '#f0f9ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRow !== rowIndex && editRowIndex !== rowIndex) {
                      e.target.parentElement.style.backgroundColor = 
                        rowIndex % 2 === 0 ? '#f9fafb' : 'white';
                    }
                  }}
                >
                  {sortedColumns.map((col, colIndex) => (
                    <td key={colIndex} style={cellStyle}>
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
                          style={editInputStyle}
                          onClick={(e) => e.stopPropagation()}
                          placeholder={`Nhập ${getColumnDisplayName(col).toLowerCase()}...`}
                          onFocus={(e) => {
                            e.target.style.outline = 'none';
                            e.target.style.boxShadow = '0 0 0 2px #027e02';
                            e.target.style.borderColor = '#027e02';
                          }}
                          onBlur={(e) => {
                            e.target.style.boxShadow = 'none';
                            e.target.style.borderColor = '#d1d5db';
                          }}
                        />
                      ) : (
                        <div className="flex items-center">
                          <span 
                            className={`truncate ${
                              col === 'area' ? 'text-green-700 font-medium' : ''
                            } ${
                              ['start_dau', 'end_sau'].includes(col) ? 'text-blue-700' : ''
                            }`}
                            title={formatValue(col, row[col])}
                          >
                            {formatValue(col, row[col])}
                          </span>
                        </div>
                      )}
                    </td>
                  ))}
                  
                  {/* Actions column */}
                  {isAdmin() && (
                    <td 
                      style={actionsCellStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editRowIndex === rowIndex ? (
                        <div className="flex justify-center items-center gap-3">
                          <button
                            onClick={saveChanges}
                            disabled={loading}
                            style={{
                              ...actionButtonStyle,
                              color: '#16a34a',
                              backgroundColor: loading ? '#f3f4f6' : 'transparent',
                            }}
                            title="Lưu thay đổi"
                            onMouseEnter={(e) => {
                              if (!loading) {
                                e.target.style.backgroundColor = '#f0fdf4';
                                e.target.style.borderColor = '#bbf7d0';
                                e.target.style.color = '#15803d';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!loading) {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = 'transparent';
                                e.target.style.color = '#16a34a';
                              }
                            }}
                          >
                            <FaSave className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{
                              ...actionButtonStyle,
                              color: '#6b7280',
                            }}
                            title="Hủy chỉnh sửa"
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#f9fafb';
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.color = '#374151';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.borderColor = 'transparent';
                              e.target.style.color = '#6b7280';
                            }}
                          >
                            <FaTimes className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => startEdit(rowIndex, row)}
                            style={{
                              ...actionButtonStyle,
                              color: '#2563eb',
                              opacity: editRowIndex !== -1 ? 0.5 : 0.7,
                            }}
                            title="Chỉnh sửa"
                            disabled={editRowIndex !== -1}
                            onMouseEnter={(e) => {
                              if (editRowIndex === -1) {
                                e.target.style.backgroundColor = '#eff6ff';
                                e.target.style.borderColor = '#bfdbfe';
                                e.target.style.color = '#1d4ed8';
                                e.target.style.opacity = '1';
                                e.target.style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (editRowIndex === -1) {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = 'transparent';
                                e.target.style.color = '#2563eb';
                                e.target.style.opacity = '0.7';
                                e.target.style.transform = 'scale(1)';
                              }
                            }}
                          >
                            <FaEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            style={{
                              ...actionButtonStyle,
                              color: '#dc2626',
                              opacity: editRowIndex !== -1 || loading ? 0.5 : 0.7,
                            }}
                            title="Xóa"
                            disabled={editRowIndex !== -1 || loading}
                            onMouseEnter={(e) => {
                              if (editRowIndex === -1 && !loading) {
                                e.target.style.backgroundColor = '#fef2f2';
                                e.target.style.borderColor = '#fecaca';
                                e.target.style.color = '#b91c1c';
                                e.target.style.opacity = '1';
                                e.target.style.transform = 'scale(1.05)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (editRowIndex === -1 && !loading) {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.borderColor = 'transparent';
                                e.target.style.color = '#dc2626';
                                e.target.style.opacity = '0.7';
                                e.target.style.transform = 'scale(1)';
                              }
                            }}
                          >
                            <FaTrash className="w-4 h-4" />
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

      {/* Footer */}
      <div style={footerStyle}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span className="font-medium">
              📊 Tổng số bản ghi: 
              <span className="text-forest-green-primary font-bold ml-1">{data.length}</span>
            </span>
            {selectedRow !== null && (
              <span className="text-blue-600">
                🎯 Đã chọn hàng #{selectedRow + 1}
              </span>
            )}
          </div>
          
          {editRowIndex !== -1 && (
            <div className="text-orange-600 font-medium">
              ✏️ Đang chỉnh sửa hàng #{editRowIndex + 1}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;