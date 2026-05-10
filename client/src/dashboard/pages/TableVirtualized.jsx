// client/src/dashboard/pages/TableVirtualized.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import config from "../../config";
import { convertTcvn3ToUnicode } from "../../utils/fontConverter";

const ROW_HEIGHT = 42;
const HEADER_HEIGHT = 72; // single flex row spanning 2 visual tiers
const MAX_TABLE_HEIGHT = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.6, 600) : 600;

// ── Pure constants ngoài component ──────────────────────────────────────────
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

const COLUMN_FLEX = {
  loPH:"0.85", soLan:"0.55",
  kyDauBD:"1.2", kyDauKT:"1.2", kySauBD:"1.2", kySauKT:"1.2",
  dtich:"1.0", xa:"1.5", tk:"0.85", khoanh:"0.75",
  X:"1.1", Y:"1.1",
  xacminh:"1.5", DtichXM:"1.2",
  ngnhan:"1.6", NguoiXM:"1.3", NgayXM:"1.1", ghichu:"1.6",
};

const COLUMN_DISPLAY = {
  loPH:"Lô phát hiện", soLan:"Số lần",
  kyDauBD:"KĐ Bắt đầu", kyDauKT:"KĐ Kết thúc",
  kySauBD:"KS Bắt đầu", kySauKT:"KS Kết thúc",
  dtich:"Diện tích (ha)", xa:"Xã", tk:"Tiểu khu", khoanh:"Khoảnh",
  X:"X", Y:"Y",
  xacminh:"Trạng thái xác minh", DtichXM:"Diện tích XM (ha)",
  ngnhan:"Nguyên nhân", NguoiXM:"Người xác minh", NgayXM:"Ngày xác minh", ghichu:"Ghi chú",
};

// Cấu trúc header 2 tầng theo đúng form Excel mẫu
const HEADER_GROUPS = [
  { label: "Lô PH",                cols: ["loPH"],                        rowspan: true },
  { label: "Số lần",               cols: ["soLan"],                       rowspan: true },
  { label: "Thời gian xử lý ảnh",  cols: ["kyDauBD","kyDauKT","kySauBD","kySauKT"], subGroups: [
    { label: "Kỳ đầu",  cols: ["kyDauBD","kyDauKT"] },
    { label: "Kỳ sau",  cols: ["kySauBD","kySauKT"] },
  ]},
  { label: "Diện tích",            cols: ["dtich"],                       rowspan: true },
  { label: "Xã",                   cols: ["xa"],                          rowspan: true },
  { label: "Tiểu khu",             cols: ["tk"],                          rowspan: true },
  { label: "Khoảnh",               cols: ["khoanh"],                      rowspan: true },
  { label: "Tọa độ",               cols: ["X","Y"], subGroups: [
    { label: "Latitude (X)", cols: ["X"] },
    { label: "Longitude (Y)", cols: ["Y"] },
  ]},
  { label: "Trạng thái",           cols: ["xacminh"],                     rowspan: true },
  { label: "DT xác minh",          cols: ["DtichXM"],                     rowspan: true },
  { label: "Nguyên nhân",          cols: ["ngnhan"],                      rowspan: true },
  { label: "Ghi chú",              cols: ["ghichu"],                      rowspan: true },
  { label: "Người XM",             cols: ["NguoiXM"],                     rowspan: true },
  { label: "Ngày XM",              cols: ["NgayXM"],                      rowspan: true },
];

const ACTIONS_FLEX = "1.2";
const EDITABLE_COLS = ["detection_status","dtichXM","verification_reason","verification_notes"];
const STATUS_OPTIONS = ["Đã xác minh", "Chưa xác minh"];

