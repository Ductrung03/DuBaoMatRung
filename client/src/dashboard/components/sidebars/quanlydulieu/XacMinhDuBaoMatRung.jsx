import React, { useState } from "react";
import Select from "../../Select";

const XacMinhDuBaoMatRung = () => {
  const nguyenNhanList = [
    "Khai thác rừng trái phép",
    "Chuyển đổi mục đích sử dụng đất",
    "Cháy rừng",
    "Khai thác khoáng sản",
    "Sạt lở đất",
    "Tự nhiên phục hồi",
    "Sai sót dữ liệu",
    "Nguyên nhân khác",
  ];
  const [isForecastOpen, setIsForecastOpen] = useState(true);

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

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
        Xác minh dự báo mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Mã lô dự báo */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Mã lô dự báo</label>
              <div className="flex items-center gap-2 w-36">
                <input
                  type="text"
                  className="w-16 border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button className="w-16 bg-forest-green-gray hover:bg-green-200 text-black-800 whitespace-nowrap font-medium py-0.5 px-2 rounded-md text-center  self-center">
                  Tìm
                </button>
              </div>
            </div>

            {/* Nguyên nhân */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Nguyên nhân</label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("nguyennhan", true)}
                  onBlur={() => handleDropdownToggle("nguyennhan", false)}
                >
                  <option value="">Chọn nguyên nhân</option>
                  {nguyenNhanList.map((nn, idx) => (
                    <option key={idx} value={nn}>
                      {nn}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "nguyennhan"} />
              </div>
            </div>

            {/* Diện tích thực tế */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">
                Diện tích thực tế
              </label>
              <div className="relative w-36">
                <input
                  type="text"
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Người xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Người xác minh</label>
              <div className="relative w-36">
                <input
                  type="text"
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Ngày xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Ngày xác minh</label>
              <div className="relative w-36">
                <input
                  type="date"
                  className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Ghi chú */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Ghi chú</label>
              <div className="relative w-36">
                <input
                  type="text"
                  className="bw-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          </div>

          <button className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
            Cập nhật
          </button>
        </div>
      )}
    </div>
  );
};

export default XacMinhDuBaoMatRung;
