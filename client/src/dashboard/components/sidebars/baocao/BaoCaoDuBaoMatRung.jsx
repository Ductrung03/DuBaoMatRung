import React, { useState, useEffect, useRef } from "react";
import Select from "../../Select";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Title,
} from "chart.js";
import { useReport } from "../../../contexts/ReportContext";
import { useNavigate } from "react-router-dom";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import { useAuth } from "../../../contexts/AuthContext";
import DistrictDropdown from "../../DistrictDropdown";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Title
);

// Overlay loading component
const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-forest-green-primary font-medium">{message}</p>
    </div>
  </div>
);

const BaoCaoDuBaoMatRung = () => {
  const loaiBaoCaoList = ["Văn bản", "Biểu đồ"];
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportType, setReportType] = useState("");
  const [chartData] = useState(null);
  const [, setOpenDropdown] = useState(null);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  
  // ✅ THÊM: State cho checkbox xác minh
  const [isXacMinh, setIsXacMinh] = useState(false);
  
  // Thêm state cho loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { setReportData, setReportLoading } = useReport();
  const navigate = useNavigate();
  useAuth();

  useEffect(() => {
    // Hàm này sẽ được thực hiện khi danh sách huyện thay đổi hoặc khi có huyện được chọn
    const fetchXa = async () => {
      if (selectedHuyen) {
        try {
          setIsLoading(true);
          const xaRes = await fetch(
            `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(selectedHuyen)}`
          );
          const xaData = await xaRes.json();
          setXaList(xaData);
        } catch (err) {
          console.error("Lỗi lấy xã:", err);
          toast.error("Không thể tải danh sách xã. Vui lòng thử lại sau.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setXaList([]);
      }
    };
    
    fetchXa();
  }, [selectedHuyen]);
  
  const handleHuyenChange = (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    setSelectedXa(""); // Reset xã khi thay đổi huyện
  };

  const handleXaChange = (e) => {
    setSelectedXa(e.target.value);
  };

  const timeoutRef = useRef(null);

const handleDropdownToggle = (dropdownName, isOpen) => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  
  if (!isOpen) {
    // Delay việc đóng dropdown để tránh xung đột
    timeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 100);
  } else {
    setOpenDropdown(dropdownName);
  }
};

  const handleBaoCao = async () => {
    // Kiểm tra thông tin nhập vào - phải điền đầy đủ tất cả các trường
    if (!fromDate || !toDate) {
      toast.warning("Vui lòng chọn ngày bắt đầu và kết thúc");
      return;
    }
    
    if (!reportType) {
      toast.warning("Vui lòng chọn loại báo cáo");
      return;
    }
    
    if (!selectedHuyen) {
      toast.warning("Vui lòng chọn huyện");
      return;
    }
    
    if (!selectedXa) {
      toast.warning("Vui lòng chọn xã");
      return;
    }
    
    setIsLoading(true);
    setLoadingMessage("Đang tạo báo cáo...");
    
    // Cập nhật trạng thái loading cho cả trang Thống kê báo cáo
    setReportLoading(true);

    const params = new URLSearchParams({
      fromDate,
      toDate,
      huyen: selectedHuyen,
      xa: selectedXa,
      type: reportType,
      xacMinh: isXacMinh ? 'true' : 'false'  // ✅ THÊM: Truyền tham số xác minh
    });

    try {
      // Giả lập trạng thái loading progress
      const progressInterval = setInterval(() => {
        const newMessage = getNextLoadingMessage(loadingMessage);
        setLoadingMessage(newMessage);
      }, 800);

      const res = await fetch(`${config.API_URL}/api/bao-cao/tra-cuu-du-lieu-bao-mat-rung?${params.toString()}`);
      
      clearInterval(progressInterval);
      
      if (!res.ok) {
        throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (reportType === "Văn bản" || reportType === "Biểu đồ") {
        if (!data.data || (Array.isArray(data.data) && data.data.length === 0)) {
          toast.info(`Không tìm thấy dữ liệu ${isXacMinh ? 'đã xác minh' : ''} phù hợp với điều kiện tìm kiếm`);
          setReportLoading(false);
        } else {
          setReportData(data.data);
          
          // Đợi một chút để trạng thái loading được hiển thị rõ ràng
          setTimeout(() => {
            // ✅ SỬA: Lưu tham số xác minh vào URL
            navigate({
              pathname: "/dashboard/baocao",
              search: `?fromDate=${fromDate}&toDate=${toDate}&huyen=${encodeURIComponent(selectedHuyen)}&xa=${encodeURIComponent(selectedXa)}&xacMinh=${isXacMinh}`
            });
            
            toast.success(`Đã tạo báo cáo ${isXacMinh ? 'xác minh' : ''} thành công!`);
            setReportLoading(false);
          }, 1000);
        }
      }
    } catch (err) {
      console.error("Lỗi tạo báo cáo:", err);
      toast.error("Không thể tạo báo cáo: " + err.message);
      setReportLoading(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Hàm lấy thông báo loading tiếp theo theo vòng tròn
  const getNextLoadingMessage = (currentMessage) => {
    const messages = [
      "Đang tạo báo cáo...",
      "Đang truy vấn dữ liệu...",
      "Đang xử lý kết quả...",
      "Đang hoàn thiện báo cáo..."
    ];
    const currentIndex = messages.indexOf(currentMessage);
    return messages[(currentIndex + 1) % messages.length];
  };

  return (
    <div>
      {/* Hiển thị overlay loading khi đang xử lý */}
      {isLoading && <LoadingOverlay message={loadingMessage} />}
    
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Báo cáo phát hiện sớm mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          <div className="flex flex-col gap-3">
            {/* Từ ngày */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Từ ngày</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-36 border border-green-400 rounded-md px-2 py-1 bg-white"
                disabled={isLoading}
              />
            </div>

            {/* Đến ngày */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Đến ngày</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-36 border border-green-400 rounded-md px-2 py-1 bg-white"
                disabled={isLoading}
              />
            </div>

            {/* Huyện */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Huyện</label>
              <div className="w-36">
                <DistrictDropdown
                  value={selectedHuyen}
                  onChange={handleHuyenChange}
                  isLoading={isLoading}
                  onFocus={() => handleDropdownToggle("huyen", true)}
                  onBlur={() => handleDropdownToggle("huyen", false)}
                />
              </div>
            </div>

            {/* Xã */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Xã</label>
              <select
                value={selectedXa}
                onChange={handleXaChange}
                className="w-36 border border-green-400 rounded-md px-2 py-1 bg-white"
                disabled={isLoading}
              >
                <option value="">Chọn xã</option>
                {xaList.map((item, i) => (
                  <option key={i} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ THÊM: Checkbox Xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Xác minh</label>
              <div className="w-36 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="xacMinh"
                  checked={isXacMinh}
                  onChange={(e) => setIsXacMinh(e.target.checked)}
                  className="w-4 h-4 accent-green-600"
                  disabled={isLoading}
                />
              
              </div>
            </div>

            {/* Loại báo cáo */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Loại báo cáo</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-36 border border-green-400 rounded-md px-2 py-1 bg-white"
                disabled={isLoading}
              >
                <option value="">Chọn loại</option>
                {loaiBaoCaoList.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleBaoCao}
            disabled={isLoading}
            className={`w-36 ${isLoading ? 'bg-gray-400' : 'bg-green-300 hover:bg-green-400'} text-black font-medium py-1 px-3 rounded-full text-center mt-2 self-center flex justify-center items-center transition-all`}
          >
            {isLoading ? (
              <>
                <ClipLoader color="#333333" size={16} className="mr-2" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              "Báo cáo"
            )}
          </button>
        </div>
      )}

      {reportType === "Biểu đồ" && chartData && (
        <div className="mt-6 bg-white p-4 rounded shadow-md">
          <h3 className="text-lg font-semibold text-center mb-4">
            Biểu đồ mức độ xác minh mất rừng theo huyện
          </h3>
          <Bar
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" },
                title: { display: false },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default BaoCaoDuBaoMatRung;