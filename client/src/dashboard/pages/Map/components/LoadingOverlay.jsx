// ===================================
// LoadingOverlay.jsx
// 🎯 MỤC ĐÍCH: Component hiển thị loading overlay
// ===================================

// client/src/dashboard/pages/Map/components/LoadingOverlay.jsx
import React from "react";
import { ClipLoader } from "react-spinners";

const LoadingOverlay = ({ message = "Đang tải..." }) => (
  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-forest-green-primary font-medium">{message}</p>
    </div>
  </div>
);

export default LoadingOverlay;
