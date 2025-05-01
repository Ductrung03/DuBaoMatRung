import React, { useState } from "react";
import Select from "../../Select";

const DuBaoMatRungTuyBien = () => {
  const administrativeUnits = [
    {
      district: "Thành phố Lào Cai",
      communes: [
        "Xã Vạn Hòa",
        "Xã Đồng Tuyển",
        "Xã Cam Đường",
        "Xã Tả Phời",
        "Xã Hợp Thành",
        "Xã Cốc San",
        "Xã Thống Nhất"
      ]
    },
    {
      district: "Thị xã Sa Pa",
      communes: [
        "Xã Sa Pả",
        "Xã San Sả Hồ",
        "Xã Bản Hồ",
        "Xã Lao Chải",
        "Xã Thanh Bình",
        "Xã Nậm Cang",
        "Xã Nậm Sài",
        "Xã Nậm Mòn",
        "Xã Tả Van",
        "Xã Tả Phìn",
        "Xã Sử Pán",
        "Xã Mường Hoa",
        "Xã Trung Chải",
        "Xã Hầu Thào"
      ]
    },
    {
      district: "Huyện Bát Xát",
      communes: [
        "Xã A Lù",
        "Xã A Mú Sung",
        "Xã Bản Qua",
        "Xã Bản Vược",
        "Xã Bản Xèo",
        "Xã Cốc Mỳ",
        "Xã Dền Sáng",
        "Xã Dền Thàng",
        "Xã Mường Hum",
        "Xã Mường Vi",
        "Xã Nậm Chạc",
        "Xã Nậm Pung",
        "Xã Pa Cheo",
        "Xã Phìn Ngan",
        "Xã Quang Kim",
        "Xã Sàng Ma Sáo",
        "Xã Tòng Sành",
        "Xã Trịnh Tường",
        "Xã Trung Lèng Hồ",
        "Xã Y Tý",
        "Xã Ngải Thầu"
      ]
    },
    {
      district: "Huyện Bảo Thắng",
      communes: [
        "Xã Phố Lu",
        "Xã Sơn Hà",
        "Xã Sơn Hải",
        "Xã Xuân Giao",
        "Xã Xuân Quang",
        "Xã Trì Quang",
        "Xã Gia Phú",
        "Xã Bản Cầm",
        "Xã Thái Niên",
        "Xã Phong Niên",
        "Xã Bản Phiệt",
        "Xã Phú Nhuận"
      ]
    },
    {
      district: "Huyện Bảo Yên",
      communes: [
        "Xã Nghĩa Đô",
        "Xã Xuân Thượng",
        "Xã Xuân Hòa",
        "Xã Tân Tiến",
        "Xã Tân Dương",
        "Xã Thượng Hà",
        "Xã Kim Sơn",
        "Xã Cam Cọn",
        "Xã Minh Tân",
        "Xã Việt Tiến",
        "Xã Yên Sơn",
        "Xã Bảo Hà",
        "Xã Lương Sơn",
        "Xã Điện Quan",
        "Xã Phúc Khánh",
        "Xã Vĩnh Yên"
      ]
    },
    {
      district: "Huyện Bắc Hà",
      communes: [
        "Xã Lùng Cải",
        "Xã Lùng Phình",
        "Xã Tả Van Chư",
        "Xã Lầu Thí Ngài",
        "Xã Thải Giàng Phố",
        "Xã Hoàng Thu Phố",
        "Xã Bản Phố",
        "Xã Bản Liền",
        "Xã Tà Chải",
        "Xã Na Hối",
        "Xã Cốc Ly",
        "Xã Nậm Mòn",
        "Xã Nậm Đét",
        "Xã Nậm Khánh",
        "Xã Bảo Nhai",
        "Xã Nậm Lúc",
        "Xã Cốc Lầu",
        "Xã Bản Cái"
      ]
    },
    {
      district: "Huyện Mường Khương",
      communes: [
        "Xã Bản Lầu",
        "Xã Bản Sen",
        "Xã Cao Sơn",
        "Xã Dìn Chin",
        "Xã La Pan Tẩn",
        "Xã Lùng Khấu Nhin",
        "Xã Lùng Vai",
        "Xã Nậm Chảy",
        "Xã Nấm Lư",
        "Xã Pha Long",
        "Xã Tả Gia Khâu",
        "Xã Tả Ngải Chồ",
        "Xã Tả Thàng",
        "Xã Thanh Bình",
        "Xã Tung Chung Phố"
      ]
    },
    {
      district: "Huyện Si Ma Cai",
      communes: [
        "Xã Bản Mế",
        "Xã Cán Cấu",
        "Xã Lùng Thẩn",
        "Xã Mản Thẩn",
        "Xã Nàn Sán",
        "Xã Nàn Sín",
        "Xã Quan Thần Sán",
        "Xã Sán Chải",
        "Xã Sín Chéng",
        "Xã Thào Chư Phìn",
        "Xã Cán Hồ",
        "Xã Lử Thẩn"
      ]
    },
    {
      district: "Huyện Văn Bàn",
      communes: [
        "Xã Chiềng Ken",
        "Xã Dần Thàng",
        "Xã Dương Quỳ",
        "Xã Hòa Mạc",
        "Xã Khánh Yên Hạ",
        "Xã Khánh Yên Thượng",
        "Xã Khánh Yên Trung",
        "Xã Làng Giàng",
        "Xã Liêm Phú",
        "Xã Minh Lương",
        "Xã Nậm Chày",
        "Xã Nậm Dạng",
        "Xã Nậm Mả",
        "Xã Nậm Tha",
        "Xã Nậm Xây",
        "Xã Nậm Xé",
        "Xã Sơn Thủy",
        "Xã Tân An",
        "Xã Tân Thượng",
        "Xã Thẩm Dương"
      ]
    }
  ];
  

  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isInputOpen, setInputOpen] = useState(true);
  const [isDownloadOpen, setDownloadOpen] = useState(true);
  const [selectedHuyen, setSelectedHuyen] = useState("");
  const [xaList, setXaList] = useState([]);

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleHuyenChange = (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);

    const found = administrativeUnits.find((d) => d.district === huyen);
    setXaList(found ? found.communes : []);
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
                  <div className="relative w-36">
                    <select
                      value={selectedHuyen}
                      onChange={handleHuyenChange}
                      className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      onFocus={() => handleDropdownToggle("huyen", true)}
                      onBlur={() => handleDropdownToggle("huyen", false)}
                    >
                      <option value="">Chọn huyện</option>
                      {administrativeUnits.map((item, index) => (
                        <option key={index} value={item.district}>
                          {item.district}
                        </option>
                      ))}
                    </select>
                    <Select isOpen={openDropdown === "huyen"} />
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Xã</label>
                  <div className="relative w-36">
                    <select
                      className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      onFocus={() => handleDropdownToggle("xa", true)}
                      onBlur={() => handleDropdownToggle("xa", false)}
                    >
                      <option value="">Chọn xã</option>
                      {xaList.map((xa, index) => (
                        <option key={index} value={xa}>
                          {xa}
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
                    className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">Kỳ sau:</div>
                <div className="flex items-center justify-between mb-1 pl-4">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
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
