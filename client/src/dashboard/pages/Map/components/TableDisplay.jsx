import React from "react";
import Table from "../../Table";
import LoadingOverlay from "./LoadingOverlay";

const TableDisplay = ({ 
  isDataPage, 
  loading, 
  geoData, 
  loadingDetails, 
  loadingMessage, 
  onRowClick 
}) => {
  // Chỉ hiển thị khi ở trang quản lý dữ liệu
  if (!isDataPage) return null;

  // Hiển thị loading
  if (loading) {
    return (
      <div className="text-center text-green-700 font-semibold p-3 bg-white rounded-md shadow">
        <div className="animate-spin inline-block w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full mr-2"></div>
        Đang tải dữ liệu... Vui lòng đợi trong giây lát
      </div>
    );
  }

  // Hiển thị bảng dữ liệu
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

  // Hiển thị thông báo không có dữ liệu
  return (
    <div className="text-center text-amber-700 font-semibold p-4 bg-amber-50 rounded-md mt-2 border border-amber-200">
      <h3 className="text-lg mb-2">⚠️ Chưa có dữ liệu hiển thị</h3>
      <div className="text-sm space-y-1">
        <p>🔍 <strong>Kiểm tra:</strong></p>
        <ul className="list-disc list-inside text-left max-w-md mx-auto">
          <li>Dữ liệu mat_rung đã được load chưa</li>
          <li>Kết nối với database có ổn định không</li>
          <li>Có dữ liệu trong 3 tháng gần nhất không</li>
        </ul>
        <p className="mt-3 text-blue-600">
          💡 Thử refresh trang hoặc kiểm tra kết nối mạng
        </p>
      </div>
    </div>
  );
};

export default TableDisplay;