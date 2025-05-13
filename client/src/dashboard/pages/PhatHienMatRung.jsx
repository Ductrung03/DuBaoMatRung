import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ClipLoader } from 'react-spinners';

export default function PhatHienMatRung() {
  const [loading, setLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState("https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung");
  const { getUserDistrictId, isAdmin } = useAuth();
  
  useEffect(() => {
    // Tạo URL với tham số huyện nếu người dùng không phải admin
    const initIframe = () => {
      const districtId = getUserDistrictId();
      let url = "https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung";
      
      // Thêm tham số huyện vào URL nếu người dùng không phải admin và có huyện quản lý
      if (!isAdmin() && districtId) {
        url += `?district=${districtId}`;
      }
      
      setIframeUrl(url);
      setLoading(false);
    };
    
    // Khởi tạo iframe sau khi component mount
    initIframe();
  }, [getUserDistrictId, isAdmin]);
  
  // Xử lý sự kiện khi iframe đã load xong
  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-y-auto overflow-y-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="bg-white p-4 rounded-md flex flex-col items-center">
            <ClipLoader color="#027e02" size={50} />
            <p className="mt-2 text-lg text-forest-green-primary">Đang tải ứng dụng phát hiện mất rừng...</p>
          </div>
        </div>
      )}
      
      <iframe
        src={iframeUrl}
        title="GEE Phát hiện mất rừng"
        width="100%"
        height="100%"
        style={{ border: "none" }}
        onLoad={handleIframeLoad}
      />
    </div>
  );
}