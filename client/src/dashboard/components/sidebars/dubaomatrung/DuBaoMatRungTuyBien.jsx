import React, { useState, useEffect } from "react";
import Select from "../../Select";
import { useAuth } from "../../../contexts/AuthContext";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import DistrictDropdown from "../../DistrictDropdown";
import { toast } from "react-toastify";

const DuBaoMatRungTuyBien = () => {
  const { isAdmin, getUserDistrictId } = useAuth();
  const { setGeoData, setLoading } = useGeoData();
  
  const [xaList, setXaList] = useState([]);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isInputOpen, setInputOpen] = useState(true);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [selectedXa, setSelectedXa] = useState("");
  const [loading, setLoadingState] = useState(false);

  // ✅ THÊM: State cho các input date của giao diện cũ
  const [kyTruocStart, setKyTruocStart] = useState("");
  const [kyTruocEnd, setKyTruocEnd] = useState("");
  const [kySauStart, setKySauStart] = useState("");
  const [kySauEnd, setKySauEnd] = useState("");

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    // Auto-fill huyện cho user cấp huyện
    if (!isAdmin() && getUserDistrictId()) {
      const districtMapping = {
        '01': 'Lào Cai',
        '02': 'Bát Xát', 
        '03': 'Mường Khương',
        '04': 'Si Ma Cai',
        '05': 'Bắc Hà',
        '06': 'Bảo Thắng',
        '07': 'Bảo Yên',
        '08': 'Sa Pa',
        '09': 'Văn Bàn'
      };
      const districtName = districtMapping[getUserDistrictId()];
      if (districtName) {
        setSelectedHuyen(districtName);
      }
    }
  }, [isAdmin, getUserDistrictId]);

  useEffect(() => {
    // Khi huyện thay đổi, tải danh sách xã tương ứng
    const fetchXaList = async () => {
      if (!selectedHuyen) return;
      
      try {
        setLoadingState(true);
        const res = await fetch(
          `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(selectedHuyen)}`
        );
        const data = await res.json();
        setXaList(data);
      } catch (err) {
        console.error("Lỗi khi tải danh sách xã:", err);
        setXaList([]);
      } finally {
        setLoadingState(false);
      }
    };
    
    fetchXaList();
  }, [selectedHuyen]);

  const handleHuyenChange = (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    setSelectedXa(""); // Reset xã khi thay đổi huyện
  };

  const handleXaChange = (e) => {
    setSelectedXa(e.target.value);
  };

  // ✅ THÊM: Hàm xử lý phân tích với logic của giao diện cũ
  const handleAnalyze = async () => {
    try {
      // ✅ Xác định khoảng thời gian để phân tích
      let fromDate = "";
      let toDate = "";

      // Logic: Nếu có cả kỳ trước và kỳ sau, lấy từ kỳ trước đến kỳ sau
      // Nếu chỉ có một kỳ, sử dụng kỳ đó
      if (kyTruocStart && kySauEnd) {
        fromDate = kyTruocStart;
        toDate = kySauEnd;
      } else if (kyTruocStart && kyTruocEnd) {
        fromDate = kyTruocStart;
        toDate = kyTruocEnd;
      } else if (kySauStart && kySauEnd) {
        fromDate = kySauStart;
        toDate = kySauEnd;
      } else {
        toast.warning("Vui lòng chọn ít nhất một khoảng thời gian (kỳ trước hoặc kỳ sau)");
        return;
      }

      // Kiểm tra quyền truy cập cho admin
      if (isAdmin() && !selectedHuyen) {
        toast.warning("Vui lòng chọn huyện");
        return;
      }

      console.log("🔮 Dự báo tùy biến với tham số:", {
        fromDate,
        toDate, 
        huyen: selectedHuyen,
        xa: selectedXa
      });

      setLoading(true);
      setLoadingState(true);

      // ✅ Gọi API tra cứu dữ liệu với tham số đã xác định
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        huyen: selectedHuyen,
        xa: selectedXa
      });

      const res = await fetch(
        `${config.API_URL}/api/quan-ly-du-lieu/tra-cuu-du-lieu-bao-mat-rung?${queryParams.toString()}`
      );

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.message || "Lỗi khi truy vấn dữ liệu");
        return;
      }

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Lỗi từ backend");
        return;
      }

      if (!data.data || data.data.features.length === 0) {
        toast.warning("Không có dữ liệu phù hợp trong khoảng thời gian này");
        setGeoData({ type: "FeatureCollection", features: [] });
        return;
      }

      // ✅ Set dữ liệu để hiển thị trên bản đồ và bảng
      setGeoData(data.data);
      
      toast.success(`✅ Phân tích hoàn tất: tìm thấy ${data.data.features.length} khu vực mất rừng`, {
        autoClose: 3000
      });

      console.log("✅ Dự báo tùy biến hoàn thành:", data.data.features.length, "features");

    } catch (err) {
      console.error("❌ Lỗi dự báo tùy biến:", err);
      toast.error(`Lỗi khi thực hiện phân tích: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingState(false);
    }
  };

  // Hàm xử lý khi dropdown focus hoặc blur
  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };
  
  return (
    <div>
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Dự báo mất rừng tùy biến
      </div>
      
      {isForecastOpen && (
        <div className="flex flex-col gap-2 pt-3">
          <div
            className="bg-forest-green-gray py-2=0.2 px-3 rounded-md flex justify-between items-center cursor-pointer relative"
            onClick={() => setInputOpen(!isInputOpen)}
          >
            <span className="text-sm font-medium">Lựa chọn đầu vào</span>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Select isOpen={isInputOpen} />
            </div>
          </div>

          {isInputOpen && (
            <div className="flex flex-col gap-2 px-1 pt-1">
              <div className="px-2 ml-8">
                <div className="font-medium text-sm mb-1 ">Khu vực</div>
                <div className="flex items-center justify-between mb-1 pl-4 ">
                  <label className="text-sm">Huyện</label>
                  <div className="w-36">
                    <DistrictDropdown
                      value={selectedHuyen}
                      onChange={handleHuyenChange}
                      isLoading={loading}
                      disabled={!isAdmin()} // ✅ Lock cho user cấp huyện
                      onFocus={() => handleDropdownToggle("huyen", true)}
                      onBlur={() => handleDropdownToggle("huyen", false)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Xã</label>
                  <div className="relative w-36">
                    <select
                      value={selectedXa}
                      onChange={handleXaChange}
                      disabled={loading}
                      className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      onFocus={() => handleDropdownToggle("xa", true)}
                      onBlur={() => handleDropdownToggle("xa", false)}
                    >
                      <option value="">Chọn xã</option>
                      {xaList.map((xa, index) => (
                        <option key={index} value={xa.value}>
                          {xa.label}
                        </option>
                      ))}
                    </select>
                    <Select isOpen={openDropdown === "xa"} />
                  </div>
                </div>

                <div className="font-medium text-sm mb-1">Kỳ trước:</div>
                <div className="flex items-center justify-between mb-1 pl-4 relative ">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={kyTruocStart}
                    onChange={(e) => setKyTruocStart(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={kyTruocEnd}
                    onChange={(e) => setKyTruocEnd(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">Kỳ sau:</div>
                <div className="flex items-center justify-between mb-1 pl-4">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={kySauStart}
                    onChange={(e) => setKySauStart(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={kySauEnd}
                    onChange={(e) => setKySauEnd(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">
                  Diện tích phát hiện tối thiểu:
                </div>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center disabled:opacity-50"
              >
                {loading ? "Đang phân tích..." : "Phân tích"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuBaoMatRungTuyBien;