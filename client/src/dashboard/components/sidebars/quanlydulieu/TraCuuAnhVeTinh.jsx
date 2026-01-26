import React, { useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";
import { useSonLaAdminUnits } from "../../../hooks/useSonLaAdminUnits";
import { toast } from "react-toastify";
import Dropdown from "../../../../components/Dropdown";
import { useIsMobile } from "../../../../hooks/useMediaQuery";

const TraCuuAnhVeTinh = () => {
  const adminUnits = useSonLaAdminUnits();
  const { selectedXa, selectedTieukhu, selectedKhoanh } = adminUnits;
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const { user, isAdmin } = useAuth();

  return (
    <div>
      {/* DỰ BÁO MẤT RỪNG TỰ ĐỘNG */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Tra cứu dữ liệu ảnh vệ tinh
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 sm:px-2 pt-3">
          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Thời gian */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Thời gian</label>
              <div className={`relative ${isMobile ? 'w-full' : 'w-36'}`}>
                <input
                  type="date"
                  className="w-full border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            </div>

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
          </div>

          <button
            className={`${isMobile ? 'w-full' : 'w-36'} bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-2.5 px-3 rounded-full text-center mt-3 ${isMobile ? '' : 'self-center'} min-h-[44px]`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>Đang tải...</span>
              </div>
            ) : (
              "Tra cứu"
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default TraCuuAnhVeTinh;