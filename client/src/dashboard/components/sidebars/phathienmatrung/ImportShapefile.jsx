import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGeoData } from "../../../contexts/GeoDataContext";
import axios from "axios";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
 
const ImportShapefile = () => {
  const [zipUrl, setZipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setGeoData } = useGeoData();

  const handleImport = async () => {
    if (!zipUrl || !zipUrl.includes(":getFeatures")) {
      toast.error("❗ Vui lòng nhập đúng link từ Google Earth Engine.");
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(
        `${config.API_URL}/api/import-gee-url`,
        { zipUrl }
      );

      const data = response.data;
      toast.success(data.message);

      if (data.geojson) {
        setGeoData(data.geojson);
        navigate("/dashboard/quanlydulieu");
      }
    } catch (err) {
      toast.error("❌ Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-md">
      <h3 className="text-lg font-semibold mb-4">Import dữ liệu mất rừng</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL từ Google Earth Engine
        </label>
        <input
          type="text"
          value={zipUrl}
          onChange={(e) => setZipUrl(e.target.value)}
          placeholder="Dán URL từ Google Earth Engine"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-forest-green-primary"
        />
        <p className="text-xs text-gray-500 mt-1">
          URL phải có dạng "https://.../:getFeatures"
        </p>
      </div>
      
      <button 
        onClick={handleImport} 
        disabled={loading}
        className="w-full bg-forest-green-primary text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
      >
        {loading ? (
          <>
            <ClipLoader color="#ffffff" size={20} />
            <span className="ml-2">Đang xử lý...</span>
          </>
        ) : (
          "Tải & Import"
        )}
      </button>
    </div>
  );
};

export default ImportShapefile;