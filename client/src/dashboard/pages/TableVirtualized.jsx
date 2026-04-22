// client/src/dashboard/pages/TableVirtualized.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";
import { convertTcvn3ToUnicode } from "../../utils/fontConverter";

const ROW_HEIGHT = 45;
const HEADER_HEIGHT = 48;
const MAX_TABLE_HEIGHT = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.6, 600) : 600;

// ── Pure constants ngoài component ──────────────────────────────────────────
const COLUMN_MAPPING = {
  loCB: "gid", dtich: "dtich", xa: "xa", tk: "tk", khoanh: "khoanh",
  X: "x", Y: "y", xacminh: "detection_status", DtichXM: "dtichXM",
  ngnhan: "verification_reason", ghichu: "verification_notes",
  NguoiXM: "verified_by_name", NgayXM: "detection_date",
};

const REQUIRED_COLUMNS = [
  "loCB","dtich","xa","tk","khoanh","X","Y",
  "xacminh","DtichXM","ngnhan","ghichu","NguoiXM","NgayXM"
];

const COLUMN_FLEX = {
  loCB:"0.8", dtich:"1.2", DtichXM:"1.2", xa:"1.5", tk:"1", khoanh:"1",
  X:"1.1", Y:"1.1", xacminh:"1.3", ngnhan:"1.6", ghichu:"1.6",
  NguoiXM:"1.3", NgayXM:"1.2",
};

const COLUMN_DISPLAY = {
  loCB:"Lô CB", dtich:"Diện tích", xa:"Xã", tk:"Tiểu khu", khoanh:"Khoảnh",
  X:"X", Y:"Y", xacminh:"Trạng thái", DtichXM:"DT xác minh",
  ngnhan:"Nguyên nhân", ghichu:"Ghi chú", NguoiXM:"Người XM", NgayXM:"Ngày XM",
};

const ACTIONS_FLEX = "1.2";
const EDITABLE_COLS = ["detection_status","dtichXM","verification_reason","verification_notes"];
const STATUS_OPTIONS = ["Đã xác minh", "Chưa xác minh"];

function getActualValue(row, columnKey) {
  const col = COLUMN_MAPPING[columnKey];
  if (col && row[col] !== undefined) return row[col];
  const fallbacks = {
    loCB:["gid","GID","id"], dtich:["dtich","DTICH","area"],
    xa:["xa","XA","xa_name"], tk:["tk","TK","tieukhu"],
    khoanh:["khoanh","KHOANH"], X:["x_coordinate","X","x","longitude"],
    Y:["y_coordinate","Y","y","latitude"], xacminh:["detection_status"],
    DtichXM:["dtichXM","dtich_xm","verified_area"],
    ngnhan:["verification_reason"], ghichu:["verification_notes"],
    NguoiXM:["verified_by_name","verified_by_username","verified_by"],
    NgayXM:["detection_date"],
  };
  for (const name of (fallbacks[columnKey] || [columnKey])) {
    if (row[name] !== undefined && row[name] !== null) return row[name];
  }
  return null;
}

function formatValue(columnKey, row) {
  const value = getActualValue(row, columnKey);
  const optional = ["DtichXM","ngnhan","ghichu","NguoiXM","NgayXM"];
  if (value === null || value === undefined) return optional.includes(columnKey) ? "-" : "NULL";

  if (columnKey === "dtich") return `${((parseFloat(value)||0)/10000).toFixed(2)} ha`;
  if (columnKey === "DtichXM") {
    const n = parseFloat(value);
    return (isNaN(n) || n <= 0) ? "-" : `${(n/10000).toFixed(2)} ha`;
  }
  if (columnKey === "X" || columnKey === "Y") {
    const n = parseFloat(value);
    return isNaN(n) ? value : Number(n.toFixed(5));
  }
  if ((columnKey === "xa" || columnKey === "tk" || columnKey === "khoanh") && value) {
    try { return convertTcvn3ToUnicode(value.toString()) || value; } catch { return value; }
  }
  if (columnKey === "NgayXM" && value) {
    try { return new Date(value).toLocaleDateString("vi-VN"); } catch { return value; }
  }
  if (columnKey === "xacminh") {
    const m = { positive:"✅ Xác nhận", negative:"❌ Phủ nhận", pending:"⏳ Chờ xử lý", unknown:"❓ Không rõ" };
    return m[value] || value || "⏳ Chờ xử lý";
  }
  return value.toString();
}

