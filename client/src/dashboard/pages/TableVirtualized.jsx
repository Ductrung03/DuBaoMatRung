// client/src/dashboard/pages/TableVirtualized.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";
import { convertTcvn3ToUnicode } from "../../utils/fontConverter";

const ROW_HEIGHT = 42;
const MAX_TABLE_HEIGHT = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.6, 600) : 600;

// ── Pixel widths cố định cho mỗi cột – đảm bảo header & rows thẳng hàng ──────
const COLUMN_WIDTH = {
  loPH: 85,   soLan: 50,
  kyDauBD: 92, kyDauKT: 92, kySauBD: 92, kySauKT: 92,
  dtich: 82,  xa: 130,     tk: 72,      khoanh: 66,
  X: 95,      Y: 95,
  xacminh: 122, DtichXM: 95,
  ngnhan: 140, NguoiXM: 110, NgayXM: 92, ghichu: 140,
};
const ACTIONS_WIDTH = 85;

const COLUMN_MAPPING = {
  loPH: "gid", soLan: "so_lan",
  kyDauBD: "start_dau", kyDauKT: "end_dau",
  kySauBD: "start_sau", kySauKT: "end_sau",
  dtich: "dtich", xa: "xa", tk: "tk", khoanh: "khoanh",
  X: "x_coordinate", Y: "y_coordinate",
  xacminh: "detection_status", DtichXM: "dtichXM",
  ngnhan: "verification_reason", ghichu: "verification_notes",
  NguoiXM: "verified_by_name", NgayXM: "detection_date",
};

const REQUIRED_COLUMNS = [
  "loPH","soLan","kyDauBD","kyDauKT","kySauBD","kySauKT",
  "dtich","xa","tk","khoanh","X","Y",
  "xacminh","DtichXM","ngnhan","NguoiXM","NgayXM","ghichu"
];

const COLUMN_DISPLAY = {
  loPH:"Lô phát hiện", soLan:"Số lần",
  kyDauBD:"KĐ Bắt đầu", kyDauKT:"KĐ Kết thúc",
  kySauBD:"KS Bắt đầu", kySauKT:"KS Kết thúc",
  dtich:"Diện tích (ha)", xa:"Xã", tk:"Tiểu khu", khoanh:"Khoảnh",
  X:"X", Y:"Y",
  xacminh:"Trạng thái XM", DtichXM:"DT XM (ha)",
  ngnhan:"Nguyên nhân", NguoiXM:"Người XM", NgayXM:"Ngày XM", ghichu:"Ghi chú",
};

const EDITABLE_COLS = ["detection_status","dtichXM","verification_reason","verification_notes"];
const STATUS_OPTIONS = ["Đã xác minh", "Chưa xác minh"];

// Tổng chiều rộng bảng (tính khi render, tuỳ admin)
function getTotalWidth(isAdminUser) {
  const base = REQUIRED_COLUMNS.reduce((s, k) => s + (COLUMN_WIDTH[k] || 80), 0);
  return base + (isAdminUser ? ACTIONS_WIDTH : 0);
}

