// BangKeXuLyAnhVienTham.jsx - Bảng kê xử lý ảnh viễn thám (đúng form Excel)
import React, { useState, useEffect, useCallback } from "react";
import api from "../../../../services/api";
import { toast } from "react-toastify";
import { FaSync, FaSearch } from "react-icons/fa";
import { ClipLoader } from "react-spinners";

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  } catch { return ""; }
};

const BangKeXuLyAnhVienTham = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterXa, setFilterXa] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 100 };
      if (filterXa.trim()) params.ten_xa = filterXa.trim();
      const res = await api.get("/bang-ke-xu-ly-anh", { params });
      setData(res.data.data || []);
      setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch {
      toast.error("Không thể tải bảng kê xử lý ảnh viễn thám");
    } finally {
      setLoading(false);
    }
  }, [filterXa]);

  useEffect(() => { fetchData(1); }, []);

  const handleSearch = (e) => { e.preventDefault(); fetchData(1); };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1">
          <input
            type="text"
            value={filterXa}
            onChange={(e) => setFilterXa(e.target.value)}
            placeholder="Lọc theo xã..."
            className="border border-gray-300 rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-green-400"
          />
          <button
            type="submit"
            className="flex items-center gap-1 bg-green-600 text-white px-2.5 py-1 rounded text-xs hover:bg-green-700 transition-colors"
          >
            <FaSearch size={10} /> Lọc
          </button>
        </form>
        <span className="text-xs text-gray-400">{pagination.total} bản ghi</span>
        <button
          onClick={() => fetchData(pagination.page)}
          className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors"
          title="Làm mới"
        >
          <FaSync size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <ClipLoader color="#027e02" size={30} />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <p className="font-medium">Chưa có dữ liệu</p>
            <p className="text-xs mt-1">Dữ liệu sẽ được ghi sau khi import ảnh viễn thám</p>
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Title row */}
              <tr>
                <th
                  colSpan={7}
                  className="bg-green-700 text-white text-center font-bold text-sm py-2 px-3 border border-green-800 tracking-wide"
                >
                  BẢNG KÊ XỬ LÝ ẢNH VIỄN THÁM
                </th>
              </tr>
              {/* Header row 1 */}
              <tr className="bg-green-100">
                <th rowSpan={2} className="border border-green-300 px-2 py-1.5 text-center font-semibold text-green-800 whitespace-nowrap align-middle">
                  Số lần
                </th>
                <th rowSpan={2} className="border border-green-300 px-2 py-1.5 text-center font-semibold text-green-800 align-middle">
                  Xã
                </th>
                <th colSpan={2} className="border border-green-300 px-2 py-1.5 text-center font-semibold text-green-800">
                  Kỳ đầu
                </th>
                <th colSpan={2} className="border border-green-300 px-2 py-1.5 text-center font-semibold text-green-800">
                  Kỳ sau
                </th>
                <th rowSpan={2} className="border border-green-300 px-2 py-1.5 text-center font-semibold text-green-800 align-middle">
                  Ghi chú
                </th>
              </tr>
              {/* Header row 2 */}
              <tr className="bg-green-50">
                <th className="border border-green-300 px-2 py-1 text-center font-medium text-green-700 whitespace-nowrap">
                  Ngày bắt đầu
                </th>
                <th className="border border-green-300 px-2 py-1 text-center font-medium text-green-700 whitespace-nowrap">
                  Ngày kết thúc
                </th>
                <th className="border border-green-300 px-2 py-1 text-center font-medium text-green-700 whitespace-nowrap">
                  Ngày bắt đầu
                </th>
                <th className="border border-green-300 px-2 py-1 text-center font-medium text-green-700 whitespace-nowrap">
                  Ngày kết thúc
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`hover:bg-green-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  {/* Số lần - badge màu */}
                  <td className="border border-gray-200 px-2 py-1.5 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold ${
                      row.so_lan === 1 ? "bg-green-500" :
                      row.so_lan === 2 ? "bg-yellow-500" : "bg-orange-500"
                    }`}>
                      {row.so_lan}
                    </span>
                  </td>
                  {/* Xã */}
                  <td className="border border-gray-200 px-2 py-1.5">
                    <div className="font-medium text-gray-800 whitespace-nowrap">{row.ten_xa || "—"}</div>
                    {row.maxa && (
                      <div className="text-gray-400 font-mono text-xs">#{row.maxa}</div>
                    )}
                  </td>
                  {/* Kỳ đầu - Ngày bắt đầu */}
                  <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-700 whitespace-nowrap">
                    {formatDate(row.start_dau) || "—"}
                  </td>
                  {/* Kỳ đầu - Ngày kết thúc */}
                  <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-700 whitespace-nowrap">
                    {formatDate(row.end_dau) || "—"}
                  </td>
                  {/* Kỳ sau - Ngày bắt đầu */}
                  <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-700 whitespace-nowrap">
                    {formatDate(row.start_sau) || "—"}
                  </td>
                  {/* Kỳ sau - Ngày kết thúc */}
                  <td className="border border-gray-200 px-2 py-1.5 text-center text-gray-700 whitespace-nowrap">
                    {formatDate(row.end_sau) || "—"}
                  </td>
                  {/* Ghi chú */}
                  <td className="border border-gray-200 px-2 py-1.5 text-gray-500 min-w-[80px]">
                    {row.ghi_chu || ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Phân trang */}
      {pagination.totalPages > 1 && (
        <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-t border-gray-200">
          <span className="text-xs text-gray-500">
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => fetchData(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2 py-0.5 text-xs border rounded disabled:opacity-40 hover:bg-gray-100"
            >
              ‹ Trước
            </button>
            <button
              onClick={() => fetchData(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2 py-0.5 text-xs border rounded disabled:opacity-40 hover:bg-gray-100"
            >
              Sau ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BangKeXuLyAnhVienTham;