// ── Row được định nghĩa NGOÀI component → reference ổn định ─────────────────
// Nhận state qua itemData → react-window re-render khi itemData thay đổi
const Row = ({ index, style, data: d }) => {
  const {
    rows, editRowIndex, editData, selectedRow, highlightedRow,
    targetGid, screenWidth, loading, actionsGap, isAdminUser,
    onSetSelectedRow, onRowClickFn, onStartEdit, onCancelEdit,
    onSaveChanges, onDeleteRow, onInputChange,
  } = d;

  const row = rows[index];
  if (!row) return null;

  const gid = getActualValue(row, "loCB");
  const isTarget = targetGid && gid && gid.toString() === targetGid.toString();

  let bg;
  if (highlightedRow === index) bg = "#fef3c7";
  else if (isTarget)            bg = "#fef2f2";
  else if (selectedRow === index) bg = "#dbeafe";
  else if (editRowIndex === index) bg = "#fefce8";
  else bg = index % 2 === 0 ? "#f9fafb" : "white";

  return (
    <div
      style={{ ...style, display:"flex", alignItems:"center", backgroundColor:bg,
        borderBottom:"1px solid #f3f4f6", cursor:"pointer", transition:"background-color 0.2s" }}
      onClick={() => { onSetSelectedRow(index); onRowClickFn && onRowClickFn(row); }}
    >
      {REQUIRED_COLUMNS.map((colKey, ci) => {
        const display = formatValue(colKey, row);
        const isNull  = getActualValue(row, colKey) === null;
        const colName = COLUMN_MAPPING[colKey];
        const isTargetCell = isTarget && colKey === "loCB";

        return (
          <div
            key={ci}
            style={{ flex:`${COLUMN_FLEX[colKey]||"1"} 1 0`, padding:"0.5rem",
              fontSize:"0.8rem", overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap", borderRight:"1px solid #f3f4f6" }}
          >
            {editRowIndex === index && EDITABLE_COLS.includes(colName) ? (
              colName === "detection_status" ? (
                <select
                  value={editData[colName] !== undefined ? (editData[colName] ?? "") : (getActualValue(row, colKey) ?? "")}
                  onChange={(e) => onInputChange(colKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width:"100%", padding:"0.25rem 0.5rem", fontSize:"0.75rem",
                    border:"1px solid #d1d5db", borderRadius:"0.25rem", background:"white" }}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={editData[colName] !== undefined ? (editData[colName] ?? "") : (getActualValue(row, colKey) ?? "")}
                  onChange={(e) => onInputChange(colKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  autoFocus={colKey === "ngnhan"}
                  style={{ width:"100%", padding:"0.25rem 0.5rem", fontSize:"0.75rem",
                    border:"1px solid #d1d5db", borderRadius:"0.25rem" }}
                />
              )
            ) : (
              <span
                className={`${isTargetCell?"text-red-700 font-bold":""} ${isNull?"text-gray-400 italic":""}`}
                title={display}
              >
                {isTargetCell ? `🎯 ${display}` : display}
              </span>
            )}
          </div>
        );
      })}

      {isAdminUser && (
        <div
          style={{ flex:`${ACTIONS_FLEX} 1 0`, display:"flex", justifyContent:"center",
            alignItems:"center", gap:actionsGap, backgroundColor:"white" }}
          onClick={(e) => e.stopPropagation()}
        >
          {editRowIndex === index ? (
            <>
              <button onClick={onSaveChanges} disabled={loading}
                style={{ color:"#16a34a", padding:screenWidth<640?"0.2rem":"0.25rem",
                  cursor:"pointer", fontSize:screenWidth<640?"0.875rem":"1rem" }} title="Lưu">
                <FaSave />
              </button>
              <button onClick={onCancelEdit}
                style={{ color:"#6b7280", padding:screenWidth<640?"0.2rem":"0.25rem",
                  cursor:"pointer", fontSize:screenWidth<640?"0.875rem":"1rem" }} title="Hủy">
                <FaTimes />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onStartEdit(index, row)} disabled={editRowIndex !== -1}
                style={{ color:"#2563eb", padding:screenWidth<640?"0.2rem":"0.25rem",
                  cursor:"pointer", opacity:editRowIndex!==-1?0.5:1,
                  fontSize:screenWidth<640?"0.875rem":"1rem" }} title="Sửa">
                <FaEdit />
              </button>
              <button onClick={() => onDeleteRow(row)} disabled={editRowIndex !== -1 || loading}
                style={{ color:"#dc2626", padding:screenWidth<640?"0.2rem":"0.25rem",
                  cursor:"pointer", opacity:editRowIndex!==-1?0.5:1,
                  fontSize:screenWidth<640?"0.875rem":"1rem" }} title="Xóa">
                <FaTrash />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Component ────────────────────────────────────────────────────────────────
const TableVirtualized = ({ data, tableName = "unknown", onRowClick }) => {
  const { isAdmin } = useAuth();
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [highlightedRow, setHighlightedRow] = useState(null);
  const [targetGid, setTargetGid] = useState(null);
  const listRef = useRef(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);

  useEffect(() => {
    const h = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const actionsGap = useMemo(() => {
    if (screenWidth < 640) return "0.15rem";
    if (screenWidth < 768) return "0.25rem";
    return "0.5rem";
  }, [screenWidth]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const startEdit = useCallback((rowIndex, row) => {
    setEditRowIndex(rowIndex);
    setEditData({
      detection_status: getActualValue(row, "xacminh"),
      dtichXM: getActualValue(row, "DtichXM"),
      verification_reason: getActualValue(row, "ngnhan"),
      verification_notes: getActualValue(row, "ghichu"),
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditRowIndex(-1);
    setEditData({});
  }, []);

  const handleInputChange = useCallback((columnKey, value) => {
    const colName = COLUMN_MAPPING[columnKey];
    setEditData(prev => ({ ...prev, [colName]: value }));
  }, []);

  // dùng ref để saveChanges/handleDelete luôn có data/editData mới nhất
  const editStateRef = useRef({ editRowIndex, editData, data });
  editStateRef.current = { editRowIndex, editData, data };

  const saveChanges = useCallback(async () => {
    const { data: rows, editRowIndex: idx, editData: ed } = editStateRef.current;
    try {
      setLoading(true);
      const row = rows[idx];
      const gid = getActualValue(row, "loCB");
      const response = await axios.put(
        `${config.API_BASE_URL}/mat-rung/${gid}`, ed,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.success) {
        toast.success("Cập nhật thành công!");
        Object.assign(rows[idx], ed);
        setEditRowIndex(-1);
        setEditData({});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (row) => {
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
        const { data: rows } = editStateRef.current;
        const i = rows.indexOf(row);
        if (i > -1) rows.splice(i, 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa");
    } finally {
      setLoading(false);
    }
  }, []);

  if (!data || data.length === 0) return null;

  // ── itemData: thay đổi khi state thay đổi → react-window re-render rows ──
  const itemData = {
    rows: data,
    editRowIndex, editData, selectedRow, highlightedRow,
    targetGid, screenWidth, loading, actionsGap,
    isAdminUser: isAdmin(),
    onSetSelectedRow: setSelectedRow,
    onRowClickFn: onRowClick,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onSaveChanges: saveChanges,
    onDeleteRow: handleDelete,
    onInputChange: handleInputChange,
  };

  return (
    <div style={{ width:"100%" }}>
      <div style={{ backgroundColor:"white", borderRadius:"0.75rem",
        boxShadow:"0 10px 15px -3px rgba(0,0,0,0.1)", border:"1px solid #e5e7eb", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center",
          background:"linear-gradient(to right, #027e02, #15803d)", color:"white",
          fontSize:"0.7rem", fontWeight:"bold", textTransform:"uppercase", height:`${HEADER_HEIGHT}px` }}>
          {REQUIRED_COLUMNS.map((colKey, i) => (
            <div key={i} style={{ flex:`${COLUMN_FLEX[colKey]||"1"} 1 0`, padding:"0.75rem 0.5rem",
              borderRight:"1px solid #16a34a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {COLUMN_DISPLAY[colKey] || colKey}
            </div>
          ))}
          {isAdmin() && (
            <div style={{ flex:`${ACTIONS_FLEX} 1 0`, textAlign:"center",
              fontSize:screenWidth<640?"0.65rem":"0.7rem" }}>
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
          itemData={itemData}
          width="100%"
        >
          {Row}
        </List>

        {/* Footer */}
        <div style={{ padding:"0.75rem 1rem", backgroundColor:"#f9fafb", borderTop:"1px solid #e5e7eb" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.875rem" }}>
            <span>📊 Tổng số bản ghi: <strong style={{ color:"#027e02" }}>{data.length}</strong></span>
            {editRowIndex !== -1 && <span style={{ color:"#f59e0b" }}>✏️ Đang chỉnh sửa hàng #{editRowIndex+1}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableVirtualized;
