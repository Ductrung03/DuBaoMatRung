import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import config from "../../../../config";
import { FaFileUpload, FaSpinner } from "react-icons/fa";
import { ClipLoader } from "react-spinners";

const LoadingOverlay = ({ message }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-gray-800 font-medium">{message}</p>
    </div>
  </div>
);

const ImportShapefile = () => {
  const [zipUrl, setZipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();
  const { setGeoData } = useGeoData();

  const handleImport = async () => {
    if (!zipUrl || !zipUrl.includes(":getFeatures")) {
      toast.error("❗ Vui lòng nhập đúng link từ Google Earth Engine.");
      return;
    }
    
    setLoading(true);
    setLoadingMessage("Đang tải dữ liệu từ Google Earth Engine...");
    setUploadProgress(10);

    try {
      // Cập nhật tiến trình theo thời gian
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          // Chỉ tăng đến 90% và đợi kết quả thực từ server
          return newProgress > 90 ? 90 : newProgress;
        });
        
        // Cập nhật thông báo tùy thuộc vào tiến trình
        if (uploadProgress > 60) {
          setLoadingMessage("Đang xử lý và import dữ liệu vào hệ thống...");
        } else if (uploadProgress > 30) {
          setLoadingMessage("Đang chuyển đổi dữ liệu...");
        }
      }, 800);

      const response = await axios.post(
        `${config.API_URL}/api/import-gee-url`,
        { zipUrl }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setLoadingMessage("Hoàn thành!");

      const data = response.data;
      toast.success(data.message);

      if (data.geojson) {
        setGeoData(data.geojson);
        navigate("/dashboard/quanlydulieu");
      }
    } catch (err) {
      toast.error("❌ Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
      }, 500); // Hiển thị "Hoàn thành!" trong nửa giây
    }
  };

  return (

    
    <div className="p-4 bg-white rounded-md shadow-md relative">

      
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
          disabled={loading}
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
          <>
            <FaFileUpload className="mr-2" />
            Tải & Import
          </>
        )}
      </button>

      {loading && (
        <>
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-forest-green-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-center text-gray-600 mt-2">{loadingMessage}</p>
        </>
      )}
      
      {/* Overlay loading khi đang xử lý */}
      {loading && <LoadingOverlay message={loadingMessage} />}
    </div>
  );
};

import { useNavigate } from "react-router-dom";
import { useGeoData } from "../../../contexts/GeoDataContext";

export default ImportShapefile;
