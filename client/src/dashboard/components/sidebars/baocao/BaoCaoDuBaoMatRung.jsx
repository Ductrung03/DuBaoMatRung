import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
import { getCommunes } from "../../../../utils/adminService";
import Dropdown from "../../../../components/Dropdown";
 // Import the generic Dropdown

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
    const fetchXa = async () => {
      if (selectedHuyen) {
        try {
          setIsLoading(true);
          const communes = await getCommunes(selectedHuyen);
          setXaList(communes);
        } catch (err) {
          console.error("Lỗi lấy xã:", err);
          toast.error("Không thể tải danh sách xã. Vui lòng thử lại sau.");
          setXaList([]);
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
    const value = typeof e === 'string' ? e : e.target.value;
    setSelectedHuyen(value);
    setSelectedXa(""); // Reset xã khi thay đổi huyện
  };

  const handleXaChange = (value) => {
    setSelectedXa(value);
  };

  const handleReportTypeChange = (value) => {
    setReportType(value);
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
      status: isXacMinh ? 'true' : 'false'  // ✅ SỬA: Đổi tên param thành status
    });

    try {
      // Giả lập trạng thái loading progress
      const progressInterval = setInterval(() => {
        const newMessage = getNextLoadingMessage(loadingMessage);
        setLoadingMessage(newMessage);
      }, 800);

      // ✅ SỬA: Đổi endpoint thành /api/search/mat-rung
      const res = await axios.get(`/api/search/mat-rung?${params.toString()}`);

      clearInterval(progressInterval);

      const data = res.data;
      
      if (reportType === "Văn bản" || reportType === "Biểu đồ") {
        if (!data.data || !data.data.features || data.data.features.length === 0) {
          toast.info(`Không tìm thấy dữ liệu ${isXacMinh ? 'đã xác minh' : ''} phù hợp với điều kiện tìm kiếm`);
          setReportLoading(false);
        } else {
          setReportData(data.data.features);
          
          // Đợi một chút để trạng thái loading được hiển thị rõ ràng
          setTimeout(() => {
            // ✅ SỬA: Lưu tham số status vào URL
            navigate({
              pathname: "/dashboard/baocao",
              search: `?fromDate=${fromDate}&toDate=${toDate}&huyen=${encodeURIComponent(selectedHuyen)}&xa=${encodeURIComponent(selectedXa)}&status=${isXacMinh}&type=${encodeURIComponent(reportType)}`
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
                />
              </div>
            </div>

            {/* Xã */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Xã</label>
              <Dropdown
                selectedValue={selectedXa}
                onValueChange={handleXaChange}
                options={xaList}
                placeholder="Chọn xã"
                disabled={isLoading}
                loading={isLoading}
                className="w-36"
                selectClassName="w-full border border-green-400 rounded-md px-2 py-1 bg-white"
              />
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
              <Dropdown
                selectedValue={reportType}
                onValueChange={handleReportTypeChange}
                options={loaiBaoCaoList.map(type => ({ value: type, label: type }))}
                placeholder="Chọn loại"
                disabled={isLoading}
                loading={isLoading}
                className="w-36"
                selectClassName="w-full border border-green-400 rounded-md px-2 py-1 bg-white"
              />
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