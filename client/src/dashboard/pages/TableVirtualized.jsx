// client/src/dashboard/pages/TableVirtualized.jsx
// Virtualized table with react-window for 60 FPS scrolling
import React, { useState, useEffect, useRef, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";
import { convertTcvn3ToUnicode } from "../../utils/fontConverter";

const ROW_HEIGHT = 45; // Height of each row in pixels
const HEADER_HEIGHT = 48;
const MAX_TABLE_HEIGHT = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.6, 600) : 600;

const TableVirtualized = ({ data, tableName = "unknown", onRowClick }) => {
  const { isAdmin } = useAuth();
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [targetGid, setTargetGid] = useState(null);
  const listRef = useRef(null);

  // ⚡ Responsive width for actions column
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ⚡ Flexible column widths using flex-grow ratios (auto-scale with container)
  const getColumnFlex = (columnKey) => {
    // Sử dụng flex-grow để các cột tự động chia tỷ lệ
    switch(columnKey) {
      case "loCB": return "0.8";        // Nhỏ nhất
      case "dtich": return "1.2";
      case "DtichXM": return "1.2";
      case "xa": return "1.5";          // Rộng hơn
      case "tk": return "1";
      case "khoanh": return "1";
      case "X": return "1.1";
      case "Y": return "1.1";
      case "xacminh": return "1.3";
      case "ngnhan": return "1.6";      // Rộng nhất
      case "NguoiXM": return "1.3";
      case "NgayXM": return "1.2";
      default: return "1";
    }
  };

  // Actions column flex ratio
  const actionsColumnFlex = "1.2";

  // Calculate gap between buttons based on screen size
  const actionsGap = useMemo(() => {
    if (screenWidth < 640) return "0.15rem";
    if (screenWidth < 768) return "0.25rem";
    return "0.5rem";
  }, [screenWidth]);

  if (!data || data.length === 0) return null;

  // Column mapping (same as original Table.jsx)
  const columnMapping = {
    loCB: "gid",
    dtich: "dtich",
    xa: "xa",
    tk: "tk",
    khoanh: "khoanh",
    X: "x",
    Y: "y",
    xacminh: "detection_status",
    DtichXM: "dtichXM",
    ngnhan: "verification_reason",
    NguoiXM: "verified_by_name",
    NgayXM: "detection_date",
  };

  const getColumnDisplayName = (columnKey) => {
    const displayNames = {
      loCB: "Lô CB",
      dtich: "Diện tích",
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

  const getActualValue = (row, columnKey) => {
    const actualColumnName = columnMapping[columnKey];
    if (actualColumnName && row[actualColumnName] !== undefined) {
      return row[actualColumnName];
    }

    const fallbackNames = {
      loCB: ["gid", "GID", "id"],
      dtich: ["dtich", "DTICH", "area", "AREA"],
      xa: ["xa", "XA", "xa_name"],
      tk: ["tk", "TK", "tieukhu", "TIEUKHU"],
      khoanh: ["khoanh", "KHOANH"],
      X: ["x_coordinate", "X", "x", "longitude"],
      Y: ["y_coordinate", "Y", "y", "latitude"],
      xacminh: ["detection_status", "DETECTION_STATUS"],
      DtichXM: ["dtichXM", "dtich_xm", "verified_area", "VERIFIED_AREA"],
      ngnhan: ["verification_reason", "VERIFICATION_REASON"],
      NguoiXM: ["verified_by_name", "verified_by_username", "verified_by", "VERIFIED_BY"],
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

  const requiredColumns = [
    "loCB", "dtich", "xa", "tk", "khoanh",
    "X", "Y", "xacminh", "DtichXM", "ngnhan", "NguoiXM", "NgayXM"
  ];

  const formatValue = (columnKey, row) => {
    const value = getActualValue(row, columnKey);
    if (value === null || value === undefined) return "NULL";

    // Format diện tích
    if (columnKey === "dtich" || columnKey === "DtichXM") {
      const numValue = parseFloat(value);
      return !isNaN(numValue) ? `${(numValue / 10000).toFixed(1)} ha` : value;
    }

    // Format tọa độ X, Y - làm tròn 5 chữ số thập phân
    if (columnKey === "X" || columnKey === "Y") {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return Number(numValue.toFixed(5));
      }
      return value;
    }

    // Format text fields - convert TCVN3 to Unicode
    if ((columnKey === "xa" || columnKey === "tk" || columnKey === "khoanh" || columnKey === "ngnhan") && value) {
      try {
        const converted = convertTcvn3ToUnicode(value.toString());
        return converted || value;
      } catch (error) {
        return value;
      }
    }

    // Format ngày tháng
    if (columnKey === "NgayXM" && value) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString("vi-VN");
      } catch {
        return value;
      }
    }

    // Format trạng thái xác minh
    if (columnKey === "xacminh") {
      const statusMap = {
        "positive": "✅ Xác nhận",
        "negative": "❌ Phủ nhận",
        "pending": "⏳ Chờ xử lý",
        "unknown": "❓ Không rõ"
      };
      return statusMap[value] || value || "⏳ Chờ xử lý";
    }

    return value.toString();
  };

  const isEditableColumn = (columnName) => {
    const editableColumns = ["detection_status", "dtichXM", "verification_reason"];
    return editableColumns.includes(columnName);
  };

  // Event handlers (same as original)
  const startEdit = (rowIndex, row) => {
    setEditRowIndex(rowIndex);
    setEditData({
      detection_status: getActualValue(row, "xacminh"),
      dtichXM: getActualValue(row, "DtichXM"),
      verification_reason: getActualValue(row, "ngnhan"),
    });
  };

  const cancelEdit = () => {
    setEditRowIndex(-1);
    setEditData({});
  };

  const handleInputChange = (columnKey, value) => {
    const actualColumnName = columnMapping[columnKey];
    setEditData(prev => ({ ...prev, [actualColumnName]: value }));
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      const row = data[editRowIndex];
      const gid = getActualValue(row, "loCB");

      const response = await axios.put(
        `${config.API_BASE_URL}/mat-rung/${gid}`,
        editData,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.success) {
        toast.success("Cập nhật thành công!");
        Object.assign(data[editRowIndex], editData);
        cancelEdit();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;

    try {
      setLoading(true);
      const gid = getActualValue(row, "loCB");
      const response = await axios.delete(
        `${config.API_BASE_URL}/mat-rung/${gid}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      if (response.data.success) {
        toast.success("Xóa thành công!");
        const index = data.indexOf(row);
        if (index > -1) data.splice(index, 1);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi xóa");
    } finally {
      setLoading(false);
    }
  };

  // Row renderer for react-window
  const Row = ({ index, style }) => {
    const row = data[index];
    const currentRowGid = getActualValue(row, "loCB");
    const isTargetRow = targetGid && currentRowGid && currentRowGid.toString() === targetGid.toString();

    let backgroundColor;
    if (highlightedRow === index) {
      backgroundColor = "#fef3c7";
    } else if (isTargetRow) {
      backgroundColor = "#fef2f2";
    } else if (selectedRow === index) {
      backgroundColor = "#dbeafe";
    } else if (editRowIndex === index) {
      backgroundColor = "#fefce8";
    } else {
      backgroundColor = index % 2 === 0 ? "#f9fafb" : "white";
    }

    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          backgroundColor,
          borderBottom: "1px solid #f3f4f6",
          cursor: "pointer",
          transition: "background-color 0.2s",
        }}
        onClick={() => {
          setSelectedRow(index);
          onRowClick && onRowClick(row);
        }}
      >
        {requiredColumns.map((columnKey, colIndex) => {
          const displayValue = formatValue(columnKey, row);
          const isNull = getActualValue(row, columnKey) === null;
          const actualColumnName = columnMapping[columnKey];
          const isTargetCell = isTargetRow && columnKey === "loCB";

          return (
            <div
              key={colIndex}
              style={{
                flex: `${getColumnFlex(columnKey)} 1 0`,
                padding: "0.5rem",
                fontSize: "0.8rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                borderRight: "1px solid #f3f4f6",
              }}
            >
              {editRowIndex === index && isEditableColumn(actualColumnName) ? (
                <input
                  type="text"
                  value={editData[actualColumnName] !== undefined ? editData[actualColumnName] : getActualValue(row, columnKey) || ""}
                  onChange={(e) => handleInputChange(columnKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.25rem",
                  }}
                />
              ) : (
                <span
                  className={`${isTargetCell ? "text-red-700 font-bold" : ""} ${isNull ? "text-gray-400 italic" : ""}`}
                  title={displayValue}
                >
                  {isTargetCell ? `🎯 ${displayValue}` : displayValue}
                </span>
              )}
            </div>
          );
        })}

        {/* Actions column */}
        {isAdmin() && (
          <div
            style={{
              flex: `${actionsColumnFlex} 1 0`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: actionsGap,
              backgroundColor: "white",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {editRowIndex === index ? (
              <>
                <button
                  onClick={saveChanges}
                  disabled={loading}
                  style={{
                    color: "#16a34a",
                    padding: screenWidth < 640 ? "0.2rem" : "0.25rem",
                    cursor: "pointer",
                    fontSize: screenWidth < 640 ? "0.875rem" : "1rem"
                  }}
                  title="Lưu"
                >
                  <FaSave />
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    color: "#6b7280",
                    padding: screenWidth < 640 ? "0.2rem" : "0.25rem",
                    cursor: "pointer",
                    fontSize: screenWidth < 640 ? "0.875rem" : "1rem"
                  }}
                  title="Hủy"
                >
                  <FaTimes />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => startEdit(index, row)}
                  disabled={editRowIndex !== -1}
                  style={{
                    color: "#2563eb",
                    padding: screenWidth < 640 ? "0.2rem" : "0.25rem",
                    cursor: "pointer",
                    opacity: editRowIndex !== -1 ? 0.5 : 1,
                    fontSize: screenWidth < 640 ? "0.875rem" : "1rem"
                  }}
                  title="Sửa"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(row)}
                  disabled={editRowIndex !== -1 || loading}
                  style={{
                    color: "#dc2626",
                    padding: screenWidth < 640 ? "0.2rem" : "0.25rem",
                    cursor: "pointer",
                    opacity: editRowIndex !== -1 ? 0.5 : 1,
                    fontSize: screenWidth < 640 ? "0.875rem" : "1rem"
                  }}
                  title="Xóa"
                >
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "linear-gradient(to right, #027e02, #15803d)",
            color: "white",
            fontSize: "0.7rem",
            fontWeight: "bold",
            textTransform: "uppercase",
            height: `${HEADER_HEIGHT}px`,
          }}
        >
          {requiredColumns.map((columnKey, index) => {
            return (
              <div
                key={index}
                style={{
                  flex: `${getColumnFlex(columnKey)} 1 0`,
                  padding: "0.75rem 0.5rem",
                  borderRight: "1px solid #16a34a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {getColumnDisplayName(columnKey)}
              </div>
            );
          })}
          {isAdmin() && (
            <div
              style={{
                flex: `${actionsColumnFlex} 1 0`,
                textAlign: "center",
                borderRight: "none",
                fontSize: screenWidth < 640 ? "0.65rem" : "0.7rem"
              }}
            >
              {screenWidth < 640 ? "TT" : "Thao tác"}
            </div>
          )}
        </div>

        {/* Virtualized rows */}
        <List
          ref={listRef}
          height={Math.min(data.length * ROW_HEIGHT, MAX_TABLE_HEIGHT)}
          itemCount={data.length}
          itemSize={ROW_HEIGHT}
          width="100%"
        >
          {Row}
        </List>

        {/* Footer */}
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.875rem" }}>
            <span>
              📊 Tổng số bản ghi: <strong style={{ color: "#027e02" }}>{data.length}</strong>
            </span>
            {editRowIndex !== -1 && (
              <span style={{ color: "#f59e0b" }}>✏️ Đang chỉnh sửa hàng #{editRowIndex + 1}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableVirtualized;
