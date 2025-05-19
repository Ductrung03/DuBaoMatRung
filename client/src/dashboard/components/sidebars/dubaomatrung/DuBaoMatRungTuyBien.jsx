import React, { useState, useEffect } from "react";
import Select from "../../Select";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";
import DistrictDropdown from "../../DistrictDropdown";

const DuBaoMatRungTuyBien = () => {
  const { user, isAdmin } = useAuth();
  const [xaList, setXaList] = useState([]);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isInputOpen, setInputOpen] = useState(true);
  const [isDownloadOpen, setDownloadOpen] = useState(true);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [selectedXa, setSelectedXa] = useState("");
  const [loading, setLoading] = useState(false);

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

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
        console.error("Lỗi khi tải danh sách xã:", err);
        setXaList([]);
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
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">Kỳ sau:</div>
                <div className="flex items-center justify-between mb-1 pl-4">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">
                  Diện tích phát hiện tối thiểu:
                </div>
              </div>
              <button className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Phân tích
              </button>
            </div>
          )}
          <div
            className="bg-forest-green-gray py-2=0.2 px-3 rounded-md flex justify-between items-center cursor-pointer relative"
            onClick={() => setDownloadOpen(!isDownloadOpen)}
          >
            <span className="text-sm font-medium">Tải xuống</span>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Select isOpen={isDownloadOpen} />
            </div>
          </div>
          {isDownloadOpen && (
            <div className="px-2 py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">Lọc mây</span>
                <div className="flex gap-2">
                  <button className="bg-forest-green-gray hover:bg-green-200 text-black-800 text-sm py-1 px-4 rounded-md">
                    Kỳ trước
                  </button>
                  <button className="bg-forest-green-gray hover:bg-green-200 text-black-800 text-sm py-1 px-4 rounded-md">
                    Kỳ sau
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm">NDVI</span>
                <button className="bg-forest-green-gray hover:bg-green-200 text-black-800 text-sm py-1 px-4 rounded-md">
                  Xuất
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Kết quả dự báo mất rừng</span>
                <button className="bg-forest-green-gray hover:bg-green-200 text-black-800 text-sm py-1 px-4 rounded-md">
                  Xuất
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuBaoMatRungTuyBien;
