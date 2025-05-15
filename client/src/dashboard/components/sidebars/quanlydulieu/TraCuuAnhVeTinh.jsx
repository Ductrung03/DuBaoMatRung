import React, { useState, useEffect } from "react";
import Select from "../../Select";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";

const TraCuuAnhVeTinh = () => {
  const [huyenList, setHuyenList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  
  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const { user, isAdmin } = useAuth();

  // Tải danh sách huyện khi component mount
  useEffect(() => {
    const fetchHuyenList = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/api/dropdown/huyen`);
        let data = await response.json();
        
        // Nếu không phải admin, lọc danh sách huyện theo huyện của người dùng
        if (!isAdmin() && user?.district_id) {
          data = data.filter(huyen => huyen.value === user.district_id);
          
          // Nếu chỉ có một huyện (huyện của người dùng), tự động chọn huyện đó
          if (data.length === 1) {
            setSelectedHuyen(data[0].value);
            // Tự động load danh sách xã của huyện đó
            const xaRes = await fetch(
              `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(data[0].value)}`
            );
            const xaData = await xaRes.json();
            setXaList(xaData);
          }
        }
        
        setHuyenList(data);
        setLoading(false);
      } catch (err) {
        console.error("Lỗi khi tải danh sách huyện:", err);
        setLoading(false);
      }
    };
    
    fetchHuyenList();
  }, [isAdmin, user]);

  const handleHuyenChange = async (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    try {
      setLoading(true);
      const res = await fetch(`${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(huyen)}`);
      const data = await res.json();
      setXaList(data);
      setLoading(false);
    } catch (err) {
      console.error("Lỗi lấy xã:", err);
      setLoading(false);
    }
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
        Tra cứu dữ ảnh vệ tinh
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
                  className="bw-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Huyện */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Huyện</label>
              <div className="relative w-36">
                <select
                  value={selectedHuyen}
                  onChange={handleHuyenChange}
                  disabled={loading || (!isAdmin() && user?.district_id)}
                  className={`w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none ${!isAdmin() && user?.district_id ? "bg-gray-100" : "bg-white"} focus:outline-none focus:ring-2 focus:ring-green-400`}
                  onFocus={() => handleDropdownToggle("huyen", true)}
                  onBlur={() => handleDropdownToggle("huyen", false)}
                >
                  <option value="">Chọn huyện</option>
                  {huyenList.map((huyen, index) => (
                    <option key={index} value={huyen.value}>
                      {huyen.label}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "huyen"} />
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
            {loading ? 'Đang tải...' : 'Tra cứu'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuAnhVeTinh;