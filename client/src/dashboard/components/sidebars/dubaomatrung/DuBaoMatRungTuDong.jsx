import React, { useState } from "react";
import Select from "../../Select";

const DuBaoMatRungTuDong = () => {
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedDay, setSelectedDay] = useState("Trước ngày 15");
  const [isForecastOpen, setIsForecastOpen] = useState(true);

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const months = Array.from({ length: 12 }, (_, i) =>
    (i + 1).toString().padStart(2, "0")
  );

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
        Dự báo mất rừng tự động
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Năm */}
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Năm</label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("year", true)}
                  onBlur={() => handleDropdownToggle("year", false)}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <Select isOpen={openDropdown === "year"} />
              </div>
            </div>

            {/* Tháng */}
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Tháng</label>
              <div className="relative w-36">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("month", true)}
                  onBlur={() => handleDropdownToggle("month", false)}
                >
                  {months.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "month"} />
              </div>
            </div>

            {/* Chọn */}
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Chọn</label>
              <div className="relative w-36">
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("day", true)}
                  onBlur={() => handleDropdownToggle("day", false)}
                >
                  <option value="Trước ngày 15">Trước ngày 15</option>
                  <option value="Sau ngày 15">Sau ngày 15</option>
                </select>
                <Select isOpen={openDropdown === "day"} />
              </div>
            </div>
          </div>

          <button className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
            Dự báo
          </button>
        </div>
      )}
    </div>
  );
};

export default DuBaoMatRungTuDong;
