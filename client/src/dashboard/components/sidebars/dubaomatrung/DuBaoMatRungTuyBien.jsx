import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { useSonLaAdminUnits } from "../../../hooks/useSonLaAdminUnits";
import Dropdown from "../../../../components/Dropdown";

const DuBaoMatRungTuyBien = () => {
  const { isAdmin, user } = useAuth();
  const { setGeoData, setLoading } = useGeoData();
  const adminUnits = useSonLaAdminUnits();
  const { selectedXa, selectedTieukhu, selectedKhoanh } = adminUnits;

  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isInputOpen, setInputOpen] = useState(true);
  const [loading, setLoadingState] = useState(false);

  const [kyTruocStart, setKyTruocStart] = useState("");
  const [kyTruocEnd, setKyTruocEnd] = useState("");
  const [kySauStart, setKySauStart] = useState("");
  const [kySauEnd, setKySauEnd] = useState("");

  const handleAnalyze = async () => {
    try {
      let fromDate = "";
      let toDate = "";

      if (kyTruocStart && kySauEnd) {
        fromDate = kyTruocStart;
        toDate = kySauEnd;
      } else if (kyTruocStart && kyTruocEnd) {
        fromDate = kyTruocStart;
        toDate = kyTruocEnd;
      } else if (kySauStart && kySauEnd) {
        fromDate = kySauStart;
        toDate = kySauEnd;
      } else {
        toast.warning("Vui lòng chọn ít nhất một khoảng thời gian (kỳ trước hoặc kỳ sau)");
        return;
      }

      if (!selectedXa) {
        toast.warning("Vui lòng chọn xã");
        return;
      }

      setLoading(true);
      setLoadingState(true);

      const queryParams = new URLSearchParams();
      queryParams.append('fromDate', fromDate);
      queryParams.append('toDate', toDate);
      if (selectedXa) queryParams.append('xa', selectedXa);
      if (selectedTieukhu) queryParams.append('tk', selectedTieukhu);
      if (selectedKhoanh) queryParams.append('khoanh', selectedKhoanh);

      const res = await fetch(
        `/api/mat-rung?${queryParams.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.message || "Lỗi khi truy vấn dữ liệu");
        return;
      }

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Lỗi từ backend");
        return;
      }

      if (!data.data || data.data.features.length === 0) {
        toast.warning("Không có dữ liệu phù hợp trong khoảng thời gian này");
        setGeoData({ type: "FeatureCollection", features: [] });
        return;
      }

      setGeoData(data.data);

      toast.success(
        `✅ Phân tích hoàn tất: tìm thấy ${data.data.features.length} khu vực mất rừng! Xem bảng dữ liệu bên dưới bản đồ.`,
        {
          autoClose: 5000,
          position: "top-center"
        }
      );

      setTimeout(() => {
        const mapElement = document.querySelector('.leaflet-container');
        if (mapElement) {
          mapElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          setTimeout(() => {
            window.scrollBy({
              top: 100,
              behavior: 'smooth'
            });
          }, 500);
        }
      }, 300);

    } catch (err) {
      console.error("❌ Lỗi dự báo tùy biến:", err);
      toast.error(`Lỗi khi thực hiện phân tích: ${err.message}`);
    } finally {
      setLoading(false);
      setLoadingState(false);
    }
  };

  return (
    <div>
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Phân tích mất rừng tùy biến
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 pt-3">
          <div
            className="bg-forest-green-gray py-2=0.2 px-3 rounded-md flex justify-between items-center cursor-pointer relative"
            onClick={() => setInputOpen(!isInputOpen)}
          >
            <span className="text-sm font-medium">Lựa chọn đầu vào</span>
          </div>

          {isInputOpen && (
            <div className="flex flex-col gap-2 px-1 pt-1">
              <div className="px-2 ml-8">
                <div className="font-medium text-sm mb-1">Khu vực</div>

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
                    selectClassName="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
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
                    selectClassName="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                {/* Khoảnh */}
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Khoảnh</label>
                  <Dropdown
                    selectedValue={selectedKhoanh}
                    onValueChange={adminUnits.khoanh.onChange}
                    options={adminUnits.khoanh.list}
                    placeholder="Chọn khoảnh"
                    disabled={adminUnits.khoanh.loading || adminUnits.khoanh.disabled}
                    loading={adminUnits.khoanh.loading}
                    className="w-36"
                    selectClassName="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

                <div className="font-medium text-sm mb-1">Kỳ trước:</div>
                <div className="flex items-center justify-between mb-1 pl-4 relative ">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={kyTruocStart}
                    onChange={(e) => setKyTruocStart(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={kyTruocEnd}
                    onChange={(e) => setKyTruocEnd(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="font-medium text-sm mb-1">Kỳ sau:</div>
                <div className="flex items-center justify-between mb-1 pl-4">
                  <label className="text-sm">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={kySauStart}
                    onChange={(e) => setKySauStart(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>
                <div className="flex items-center justify-between mb-2 pl-4">
                  <label className="text-sm">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={kySauEnd}
                    onChange={(e) => setKySauEnd(e.target.value)}
                    className="w-full border border-green-400 rounded-md py-0.2 pr-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </div>

              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center disabled:opacity-50"
              >
                {loading ? "Đang phân tích..." : "Phân tích"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DuBaoMatRungTuyBien;
