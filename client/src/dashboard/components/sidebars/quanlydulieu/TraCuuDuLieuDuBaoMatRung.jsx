import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useSonLaAdminUnits } from "../../../hooks/useSonLaAdminUnits";
import { getChucNangRung, getChuRung, getTrangThaiXacMinh, getNguyenNhan } from "../../../../utils/dropdownService";
import { useAuth } from "../../../contexts/AuthContext";
import { useGeoData } from "../../../contexts/GeoDataContext";
import Dropdown from "../../../../components/Dropdown";

const TraCuuDuLieuDuBaoMatRung = () => {
  const { user, isAdmin } = useAuth();
  const { setGeoData } = useGeoData();
  const [loading, setLoading] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(true);
  const [chucNangRungList, setChucNangRungList] = useState([]);
  const [chuRungList, setChuRungList] = useState([]);
  const [trangThaiXacMinhList, setTrangThaiXacMinhList] = useState([]);
  const [nguyenNhanList, setNguyenNhanList] = useState([]);

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
      {/* Tra cứu dữ liệu dự báo mất rừng */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsInputOpen(!isInputOpen)}
      >
        Tra cứu dữ liệu dự báo mất rừng
      </div>

      {isInputOpen && (
        <div className="flex flex-col gap-2 pt-3">
          <div
            className="bg-forest-green-gray py-2=0.2 px-3 rounded-md flex justify-between items-center cursor-pointer relative"
            onClick={() => setIsInputOpen(!isInputOpen)}
          >
            <span className="text-sm font-medium">Lựa chọn đầu vào</span>
          </div>

          <div className="flex flex-col gap-2 px-1 pt-1">
            <div className="px-2 ml-8">
              <div className="font-medium text-sm mb-1">Thời gian</div>
              
              {/* Từ ngày */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Từ ngày</label>
                <div className="w-36">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={loading}
                    className="w-full border border-green-400 rounded-md py-0.2 px-2 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              {/* Đến ngày */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Đến ngày</label>
                <div className="w-36">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={loading}
                    className="w-full border border-green-400 rounded-md py-0.2 px-2 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
              </div>

              <div className="font-medium text-sm mb-1 mt-3">Khu vực</div>

              {/* Xã */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Xã</label>
                <Dropdown
                  selectedValue={selectedXa}
                  onValueChange={adminUnits.xa.onChange}
                  options={adminUnits.xa.list}
                  placeholder="Chọn xã"
                  disabled={adminUnits.xa.loading || adminUnits.xa.disabled}
                  loading={adminUnits.xa.loading}
                  className="w-36"
                />
              </div>

              {/* Tiểu khu */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Tiểu khu</label>
                <Dropdown
                  selectedValue={selectedTieukhu}
                  onValueChange={adminUnits.tieukhu.onChange}
                  options={adminUnits.tieukhu.list}
                  placeholder="Chọn tiểu khu"
                  disabled={adminUnits.tieukhu.loading || adminUnits.tieukhu.disabled}
                  loading={adminUnits.tieukhu.loading}
                  className="w-36"
                />
              </div>

              {/* Khoảnh */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Khoảnh</label>
                <Dropdown
                  selectedValue={selectedKhoanh}
                  onValueChange={adminUnits.khoanh.onChange}
                  options={adminUnits.khoanh.list}
                  placeholder="Chọn khoảnh"
                  disabled={adminUnits.khoanh.loading || adminUnits.khoanh.disabled}
                  loading={adminUnits.khoanh.loading}
                  className="w-36"
                />
              </div>

              <div className="font-medium text-sm mb-1 mt-3">Thuộc tính rừng</div>
              
              {/* Chức năng rừng */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Chức năng rừng</label>
                <Dropdown
                  selectedValue={selectedChucNangRung}
                  onValueChange={handleChucNangRungChange}
                  options={chucNangRungList}
                  placeholder="Chọn chức năng"
                  disabled={loading}
                  loading={loading}
                  className="w-36"
                />
              </div>

              {/* Chủ rừng */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Chủ rừng</label>
                <Dropdown
                  selectedValue={adminUnits.selectedChuRung}
                  onValueChange={adminUnits.handleChuRungChange}
                  options={chuRungList}
                  placeholder="Chọn chủ rừng"
                  disabled={loading}
                  loading={loading}
                  className="w-36"
                />
              </div>

              <div className="font-medium text-sm mb-1 mt-3">Trạng thái xác minh</div>
              
              {/* Trạng thái xác minh */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Trạng thái</label>
                <Dropdown
                  selectedValue={selectedTrangThaiXacMinh}
                  onValueChange={handleTrangThaiXacMinhChange}
                  options={trangThaiXacMinhList}
                  placeholder="Chọn trạng thái"
                  disabled={loading}
                  loading={loading}
                  className="w-36"
                />
              </div>

              {/* Nguyên nhân */}
              <div className="flex items-center justify-between mb-1 pl-4">
                <label className="text-sm">Nguyên nhân</label>
                <Dropdown
                  selectedValue={selectedNguyenNhan}
                  onValueChange={handleNguyenNhanChange}
                  options={nguyenNhanList}
                  placeholder="Chọn nguyên nhân"
                  disabled={loading}
                  loading={loading}
                  className="w-36"
                />
              </div>

              {/* Nút tra cứu */}
              <div className="flex justify-center mt-4 pt-2">
                <button
                  onClick={() => {
                    // Logic tra cứu (sử dụng endpoint đúng)
                    handleTraCuu();
                  }}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {loading ? 'Đang tải...' : 'Tra cứu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraCuuDuLieuDuBaoMatRung;
