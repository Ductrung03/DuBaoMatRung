import React, { useState, useEffect } from "react";
import Select from "../../Select";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";
import DistrictDropdown from "../../DistrictDropdown";

const TraCuuAnhVeTinh = () => {
  const [xaList, setXaList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [selectedXa, setSelectedXa] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  
  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    // Khi huyện thay đổi, tải danh sách xã tương ứng
    const fetchXaList = async () => {
      if (!selectedHuyen) return;
      
      try {
        setLoading(true);
        const res = await fetch(
          `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(selectedHuyen)}`
        );
        const data = await res.json();
        setXaList(data);
      } catch (err) {
        console.error("Lỗi lấy xã:", err);
        setLoading(false);
      } finally {
        setLoading(false);
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

  // Hàm xử lý khi dropdown focus hoặc blur
  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };

  return (
    <div>
      {/* DỰ BÁO MẤT RỪNG TỰ ĐỘNG */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Tra cứu dữ liệu ảnh vệ tinh
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Thời gian */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Thời gian</label>
              <div className="relative w-36">
                <input
                  type="date"
                  className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Huyện */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Huyện</label>
              <div className="w-36">
                <DistrictDropdown
                  value={selectedHuyen}
                  onChange={handleHuyenChange}
                  isLoading={loading}
                  onFocus={() => handleDropdownToggle("huyen", true)}
                  onBlur={() => handleDropdownToggle("huyen", false)}
                />
              </div>
            </div>

            {/* Xã */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Xã</label>
              <div className="relative w-36">
                <select
                  value={selectedXa}
                  onChange={handleXaChange}
                  disabled={loading}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
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
          </div>

          <button 
            className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Đang tải...</span>
              </div>
            ) : (
              "Tra cứu"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuAnhVeTinh;