function getActualValue(row, columnKey) {
  const col = COLUMN_MAPPING[columnKey];
  if (col && row[col] !== undefined) return row[col];
  const fallbacks = {
    loPH:["gid","GID","id"],
    soLan:["so_lan"],
    kyDauBD:["start_dau"],
    kyDauKT:["end_dau"],
    kySauBD:["start_sau"],
    kySauKT:["end_sau"],
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

  const gid = getActualValue(row, "loPH");
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
        const isTargetCell = isTarget && colKey === "loPH";

        return (
          <div
            key={ci}
            style={{ flex:`${COLUMN_FLEX[colKey]||"1"} 1 0`, padding:"0.35rem 0.5rem",
              fontSize:"0.78rem", overflow:"hidden", textOverflow:"ellipsis",
              whiteSpace:"nowrap", borderRight:"1px solid #f3f4f6",
              display:"flex", alignItems:"center" }}
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
            ) : colKey === "soLan" && display !== "-" ? (
              <span style={{
                display:"inline-flex", alignItems:"center", justifyContent:"center",
                width:"1.5rem", height:"1.5rem", borderRadius:"50%", color:"white",
                fontSize:"0.75rem", fontWeight:"bold",
                backgroundColor: display == 1 ? "#16a34a" : display == 2 ? "#ca8a04" : "#ea580c"
              }}>
                {display}
              </span>
            ) : (
              <span
                className={`${isTargetCell?"text-red-700 font-bold":""} ${isNull?"text-gray-400 italic":""}`}
                title={typeof display === "string" ? display : String(display)}
                style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
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
      const gid = getActualValue(row, "loPH");
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

        {/* Header 2 tầng đúng chuẩn Excel mẫu */}
        {(() => {
          const bg = "linear-gradient(to right, #027e02, #15803d)";
          const border = "1px solid #16a34a";
          const fs = screenWidth < 640 ? "0.58rem" : "0.64rem";
          const fsSmall = screenWidth < 640 ? "0.52rem" : "0.58rem";
          const baseCell = (flex, children, extra = {}) => (
            <div style={{
              flex:`${flex} 1 0`, display:"flex", alignItems:"center", justifyContent:"center",
              textAlign:"center", padding:"0 0.2rem", borderRight:border,
              overflow:"hidden", fontSize:fs, fontWeight:"bold",
              whiteSpace:"normal", wordBreak:"break-word", lineHeight:"1.2",
              ...extra
            }}>{children}</div>
          );

          const timeFlex  = ["kyDauBD","kyDauKT","kySauBD","kySauKT"].reduce((s,c)=>s+parseFloat(COLUMN_FLEX[c]||1),0);
          const kyDauFlex = ["kyDauBD","kyDauKT"].reduce((s,c)=>s+parseFloat(COLUMN_FLEX[c]||1),0);
          const kySauFlex = ["kySauBD","kySauKT"].reduce((s,c)=>s+parseFloat(COLUMN_FLEX[c]||1),0);
          const coordFlex = ["X","Y"].reduce((s,c)=>s+parseFloat(COLUMN_FLEX[c]||1),0);
          const GROUP_COLS = ["kyDauBD","kyDauKT","kySauBD","kySauKT","X","Y"];

          return (
            <div style={{
              background:bg, color:"white", fontWeight:"bold", userSelect:"none",
              display:"flex", alignItems:"stretch", height:"72px"
            }}>
              {REQUIRED_COLUMNS.map((colKey) => {
                // Cột đơn: span cả 2 hàng (height 100%)
                if (!GROUP_COLS.includes(colKey)) {
                  return baseCell(parseFloat(COLUMN_FLEX[colKey]||1), COLUMN_DISPLAY[colKey]||colKey, { key:colKey, height:"100%" });
                }

                // Nhóm "Thời gian xử lý ảnh"
                if (colKey === "kyDauBD") {
                  return (
                    <div key="tg" style={{ flex:`${timeFlex} 1 0`, display:"flex", flexDirection:"column", borderRight:border }}>
                      <div style={{ height:"42px", display:"flex", alignItems:"center", justifyContent:"center",
                        borderBottom:border, fontSize:fs, fontWeight:"bold", textAlign:"center", padding:"0 0.2rem" }}>
                        Thời gian xử lý ảnh
                      </div>
                      <div style={{ height:"30px", display:"flex" }}>
                        <div style={{ flex:`${kyDauFlex} 1 0`, display:"flex", alignItems:"center", justifyContent:"center",
                          borderRight:border, fontSize:fsSmall, fontWeight:"bold", backgroundColor:"rgba(0,0,0,0.18)" }}>
                          Kỳ đầu
                        </div>
                        <div style={{ flex:`${kySauFlex} 1 0`, display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:fsSmall, fontWeight:"bold", backgroundColor:"rgba(0,0,0,0.18)" }}>
                          Kỳ sau
                        </div>
                      </div>
                    </div>
                  );
                }

                // Nhóm "Tọa độ"
                if (colKey === "X") {
                  return (
                    <div key="cg" style={{ flex:`${coordFlex} 1 0`, display:"flex", flexDirection:"column", borderRight:border }}>
                      <div style={{ height:"42px", display:"flex", alignItems:"center", justifyContent:"center",
                        borderBottom:border, fontSize:fs, fontWeight:"bold" }}>
                        Tọa độ
                      </div>
                      <div style={{ height:"30px", display:"flex" }}>
                        <div style={{ flex:`${parseFloat(COLUMN_FLEX["X"]||1)} 1 0`, display:"flex", alignItems:"center",
                          justifyContent:"center", borderRight:border, fontSize:fsSmall, fontWeight:"bold",
                          backgroundColor:"rgba(0,0,0,0.12)", textAlign:"center", padding:"0 0.1rem" }}>
                          Lat (X)
                        </div>
                        <div style={{ flex:`${parseFloat(COLUMN_FLEX["Y"]||1)} 1 0`, display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:fsSmall, fontWeight:"bold",
                          backgroundColor:"rgba(0,0,0,0.12)", textAlign:"center", padding:"0 0.1rem" }}>
                          Lon (Y)
                        </div>
                      </div>
                    </div>
                  );
                }

                // Các cột con trong nhóm (bỏ qua vì đã render trong nhóm)
                return null;
              })}
              {isAdmin() && baseCell(parseFloat(ACTIONS_FLEX), screenWidth<640?"TT":"Thao tác", { key:"act", height:"100%" })}
            </div>
          );
        })()}

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
