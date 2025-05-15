import React, { useState } from "react";
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
import { FaFileWord, FaFilePdf, FaDownload } from "react-icons/fa";
import { ClipLoader } from 'react-spinners';
import config from "../../config";

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
  const { reportData, reportLoading, setReportLoading } = useReport();
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Đang tạo báo cáo...");

  // Hàm xử lý xuất file DOCX
  const handleExportDocx = () => {
    // Bật trạng thái loading
    setIsExportingDocx(true);
    setLoadingMessage("Đang chuẩn bị xuất file DOCX...");
    
    // Lấy tham số từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const fromDate = urlParams.get('fromDate') || '';
    const toDate = urlParams.get('toDate') || '';
    const huyen = urlParams.get('huyen') || '';
    const xa = urlParams.get('xa') || '';
    
    // Tạo URL để tải file
    const exportUrl = `${config.API_URL}/api/bao-cao/export-docx?fromDate=${fromDate}&toDate=${toDate}&huyen=${encodeURIComponent(huyen)}&xa=${encodeURIComponent(xa)}`;
    
    // Tạo iframe ẩn để tải file
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Xử lý sự kiện iframe load xong để tắt trạng thái loading
    iframe.onload = () => {
      setTimeout(() => {
        setIsExportingDocx(false);
        document.body.removeChild(iframe);
      }, 1000); // Đợi 1 giây để đảm bảo file đã bắt đầu tải xuống
    };
    
    // Xử lý trường hợp lỗi hoặc timeout
    iframe.onerror = () => {
      setIsExportingDocx(false);
      document.body.removeChild(iframe);
      alert("Có lỗi xảy ra khi tải xuống file. Vui lòng thử lại sau.");
    };
    
    // Đặt timeout để đảm bảo loading không hiển thị mãi mãi nếu có lỗi
    setTimeout(() => {
      if (isExportingDocx) {
        setIsExportingDocx(false);
      }
    }, 10000); // 10 giây timeout
    
    // Bắt đầu tải file
    iframe.src = exportUrl;
  };

  // Hàm xử lý xuất PDF (sử dụng HTML để in)
  const handleExportPdf = () => {
    // Bật trạng thái loading
    setIsExportingPdf(true);
    setLoadingMessage("Đang chuẩn bị tài liệu PDF...");
    
    const urlParams = new URLSearchParams(window.location.search);
    const fromDate = urlParams.get('fromDate') || '';
    const toDate = urlParams.get('toDate') || '';
    const huyen = urlParams.get('huyen') || '';
    const xa = urlParams.get('xa') || '';
    
    const exportUrl = `${config.API_URL}/api/bao-cao/export-html?fromDate=${fromDate}&toDate=${toDate}&huyen=${encodeURIComponent(huyen)}&xa=${encodeURIComponent(xa)}`;
    
    // Mở cửa sổ mới để hiển thị HTML (sẽ tự động mở hộp thoại in)
    const printWindow = window.open(exportUrl, '_blank');
    
    // Xử lý khi cửa sổ đóng hoặc không thể mở
    if (!printWindow) {
      setIsExportingPdf(false);
      alert("Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up và thử lại.");
      return;
    }
    
    // Kiểm tra khi cửa sổ in đã load xong
    const checkWindowClosed = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(checkWindowClosed);
        setIsExportingPdf(false);
      }
    }, 1000);
    
    // Đặt timeout để đảm bảo loading không hiển thị mãi mãi
    setTimeout(() => {
      clearInterval(checkWindowClosed);
      if (isExportingPdf) {
        setIsExportingPdf(false);
      }
    }, 30000); // 30 giây timeout
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

  // Kiểm tra nếu reportData là mảng => hiển thị bảng văn bản
  if (Array.isArray(reportData)) {
    return (
      <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-center text-lg font-bold">
            THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG
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
              title="In thành PDF"
            >
              {isExportingPdf ? (
                <>
                  <ClipLoader color="#ffffff" size={14} />
                  <span className="ml-1">Đang chuẩn bị...</span>
                </>
              ) : (
                <>
                  <FaFilePdf className="text-lg" />
                  <span>In PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="overflow-auto border border-gray-300 rounded shadow px-6 pt-2 pb-6">
          <div className="text-sm mb-2">
            <div className="flex justify-between font-semibold">
              <span>Tỉnh: ........................................</span>
              <span>Từ ngày: .......... Đến ngày: ..........</span>
            </div>
          </div>

          <table className="w-full border border-black text-sm text-center table-fixed">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1">TT</th>
                <th className="border border-black px-2 py-1">Huyện</th>
                <th className="border border-black px-2 py-1">Mã xã</th>
                <th className="border border-black px-2 py-1">Xã</th>
                <th className="border border-black px-2 py-1">X</th>
                <th className="border border-black px-2 py-1">Y</th>
                <th className="border border-black px-2 py-1">Tiểu khu</th>
                <th className="border border-black px-2 py-1">Khoảnh</th>
                <th className="border border-black px-2 py-1">Diện tích</th>
                <th className="border border-black px-2 py-1">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">
                    {item.huyen}
                  </td>
                  <td className="border border-black px-2 py-1">{item.maxa}</td>
                  <td className="border border-black px-2 py-1">{item.xa}</td>
                  <td className="border border-black px-2 py-1">
                    {item.x || ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.y || ""}
                  </td>
                  <td className="border border-black px-2 py-1">{item.tk}</td>
                  <td className="border border-black px-2 py-1">
                    {item.khoanh}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.area ? (item.area / 10000).toFixed(1) : ""} ha
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.ghichu || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-6 text-sm px-2">
            <span>
              <strong>Người tổng hợp</strong>
            </span>
            <span className="text-right">
              ........., ngày ...... tháng ...... năm ......
              <br />
              <strong>Chi cục trưởng</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Nếu reportData không phải mảng => hiển thị biểu đồ
  const dataTinCay = Object.entries(reportData).map(([huyen, value]) => ({
    name: huyen,
    "Chưa xác minh": value["Chưa xác minh"] || 0,
    "Đã xác minh": value["Đã xác minh"] || 0,
  }));

  const dataDienTich = Object.entries(reportData).map(([huyen, value]) => ({
    name: huyen,
    "Chưa xác minh": value.area_chua_xac_minh || Math.random() * 100 + 20,
    "Đã xác minh": value.area_da_xac_minh || Math.random() * 100 + 20,
  }));

  return (
    <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
      <h2 className="text-center text-lg font-bold mb-4">
        THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG
      </h2>

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
};

export default ThongKeBaoCaoMatRung;