function getActualValue(row, columnKey) {
  const col = COLUMN_MAPPING[columnKey];
  if (col && row[col] !== undefined) return row[col];
  const fallbacks = {
    loPH:["gid","GID","id"],
    soLan:["so_lan"],
    kyDauBD:["start_dau"], kyDauKT:["end_dau"],
    kySauBD:["start_sau"], kySauKT:["end_sau"],
    dtich:["dtich","DTICH","area"],
    xa:["xa","XA","xa_name"], tk:["tk","TK","tieukhu"],
    khoanh:["khoanh","KHOANH"],
    X:["x_coordinate","X","x","longitude"],
    Y:["y_coordinate","Y","y","latitude"],
    xacminh:["detection_status"],
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

const DATE_COLS = ["kyDauBD","kyDauKT","kySauBD","kySauKT","NgayXM"];

function formatDate(value) {
  if (!value) return "-";
  try { return new Date(value).toLocaleDateString("vi-VN"); } catch { return value; }
}

function formatValue(columnKey, row) {
  const value = getActualValue(row, columnKey);
  const optional = ["soLan","kyDauBD","kyDauKT","kySauBD","kySauKT","DtichXM","ngnhan","ghichu","NguoiXM","NgayXM"];
  if (value === null || value === undefined) return optional.includes(columnKey) ? "-" : "NULL";

  if (columnKey === "loPH") return `PH-${value}`;
  if (columnKey === "soLan") return value;
  if (DATE_COLS.includes(columnKey)) return formatDate(value);
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
  if (columnKey === "xacminh") {
    const m = { positive:"✅ Xác nhận", negative:"❌ Phủ nhận", pending:"⏳ Chờ xử lý", unknown:"❓ Không rõ" };
    return m[value] || value || "⏳ Chờ xử lý";
  }
  return value.toString();
}

// ── Cell style dùng chung ─────────────────────────────────────────────────────
const cellBase = (width) => ({
  width: `${width}px`,
  flexShrink: 0,
  padding: "0 6px",
  fontSize: "0.77rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  borderRight: "1px solid #f3f4f6",
  display: "flex",
  alignItems: "center",
  boxSizing: "border-box",
});

// ── Row ───────────────────────────────────────────────────────────────────────
const Row = ({ index, style, data: d }) => {
  const {
    rows, editRowIndex, editData, selectedRow, highlightedRow,
    targetGid, loading, actionsGap, isAdminUser,
    onSetSelectedRow, onRowClickFn, onStartEdit, onCancelEdit,
    onSaveChanges, onDeleteRow, onInputChange,
  } = d;

  const row = rows[index];
  if (!row) return null;

  const gid = getActualValue(row, "loPH");
  const isTarget = targetGid && gid && gid.toString() === targetGid.toString();

  let bg;
  if (highlightedRow === index)   bg = "#fef3c7";
  else if (isTarget)              bg = "#fef2f2";
  else if (selectedRow === index) bg = "#dbeafe";
  else if (editRowIndex === index) bg = "#fefce8";
  else bg = index % 2 === 0 ? "#f9fafb" : "white";

  return (
    <div
      style={{ ...style, display:"flex", alignItems:"center", backgroundColor:bg,
        borderBottom:"1px solid #f3f4f6", cursor:"pointer" }}
      onClick={() => { onSetSelectedRow(index); onRowClickFn && onRowClickFn(row); }}
    >
      {REQUIRED_COLUMNS.map((colKey, ci) => {
        const display   = formatValue(colKey, row);
        const isNull    = getActualValue(row, colKey) === null;
        const colName   = COLUMN_MAPPING[colKey];
        const isTargetCell = isTarget && colKey === "loPH";
        const w = COLUMN_WIDTH[colKey] || 80;

        return (
          <div key={ci} style={cellBase(w)}>
            {editRowIndex === index && EDITABLE_COLS.includes(colName) ? (
              colName === "detection_status" ? (
                <select
                  value={editData[colName] !== undefined ? (editData[colName] ?? "") : (getActualValue(row, colKey) ?? "")}
                  onChange={(e) => onInputChange(colKey, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  style={{ width:"100%", padding:"2px 4px", fontSize:"0.73rem",
                    border:"1px solid #d1d5db", borderRadius:"3px", background:"white" }}
                >
                  {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
                  placeholder={colKey === "DtichXM" ? "vd: 1.42 (ha)" : ""}
                  style={{ width:"100%", padding:"2px 4px", fontSize:"0.73rem",
                    border:"1px solid #d1d5db", borderRadius:"3px" }}
                />
              )
            ) : colKey === "soLan" && display !== "-" ? (
              <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:"22px", height:"22px", borderRadius:"50%", color:"white",
                fontSize:"0.72rem", fontWeight:"bold", flexShrink: 0,
                backgroundColor: display == 1 ? "#16a34a" : display == 2 ? "#ca8a04" : "#ea580c"
              }}>
                {display}
              </span>
            ) : (
              <span
                className={`${isTargetCell ? "text-red-700 font-bold" : ""} ${isNull ? "text-gray-400 italic" : ""}`}
                title={typeof display === "string" ? display : String(display)}
                style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", width:"100%" }}
              >
                {isTargetCell ? `🎯 ${display}` : display}
              </span>
            )}
          </div>
        );
      })}

      {isAdminUser && (
        <div
          style={{ width:`${ACTIONS_WIDTH}px`, flexShrink:0, display:"flex",
            justifyContent:"center", alignItems:"center", gap: actionsGap }}
          onClick={(e) => e.stopPropagation()}
        >
          {editRowIndex === index ? (
            <>
              <button onClick={onSaveChanges} disabled={loading}
                style={{ color:"#16a34a", padding:"3px", cursor:"pointer", fontSize:"1rem" }} title="Lưu">
                <FaSave />
              </button>
              <button onClick={onCancelEdit}
                style={{ color:"#6b7280", padding:"3px", cursor:"pointer", fontSize:"1rem" }} title="Hủy">
                <FaTimes />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onStartEdit(index, row)} disabled={editRowIndex !== -1}
                style={{ color:"#2563eb", padding:"3px", cursor:"pointer",
                  opacity: editRowIndex !== -1 ? 0.5 : 1, fontSize:"1rem" }} title="Sửa">
                <FaEdit />
              </button>
              <button onClick={() => onDeleteRow(row)} disabled={editRowIndex !== -1 || loading}
                style={{ color:"#dc2626", padding:"3px", cursor:"pointer",
                  opacity: editRowIndex !== -1 ? 0.5 : 1, fontSize:"1rem" }} title="Xóa">
                <FaTrash />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Component ─────────────────────────────────────────────────────────────────
const TableVirtualized = ({ data, onRowClick, fillHeight = false }) => {
  const { isAdmin } = useAuth();
  const [editRowIndex, setEditRowIndex] = useState(-1);
  const [editData, setEditData]         = useState({});
  const [loading, setLoading]           = useState(false);
  const [selectedRow, setSelectedRow]   = useState(null);
  const [highlightedRow] = useState(null);
  const [targetGid]       = useState(null);
  const listRef  = useRef(null);
  const scrollRef=useRef(null);
  const [bodyHeight,setBodyHeight]=useState(ROW_HEIGHT*3);
  useEffect(()=>{
    if(!fillHeight||!scrollRef.current)return;
    const node=scrollRef.current;
    const measure=()=>setBodyHeight(Math.max(1,node.clientHeight-62));
    const observer=new ResizeObserver(measure);observer.observe(node);measure();
    return()=>observer.disconnect();
  },[fillHeight,data?.length]);
  const isAdminUser = isAdmin();
  const TOTAL_WIDTH = getTotalWidth(isAdminUser);

  const actionsGap = "6px";

  const startEdit = useCallback((rowIndex, row) => {
    setEditRowIndex(rowIndex);
    const rawXM = getActualValue(row, "DtichXM");
    const haXM  = rawXM != null && parseFloat(rawXM) > 0
      ? (parseFloat(rawXM) / 10000).toFixed(4)
      : "";
    setEditData({
      detection_status:    getActualValue(row, "xacminh"),
      dtichXM:             haXM,   // lưu ha để user nhập ha
      verification_reason: getActualValue(row, "ngnhan"),
      verification_notes:  getActualValue(row, "ghichu"),
    });
  }, []);

  const cancelEdit = useCallback(() => { setEditRowIndex(-1); setEditData({}); }, []);

  const handleInputChange = useCallback((columnKey, value) => {
    const colName = COLUMN_MAPPING[columnKey];
    setEditData(prev => ({ ...prev, [colName]: value }));
  }, []);

  const editStateRef = useRef({ editRowIndex, editData, data });
  editStateRef.current = { editRowIndex, editData, data };

  const saveChanges = useCallback(async () => {
    const { data: rows, editRowIndex: idx, editData: ed } = editStateRef.current;
    try {
      setLoading(true);
      const row = rows[idx];
      const gid = getActualValue(row, "loPH");

      // dtichXM trong editData là giá trị ha → convert sang m² trước khi gửi API
      const payload = { ...ed };
      if (payload.dtichXM !== undefined && payload.dtichXM !== "") {
        const ha = parseFloat(String(payload.dtichXM).replace(',', '.'));
        payload.dtichXM = !isNaN(ha) && ha > 0 ? ha * 10000 : null;
      } else {
        payload.dtichXM = null;
      }

      const response = await axios.put(
        `${config.API_BASE_URL}/mat-rung/${gid}`, payload,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (response.data.success) {
        toast.success("Cập nhật thành công!");
        // Cập nhật local row với giá trị m² đã convert
        Object.assign(rows[idx], { ...ed, dtichXM: payload.dtichXM });
        setEditRowIndex(-1);
        setEditData({});
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật");
    } finally { setLoading(false); }
  }, []);

  const handleDelete = useCallback(async (row) => {
    if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    try {
      setLoading(true);
      const gid = getActualValue(row, "loPH");
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
    } finally { setLoading(false); }
  }, []);

  if (!data || data.length === 0) return null;

  const itemData = {
    rows: data, editRowIndex, editData, selectedRow, highlightedRow,
    targetGid, loading, actionsGap, isAdminUser,
    onSetSelectedRow: setSelectedRow,
    onRowClickFn: onRowClick,
    onStartEdit: startEdit,
    onCancelEdit: cancelEdit,
    onSaveChanges: saveChanges,
    onDeleteRow: handleDelete,
    onInputChange: handleInputChange,
  };

  // ── Header 2 tầng ──────────────────────────────────────────────────────────
  const hBg     = "linear-gradient(to right, #027e02, #15803d)";
  const hBorder = "1px solid rgba(255,255,255,0.25)";
  const fs      = "12px";
  const fsSmall = fs;

  // Helper: ô header đơn (chiếm cả 2 hàng)
  const hCell = (key, label, extra = {}) => (
    <div key={key} style={{
      width: `${COLUMN_WIDTH[key] || 80}px`, flexShrink: 0,
      display:"flex", alignItems:"center", justifyContent:"center",
      textAlign:"center", padding:"0 4px", borderRight: hBorder,
      fontSize: fs, fontWeight:500, color:"white",
      whiteSpace:"nowrap", wordBreak:"normal", lineHeight:"20px",
      boxSizing:"border-box", ...extra
    }}>{label}</div>
  );

  // Helper: nhóm 2 hàng
  const hGroup = (key, totalW, topLabel, subCols) => (
    <div key={key} style={{
      width:`${totalW}px`, flexShrink:0,
      display:"flex", flexDirection:"column", borderRight: hBorder, boxSizing:"border-box"
    }}>
      {/* hàng 1 */}
      <div style={{ flex:"0 0 50%", display:"flex", alignItems:"center", justifyContent:"center",
        fontSize: fs, fontWeight:500, color:"white", whiteSpace:"nowrap", lineHeight:"20px",
        borderBottom: hBorder, padding:"0 4px", textAlign:"center" }}>
        {topLabel}
      </div>
      {/* hàng 2: các cột con */}
      <div style={{ flex:"0 0 50%", display:"flex" }}>
        {subCols.map(([subKey, subLabel], i) => (
          <div key={subKey} style={{
            width:`${COLUMN_WIDTH[subKey]}px`, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize: fsSmall, fontWeight:500, color:"white", whiteSpace:"nowrap", lineHeight:"20px",
            borderRight: i < subCols.length - 1 ? hBorder : "none",
            backgroundColor:"rgba(0,0,0,0.15)",
            padding:"0 2px", textAlign:"center", boxSizing:"border-box"
          }}>{subLabel}</div>
        ))}
      </div>
    </div>
  );

  const timeTotalW  = COLUMN_WIDTH.kyDauBD + COLUMN_WIDTH.kyDauKT + COLUMN_WIDTH.kySauBD + COLUMN_WIDTH.kySauKT;
  const coordTotalW = COLUMN_WIDTH.X + COLUMN_WIDTH.Y;

  return (
    <div className="virtual-table-card" style={{ width:"100%", backgroundColor:"white", borderRadius:"0.75rem",
      boxShadow:"0 10px 15px -3px rgba(0,0,0,0.1)", border:"1px solid #e5e7eb", overflow:"hidden",
      ...(fillHeight?{height:'100%',minHeight:0,display:'flex',flexDirection:'column'}:{}) }}>

      {/* Scroll ngang bọc cả header + body để chúng luôn cuộn cùng nhau */}
      <div ref={scrollRef} className="virtual-table-horizontal-scroll" style={{ overflowX:"auto", overflowY:"hidden",...(fillHeight?{flex:'1 1 0%',minHeight:0}:{}) }}>

        {/* ── Header ── */}
        <div className="virtual-table-header" style={{
          width:`${TOTAL_WIDTH}px`, display:"flex", alignItems:"stretch",
          height:"62px", background: hBg, userSelect:"none", flexShrink:0
        }}>
          {hCell("loPH",    "Lô PH")}
          {hCell("soLan",   "Số lần")}
          {hGroup("tg", timeTotalW, "Thời gian xử lý ảnh", [
            ["kyDauBD","KĐ BD"], ["kyDauKT","KĐ KT"],
            ["kySauBD","KS BD"], ["kySauKT","KS KT"],
          ])}
          {hCell("dtich",   "DT (ha)")}
          {hCell("xa",      "Xã")}
          {hCell("tk",      "Tiểu khu")}
          {hCell("khoanh",  "Khoảnh")}
          {hGroup("coord", coordTotalW, "Tọa độ", [
            ["X","Lat (X)"], ["Y","Lon (Y)"],
          ])}
          {hCell("xacminh", "Trạng thái XM")}
          {hCell("DtichXM", "DT XM (ha)")}
          {hCell("ngnhan",  "Nguyên nhân")}
          {hCell("NguoiXM", "Người XM")}
          {hCell("NgayXM",  "Ngày XM")}
          {hCell("ghichu",  "Ghi chú")}
          {isAdminUser && (
            <div style={{
              width:`${ACTIONS_WIDTH}px`, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: fs, fontWeight:500, color:"white", whiteSpace:"nowrap", lineHeight:"20px"
            }}>Thao tác</div>
          )}
        </div>

        {/* ── Body (react-window) ── */}
        <List
          ref={listRef}
          height={fillHeight?bodyHeight:Math.min(data.length * ROW_HEIGHT, MAX_TABLE_HEIGHT)}
          className="virtual-table-rows"
          itemCount={data.length}
          itemSize={ROW_HEIGHT}
          itemData={itemData}
          width={TOTAL_WIDTH}
          style={{ overflowX:"hidden" }}
        >
          {Row}
        </List>
      </div>

      {editRowIndex !== -1 && <div role="status" style={{ padding:"10px 16px", backgroundColor:"#f9fafb", borderTop:"1px solid #e5e7eb", fontSize:"0.875rem", flexShrink:0, color:"#f59e0b" }}>
        ✏️ Đang chỉnh sửa hàng #{editRowIndex + 1}
      </div>}
    </div>
  );
};

export default TableVirtualized;
