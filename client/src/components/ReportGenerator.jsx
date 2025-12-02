import React, { useState, useEffect } from "react";
import { FaFileWord, FaFilePdf, FaEye } from "react-icons/fa";
import { ClipLoader } from 'react-spinners';
import { toast } from "react-toastify";
import { convertTcvn3ToUnicode } from "../utils/fontConverter";

const ReportGenerator = ({ reportData, reportParams }) => {
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Xác định loại báo cáo
  const isVerifiedReport = reportParams.xacMinh === 'true' || reportParams.xacMinh === '1';
  
  // Tiêu đề báo cáo
  const reportTitle = isVerifiedReport
    ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
    : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

  // Format ngày
  const formatDate = (dateString) => {
    if (!dateString) return '..........';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  // Tính tổng số lô và diện tích
  const calculateTotals = () => {
    if (!Array.isArray(reportData)) return { totalLots: 0, totalArea: 0 };
    
    const totalLots = reportData.length;
    const totalArea = reportData.reduce((sum, item) => {
      // Loại 1: dùng dtich, Loại 2: dùng dtichXM
      const areaField = isVerifiedReport ? item.properties.dtichXM : item.properties.dtich;
      return sum + (areaField || 0);
    }, 0) / 10000; // Convert to hectares

    return { totalLots, totalArea };
  };

  const { totalLots, totalArea } = calculateTotals();

  // Xuất DOCX
  const handleExportDocx = () => {
    try {
      setIsExportingDocx(true);
      
      const exportUrl = `/api/bao-cao/export-docx?fromDate=${reportParams.fromDate}&toDate=${reportParams.toDate}&huyen=${encodeURIComponent(reportParams.huyen)}&xa=${encodeURIComponent(reportParams.xa)}&xacMinh=${reportParams.xacMinh}`;
      const link = document.createElement('a');
      link.href = exportUrl;
      
      const fileName = isVerifiedReport 
        ? `bao-cao-vi-tri-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`
        : `bao-cao-phat-hien-som-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank');
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("File DOCX đang được tải xuống");
      setTimeout(() => setIsExportingDocx(false), 2000);
    } catch (error) {
      console.error("Lỗi khi tải DOCX:", error);
      toast.error("Có lỗi xảy ra khi tải DOCX");
      setIsExportingDocx(false);
    }
  };

  // Xuất PDF
  const handleExportPdf = () => {
    try {
      setIsExportingPdf(true);
      
      const exportUrl = `/api/bao-cao/export-pdf?fromDate=${reportParams.fromDate}&toDate=${reportParams.toDate}&huyen=${encodeURIComponent(reportParams.huyen)}&xa=${encodeURIComponent(reportParams.xa)}&xacMinh=${reportParams.xacMinh}`;
      
      window.open(exportUrl, '_blank');
      
      toast.info("Đã mở trang báo cáo. Hãy nhấn nút 'Lưu PDF' ở trang mới để tải về.");
      setTimeout(() => setIsExportingPdf(false), 2000);
    } catch (error) {
      console.error("Lỗi khi mở trang PDF:", error);
      toast.error("Có lỗi xảy ra khi mở trang báo cáo");
      setIsExportingPdf(false);
    }
  };

  if (!Array.isArray(reportData) || reportData.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Không có dữ liệu để hiển thị báo cáo</p>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
      {/* Header với nút xuất file */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-center text-lg font-bold flex-1">
          {reportTitle}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
            title="Xuất file Word"
          >
            {isExportingDocx ? (
              <>
                <ClipLoader color="#ffffff" size={14} />
                <span className="ml-1">Đang xuất...</span>
              </>
            ) : (
              <>
                <FaFileWord className="text-lg" />
                <span>Xuất DOCX</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
            title="Xem và lưu báo cáo dạng PDF"
          >
            {isExportingPdf ? (
              <>
                <ClipLoader color="#ffffff" size={14} />
                <span className="ml-1">Đang chuẩn bị...</span>
              </>
            ) : (
              <>
                <FaEye className="text-lg mr-1" />
                <FaFilePdf className="text-lg" />
                <span className="ml-1">Xem & Lưu PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nội dung báo cáo */}
      <div className="overflow-auto border border-gray-300 rounded shadow px-6 pt-2 pb-6">
        {/* Thông tin header */}
        <div className="text-sm mb-2">
          <div className="flex justify-between font-semibold">
            <span>Tỉnh: Sơn La</span>
            <span>Huyện: {reportData.length > 0 ? (reportData[0].properties.huyen_name || convertTcvn3ToUnicode(reportParams.huyen)) : (reportParams.huyen ? convertTcvn3ToUnicode(reportParams.huyen) : '..........')}</span>
            <span>Xã: {reportData.length > 0 ? (reportData[0].properties.xa_name || convertTcvn3ToUnicode(reportParams.xa)) : (reportParams.xa ? convertTcvn3ToUnicode(reportParams.xa) : '..........')}</span>
          </div>
          <div className="flex justify-between font-semibold mt-1">
            <span></span>
            <span>
              Từ ngày: {formatDate(reportParams.fromDate)}
              {' '}
              Đến ngày: {formatDate(reportParams.toDate)}
            </span>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <table className="w-full border border-black text-sm text-center table-fixed">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1 w-12">TT</th>
              <th className="border border-black px-2 py-1">Xã</th>
              <th className="border border-black px-2 py-1">Lô cảnh báo</th>
              <th className="border border-black px-2 py-1">Tiểu khu</th>
              <th className="border border-black px-2 py-1">Khoảnh</th>
              <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>X</th>
              <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>Y</th>
              <th className="border border-black px-2 py-1">Diện tích (ha)</th>
              {isVerifiedReport && (
                <th className="border border-black px-2 py-1">Nguyên nhân</th>
              )}
            </tr>
          </thead>
          <tbody>
            {reportData.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-black px-2 py-1">{idx + 1}</td>
                <td className="border border-black px-2 py-1">
                  {item.properties.xa_name || (item.properties.xa ? convertTcvn3ToUnicode(item.properties.xa) : "")}
                </td>
                <td className="border border-black px-2 py-1">
                  {item.properties.lo_canbao || (item.properties.gid ? `CB-${item.properties.gid}` : "")}
                </td>
                <td className="border border-black px-2 py-1">
                  {item.properties.tk || ""}
                </td>
                <td className="border border-black px-2 py-1">
                  {item.properties.khoanh || ""}
                </td>
                <td className="border border-black px-2 py-1">
                  {item.properties.x ? Math.round(item.properties.x) : ""}
                </td>
                <td className="border border-black px-2 py-1">
                  {item.properties.y ? Math.round(item.properties.y) : ""}
                </td>
                <td className="border border-black px-2 py-1">
                  {(() => {
                    const areaField = isVerifiedReport ? item.properties.dtichXM : item.properties.dtich;
                    return areaField ? (areaField / 10000).toFixed(2) : "";
                  })()}
                </td>
                {isVerifiedReport && (
                  <td className="border border-black px-2 py-1">
                    {item.properties.verification_reason || item.properties.nguyennhan || ""}
                  </td>
                )}
              </tr>
            ))}
            
            {/* Dòng tổng */}
            <tr className="font-bold">
              <td className="border border-black px-2 py-1" colSpan={isVerifiedReport ? "8" : "7"}>
                Tổng {totalLots} lô
              </td>
              <td className="border border-black px-2 py-1">
                {totalArea.toFixed(2)}
              </td>
              {isVerifiedReport && <td className="border border-black px-2 py-1"></td>}
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex justify-between mt-6 text-sm px-2">
          <div>
            <div className="mb-2">
              <strong>Người tổng hợp</strong>
            </div>
            <div className="text-xs text-gray-600">
              Lưu ý:<br/>
              + Diện tích này lấy theo cột {isVerifiedReport ? 'dtichXM' : 'dtich'}<br/>
              + Dòng tổng: tính toán tổng số lô và tổng diện tích<br/>
              + Tọa độ X,Y làm tròn, không lấy sau dấu ","
            </div>
          </div>
          <div className="text-right">
            <div>
              Sơn La, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
            </div>
            <div className="mt-2">
              <strong>Hạt kiểm lâm</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
