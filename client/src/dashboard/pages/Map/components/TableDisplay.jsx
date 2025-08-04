// client/src/dashboard/pages/Map/components/TableDisplay.jsx - FIXED VERSION
import React from "react";
import Table from "../../Table";
import LoadingOverlay from "./LoadingOverlay";

const TableDisplay = ({ 
  loading, 
  geoData, 
  loadingDetails, 
  loadingMessage, 
  onRowClick 
}) => {
  // ✅ REMOVED: Không còn kiểm tra trang nào nữa - Hiển thị table cho TẤT CẢ trang

  // Hiển thị loading
  if (loading) {
    return (
      <div className="text-center text-green-700 font-semibold p-3 bg-white rounded-md shadow">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full mr-2"></div>
        Đang tải dữ liệu... Vui lòng đợi trong giây lát
      </div>
    );
  }

  // Hiển thị bảng dữ liệu khi có dữ liệu
  if (geoData?.features?.length > 0) {
    return (
      <div className="relative">
        {/* Loading overlay cho bảng dữ liệu */}
        {loadingDetails && <LoadingOverlay message={loadingMessage} />}

        <div className="bg-blue-50 p-3 rounded-md mb-3 border-l-4 border-blue-400">
          <p className="text-blue-800 text-sm">
            🔍 <strong>Hiển thị bảng dữ liệu:</strong> {geoData.features.length} khu vực mất rừng
          </p>
          <p className="text-blue-600 text-xs mt-1">
            💡 <strong>Lưu ý:</strong> Nhấp vào một dòng trong bảng để xem vị trí chính xác trên bản đồ
          </p>
        </div>

        <Table
          data={geoData.features.map((f) => f.properties)}
          onRowClick={onRowClick}
          tableName="mat_rung"
        />
      </div>
    );
  }

  // Thông báo khi không có dữ liệu (chỉ hiển thị khi cần thiết)
  return null; // ✅ Không hiển thị thông báo "chưa có dữ liệu" để tránh làm rối UI
};

export default TableDisplay;