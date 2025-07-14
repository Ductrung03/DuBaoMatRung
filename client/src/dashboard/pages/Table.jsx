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

  // ✅ MAPPING CHÍNH XÁC: Dựa vào spatial intersection query trong controller
  const columnMapping = {
    // Cột yêu cầu: cột thực tế từ spatial intersection (controller đã cập nhật)
    'loCB': 'gid',                    // mat_rung.gid
    'dtich': 'area',                  // mat_rung.area  
    'huyen': 'huyen',                 // laocai_ranhgioihc.huyen (TÊN HUYỆN)
    'xa': 'xa',                       // laocai_ranhgioihc.xa
    'tk': 'tk',                       // laocai_ranhgioihc.tieukhu AS tk
    'khoanh': 'khoanh',               // laocai_ranhgioihc.khoanh
    'X': 'x_coordinate',              // ST_X(ST_Centroid(m.geom)) as x_coordinate
    'Y': 'y_coordinate',              // ST_Y(ST_Centroid(m.geom)) as y_coordinate
    'xacminh': 'detection_status',    // mat_rung.detection_status
    'DtichXM': 'verified_area',       // mat_rung.verified_area
    'ngnhan': 'verification_reason',  // mat_rung.verification_reason
    'NguoiXM': 'verified_by',         // mat_rung.verified_by
    'NgayXM': 'detection_date'        // mat_rung.detection_date
  };

  // ✅ Tên hiển thị cho các cột (Rút ngắn để tránh đè)
  const getColumnDisplayName = (columnKey) => {
    const displayNames = {
      'loCB': 'Lô cảnh báo',
      'dtich': 'Diện tích', 
      'huyen': 'Huyện',
      'xa': 'Xã',
      'tk': 'Tiểu khu',
      'khoanh': 'Khoảnh',
      'X': 'X',
      'Y': 'Y',
      'xacminh': 'Trạng thái XM',
      'DtichXM': 'DT xác minh',
      'ngnhan': 'Nguyên nhân',
      'NguoiXM': 'Người XM',
      'NgayXM': 'Ngày XM'
    };
    
    return displayNames[columnKey] || columnKey;
  };

  // ✅ Extract tọa độ từ geometry (centroid)
  const extractCoordinatesFromGeometry = (geometry) => {
    if (!geometry) return { x: null, y: null };
    
    try {
      // Parse geometry nếu là string
      const geom = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
      
      if (geom.type === 'MultiPolygon' && geom.coordinates && geom.coordinates[0]) {
        // Lấy polygon đầu tiên của MultiPolygon
        const polygon = geom.coordinates[0];
        if (polygon && polygon[0] && polygon[0].length > 0) {
          // Tính centroid đơn giản (trung bình các điểm)
          const coords = polygon[0];
          let sumX = 0, sumY = 0;
          coords.forEach(coord => {
            sumX += coord[0]; // longitude
            sumY += coord[1]; // latitude
          });
          return {
            x: (sumX / coords.length).toFixed(6),
            y: (sumY / coords.length).toFixed(6)
          };
        }
      } else if (geom.type === 'Polygon' && geom.coordinates && geom.coordinates[0]) {
        // Xử lý Polygon đơn
        const coords = geom.coordinates[0];
        let sumX = 0, sumY = 0;
        coords.forEach(coord => {
          sumX += coord[0];
          sumY += coord[1]; 
        });
        return {
          x: (sumX / coords.length).toFixed(6),
          y: (sumY / coords.length).toFixed(6)
        };
      }
    } catch (error) {
      console.error('Lỗi extract tọa độ:', error);
    }
    
    return { x: null, y: null };
  };

  // ✅ Lấy giá trị thực từ data theo mapping
  const getActualValue = (row, columnKey) => {
    // Tọa độ đã được extract trong controller, không cần extract từ geometry nữa
    const actualColumnName = columnMapping[columnKey];
    
    // Kiểm tra field name chính xác từ spatial intersection
    if (actualColumnName && row[actualColumnName] !== undefined) {
      return row[actualColumnName];
    }
    
    // Fallback: thử các tên khác có thể có
    const fallbackNames = {
      'loCB': ['gid', 'GID', 'id'],
      'dtich': ['area', 'AREA', 'dtich'],
      'huyen': ['huyen', 'HUYEN', 'huyen_name'], // TÊN HUYỆN từ spatial join
      'xa': ['xa', 'XA', 'xa_name'],
      'tk': ['tk', 'TK', 'tieukhu', 'TIEUKHU'],
      'khoanh': ['khoanh', 'KHOANH'],
      'X': ['x_coordinate', 'X', 'x', 'longitude'],
      'Y': ['y_coordinate', 'Y', 'y', 'latitude'],
      'xacminh': ['detection_status', 'DETECTION_STATUS'],
      'DtichXM': ['verified_area', 'VERIFIED_AREA'],
      'ngnhan': ['verification_reason', 'VERIFICATION_REASON', 'verification_notes'],
      'NguoiXM': ['verified_by', 'VERIFIED_BY'],
      'NgayXM': ['detection_date', 'DETECTION_DATE']
    };
    
    const possibleNames = fallbackNames[columnKey] || [columnKey];
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return row[name];
      }
    }
    
    return null;
  };

  // ✅ Cột hiển thị theo thứ tự yêu cầu
  const requiredColumns = [
    'loCB',
    'dtich', 
    'huyen',
    'xa',
    'tk', 
    'khoanh',
    'X',
    'Y',
    'xacminh',
    'DtichXM',
    'ngnhan',
    'NguoiXM',
    'NgayXM'
  ];

  // ✅ Format giá trị hiển thị
  const formatValue = (columnKey, row) => {
    const value = getActualValue(row, columnKey);
    
    if (value === null || value === undefined) {
      return "NULL";
    }

    // Format đặc biệt theo loại cột
    switch (columnKey) {
      case 'dtich':
      case 'DtichXM':
        if (typeof value === 'number') {
          // Nếu giá trị > 1000, có thể là m² cần chuyển sang ha
          if (value > 1000) {
            return `${(value / 10000).toFixed(2)} ha`;
          }
          return `${parseFloat(value).toFixed(2)} ha`;
        }
        return value;

      case 'NgayXM':
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('vi-VN');
          }
        }
        return value || "NULL";

      case 'X':
      case 'Y':
        if (value && value !== null) {
          return parseFloat(value).toFixed(4);
        }
        return "NULL";

      case 'xacminh':
        // Map English status to Vietnamese
        const statusMap = {
          'pending': 'Chưa xác minh',
          'verifying': 'Đang xác minh', 
          'verified': 'Đã xác minh',
          'rejected': 'Không xác minh được',
          'Chưa xác minh': 'Chưa xác minh',
          'Đang xác minh': 'Đang xác minh',
          'Đã xác minh': 'Đã xác minh'
        };
        return statusMap[value] || value || 'Chưa xác minh';

      case 'loCB':
        return `CB-${value}`;

      case 'NguoiXM':
        // Nếu là số (user ID), có thể cần lookup tên
        if (typeof value === 'number') {
          return `User ${value}`;
        }
        return value || "NULL";

      default:
        return String(value);
    }
  };

  // Debug chỉ trong development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && data && data.length > 0) {
      console.log("🔍 Table data loaded:", data.length, "records");
    }
  }, [data]);

  const skipColumns = ["id", "gid", "geom", "geometry"];

  const isEditableColumn = (col) => {
    return !skipColumns.includes(col.toLowerCase());
  };

  const createWhereCondition = (row) => {
    // Sử dụng giá trị thực từ mapping
    const gidValue = getActualValue(row, 'loCB');
    if (gidValue !== null && gidValue !== undefined) {
      return { field: "gid", value: gidValue, where: `gid = ${gidValue}` };
    }

    // Fallback logic khác...
    if (tableName === "mat_rung" || tableName.includes("mat_rung")) {
      const startDau = row.start_dau || row.START_DAU;
      const endSau = row.end_sau || row.END_SAU; 
      const mahuyen = row.mahuyen || row.MAHUYEN;
      
      if (startDau && endSau && mahuyen) {
        return {
          table: "mat_rung",
          where: `start_dau = '${startDau}' AND end_sau = '${endSau}' AND mahuyen = '${mahuyen}'`,
        };
      }
    }

    return {};
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

  const handleInputChange = (columnKey, value) => {
    const actualColumnName = columnMapping[columnKey] || columnKey;
    setEditData({
      ...editData,
      [actualColumnName]: value,
    });
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const originalRow = data[editRowIndex];
      const whereCondition = editData._whereCondition || createWhereCondition(originalRow);

      // Thông báo lưu ý
      toast.info("💾 Đang cập nhật dữ liệu...");

      for (const columnKey of requiredColumns) {
        const actualColumnName = columnMapping[columnKey] || columnKey;
        
        if (
          isEditableColumn(actualColumnName) &&
          editData[actualColumnName] !== getActualValue(originalRow, columnKey)
        ) {
          try {
            const response = await axios.post(
              `${config.API_URL}/api/data/update-with-where`,
              {
                table: tableName || "mat_rung",
                column: actualColumnName,
                value: editData[actualColumnName],
                whereClause: whereCondition.where,
              }
            );

            if (response.data.success) {
              toast.success(`✅ Cập nhật ${getColumnDisplayName(columnKey)} thành công!`);
            } else {
              toast.error(`❌ Lỗi cập nhật ${getColumnDisplayName(columnKey)}: ${response.data.message}`);
            }
          } catch (error) {
            console.error(`Lỗi khi cập nhật cột ${actualColumnName}:`, error);
            toast.error(`❌ Lỗi khi cập nhật ${getColumnDisplayName(columnKey)}: ${error.message}`);
          }
        }
      }

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu:", error);
      toast.error("❌ Lỗi khi cập nhật dữ liệu: " + error.message);
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

      const response = await axios.post(
        `${config.API_URL}/api/data/delete-with-where`,
        {
          table: tableName || "mat_rung",
          whereClause: whereCondition.where,
        }
      );

      if (response.data.success) {
        toast.success("✅ Xóa dữ liệu thành công!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(`❌ Lỗi xóa dữ liệu: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu:", error);
      toast.error("❌ Lỗi khi xóa dữ liệu: " + error.message);
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
    scrollbarWidth: 'thin',
    scrollbarColor: '#027e02 #f1f5f9',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1600px', // Tăng minWidth để có đủ chỗ cho 13 cột
  };

  const headerRowStyle = {
    background: 'linear-gradient(to right, #027e02, #15803d)',
    color: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  };

  const headerCellStyle = {
    padding: '0.75rem 0.5rem',
    textAlign: 'left',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderRight: '1px solid #16a34a',
    whiteSpace: 'nowrap',
    minWidth: '100px', // Đảm bảo width tối thiểu
    maxWidth: '140px', // Tăng maxWidth
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
    padding: '0.5rem',
    fontSize: '0.8rem',
    color: '#111827',
    borderRight: '1px solid #f3f4f6',
    minWidth: '100px', // Đảm bảo width tối thiểu
    maxWidth: '140px', // Tăng maxWidth
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const actionsCellStyle = {
    ...cellStyle,
    textAlign: 'center',
    width: '6rem',
    backgroundColor: 'white',
    position: 'sticky',
    right: 0,
    borderLeft: '1px solid #e5e7eb',
    whiteSpace: 'nowrap',
  };

  const actionButtonStyle = {
    padding: '0.25rem',
    borderRadius: '0.25rem',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid transparent',
    minWidth: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    margin: '0 0.125rem',
  };

  const editInputStyle = {
    width: '100%',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.25rem',
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
          🔍 Bảng dữ liệu xác minh mất rừng ({data.length} bản ghi)
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
                {requiredColumns.map((columnKey, index) => {
                  const fullName = {
                    'xacminh': 'Trạng thái xác minh',
                    'DtichXM': 'Diện tích xác minh', 
                    'NguoiXM': 'Người xác minh',
                    'NgayXM': 'Ngày xác minh'
                  }[columnKey] || getColumnDisplayName(columnKey);
                  
                  return (
                    <th key={index} style={headerCellStyle}>
                      <div className="flex items-center justify-between">
                        <span 
                          className="font-semibold text-xs cursor-help" 
                          title={fullName}
                        >
                          {getColumnDisplayName(columnKey)}
                        </span>
                        {(columnKey === 'dtich' || columnKey === 'DtichXM') && <span className="text-green-200 ml-1">📏</span>}
                        {columnKey === 'huyen' && <span className="text-blue-200 ml-1">🏛️</span>}
                        {columnKey === 'xa' && <span className="text-purple-200 ml-1">🏘️</span>}
                        {columnKey === 'xacminh' && <span className="text-yellow-200 ml-1">✅</span>}
                        {(columnKey === 'X' || columnKey === 'Y') && <span className="text-orange-200 ml-1">📍</span>}
                        {columnKey === 'loCB' && <span className="text-red-200 ml-1">🏷️</span>}
                      </div>
                    </th>
                  );
                })}
                {isAdmin() && (
                  <th style={{...headerCellStyle, textAlign: 'center', borderRight: 'none'}}>
                    <span className="font-semibold text-xs">Thao tác</span>
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
                  {requiredColumns.map((columnKey, colIndex) => {
                    const actualColumnName = columnMapping[columnKey] || columnKey;
                    const displayValue = formatValue(columnKey, row);
                    const isNull = getActualValue(row, columnKey) === null;
                    
                    return (
                      <td key={colIndex} style={cellStyle}>
                        {editRowIndex === rowIndex && isEditableColumn(actualColumnName) ? (
                          <input
                            type="text"
                            value={
                              editData[actualColumnName] !== undefined
                                ? editData[actualColumnName]
                                : getActualValue(row, columnKey) || ""
                            }
                            onChange={(e) => handleInputChange(columnKey, e.target.value)}
                            style={editInputStyle}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={`Nhập ${getColumnDisplayName(columnKey).toLowerCase()}...`}
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
                                (columnKey === 'dtich' || columnKey === 'DtichXM') ? 'text-green-700 font-medium' : ''
                              } ${
                                columnKey === 'NgayXM' ? 'text-blue-700' : ''
                              } ${
                                columnKey === 'xacminh' ? 'text-orange-700 font-medium' : ''
                              } ${
                                columnKey === 'loCB' ? 'text-red-700 font-medium' : ''
                              } ${
                                isNull ? 'text-gray-400 italic' : ''
                              }`}
                              title={displayValue}
                            >
                              {displayValue}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                  
                  {/* Actions column */}
                  {isAdmin() && (
                    <td 
                      style={actionsCellStyle}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {editRowIndex === rowIndex ? (
                        <div className="flex justify-center items-center gap-1">
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
                            <FaSave className="w-3 h-3" />
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
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-1">
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
                            <FaEdit className="w-3 h-3" />
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
                            <FaTrash className="w-3 h-3" />
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