// client/src/dashboard/pages/Table.jsx - FIXED VERSION WITH REAL USER NAMES
import React, { useState, useEffect } from "react";
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
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [targetGid, setTargetGid] = useState(null);

  if (!data || data.length === 0) return null;

  // ✅ MAPPING CHÍNH XÁC với spatial intersection và user info
  const columnMapping = {
    loCB: "gid",
    dtich: "area", 
    huyen: "huyen",
    xa: "xa",
    tk: "tk",
    khoanh: "khoanh",
    X: "x_coordinate",
    Y: "y_coordinate",
    xacminh: "detection_status",
    DtichXM: "verified_area",
    ngnhan: "verification_reason",
    NguoiXM: "verified_by_name", // ✅ FIX: Đổi thành verified_by_name thay vì verified_by
    NgayXM: "detection_date",
  };

  // ✅ Tên hiển thị cho các cột
  const getColumnDisplayName = (columnKey) => {
    const displayNames = {
      loCB: "Lô CB",
      dtich: "Diện tích",
      huyen: "Huyện",
      xa: "Xã",
      tk: "Tiểu khu",
      khoanh: "Khoảnh",
      X: "X",
      Y: "Y",
      xacminh: "Trạng thái",
      DtichXM: "DT xác minh",
      ngnhan: "Nguyên nhân",
      NguoiXM: "Người XM",
      NgayXM: "Ngày XM",
    };
    return displayNames[columnKey] || columnKey;
  };

  // ✅ Lấy giá trị thực từ data theo mapping
  const getActualValue = (row, columnKey) => {
    const actualColumnName = columnMapping[columnKey];

    if (actualColumnName && row[actualColumnName] !== undefined) {
      return row[actualColumnName];
    }

    // Fallback names với user info
    const fallbackNames = {
      loCB: ["gid", "GID", "id"],
      dtich: ["area", "AREA", "dtich"],
      huyen: ["huyen", "HUYEN", "huyen_name"],
      xa: ["xa", "XA", "xa_name"],
      tk: ["tk", "TK", "tieukhu", "TIEUKHU"],
      khoanh: ["khoanh", "KHOANH"],
      X: ["x_coordinate", "X", "x", "longitude"],
      Y: ["y_coordinate", "Y", "y", "latitude"],
      xacminh: ["detection_status", "DETECTION_STATUS"],
      DtichXM: ["verified_area", "VERIFIED_AREA"],
      ngnhan: ["verification_reason", "VERIFICATION_REASON"],
      NguoiXM: ["verified_by_name", "verified_by_username", "verified_by", "VERIFIED_BY"], // ✅ FIX: Ưu tiên tên thật
      NgayXM: ["detection_date", "DETECTION_DATE"],
    };

    const possibleNames = fallbackNames[columnKey] || [columnKey];
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null) {
        return row[name];
      }
    }

    return null;
  };

  // ✅ Cột hiển thị theo thứ tự
  const requiredColumns = [
    "loCB", "dtich", "huyen", "xa", "tk", "khoanh", 
    "X", "Y", "xacminh", "DtichXM", "ngnhan", "NguoiXM", "NgayXM"
  ];

  // ✅ Format giá trị hiển thị - FIXED VERSION
  const formatValue = (columnKey, row) => {
    const value = getActualValue(row, columnKey);

    if (value === null || value === undefined) {
      return "NULL";
    }

    switch (columnKey) {
      case "dtich":
      case "DtichXM":
        if (typeof value === "number") {
          if (value > 1000) {
            return `${(value / 10000).toFixed(2)} ha`;
          }
          return `${parseFloat(value).toFixed(2)} ha`;
        }
        return value;

      case "NgayXM":
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("vi-VN");
          }
        }
        return value || "NULL";

      case "X":
      case "Y":
        if (value && value !== null) {
          return parseFloat(value).toFixed(4);
        }
        return "NULL";

      case "xacminh":
        { const statusMap = {
          pending: "Chưa xác minh",
          verifying: "Đang xác minh", 
          verified: "Đã xác minh",
          rejected: "Không xác minh được",
          "Chưa xác minh": "Chưa xác minh",
          "Đang xác minh": "Đang xác minh",
          "Đã xác minh": "Đã xác minh",
        };
        return statusMap[value] || value || "Chưa xác minh"; }

      case "loCB":
        return `CB-${value}`;

      case "NguoiXM":
        // ✅ FIX: Hiển thị tên thật thay vì "User ID"
        if (value) {
          // Nếu có tên thật (verified_by_name)
          if (typeof value === "string" && value !== "NULL") {
            return value;
          }
          // Nếu chỉ có ID (fallback)
          if (typeof value === "number") {
            // Thử lấy từ verified_by_name hoặc verified_by_username trong row
            const realName = row.verified_by_name || row.verified_by_username;
            if (realName) {
              return realName;
            }
            return `User ${value}`;
          }
        }
        return "NULL";

      default:
        return String(value);
    }
  };

  // Debug data changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    // eslint-disable-next-line no-undef
    if (process.env.NODE_ENV === "development" && data && data.length > 0) {
      console.log("🔍 Table data loaded:", data.length, "records");
      
      // ✅ FIX: Debug user info trong data
      const sampleRow = data[0];
      console.log("📋 Sample row user info:", {
        verified_by: sampleRow.verified_by,
        verified_by_name: sampleRow.verified_by_name,
        verified_by_username: sampleRow.verified_by_username
      });
      
      // ✅ FIX: Check for target feature (is_target property or first feature)
      const possibleTarget = data.find(row => row.is_target === true) || data[0];
      if (possibleTarget) {
        const targetGidValue = getActualValue(possibleTarget, "loCB");
        if (targetGidValue) {
          setTargetGid(targetGidValue);
          console.log("🎯 Target GID detected:", targetGidValue);
        }
      }
    }
  }, [data]);

  const skipColumns = ["id", "gid", "geom", "geometry"];

  const isEditableColumn = (col) => {
    return !skipColumns.includes(col.toLowerCase());
  };

  const createWhereCondition = (row) => {
    const gidValue = getActualValue(row, "loCB");
    if (gidValue !== null && gidValue !== undefined) {
      return { field: "gid", value: gidValue, where: `gid = ${gidValue}` };
    }

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

  // ✅ FIX: Enhanced highlight table row event listener
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    const handleHighlightTableRow = (event) => {
      const { feature } = event.detail;

      if (feature && feature.properties && feature.properties.gid) {
        const targetGid = feature.properties.gid;
        console.log("🎯 Highlighting table row for CB-" + targetGid);

        // Find index of row in data
        const rowIndex = data.findIndex((row) => {
          const rowGid = getActualValue(row, "loCB");
          return rowGid && rowGid.toString() === targetGid.toString();
        });

        if (rowIndex !== -1) {
          console.log(`✅ Found row at index ${rowIndex} for CB-${targetGid}`);
          
          setHighlightedRow(rowIndex);
          setSelectedRow(rowIndex);
          setTargetGid(targetGid);

          // Scroll to highlighted row
          setTimeout(() => {
            const tableContainer = document.querySelector(".custom-table-scroll");
            const highlightedRowElement = document.querySelector(`[data-row-index="${rowIndex}"]`);

            if (tableContainer && highlightedRowElement) {
              const containerRect = tableContainer.getBoundingClientRect();
              const rowRect = highlightedRowElement.getBoundingClientRect();

              if (rowRect.top < containerRect.top || rowRect.bottom > containerRect.bottom) {
                highlightedRowElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                console.log("📜 Scrolled to highlighted row");
              }
            }
          }, 100);

          // Auto-clear highlight after 10 seconds
          setTimeout(() => {
            setHighlightedRow(null);
          }, 10000);

          console.log("✅ Table row highlighted for CB-" + targetGid);

          // Call onRowClick if available
          if (onRowClick) {
            onRowClick(data[rowIndex]);
          }
        } else {
          console.warn(`⚠️ Row not found in table for CB-${targetGid}`);
          console.log("Available GIDs:", data.map(row => getActualValue(row, "loCB")));
        }
      }
    };

    window.addEventListener("highlightTableRow", handleHighlightTableRow);

    return () => {
      window.removeEventListener("highlightTableRow", handleHighlightTableRow);
    };
  }, [data, onRowClick]);

  // ✅ FIX: Enhanced getRowStyle function
  const getRowStyle = (rowIndex) => {
    const currentRowGid = getActualValue(data[rowIndex], "loCB");
    const isTargetRow = targetGid && currentRowGid && currentRowGid.toString() === targetGid.toString();
    
    let backgroundColor;
    let borderLeft = "none";
    let fontWeight = "normal";

    if (highlightedRow === rowIndex) {
      // Row được highlight từ search
      backgroundColor = "#fef3c7"; // Vàng nhạt để highlight
      borderLeft = "4px solid #f59e0b"; // Border vàng
      fontWeight = "bold";
    } else if (isTargetRow) {
      // Target row (CB được tìm kiếm)
      backgroundColor = "#fef2f2"; // Đỏ nhạt
      borderLeft = "4px solid #ef4444"; // Border đỏ
      fontWeight = "bold";
    } else if (selectedRow === rowIndex) {
      backgroundColor = "#dbeafe"; // Xanh nhạt
      borderLeft = "4px solid #3b82f6"; // Border xanh
    } else if (editRowIndex === rowIndex) {
      backgroundColor = "#fefce8"; // Vàng nhạt khi edit
      borderLeft = "4px solid #eab308"; // Border vàng
    } else {
      backgroundColor = rowIndex % 2 === 0 ? "#f9fafb" : "white";
    }

    return {
      backgroundColor,
      borderLeft,
      fontWeight,
      cursor: "pointer",
      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

  // Inline styles
  const containerStyle = { width: "100%" };
  const headerStyle = {
    display: "flex",
    flexDirection: window.innerWidth <= 768 ? "column" : "row",
    justifyContent: "space-between",
    alignItems: window.innerWidth <= 768 ? "flex-start" : "center",
    marginBottom: "1rem",
    gap: "0.5rem",
  };

  const tableContainerStyle = {
    backgroundColor: "white",
    borderRadius: "0.75rem",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  };

  const tableWrapperStyle = {
    position: "relative",
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: "60vh",
    minHeight: "300px",
    scrollbarWidth: "thin",
    scrollbarColor: "#027e02 #f1f5f9",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1600px",
  };

  const headerRowStyle = {
    background: "linear-gradient(to right, #027e02, #15803d)",
    color: "white",
    position: "sticky",
    top: 0,
    zIndex: 10,
  };

  const headerCellStyle = {
    padding: "0.75rem 0.5rem",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderRight: "1px solid #16a34a",
    whiteSpace: "nowrap",
    minWidth: "100px",
    maxWidth: "140px",
  };

  const cellStyle = {
    padding: "0.5rem",
    fontSize: "0.8rem",
    color: "#111827",
    borderRight: "1px solid #f3f4f6",
    minWidth: "100px",
    maxWidth: "140px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const actionsCellStyle = {
    ...cellStyle,
    textAlign: "center",
    width: "6rem",
    backgroundColor: "white",
    position: "sticky",
    right: 0,
    borderLeft: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const actionButtonStyle = {
    padding: "0.25rem",
    borderRadius: "0.25rem",
    transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "1px solid transparent",
    minWidth: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    margin: "0 0.125rem",
  };

  const editInputStyle = {
    width: "100%",
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    border: "1px solid #d1d5db",
    borderRadius: "0.25rem",
    transition: "all 0.2s",
  };

  const footerStyle = {
    padding: "0.75rem 1rem",
    backgroundColor: "#f9fafb",
    borderTop: "1px solid #e5e7eb",
  };

  // Add CSS for webkit scrollbar
  // eslint-disable-next-line react-hooks/rules-of-hooks
  React.useEffect(() => {
    const style = document.createElement("style");
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
          🔍 Bảng dữ liệu xác minh ({data.length} bản ghi)
          
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
        <div style={tableWrapperStyle} className="custom-table-scroll">
          <table style={tableStyle}>
            {/* Header */}
            <thead>
              <tr style={headerRowStyle}>
                {requiredColumns.map((columnKey, index) => {
                  const fullName = {
                    xacminh: "Trạng thái xác minh",
                    DtichXM: "Diện tích xác minh", 
                    NguoiXM: "Người xác minh",
                    NgayXM: "Ngày xác minh",
                  }[columnKey] || getColumnDisplayName(columnKey);

                  return (
                    <th key={index} style={headerCellStyle}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs cursor-help" title={fullName}>
                          {getColumnDisplayName(columnKey)}
                        </span>
                        {(columnKey === "dtich" || columnKey === "DtichXM") && (
                          <span className="text-green-200 ml-1">📏</span>
                        )}
                        {columnKey === "loCB" && (
                          <span className="text-red-200 ml-1">🎯</span>
                        )}
                        {columnKey === "NguoiXM" && (
                          <span className="text-blue-200 ml-1">👤</span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {isAdmin() && (
                  <th style={{ ...headerCellStyle, textAlign: "center", borderRight: "none" }}>
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
                  data-row-index={rowIndex}
                  style={getRowStyle(rowIndex)}
                  onClick={() => handleRowClick(row, rowIndex)}
                  onMouseEnter={(e) => {
                    if (selectedRow !== rowIndex && editRowIndex !== rowIndex && highlightedRow !== rowIndex) {
                      e.target.parentElement.style.backgroundColor = "#f0f9ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRow !== rowIndex && editRowIndex !== rowIndex && highlightedRow !== rowIndex) {
                      e.target.parentElement.style.backgroundColor = rowIndex % 2 === 0 ? "#f9fafb" : "white";
                    }
                  }}
                >
                  {requiredColumns.map((columnKey, colIndex) => {
                    const actualColumnName = columnMapping[columnKey] || columnKey;
                    const displayValue = formatValue(columnKey, row);
                    const isNull = getActualValue(row, columnKey) === null;
                    const currentRowGid = getActualValue(row, "loCB");
                    const isTargetCell = targetGid && currentRowGid && currentRowGid.toString() === targetGid.toString() && columnKey === "loCB";

                    return (
                      <td key={colIndex} style={cellStyle}>
                        {editRowIndex === rowIndex && isEditableColumn(actualColumnName) ? (
                          <input
                            type="text"
                            value={editData[actualColumnName] !== undefined ? editData[actualColumnName] : getActualValue(row, columnKey) || ""}
                            onChange={(e) => handleInputChange(columnKey, e.target.value)}
                            style={editInputStyle}
                            onClick={(e) => e.stopPropagation()}
                            placeholder={`Nhập ${getColumnDisplayName(columnKey).toLowerCase()}...`}
                            onFocus={(e) => {
                              e.target.style.outline = "none";
                              e.target.style.boxShadow = "0 0 0 2px #027e02";
                              e.target.style.borderColor = "#027e02";
                            }}
                            onBlur={(e) => {
                              e.target.style.boxShadow = "none";
                              e.target.style.borderColor = "#d1d5db";
                            }}
                          />
                        ) : (
                          <div className="flex items-center">
                            <span
                              className={`truncate ${isTargetCell ? "text-red-700 font-bold text-lg" : ""} ${
                                columnKey === "dtich" || columnKey === "DtichXM" ? "text-green-700 font-medium" : ""
                              } ${columnKey === "NgayXM" ? "text-blue-700" : ""} ${
                                columnKey === "xacminh" ? "text-orange-700 font-medium" : ""
                              } ${columnKey === "NguoiXM" ? "text-purple-700 font-medium" : ""} ${
                                isNull ? "text-gray-400 italic" : ""
                              }`}
                              title={displayValue}
                            >
                              {isTargetCell ? `🎯 ${displayValue}` : displayValue}
                            </span>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions column */}
                  {isAdmin() && (
                    <td style={actionsCellStyle} onClick={(e) => e.stopPropagation()}>
                      {editRowIndex === rowIndex ? (
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={saveChanges}
                            disabled={loading}
                            style={{ ...actionButtonStyle, color: "#16a34a" }}
                            title="Lưu thay đổi"
                          >
                            <FaSave className="w-3 h-3" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            style={{ ...actionButtonStyle, color: "#6b7280" }}
                            title="Hủy chỉnh sửa"
                          >
                            <FaTimes className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center gap-1">
                          <button
                            onClick={() => startEdit(rowIndex, row)}
                            style={{ ...actionButtonStyle, color: "#2563eb", opacity: editRowIndex !== -1 ? 0.5 : 0.7 }}
                            title="Chỉnh sửa"
                            disabled={editRowIndex !== -1}
                          >
                            <FaEdit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            style={{ ...actionButtonStyle, color: "#dc2626", opacity: editRowIndex !== -1 || loading ? 0.5 : 0.7 }}
                            title="Xóa"
                            disabled={editRowIndex !== -1 || loading}
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
              📊 Tổng số bản ghi: <span className="text-forest-green-primary font-bold ml-1">{data.length}</span>
            </span>
           
            
          </div>

          {editRowIndex !== -1 && (
            <div className="text-orange-600 font-medium">✏️ Đang chỉnh sửa hàng #{editRowIndex + 1}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Table;