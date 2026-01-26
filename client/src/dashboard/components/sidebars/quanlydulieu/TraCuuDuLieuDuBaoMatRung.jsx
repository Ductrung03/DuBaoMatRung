import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useSonLaAdminUnits } from "../../../hooks/useSonLaAdminUnits";
import { getChucNangRung, getChuRung, getTrangThaiXacMinh, getNguyenNhan } from "../../../../utils/dropdownService";
import { useAuth } from "../../../contexts/AuthContext";
import { useGeoData } from "../../../contexts/GeoDataContext";
import Dropdown from "../../../../components/Dropdown";
import { useIsMobile } from "../../../../hooks/useMediaQuery";

const TraCuuDuLieuDuBaoMatRung = () => {
  const { user, isAdmin } = useAuth();
  const { setGeoData } = useGeoData();
  const [loading, setLoading] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(true);
  const [chucNangRungList, setChucNangRungList] = useState([]);
  const [chuRungList, setChuRungList] = useState([]);
  const [trangThaiXacMinhList, setTrangThaiXacMinhList] = useState([]);
  const [nguyenNhanList, setNguyenNhanList] = useState([]);
  const isMobile = useIsMobile();

  // State for dropdowns and dates
  const [selectedChucNangRung, setSelectedChucNangRung] = useState("");
  const [selectedTrangThaiXacMinh, setSelectedTrangThaiXacMinh] = useState("");
  const [selectedNguyenNhan, setSelectedNguyenNhan] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const adminUnits = useSonLaAdminUnits();
  const {
    selectedXa,
    selectedTieukhu,
    selectedKhoanh,
  } = adminUnits;

  // Handlers for dropdowns
  const handleChucNangRungChange = (value) => setSelectedChucNangRung(value);
  const handleTrangThaiXacMinhChange = (value) => setSelectedTrangThaiXacMinh(value);
  const handleNguyenNhanChange = (value) => setSelectedNguyenNhan(value);

  // Logic tra cứu dữ liệu (sử dụng endpoint backend đúng)
  const handleTraCuu = async () => {
    try {
      // Validation
      if (!fromDate || !toDate) {
        toast.warning("Vui lòng nhập đầy đủ từ ngày và đến ngày");
        return;
      }

      setLoading(true);

      // Tạo query parameters theo backend API
      const queryParams = new URLSearchParams();
      queryParams.append('fromDate', fromDate);
      queryParams.append('toDate', toDate);

      if (selectedXa) queryParams.append('xa', selectedXa);
      if (selectedTieukhu) queryParams.append('tk', selectedTieukhu);
      if (selectedKhoanh) queryParams.append('khoanh', selectedKhoanh);

      // Gọi API backend đúng
      const response = await fetch(`/api/mat-rung?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi khi tra cứu dữ liệu');
      }

      const data = await response.json();
      
      if (!data.success) {
        toast.error(data.message || "Lỗi từ backend.");
        return;
      }

      if (!data.data || data.data.features.length === 0) {
        toast.warning("Không có dữ liệu phù hợp.");
        return;
      }

      // Load dữ liệu lên bản đồ
      setGeoData(data.data);
      toast.success(`Tìm thấy ${data.data.features.length} kết quả phù hợp`);
      
    } catch (error) {
      console.error('Lỗi tra cứu:', error);
      toast.error('Lỗi khi tra cứu dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDropdownData = async () => {
      setLoading(true);
      try {
        const [
          chucNangRungRes,
          chuRungRes,
          trangThaiXacMinhRes,
          nguyenNhanRes,
        ] = await Promise.all([
          getChucNangRung(),
          getChuRung(),
          getTrangThaiXacMinh(),
          getNguyenNhan(),
        ]);

        setChucNangRungList(chucNangRungRes.data.map(item => ({ value: item.value, label: item.label })));
        setChuRungList(chuRungRes.data.map(item => ({ value: item.value, label: item.label })));
        setTrangThaiXacMinhList(trangThaiXacMinhRes.data.map(item => ({ value: item.value, label: item.label })));
        setNguyenNhanList(nguyenNhanRes.data.map(item => ({ value: item.value, label: item.label })));
      } catch (error) {
        toast.error("Lỗi khi tải dữ liệu dropdown.");
        console.error("Error fetching dropdown data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  return (
    <div>
      {/* Tra cứu dữ liệu phân tích mất rừng */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsInputOpen(!isInputOpen)}
      >
        Tra cứu dữ liệu phân tích mất rừng
      </div>

      {isInputOpen && (
        <div className="flex flex-col gap-2 px-1 sm:px-2 pt-3">
          <div className="flex flex-col gap-3">
            {/* Thời gian section */}
            <div className="font-medium text-sm">Thời gian</div>

            {/* Từ ngày */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Từ ngày</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  disabled={loading}
                  className={`${isMobile ? 'w-full' : 'w-full'} border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400`}
                />
              </div>
            </div>

            {/* Đến ngày */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Đến ngày</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  disabled={loading}
                  className={`${isMobile ? 'w-full' : 'w-full'} border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400`}
                />
              </div>
            </div>

            {/* Khu vực section */}
            <div className="font-medium text-sm mt-3">Khu vực</div>

            {/* Xã */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Xã</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedXa}
                  onValueChange={adminUnits.xa.onChange}
                  options={adminUnits.xa.list}
                  placeholder="Chọn xã"
                  disabled={adminUnits.xa.loading || adminUnits.xa.disabled}
                  loading={adminUnits.xa.loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Tiểu khu */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Tiểu khu</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedTieukhu}
                  onValueChange={adminUnits.tieukhu.onChange}
                  options={adminUnits.tieukhu.list}
                  placeholder="Chọn tiểu khu"
                  disabled={adminUnits.tieukhu.loading || adminUnits.tieukhu.disabled}
                  loading={adminUnits.tieukhu.loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Khoảnh */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Khoảnh</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedKhoanh}
                  onValueChange={adminUnits.khoanh.onChange}
                  options={adminUnits.khoanh.list}
                  placeholder="Chọn khoảnh"
                  disabled={adminUnits.khoanh.loading || adminUnits.khoanh.disabled}
                  loading={adminUnits.khoanh.loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Thuộc tính rừng section */}
            <div className="font-medium text-sm mt-3">Thuộc tính rừng</div>

            {/* Chức năng rừng */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Chức năng</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedChucNangRung}
                  onValueChange={handleChucNangRungChange}
                  options={chucNangRungList}
                  placeholder="Chọn chức năng"
                  disabled={loading}
                  loading={loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Chủ rừng */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Chủ rừng</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={adminUnits.selectedChuRung}
                  onValueChange={adminUnits.handleChuRungChange}
                  options={chuRungList}
                  placeholder="Chọn chủ rừng"
                  disabled={loading}
                  loading={loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Trạng thái xác minh section */}
            <div className="font-medium text-sm mt-3">Trạng thái xác minh</div>

            {/* Trạng thái xác minh */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Trạng thái</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedTrangThaiXacMinh}
                  onValueChange={handleTrangThaiXacMinhChange}
                  options={trangThaiXacMinhList}
                  placeholder="Chọn trạng thái"
                  disabled={loading}
                  loading={loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

            {/* Nguyên nhân */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Nguyên nhân</label>
              <div className={isMobile ? 'w-full' : 'w-36'}>
                <Dropdown
                  selectedValue={selectedNguyenNhan}
                  onValueChange={handleNguyenNhanChange}
                  options={nguyenNhanList}
                  placeholder="Chọn nguyên nhân"
                  disabled={loading}
                  loading={loading}
                  className={isMobile ? 'w-full' : ''}
                  selectClassName="w-full border border-green-400 rounded-md py-2 px-3 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>
          </div>

          {/* Nút tra cứu */}
          <button
            onClick={() => {
              // Logic tra cứu (sử dụng endpoint đúng)
              handleTraCuu();
            }}
            disabled={loading}
            className={`${isMobile ? 'w-full' : 'w-36'} bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-2.5 px-3 rounded-full text-center mt-3 ${isMobile ? '' : 'self-center'} min-h-[44px]`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Đang tải...</span>
              </div>
            ) : (
              'Tra cứu'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuDuLieuDuBaoMatRung;
