import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ClipLoader } from 'react-spinners';
import { FaCloudSun, FaImage, FaListAlt } from "react-icons/fa";

export default function PhatHienMatRung() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("phantich");
  const location = useLocation();
  
  useEffect(() => {
    // Kiểm tra xem có tab nào được truyền vào từ URL không
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab && ["phantich", "locmay", "xulyanh"].includes(tab)) {
      setActiveTab(tab);
    }
    
    // Đặt timeout để giả lập thời gian tải iframe
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [location]);
  
  // Lấy URL iframe tương ứng với tab đang active
  const getActiveIframeUrl = () => {
    switch(activeTab) {
      case "locmay":
        return "https://ee-phathiensommatrung.projects.earthengine.app/view/locmay";
      case "xulyanh":
        return "https://ee-phathiensommatrung.projects.earthengine.app/view/xulyanh";
      case "phantich":
      default:
        return "https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung";
    }
  };
  
  // Lấy tiêu đề tương ứng với tab đang active
  const getActiveTabTitle = () => {
    switch(activeTab) {
      case "locmay":
        return "Công cụ lọc mây";
      case "xulyanh":
        return "Xử lý ảnh vệ tinh";
      case "phantich":
      default:
        return "Phân tích mất rừng";
    }
  };
  
  // Xử lý chuyển tab
  const handleChangeTab = (tab) => {
    setLoading(true);
    setActiveTab(tab);
    // Đặt timeout để giả lập thời gian tải iframe
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      
      {/* Iframe container */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center">
              <ClipLoader color="#027e02" size={50} />
              <p className="mt-4 text-lg text-forest-green-primary">
                Đang tải {getActiveTabTitle()}...
              </p>
            </div>
          </div>
        )}
        
        <iframe
          src={getActiveIframeUrl()}
          title={getActiveTabTitle()}
          width="100%"
          height="100%"
          style={{ border: "none" }}
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
