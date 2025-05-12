import React, { useState, useEffect  } from "react";
import Select from "../../Select";
import { useGeoData } from "../../../contexts/GeoDataContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import config from "../../../../config";
import { useAuth } from "../../../contexts/AuthContext";

// LoadingSpinner component
const LoadingSpinner = ({ size = "medium" }) => {
  const sizeClass = {
    small: "w-4 h-4",
    medium: "w-6 h-6",
    large: "w-8 h-8",
  }[size];

  return (
    <div className={`inline-block ${sizeClass} animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]`} role="status">
      <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Đang tải...</span>
    </div>
  );
};

const TraCuuDuLieuDuBaoMatRung = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const { setGeoData } = useGeoData();
  const [noDataMessage, setNoDataMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [huyenList, setHuyenList] = useState([]);
  const [selectedHuyen, setSelectedHuyen] = useState("");

  const [xaList, setXaList] = useState([]);
  const [selectedXa, setSelectedXa] = useState("");

  const [tieukhuList, setTieukhuList] = useState([]);
  const [selectedTieukhu, setSelectedTieukhu] = useState("");

  const [khoanhList, setKhoanhList] = useState([]);
  const [selectedKhoanh, setSelectedKhoanh] = useState("");

  const [chuRungList, setChuRungList] = useState([]);
  const [selectedChuRung, setSelecectedChuRung] = useState("");

   const { user, isAdmin, getUserDistrictId } = useAuth(); // Sử dụng hook useAuth

  useEffect(() => {
    // Gọi huyện và khoảnh + chủ rừng lúc load
    const fetchInitialData = async () => {
      const [huyenRes, khoanhRes, churungRes] = await Promise.all([
        fetch(`${config.API_URL}/api/dropdown/huyen`),
        fetch(`${config.API_URL}/api/dropdown/khoanh`),
        fetch(`${config.API_URL}/api/dropdown/churung`),
      ]);
      
      let huyenData = await huyenRes.json();
      const khoanhData = await khoanhRes.json();
      const churungData = await churungRes.json();
      
      // Nếu không phải admin, lọc danh sách huyện theo huyện của người dùng
      if (!isAdmin() && user?.district_id) {
        huyenData = huyenData.filter(huyen => huyen.value === user.district_id);
        
        // Nếu chỉ có một huyện (huyện của người dùng), tự động chọn huyện đó
        if (huyenData.length === 1) {
          setSelectedHuyen(huyenData[0].value);
          // Tự động load danh sách xã của huyện đó
          const xaRes = await fetch(
            `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(huyenData[0].value)}`
          );
          const xaData = await xaRes.json();
          setXaList(xaData);
        }
      }
      
      setHuyenList(huyenData);
      setKhoanhList(khoanhData.map((item) => item.khoanh));
      setChuRungList(churungData.map((item) => item.churung));
    };
    
    fetchInitialData();
  }, [user, isAdmin]); 

  const handleHuyenChange = async (e) => {
    const huyen = e.target.value;
    setSelectedHuyen(huyen);
    const xaRes = await fetch(
      `${config.API_URL}/api/dropdown/xa?huyen=${encodeURIComponent(huyen)}`
    );
    const xaData = await xaRes.json();
    setXaList(xaData);
  };

  const handleXaChange = async (e) => {
    const xa = e.target.value;
    setSelectedXa(xa);
    const tkRes = await fetch(
      `${config.API_URL}/api/dropdown/tieukhu?xa=${encodeURIComponent(xa)}`
    );
    const tkData = await tkRes.json();
    setTieukhuList(tkData.map((item) => item.tk));
  };

  const handleTieukhuChange = (e) => {
    setSelectedTieukhu(e.target.value);
  };

  const handleKhoanhChange = (e) => {
    setSelectedKhoanh(e.target.value);
  };

  const handleChuRungChange = (e) => {
    setSelecectedChuRung(e.target.value);
  };

  const handleTraCuu = async () => {
    try {
      setNoDataMessage(""); // reset thông báo cũ nếu có
      setIsLoading(true); // Bắt đầu loading
  
      const queryParams = new URLSearchParams({
        fromDate,
        toDate,
        huyen: selectedHuyen,
        xa: selectedXa,
        tieukhu: selectedTieukhu,
        khoanh: selectedKhoanh,
        churung: selectedChuRung
      });
  
      const res = await fetch(
        `${config.API_URL}/api/quan-ly-du-lieu/tra-cuu-du-lieu-bao-mat-rung?${queryParams.toString()}`
      );
  
      if (!res.ok) {
        if (res.status === 400) {
          const errData = await res.json();
          toast.error(errData.message || "Thiếu tham số bắt buộc.");
          setIsLoading(false); // Kết thúc loading khi có lỗi
          return;
        }
        throw new Error(`Lỗi ${res.status}: ${res.statusText}`);
      }
  
      const data = await res.json();
  
      if (!data.success) {
        toast.error(data.message || "Lỗi từ backend.");
        setGeoData({ type: "FeatureCollection", features: [] });
        setIsLoading(false); // Kết thúc loading khi có lỗi
        return;
      }
  
      if (!data.data || data.data.features.length === 0) {
        toast.warning("Không có dữ liệu phù hợp.");
        setGeoData({ type: "FeatureCollection", features: [] });
        setIsLoading(false); // Kết thúc loading khi không có dữ liệu
        return;
      }
  
      setGeoData(data.data);
      setIsLoading(false); // Kết thúc loading khi thành công
    } catch (err) {
      console.error("Lỗi tra cứu:", err);
      toast.error(`Lỗi khi tra cứu dữ liệu: ${err.message}`);
      setIsLoading(false); // Kết thúc loading khi có lỗi
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
                  value={selectedKhoanh}
                  onChange={handleKhoanhChange}
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
                  value={selectedChuRung}
                  onChange={handleChuRungChange}
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
                <Select isOpen={openDropdown === "churung"} />
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
            disabled={isLoading}
            className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" /> 
                <span className="ml-2">Đang tải...</span>
              </>
            ) : (
              "Tra cứu"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuDuLieuDuBaoMatRung;