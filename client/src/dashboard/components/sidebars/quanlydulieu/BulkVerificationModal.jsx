// BulkVerificationModal.jsx - Xác minh hàng loạt từ file xlsx
import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { FaTimes, FaUpload, FaFileExcel, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

// Normalize chuỗi tiêu đề cột (bỏ dấu, lowercase, trim)
function normalizeHeader(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

// Tự động tìm dòng header - yêu cầu có cột "Lô cảnh báo" / "GID" + ít nhất 1 cột khác
function findHeaderRowIndex(rawData) {
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    const normalized = row.map((c) => normalizeHeader(String(c ?? "")));
    const hasGidCol = normalized.some(
      (cell) => cell === "gid" || cell === "lo canh bao" || cell === "lo cb" || cell.includes("lo canh bao")
    );
    if (!hasGidCol) continue;
    let otherCount = 0;
    for (const cell of normalized) {
      if (
        cell === "tt" ||
        cell.includes("nguyen nhan") ||
        cell.includes("dien tich") ||
        cell.includes("tieu khu") ||
        cell.includes("khoanh") ||
        cell.includes("xac minh")
      ) {
        otherCount++;
      }
    }
    if (otherCount >= 1) return i;
  }
  return 0;
}

// Parse GID từ "PH-12345", "PH12345", "CB-12345", "CB12345", hoặc số thuần
function parseGidValue(val) {
  if (val === null || val === undefined || val === "") return "";
  const str = String(val).trim();
  // Bỏ prefix "PH-", "PH ", "CB-", "CB " (case insensitive)
  const stripped = str.replace(/^(ph|cb)[-\s]*/i, "");
  // Lấy phần số ở cuối
  const match = stripped.match(/^(\d+)/);
  return match ? match[1] : stripped;
}

// Map tên cột xlsx sang field nội bộ
const COLUMN_MAP = {
  "tt": "stt",
  "lo canh bao": "gid",
  "lo cb": "gid",
  "lo canh bao (gid)": "gid",
  "gid": "gid",
  "xa": "xa",
  "tieu khu": "tk",
  "tk": "tk",
  "khoanh": "khoanh",
  "toa do x": "x",
  "x": "x",
  "toa do y": "y",
  "y": "y",
  "dien tich xac minh (ha)": "dientich",
  "dien tich xac minh": "dientich",
  "dien tich (ha)": "dientich",
  "dien tich": "dientich",
  "dt (ha)": "dientich",
  "dt": "dientich",
  "nguyen nhan": "nguyen_nhan",
  "xac minh": "xac_minh",
  "chu y": "chu_y",
  "ghi chu": "chu_y",
  "chu y/ghi chu": "chu_y",
};

function mapHeader(raw) {
  const normalized = normalizeHeader(raw);
  if (!normalized) return null;
  // Tìm exact match trước
  if (COLUMN_MAP[normalized]) return COLUMN_MAP[normalized];
  // Partial match: chỉ dùng normalized.includes(key) để tránh "xa" khớp "xac minh"
  const sortedKeys = Object.keys(COLUMN_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key.length >= 4 && normalized.includes(key)) {
      return COLUMN_MAP[key];
    }
  }
  return null;
}

const STATUS_OPTIONS = [
  "Đã xác minh",
  "Chưa xác minh",
  "Đang xác minh",
  "Không xác minh được",
];

