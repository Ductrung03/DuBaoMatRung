// client/src/dashboard/pages/Map/components/TableDisplay.jsx - VIRTUALIZED VERSION WITH PAGINATION
import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import Table from "../../TableVirtualized"; // ✅ Using virtualized table for 60 FPS scrolling
import LoadingOverlay from "./LoadingOverlay";
import PaginationControls from "../../../components/PaginationControls"; // ⚡ Pagination
import { useGeoData } from "../../../contexts/GeoDataContext"; // ⚡ Access pagination state
import { FaFileExcel, FaFileCode } from "react-icons/fa";

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
      const status = f.properties?.detection_status;
      const isVerified = status === 'verified' || status === 'Đã xác minh';
      if (filterVerified && filterUnverified) return true;
      if (filterVerified) return isVerified;
      if (filterUnverified) return !isVerified;
      return true;
    });
  }, [geoData, filterVerified, filterUnverified]);

  const handleExportExcel = () => {
    if (!geoData?.features?.length) return;

    const fmtDate = (v) => v ? new Date(v).toLocaleDateString("vi-VN") : "";
    const fmtHa   = (v) => { const n = parseFloat(v)||0; return n > 0 ? parseFloat((n/10000).toFixed(2)) : 0; };

    // Header row 1 (groups) + row 2 (sub-headers)
    const header1 = ["Lô phát hiện","Số lần","Thời gian xử lý ảnh","","","","Diện tích (ha)","Xã","Tiểu khu","Khoảnh","Tọa độ","","Trạng thái xác minh","Diện tích xác minh (ha)","Nguyên nhân","Người xác minh","Ngày xác minh","Ghi chú"];
    const header2 = ["","","Kỳ đầu","","Kỳ sau","","","","","","Latitude (X)","Longitude (Y)","","","","","",""];

    const rows = geoData.features.map((f) => {
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
    const blob = new Blob([JSON.stringify(geoData, null, 2)], { type: "application/geo+json" });
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

  // Hiển thị loading
  if (loading) {
    return (
      <div className="text-center text-green-700 font-semibold p-3 bg-white rounded-md shadow">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full mr-2"></div>
        Đang tải dữ liệu... Vui lòng đợi trong giây lát
      </div>
    );
  }

  // Hiển thị bảng dữ liệu khi có dữ liệu
  if (geoData?.features?.length > 0) {
    return (
      <div className="relative">
        {/* Loading overlay cho bảng dữ liệu */}
        {loadingDetails && <LoadingOverlay message={loadingMessage} />}

        <div className="bg-blue-50 p-3 rounded-md mb-3 border-l-4 border-blue-400">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-blue-800 text-sm">
                🔍 <strong>Hiển thị bảng dữ liệu:</strong> {geoData.features.length} khu vực mất rừng
              </p>
              <p className="text-blue-600 text-xs mt-1">
                💡 <strong>Lưu ý:</strong> Nhấp vào một dòng trong bảng để xem vị trí chính xác trên bản đồ
              </p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-1.5 px-3 rounded shadow transition-colors"
                  title="Xuất tệp Excel"
                >
                  <FaFileExcel className="text-sm" />
                  <span>Xuất tệp Excel</span>
                </button>
                <button
                  onClick={handleExportGeoJSON}
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

        <Table
          data={filteredFeatures.map((f) => f.properties)}
          onRowClick={onRowClick}
          tableName="mat_rung"
        />

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