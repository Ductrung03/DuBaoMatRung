// client/src/dashboard/pages/Map/components/TableDisplay.jsx - VIRTUALIZED VERSION WITH PAGINATION
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import Table from "../../TableVirtualized"; // ✅ Using virtualized table for 60 FPS scrolling
import LoadingOverlay from "./LoadingOverlay";
import PaginationControls from "../../../components/PaginationControls"; // ⚡ Pagination
import { useGeoData } from "../../../contexts/GeoDataContext"; // ⚡ Access pagination state
import { FaFileExcel, FaFileCode } from "react-icons/fa";
import { statusOf } from '../../../monitoring/monitoring-data';

const TableDisplay = ({
  loading,
  geoData,
  loadingDetails,
  loadingMessage,
  onRowClick
}) => {
  // ⚡ Get pagination state and functions from context
  const { pagination, goToPage } = useGeoData();

  // ✅ Filter checkboxes for verification status
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterUnverified, setFilterUnverified] = useState(false);

  // ✅ Filtered features based on checkbox state
  const filteredFeatures = useMemo(() => {
    if (!geoData?.features) return [];
    if (!filterVerified && !filterUnverified) return geoData.features;
    return geoData.features.filter(f => {
      const isVerified = statusOf(f.properties||{}) === 'verified';
      if (filterVerified && filterUnverified) return true;
      if (filterVerified) return isVerified;
      if (filterUnverified) return !isVerified;
      return true;
    });
  }, [geoData, filterVerified, filterUnverified]);

  const handleExportExcel = () => {
    if (!geoData?.features?.length) return;

    const fmtDate = (v) => v ? new Date(v).toLocaleDateString("vi-VN") : "";
    const fmtHa = v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n/10000:null;};

    // Header row 1 (groups) + row 2 (sub-headers)
    const header1 = ["Lô phát hiện","Số lần","Thời gian xử lý ảnh","","","","Diện tích (ha)","Xã","Tiểu khu","Khoảnh","Tọa độ","","Trạng thái xác minh","Diện tích xác minh (ha)","Nguyên nhân","Người xác minh","Ngày xác minh","Ghi chú"];
    const header2 = ["","","Kỳ đầu","","Kỳ sau","","","","","","Longitude (X)","Latitude (Y)","","","","","",""];

    const rows = filteredFeatures.map((f) => {
      const p = f.properties;
      return [
        p.gid ? `PH-${p.gid}` : "",
        p.so_lan ?? "",
        fmtDate(p.start_dau),
        fmtDate(p.end_dau),
        fmtDate(p.start_sau),
        fmtDate(p.end_sau),
        fmtHa(p.dtich),
        p.xa || "",
        p.tk || "",
        p.khoanh || "",
        parseFloat(p.x_coordinate ?? p.x ?? "") || "",
        parseFloat(p.y_coordinate ?? p.y ?? "") || "",
        p.detection_status || "Chưa xác minh",
        fmtHa(p.dtichXM ?? p.verified_area),
        p.verification_reason || "",
        p.verified_by_name || "",
        fmtDate(p.detection_date),
        p.verification_notes || "",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DuLieu");

    // Merge cells cho header nhóm
    ws["!merges"] = [
      { s:{r:0,c:0}, e:{r:1,c:0} },   // Lô phát hiện
      { s:{r:0,c:1}, e:{r:1,c:1} },   // Số lần
      { s:{r:0,c:2}, e:{r:0,c:5} },   // Thời gian xử lý ảnh
      { s:{r:1,c:2}, e:{r:1,c:3} },   // Kỳ đầu
      { s:{r:1,c:4}, e:{r:1,c:5} },   // Kỳ sau
      { s:{r:0,c:6}, e:{r:1,c:6} },   // Diện tích (ha)
      { s:{r:0,c:7}, e:{r:1,c:7} },   // Xã
      { s:{r:0,c:8}, e:{r:1,c:8} },   // Tiểu khu
      { s:{r:0,c:9}, e:{r:1,c:9} },   // Khoảnh
      { s:{r:0,c:10}, e:{r:0,c:11} }, // Tọa độ
      { s:{r:0,c:12}, e:{r:1,c:12} }, // Trạng thái xác minh
      { s:{r:0,c:13}, e:{r:1,c:13} }, // Diện tích xác minh
      { s:{r:0,c:14}, e:{r:1,c:14} }, // Nguyên nhân
      { s:{r:0,c:15}, e:{r:1,c:15} }, // Người xác minh
      { s:{r:0,c:16}, e:{r:1,c:16} }, // Ngày xác minh
      { s:{r:0,c:17}, e:{r:1,c:17} }, // Ghi chú
    ];

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
      { wch: 25 }, { wch: 25 }, { wch: 18 }, { wch: 12 },
    ];

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `du-lieu-mat-rung-${today}.xlsx`);
  };

  const handleExportGeoJSON = () => {
    if (!geoData?.features?.length) return;
    const fmtDate=v=>v?new Date(v).toLocaleDateString('vi-VN'):'';
    const fmtHa=v=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n/10000:null;};
    // Keep the existing production export aliases and all original metadata.
    const exported={...geoData,features:filteredFeatures.map(f=>{const p=f.properties||{};return {...f,properties:{...p,
      ma_lo:p.gid?`PH-${p.gid}`:'',gid:p.gid??'',xa:p.xa||'',tieu_khu:p.tk||'',khoanh:p.khoanh||'',
      dien_tich_ha:fmtHa(p.dtich),ky_dau_tu:fmtDate(p.start_dau),ky_dau_den:fmtDate(p.end_dau),ky_sau_tu:fmtDate(p.start_sau),ky_sau_den:fmtDate(p.end_sau),so_lan:p.so_lan??'',
      toa_do_x:p.x_coordinate??p.x??null,toa_do_y:p.y_coordinate??p.y??null,trang_thai:p.detection_status||'Chưa xác định',
      dien_tich_xac_minh_ha:fmtHa(p.dtichXM??p.verified_area),nguyen_nhan:p.verification_reason||'',nguoi_xac_minh:p.verified_by_name||'',ngay_xac_minh:fmtDate(p.detection_date),ghi_chu:p.verification_notes||''
    }};})};
    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    a.href = url;
    a.download = `du-lieu-mat-rung-${today}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // ✅ REMOVED: Không còn kiểm tra trang nào nữa - Hiển thị table cho TẤT CẢ trang

  // Hiển thị bảng dữ liệu khi có dữ liệu
  if (Array.isArray(geoData?.features)) {
    return (
      <div className="lookup-table-panel relative" aria-busy={loading}>
        {/* Loading overlay cho bảng dữ liệu */}
        {loadingDetails && <LoadingOverlay message={loadingMessage} />}

        <div className="lookup-table-toolbar bg-blue-50 p-3 rounded-md mb-3 border-l-4 border-blue-400" role="region" aria-label="Kết quả, xuất dữ liệu và bộ lọc xác minh">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-blue-800 text-sm">
                {loading&&!geoData.features.length?'Đang tải dữ liệu…':<>🔍 <strong>Hiển thị bảng dữ liệu:</strong> {filteredFeatures.length} khu vực mất rừng</>}
              </p>
            </div>
            <div className="table-export-actions">
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  disabled={loading||!filteredFeatures.length}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded shadow transition-colors"
                  title="Xuất tệp Excel"
                >
                  <FaFileExcel className="text-sm" />
                  <span>Xuất tệp Excel</span>
                </button>
                <button
                  onClick={handleExportGeoJSON}
                  disabled={loading||!filteredFeatures.length}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium py-1.5 px-3 rounded shadow transition-colors"
                  title="Xuất tệp GeoJSON"
                >
                  <FaFileCode className="text-sm" />
                  <span>Xuất tệp GeoJSON</span>
                </button>
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterVerified}
                    onChange={e => setFilterVerified(e.target.checked)}
                    className="w-4 h-4 accent-green-600"
                  />
                  Đã xác minh
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterUnverified}
                    onChange={e => setFilterUnverified(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  Chưa xác minh
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="lookup-table-data">
        {filteredFeatures.length?<Table
          data={filteredFeatures.map((f) => f.properties)}
          onRowClick={onRowClick}
          tableName="mat_rung"
          fillHeight
        />:!loading&&<p className="monitor-empty">Không có bản ghi phù hợp với bộ lọc.</p>}
        </div>

        {/* ⚡ Pagination controls */}
        <PaginationControls
          pagination={pagination}
          onPageChange={goToPage}
          loading={loading}
        />
      </div>
    );
  }

  // Thông báo khi không có dữ liệu (chỉ hiển thị khi cần thiết)
  return null; // ✅ Không hiển thị thông báo "chưa có dữ liệu" để tránh làm rối UI
};

export default TableDisplay;