const BulkVerificationModal = ({ onClose, onDone }) => {
  const [step, setStep] = useState("upload"); // upload | preview | result
  const [parsedRows, setParsedRows] = useState([]);
  const [columnKeys, setColumnKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  // Parse file xlsx
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls"].includes(ext)) {
      toast.error("Vui lòng chọn file Excel (.xlsx hoặc .xls)");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (rawData.length < 2) {
          toast.error("File không có dữ liệu hoặc thiếu dòng tiêu đề");
          return;
        }

        // Tự động tìm dòng header
        const headerRowIdx = findHeaderRowIndex(rawData);
        const headers = rawData[headerRowIdx].map((h) => ({
          raw: h,
          mapped: mapHeader(h),
        }));

        // Check có cột gid không
        const hasGid = headers.some((h) => h.mapped === "gid");
        if (!hasGid) {
          toast.error(
            `File thiếu cột "Lô cảnh báo" (hoặc "GID") để khớp dữ liệu. Dòng tiêu đề phát hiện ở dòng ${headerRowIdx + 1}: ${rawData[headerRowIdx].filter(Boolean).join(", ")}`
          );
          return;
        }

        // Parse các dòng dữ liệu (bỏ dòng header và các dòng metadata phía trước)
        const rows = rawData.slice(headerRowIdx + 1).map((row, idx) => {
          const obj = { _row: headerRowIdx + idx + 2 }; // row number in xlsx
          headers.forEach((h, i) => {
            if (h.mapped) {
              let cellVal = row[i] !== undefined ? row[i] : "";
              if (h.mapped === "gid") {
                cellVal = parseGidValue(cellVal);
              } else if (h.mapped === "dientich") {
                // Normalize: số từ Excel hoặc chuỗi "1,42" → "1.42"
                cellVal = cellVal !== "" ? String(cellVal).replace(',', '.') : "";
              }
              obj[h.mapped] = cellVal;
            }
            obj[`_raw_${i}`] = row[i];
          });
          return obj;
        }).filter((row) => {
          // Bỏ các dòng trống hoặc dòng tổng kết (gid không phải số)
          const gid = row.gid;
          return gid !== undefined && gid !== null && gid !== "" && /^\d+$/.test(String(gid));
        });

        setColumnKeys(headers.filter((h) => h.mapped).map((h) => h.mapped));
        setParsedRows(rows);
        setStep("preview");
        toast.success(`Đã đọc ${rows.length} dòng dữ liệu từ file`);
      } catch (err) {
        console.error("Parse xlsx error:", err);
        toast.error("Lỗi đọc file Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Gửi lên backend
  const handleSubmit = async () => {
    if (parsedRows.length === 0) {
      toast.warning("Không có dữ liệu để xác minh");
      return;
    }

    setLoading(true);
    try {
      // Chuẩn bị payload
      const records = parsedRows.map((row) => ({
        gid: row.gid,
        verification_reason: row.nguyen_nhan || null,
        verification_notes: row.chu_y || null,
        // dientich từ xlsx là ha → convert sang m²
        verified_area:
          row.dientich && !isNaN(parseFloat(String(row.dientich).replace(',', '.')))
            ? parseFloat(String(row.dientich).replace(',', '.')) * 10000
            : null,
        detection_status: row.xac_minh || "Đã xác minh",
      }));

      const response = await axios.post(
        "/api/verification/bulk-xlsx-verify",
        { records },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setResult(response.data.data);
        setStep("result");
        toast.success(response.data.message);
        if (onDone) onDone();
      } else {
        toast.error(response.data.message || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Bulk verify error:", err);
      toast.error(
        err.response?.data?.message || "Lỗi khi xác minh hàng loạt"
      );
    } finally {
      setLoading(false);
    }
  };

  // Download file mẫu
  const handleDownloadTemplate = () => {
    const templateData = [
      ["TT", "Lô cảnh báo", "Xã", "Tiểu khu", "Khoảnh", "Tọa độ X", "Tọa độ Y", "Diện tích (ha)", "Nguyên nhân", "Xác minh", "Chú ý"],
      [1, 1001, "Xã A", "10", "1", "103.123", "21.456", "0.5", "Khai thác rừng trái phép", "Đã xác minh", ""],
      [2, 1002, "Xã B", "11", "2", "103.234", "21.567", "1.2", "Cháy rừng", "Đã xác minh", "Ghi chú thêm"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws["!cols"] = [
      { wch: 5 }, { wch: 14 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mẫu xác minh");
    XLSX.writeFile(wb, "mau_xac_minh_hang_loat.xlsx");
    toast.success("Đã tải file mẫu");
  };

  // Label hiển thị cho field key
  const fieldLabel = {
    stt: "TT",
    gid: "Lô CB",
    xa: "Xã",
    tk: "Tiểu khu",
    khoanh: "Khoảnh",
    x: "Tọa độ X",
    y: "Tọa độ Y",
    dientich: "Diện tích (ha)",
    nguyen_nhan: "Nguyên nhân",
    xac_minh: "Xác minh",
    chu_y: "Chú ý",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-700 to-green-600 text-white flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Xác minh hàng loạt từ file Excel</h2>
            <p className="text-xs text-green-200 mt-0.5">
              Upload file .xlsx để cập nhật xác minh nhiều lô cùng lúc
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-0 px-6 py-3 bg-gray-50 border-b text-xs flex-shrink-0">
          {[
            { key: "upload", label: "1. Tải file" },
            { key: "preview", label: "2. Xem trước" },
            { key: "result", label: "3. Kết quả" },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              <div
                className={`px-3 py-1 rounded-full font-medium ${
                  step === s.key
                    ? "bg-green-600 text-white"
                    : step === "result" || (step === "preview" && s.key === "upload")
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s.label}
              </div>
              {i < 2 && <div className="flex-1 h-px bg-gray-300 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center gap-6">
              {/* Yêu cầu định dạng file */}
              <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <FaFileExcel className="text-green-600 text-2xl flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 mb-1">
                      Yêu cầu định dạng file
                    </p>
                    <p className="text-xs text-gray-600 mb-2">
                      File Excel (.xlsx) cần có các cột:{" "}
                      <span className="font-semibold text-blue-700">
                        Lô cảnh báo
                      </span>{" "}
                      (bắt buộc), Diện tích (ha), Nguyên nhân, Xác minh, Ghi chú
                    </p>
                    <p className="text-xs text-gray-500">
                      Cột <strong>"Lô cảnh báo"</strong> hỗ trợ dạng <strong>PH-12345</strong> hoặc số thuần <strong>12345</strong>. Hệ thống tự nhận diện dòng tiêu đề.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload area */}
              <div
                className="w-full border-2 border-dashed border-green-400 rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:bg-green-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FaUpload className="text-green-500 text-4xl" />
                <div className="text-center">
                  <p className="text-base font-medium text-gray-700">
                    Kéo thả hoặc nhấp để chọn file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Hỗ trợ: .xlsx, .xls
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === "preview" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FaFileExcel className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {fileName}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {parsedRows.length} dòng
                  </span>
                </div>
                <button
                  onClick={() => {
                    setStep("upload");
                    setParsedRows([]);
                    setFileName("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Chọn file khác
                </button>
              </div>

              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                Kiểm tra dữ liệu bên dưới trước khi xác minh. Hệ thống sẽ khớp theo cột <strong>"Lô cảnh báo"</strong> (GID).
              </div>

              {/* Table preview */}
              <div className="overflow-auto border rounded-lg" style={{ maxHeight: "400px" }}>
                <table className="w-full text-xs border-collapse" style={{ minWidth: "700px" }}>
                  <thead>
                    <tr className="bg-green-700 text-white sticky top-0 z-10">
                      <th className="px-3 py-2 text-left whitespace-nowrap border-r border-green-600">#</th>
                      {columnKeys.map((k) => (
                        <th key={k} className="px-3 py-2 text-left whitespace-nowrap border-r border-green-600">
                          {fieldLabel[k] || k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-3 py-1.5 border-r border-gray-200 text-gray-400">
                          {row._row}
                        </td>
                        {columnKeys.map((k) => (
                          <td
                            key={k}
                            className={`px-3 py-1.5 border-r border-gray-200 ${
                              k === "gid"
                                ? "font-bold text-green-700"
                                : k === "nguyen_nhan" || k === "xac_minh"
                                ? "text-blue-700"
                                : "text-gray-700"
                            }`}
                          >
                            {row[k] !== undefined && row[k] !== "" ? (
                              k === "dientich"
                                ? `${row[k]} ha`
                                : String(row[k])
                            ) : (
                              <span className="text-gray-300 italic">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === "result" && result && (
            <div className="flex flex-col gap-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-700">{result.total}</div>
                  <div className="text-xs text-gray-500 mt-1">Tổng dòng</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{result.success_count}</div>
                  <div className="text-xs text-green-600 mt-1">Thành công</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{result.failed_count}</div>
                  <div className="text-xs text-red-500 mt-1">Thất bại</div>
                </div>
              </div>

              {/* Success list */}
              {result.success.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                    <FaCheckCircle />
                    Xác minh thành công ({result.success.length} lô)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.success.map((s) => (
                      <span key={s.gid} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        PH-{s.gid}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed list */}
              {result.failed.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <FaTimesCircle />
                    Thất bại ({result.failed.length} lô)
                  </h4>
                  <div className="overflow-auto border rounded-lg" style={{ maxHeight: "200px" }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-red-50 text-red-700">
                          <th className="px-3 py-2 text-left">Lô PH</th>
                          <th className="px-3 py-2 text-left">Lý do</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.failed.map((f, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-red-50"}>
                            <td className="px-3 py-1.5 font-medium text-red-700">PH-{f.gid}</td>
                            <td className="px-3 py-1.5 text-gray-600">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {step === "result" ? "Đóng" : "Hủy"}
          </button>

          <div className="flex gap-3">
            {step === "preview" && (
              <button
                onClick={handleSubmit}
                disabled={loading || parsedRows.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <ClipLoader color="#fff" size={14} />
                    <span>Đang xác minh...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Xác minh {parsedRows.length} lô</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkVerificationModal;
