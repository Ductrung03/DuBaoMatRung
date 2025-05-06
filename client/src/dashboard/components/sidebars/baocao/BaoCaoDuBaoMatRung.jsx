import React, { useState, useEffect } from "react";
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

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
  Title
);

// ✅ Đổi từ axios sang fetch nên dòng này không còn cần:
// import axios from "axios";

const BASE_URL = "https://dubaomatrung-backend.onrender.com";

const BaoCaoDuBaoMatRung = () => {
  const loaiBaoCaoList = ["Văn bản", "Biểu đồ"];
  const [huyenList, setHuyenList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reportType, setReportType] = useState("");
  const [chartData, setChartData] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isForecastOpen, setIsForecastOpen] = useState(true);

  const { setReportData } = useReport();
  const navigate = useNavigate(); 

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/dropdown/huyen`);
        const data = await res.json();
        setHuyenList(data);
      } catch (err) {
        console.error("Lỗi lấy huyện:", err);
      }
    };
    fetchInitialData();
  }, []);
  
  const handleHuyenChange = async (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    try {
      const res = await fetch(`${BASE_URL}/api/dropdown/xa?huyen=${encodeURIComponent(huyen)}`);
      const data = await res.json();
      setXaList(data);
    } catch (err) {
      console.error("Lỗi lấy xã:", err);
    }
  };

  const handleXaChange = (e) => {
    setSelectedXa(e.target.value);
  };

  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };

  const handleBaoCao = async () => {
    const params = new URLSearchParams({
      fromDate,
      toDate,
      huyen: selectedHuyen,
      xa: selectedXa,
      type: reportType,
    });

    try {
      const res = await fetch(`${BASE_URL}/api/bao-cao/tra-cuu-du-lieu-bao-mat-rung?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      if (reportType === "Văn bản" || reportType === "Biểu đồ") {
        setReportData(data.data);
      }
    } catch (err) {
      console.error("Lỗi tạo báo cáo:", err);
      alert("Không thể tạo báo cáo: " + err.message);
    }
  };

  return (
    <div>
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Tra cứu dữ liệu dự báo mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          <div className="flex flex-col gap-3">
            {/* Các ô nhập như từ ngày, đến ngày, huyện, xã... giữ nguyên như cũ */}
            {/* Chỉ thay axios bằng fetch như đã làm ở trên */}
          </div>

          <button
            onClick={handleBaoCao}
            className="w-36 bg-green-300 hover:bg-green-400 text-black font-medium py-1 px-3 rounded-full text-center mt-2 self-center"
          >
            Báo cáo
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
