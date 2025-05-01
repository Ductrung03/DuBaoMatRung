import React, { useState, useEffect } from "react";
import Select from "../../Select";
import { useGeoData } from "../../../contexts/GeoDataContext";

const TraCuuDuLieuDuBaoMatRung = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { setGeoData } = useGeoData();

  const [huyenList, setHuyenList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState("");

  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState("");

  const [tieukhuList, setTieukhuList] = useState([]);
  const [selectedTieukhu, setSelectedTieukhu] = useState([]);

  const [khoanhList, setKhoanhList] = useState([]);
  const [chuRungList, setChuRungList] = useState([]);

  useEffect(() => {
    // Gọi huyện và khoảnh + chủ rừng lúc load
    const fetchInitialData = async () => {
      const [huyenRes, khoanhRes, churungRes] = await Promise.all([
        fetch("/api/dropdown/huyen"),
        fetch("/api/dropdown/khoanh"),
        fetch("/api/dropdown/churung"),
      ]);
      const huyenData = await huyenRes.json();
      const khoanhData = await khoanhRes.json();
      const churungData = await churungRes.json();
      setHuyenList(huyenData);
      setKhoanhList(khoanhData.map((item) => item.khoanh));
      setChuRungList(churungData.map((item) => item.churung));
    };
    fetchInitialData();
  }, []);

  const handleHuyenChange = async (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    const xaRes = await fetch(
      `/api/dropdown/xa?huyen=${encodeURIComponent(huyen)}`
    );
    const xaData = await xaRes.json();
    setXaList(xaData);
  };

  const handleXaChange = async (e) => {
    const xa = e.target.value;
    setSelectedXa(xa);
    const tkRes = await fetch(
      `/api/dropdown/tieukhu?xa=${encodeURIComponent(xa)}`
    );
    const tkData = await tkRes.json();
    setTieukhuList(tkData.map((item) => item.tk));
  };

  const handleTieukhuChange = (e) => {
    setSelectedTieukhu(e.target.value);
  };

  const handleTraCuu = async () => {
    try {
      const res = await fetch(
        `/api/mat-rung?fromDate=${fromDate}&toDate=${toDate}`
      );

      if (!res.ok) {
        throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Dữ liệu:", data);

      // Cập nhật geoData để hiển thị lên Map và Table
      setGeoData(data.geojson);
    } catch (err) {
      console.error("Lỗi tra cứu:", err);
      alert(`Lỗi khi tra cứu dữ liệu: ${err.message}`);
    }
  };

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

  const trangThaiXacMinhList = [
    "Chưa xác minh",
    "Đang xác minh",
    "Đã xác minh",
    "Không xác minh được",
  ];

  const chucNangRungList = ["Rừng đặc dụng", "Rừng phòng hộ", "Rừng sản xuất"];

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
        "Xã Thống Nhất",
      ],
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
        "Xã Hầu Thào",
      ],
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
        "Xã Ngải Thầu",
      ],
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
        "Xã Phú Nhuận",
      ],
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
        "Xã Vĩnh Yên",
      ],
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
        "Xã Bản Cái",
      ],
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
        "Xã Tung Chung Phố",
      ],
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
        "Xã Lử Thẩn",
      ],
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
        "Xã Thẩm Dương",
      ],
    },
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
        Tra cứu dữ liệu dự báo mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Từ ngày */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Từ ngày</label>
              <div className="relative w-36">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Đến ngày */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Đến ngày</label>
              <div className="relative w-36">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bw-full border border-green-400 rounded-md py-0.2   pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
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
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("huyen", true)}
                  onBlur={() => handleDropdownToggle("huyen", false)}
                >
                  <option value="">Chọn huyện</option>
                  {Array.isArray(huyenList) &&
                    huyenList
                      .filter(
                        (huyen) =>
                          huyen && typeof huyen === "object" && "value" in huyen
                      )
                      .map((huyen, index) => (
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

            {/* Tiểu khu */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Tiểu khu</label>
              <div className="relative w-36">
                <select
                  value={selectedTieukhu}
                  onChange={handleTieukhuChange}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("tieukhu", true)}
                  onBlur={() => handleDropdownToggle("tieukhu", false)}
                >
                  <option value="">Chọn tiểu khu</option>
                  {tieukhuList.map((tk, idx) => (
                    <option key={idx} value={tk}>
                      {tk}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "tieukhu"} />
              </div>
            </div>

            {/* Khoảnh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Khoảnh</label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("khoanh", true)}
                  onBlur={() => handleDropdownToggle("khoanh", false)}
                >
                  <option value="">Chọn khoảnh</option>
                  {khoanhList.map((k, idx) => (
                    <option key={idx} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "khoanh"} />
              </div>
            </div>

            {/* Chức năng rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Chức năng rừng</label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("chucnangrung", true)}
                  onBlur={() => handleDropdownToggle("chucnangrung", false)}
                >
                  <option value="">Chọn chức năng</option>
                  {chucNangRungList.map((cn, idx) => (
                    <option key={idx} value={cn}>
                      {cn}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "chucnangrung"} />
              </div>
            </div>

            {/* Chủ rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Chủ rừng</label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("churung", true)}
                  onBlur={() => handleDropdownToggle("churung", false)}
                >
                  <option value="">Chọn chủ rừng</option>
                  {chuRungList.map((cr, idx) => (
                    <option key={idx} value={cr}>
                      {cr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Độ tin cậy */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Độ tin cậy</label>
              <div className="relative w-36">
                <input
                  type="text"
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Trạng thái xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">
                Trạng thái xác minh
              </label>
              <div className="relative w-36">
                <select
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("trangthaixacminh", true)}
                  onBlur={() => handleDropdownToggle("trangthaixacminh", false)}
                >
                  <option value="">Chọn trạng thái</option>
                  {trangThaiXacMinhList.map((tt, idx) => (
                    <option key={idx} value={tt}>
                      {tt}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "trangthaixacminh"} />
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
          </div>

          <button
            onClick={handleTraCuu}
            className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center"
          >
            Tra cứu
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuDuLieuDuBaoMatRung;
