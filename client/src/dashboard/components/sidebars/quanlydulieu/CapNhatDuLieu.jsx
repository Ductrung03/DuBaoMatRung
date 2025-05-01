import React, { useState } from "react";
import Select from "../../Select";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";

const CapNhatDuLieu = ({ onGeoDataLoaded }) => {
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const { setGeoData } = useGeoData(); // ✅ lấy từ context

  const handleTaiLen = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/hanhchinh");
      setGeoData(res.data); // ✅ truyền dữ liệu vào context
    } catch (err) {
      console.error("Lỗi gọi API /api/hanhchinh:", err);
    }
  };
  return (
    <div>
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Cập nhật dữ liệu
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp ranh giới hành chính</label>
              <button onClick={handleTaiLen} className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Tải lên
              </button>
            </div>

            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp ranh giới 3 loại rừng</label>
              <button className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Tải lên
              </button>
            </div>

            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp địa hình, thủy văn, giao thông</label>
              <button className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Tải lên
              </button>
            </div>

            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-96">Lớp ranh giới chủ quản lý rừng</label>
              <button className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Tải lên
              </button>
            </div>

            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp hiện trạng rừng</label>
              <button className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center">
                Tải lên
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapNhatDuLieu;
