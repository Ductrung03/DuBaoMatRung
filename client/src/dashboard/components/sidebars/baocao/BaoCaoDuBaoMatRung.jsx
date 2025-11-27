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
import { useSonLaAdminUnits } from "../../../hooks/useSonLaAdminUnits";
import Dropdown from "../../../../components/Dropdown";

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
  const adminUnits = useSonLaAdminUnits();
  const { selectedXa, selectedTieukhu, selectedKhoanh } = adminUnits;

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportType, setReportType] = useState("");
  const [chartData, setChartData] = useState(null);
  const [showChart, setShowChart] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(true);

  // ✅ THÊM: State cho checkbox xác minh
  const [isXacMinh, setIsXacMinh] = useState(false);

  // Thêm state cho loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const { setReportData, setReportLoading } = useReport();
  const navigate = useNavigate();
  useAuth();

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

    if (!selectedXa) {
      toast.warning("Vui lòng chọn xã");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Đang tạo báo cáo...");

    // Cập nhật trạng thái loading cho cả trang Thống kê báo cáo
    setReportLoading(true);

    try {
      // Giả lập trạng thái loading progress
      const progressInterval = setInterval(() => {
        const newMessage = getNextLoadingMessage(loadingMessage);
        setLoadingMessage(newMessage);
      }, 800);

      if (reportType === "Biểu đồ") {
        // ✅ XỬ LÝ CHO BIỂU ĐỒ: Luôn lấy tất cả dữ liệu để tạo biểu đồ thống kê
        const params = new URLSearchParams({
          fromDate,
          toDate,
          xa: selectedXa,
          xacMinh: 'false'  // Luôn lấy tất cả dữ liệu để thống kê
        });

        const res = await axios.get(`/api/search/mat-rung?${params.toString()}`);
        clearInterval(progressInterval);

        const data = res.data;

        if (!data.data || !data.data.features || data.data.features.length === 0) {
          toast.info("Không có dữ liệu để tạo biểu đồ thống kê");
          setReportLoading(false);
          setIsLoading(false);
          return;
        }

        // Xử lý dữ liệu để tạo chartData theo huyện
        const features = data.data.features;
        const chartData = {};

        features.forEach(feature => {
          const huyen = feature.properties.huyen_name || feature.properties.huyen || 'Unknown';
          if (!chartData[huyen]) {
            chartData[huyen] = {
              "Chưa xác minh": 0,
              "Đã xác minh": 0,
              area_chua_xac_minh: 0,
              area_da_xac_minh: 0
            };
          }

          const isVerified = feature.properties.xacminh === 1 || feature.properties.xacminh === '1';
          const area = (feature.properties.dtich || 0) / 10000; // Convert to hectares

          if (isVerified) {
            chartData[huyen]["Đã xác minh"] += 1;
            chartData[huyen].area_da_xac_minh += area;
          } else {
            chartData[huyen]["Chưa xác minh"] += 1;
            chartData[huyen].area_chua_xac_minh += area;
          }
        });

        setReportData(chartData);

        // Navigate với type=biểu đồ
        setTimeout(() => {
          navigate({
            pathname: "/dashboard/baocao",
            search: `?fromDate=${fromDate}&toDate=${toDate}&xa=${encodeURIComponent(selectedXa)}&xacMinh=false&type=${encodeURIComponent(reportType)}`
          });

          toast.success("Đã tạo biểu đồ thống kê thành công!");
          setReportLoading(false);
        }, 1000);

      } else {
        // XỬ LÝ CHO VĂN BẢN: Theo loại báo cáo đã chọn
        const params = new URLSearchParams({
          fromDate,
          toDate,
          xa: selectedXa,
          xacMinh: isXacMinh ? 'true' : 'false'
        });

        const res = await axios.get(`/api/search/mat-rung?${params.toString()}`);
        clearInterval(progressInterval);

        const data = res.data;

        if (!data.data || !data.data.features || data.data.features.length === 0) {
          toast.info(`Không tìm thấy dữ liệu ${isXacMinh ? 'đã xác minh' : ''} phù hợp với điều kiện tìm kiếm`);
          setReportLoading(false);
        } else {
          setReportData(data.data.features);

          // Đợi một chút để trạng thái loading được hiển thị rõ ràng
          setTimeout(() => {
            navigate({
              pathname: "/dashboard/baocao",
              search: `?fromDate=${fromDate}&toDate=${toDate}&xa=${encodeURIComponent(selectedXa)}&xacMinh=${isXacMinh}&type=${encodeURIComponent(reportType)}`
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

            {/* Xã */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Xã</label>
              <div className="w-36">
                <Dropdown
                  selectedValue={selectedXa}
                  onValueChange={adminUnits.xa.onChange}
                  options={adminUnits.xa.list}
                  placeholder="Chọn xã"
                  disabled={adminUnits.xa.loading || adminUnits.xa.disabled}
                  loading={adminUnits.xa.loading}
                  className="w-full border border-green-400 rounded-md px-2 py-1 bg-white"
                />
              </div>
            </div>

            {/* Tiểu khu */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Tiểu khu</label>
              <div className="w-36">
                <Dropdown
                  selectedValue={selectedTieukhu}
                  onValueChange={adminUnits.tieukhu.onChange}
                  options={adminUnits.tieukhu.list}
                  placeholder="Chọn tiểu khu"
                  disabled={adminUnits.tieukhu.loading || adminUnits.tieukhu.disabled}
                  loading={adminUnits.tieukhu.loading}
                  className="w-full border border-green-400 rounded-md px-2 py-1 bg-white"
                />
              </div>
            </div>

            {/* Khoảnh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Khoảnh</label>
              <div className="w-36">
                <Dropdown
                  selectedValue={selectedKhoanh}
                  onValueChange={adminUnits.khoanh.onChange}
                  options={adminUnits.khoanh.list}
                  placeholder="Chọn khoảnh"
                  disabled={adminUnits.khoanh.loading || adminUnits.khoanh.disabled}
                  loading={adminUnits.khoanh.loading}
                  className="w-full border border-green-400 rounded-md px-2 py-1 bg-white"
                />
              </div>
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

      {showChart && chartData && (
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