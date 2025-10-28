import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useReport } from "../contexts/ReportContext";
import { FaFileWord, FaFilePdf, FaDownload, FaEye } from "react-icons/fa";
import { ClipLoader } from 'react-spinners';
import config from "../../config";
import { toast } from "react-toastify";
import { useLocation } from "react-router-dom";

// Hiển thị overlay loading khi đang xử lý báo cáo
const ReportLoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={60} />
      <p className="mt-4 text-forest-green-primary font-medium text-lg">{message}</p>
    </div>
  </div>
);

const ThongKeBaoCaoMatRung = () => {
  const { reportData, reportLoading } = useReport();
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Đang tạo báo cáo...");
  const location = useLocation();

  // ✅ Lấy thông tin từ URL params - THÊM xacMinh và type
  const [reportParams, setReportParams] = useState({
    fromDate: '',
    toDate: '',
    huyen: '',
    xa: '',
    xacMinh: 'false',
    type: ''
  });

  useEffect(() => {
    // Lấy params từ URL
    const urlParams = new URLSearchParams(location.search);
    const fromDate = urlParams.get('fromDate') || '';
    const toDate = urlParams.get('toDate') || '';
    const huyen = urlParams.get('huyen') || '';
    const xa = urlParams.get('xa') || '';
    const xacMinh = urlParams.get('xacMinh') || urlParams.get('status') || 'false'; // Support both xacMinh and status for backward compatibility
    const type = urlParams.get('type') || '';

    setReportParams({ fromDate, toDate, huyen, xa, xacMinh, type });

    // Nếu type là "Biểu đồ", gọi API để lấy dữ liệu thống kê
    if (type === 'Biểu đồ') {
      fetchChartData(fromDate, toDate, huyen, xa);
    }
  }, [location.search]);

  // Hàm lấy dữ liệu biểu đồ từ API
  const fetchChartData = async (fromDate, toDate, huyen, xa) => {
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        huyen,
        xa,
        xacMinh: 'false' // Luôn lấy tất cả dữ liệu để thống kê
      });

      const response = await fetch(`/api/search/mat-rung?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data.features) {
        // Xử lý dữ liệu để tạo chartData theo huyện
        const features = data.data.features;
        const chartData = {};

        features.forEach(feature => {
          const huyenName = feature.properties.mahuyen || 'Unknown';
          if (!chartData[huyenName]) {
            chartData[huyenName] = {
              "Chưa xác minh": 0,
              "Đã xác minh": 0,
              area_chua_xac_minh: 0,
              area_da_xac_minh: 0
            };
          }

          const isVerified = feature.properties.xacminh === 1 || feature.properties.xacminh === '1';
          const area = (feature.properties.dtich || 0) / 10000; // Convert to hectares

          if (isVerified) {
            chartData[huyenName]["Đã xác minh"] += 1;
            chartData[huyenName].area_da_xac_minh += area;
          } else {
            chartData[huyenName]["Chưa xác minh"] += 1;
            chartData[huyenName].area_chua_xac_minh += area;
          }
        });

        setReportData(chartData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  // Hàm format ngày để hiển thị đẹp hơn
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  // Hàm xử lý dữ liệu biểu đồ từ reportData
  const processChartData = (data) => {
    if (!data || typeof data !== 'object') return { dataTinCay: [], dataDienTich: [] };

    const dataTinCay = [];
    const dataDienTich = [];

    Object.entries(data).forEach(([huyen, stats]) => {
      dataTinCay.push({
        name: huyen,
        "Chưa xác minh": stats["Chưa xác minh"] || 0,
        "Đã xác minh": stats["Đã xác minh"] || 0,
      });

      dataDienTich.push({
        name: huyen,
        "Chưa xác minh": parseFloat((stats.area_chua_xac_minh || 0).toFixed(2)),
        "Đã xác minh": parseFloat((stats.area_da_xac_minh || 0).toFixed(2)),
      });
    });

    return { dataTinCay, dataDienTich };
  };

  const { dataTinCay, dataDienTich } = processChartData(reportData);

  // Hàm xử lý xuất file DOCX
  const handleExportDocx = () => {
    try {
      // Hiển thị loading
      setIsExportingDocx(true);
      setLoadingMessage("Đang chuẩn bị tải DOCX...");
      
      // ✅ Thêm tham số xacMinh vào URL
      const exportUrl = `/api/bao-cao/export-docx?fromDate=${reportParams.fromDate}&toDate=${reportParams.toDate}&huyen=${encodeURIComponent(reportParams.huyen)}&xa=${encodeURIComponent(reportParams.xa)}&xacMinh=${reportParams.xacMinh}`;
      const link = document.createElement('a');
      link.href = exportUrl;
      
      // ✅ Tên file khác nhau cho 2 loại báo cáo
      const fileName = reportParams.xacMinh === 'true' 
        ? `bao-cao-xac-minh-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`
        : `bao-cao-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`;
      link.setAttribute('download', fileName);
      link.setAttribute('target', '_blank');
      
      // Thêm vào DOM, click và xóa
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Thông báo và tắt loading sau 2 giây
      toast.success("File DOCX đang được tải xuống");
      setTimeout(() => {
        setIsExportingDocx(false);
      }, 2000);
    } catch (error) {
      console.error("Lỗi khi tải DOCX:", error);
      toast.error("Có lỗi xảy ra khi tải DOCX");
      setIsExportingDocx(false);
    }
  };

  // Hàm xử lý xuất PDF
  const handleExportPdf = () => {
    try {
      // Hiển thị loading
      setIsExportingPdf(true);
      setLoadingMessage("Đang chuẩn bị mở trang báo cáo...");
      
      // ✅ Thêm tham số xacMinh vào URL
      const exportUrl = `/api/bao-cao/export-pdf?fromDate=${reportParams.fromDate}&toDate=${reportParams.toDate}&huyen=${encodeURIComponent(reportParams.huyen)}&xa=${encodeURIComponent(reportParams.xa)}&xacMinh=${reportParams.xacMinh}`;
      
      // Mở cửa sổ mới
      window.open(exportUrl, '_blank');
      
      // Thông báo và tắt loading
      toast.info("Đã mở trang báo cáo. Hãy nhấn nút 'Lưu PDF' ở trang mới để tải về.");
      setTimeout(() => {
        setIsExportingPdf(false);
      }, 2000);
    } catch (error) {
      console.error("Lỗi khi mở trang PDF:", error);
      toast.error("Có lỗi xảy ra khi mở trang báo cáo");
      setIsExportingPdf(false);
    }
  };

  // Trạng thái loading tổng hợp
  const isPageLoading = reportLoading || isExportingDocx || isExportingPdf;

  // Hiển thị nếu không có dữ liệu
  if (!reportData && !reportLoading)
    return (
      <p className="text-center text-gray-500 mt-8">
        Chưa có dữ liệu báo cáo...
      </p>
    );

  // Hiển thị overlay loading khi đang xử lý
  if (isPageLoading) {
    return <ReportLoadingOverlay message={loadingMessage} />;
  }

  // Kiểm tra nếu reportData là mảng và type là "Văn bản" => hiển thị bảng văn bản
  // QUAN TRỌNG: Phải kiểm tra type !== "Biểu đồ" để tránh hiển thị nhầm
  if (Array.isArray(reportData) && reportParams.type !== "Biểu đồ") {
    // ✅ Tiêu đề và headers khác nhau cho 2 loại báo cáo
    const isVerified = reportParams.xacMinh === 'true';
    const reportTitle = isVerified
      ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
      : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

    // Tính tổng số lô và tổng diện tích
    const totalLots = reportData.length;
    const totalArea = reportData.reduce((sum, item) => {
      const areaField = isVerified ? item.properties.dtichXM : item.properties.dtich;
      return sum + (areaField || 0);
    }, 0) / 10000; // Convert to hectares

    return (
      <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-center text-lg font-bold">
            {reportTitle}
          </h2>

          {/* Thêm các nút xuất file */}
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

        <div className="overflow-auto border border-gray-300 rounded shadow px-6 pt-2 pb-6">
          {/* Hiển thị thông tin từ params thực tế */}
          <div className="text-sm mb-2">
            <div className="flex justify-between font-semibold">
              <span>Tỉnh: Lào Cai</span>
              <span>Huyện: {reportData.length > 0 ? (reportData[0].properties.huyen_name || reportParams.huyen) : (reportParams.huyen || '..........')}</span>
              <span>Xã: {reportData.length > 0 ? (reportData[0].properties.xa_name || reportParams.xa) : (reportParams.xa || '..........')}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1">
              <span></span>
              <span>
                Từ ngày: {formatDate(reportParams.fromDate) || '..........'}
                {' '}
                Đến ngày: {formatDate(reportParams.toDate) || '..........'}
              </span>
            </div>
          </div>

          {/* ✅ Bảng với headers khác nhau cho 2 loại báo cáo */}
          <table className="w-full border border-black text-sm text-center table-fixed">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1">TT</th>
                <th className="border border-black px-2 py-1">Huyện</th>
                <th className="border border-black px-2 py-1">Xã</th>
                <th className="border border-black px-2 py-1">Lô cảnh báo</th>
                <th className="border border-black px-2 py-1">Tiểu khu</th>
                <th className="border border-black px-2 py-1">Khoảnh</th>
                <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>X</th>
                <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>Y</th>
                <th className="border border-black px-2 py-1">Diện tích (ha)</th>
                {isVerified && (
                  <th className="border border-black px-2 py-1">Nguyên nhân</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">{item.properties.huyen_name || item.properties.huyen || ""}</td>
                  <td className="border border-black px-2 py-1">{item.properties.xa_name || item.properties.xa || ""}</td>
                  <td className="border border-black px-2 py-1">{item.properties.lo_canbao || (item.properties.gid ? `CB-${item.properties.gid}` : "")}</td>
                  <td className="border border-black px-2 py-1">{item.properties.tk || ""}</td>
                  <td className="border border-black px-2 py-1">{item.properties.khoanh || ""}</td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.x ? Math.round(item.properties.x) : ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.y ? Math.round(item.properties.y) : ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {isVerified
                      ? (item.properties.dtichXM ? (item.properties.dtichXM / 10000).toFixed(2) : "")
                      : (item.properties.dtich ? (item.properties.dtich / 10000).toFixed(2) : "")
                    }
                  </td>
                  {isVerified && (
                    <td className="border border-black px-2 py-1">
                      {item.properties.verification_reason || ""}
                    </td>
                  )}
                </tr>
              ))}
              {/* Dòng tổng */}
              <tr>
                <td className="border border-black px-2 py-1 font-bold" colSpan={isVerified ? "9" : "8"}>Tổng</td>
                <td className="border border-black px-2 py-1 font-bold">
                  {totalArea.toFixed(2)}
                </td>
                {isVerified && <td className="border border-black px-2 py-1"></td>}
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between mt-6 text-sm px-2">
            <span>
              <strong>Người tổng hợp</strong>
            </span>
            <span className="text-right">
              Lào Cai, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              <br />
              <strong>Ban quản lý rừng</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Nếu reportData là object và type là "Biểu đồ" => hiển thị biểu đồ
  // QUAN TRỌNG: Kiểm tra reportData không phải mảng và type là "Biểu đồ"
  if (typeof reportData === 'object' && !Array.isArray(reportData) && reportParams.type === "Biểu đồ") {
    const dataTinCay = Object.entries(reportData).map(([huyen, value]) => ({
      name: huyen,
      "Chưa xác minh": value["Chưa xác minh"] || 0,
      "Đã xác minh": value["Đã xác minh"] || 0,
    }));

    const dataDienTich = Object.entries(reportData).map(([huyen, value]) => ({
      name: huyen,
      "Chưa xác minh": value.area_chua_xac_minh || 0,
      "Đã xác minh": value.area_da_xac_minh || 0,
    }));

    return (
      <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
        <h2 className="text-center text-lg font-bold mb-4">
          THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG
        </h2>

        {/* Hiển thị thông tin từ params thực tế */}
        <div className="text-center text-sm mb-4 bg-gray-50 p-3 rounded">
          <div className="font-semibold">
            Tỉnh: Lào Cai |
            Từ ngày: {formatDate(reportParams.fromDate)} -
            Đến ngày: {formatDate(reportParams.toDate)}
          </div>
          {(reportParams.huyen || reportParams.xa) && (
            <div className="text-xs text-gray-600 mt-1">
              {reportParams.huyen && `Huyện: ${reportParams.huyen}`}
              {reportParams.huyen && reportParams.xa && ' | '}
              {reportParams.xa && `Xã: ${reportParams.xa}`}
            </div>
          )}
          {/* ✅ Hiển thị loại báo cáo */}
          <div className="text-sm text-green-600 font-medium mt-1">
            {reportParams.type === 'Biểu đồ' ? '📊 Báo cáo biểu đồ thống kê' : (reportParams.xacMinh === 'true' ? '✅ Báo cáo xác minh (Loại 2)' : '📋 Báo cáo tổng hợp (Loại 1)')}
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-1/2 space-y-8">
            <div>
              <h3 className="text-center font-semibold mb-2">
                Biểu đồ mức độ tin cậy dự báo mất rừng (%)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataTinCay}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                  <Bar dataKey="Đã xác minh" fill="#ff6633" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-center font-semibold mb-2">
                Biểu đồ diện tích dự báo mất rừng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataDienTich}>
                  <XAxis dataKey="name" />
                  <YAxis unit=" ha" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                  <Bar dataKey="Đã xác minh" fill="#ff6633" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trường hợp không khớp với bất kỳ điều kiện nào
  return (
    <div className="p-6 font-sans">
      <p className="text-center text-gray-500 mt-8">
        Không thể hiển thị báo cáo. Vui lòng thử lại.
      </p>
    </div>
  );
};

export default ThongKeBaoCaoMatRung;