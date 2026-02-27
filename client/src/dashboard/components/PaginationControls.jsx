// client/src/dashboard/components/PaginationControls.jsx
// Pagination controls for Mat Rung data
import React, { useState } from "react";
import { FaChevronLeft, FaChevronRight, FaAngleDoubleLeft, FaAngleDoubleRight } from "react-icons/fa";

const PaginationControls = ({ pagination, onPageChange, loading = false }) => {
  const [jumpToPage, setJumpToPage] = useState("");

  if (!pagination || pagination.totalPages <= 1) {
    return null; // Don't show pagination if only 1 page
  }

  const { page, totalPages, total, limit, hasNext, hasPrev } = pagination;

  const handleJumpToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage("");
    }
  };

  const handleFirst = () => onPageChange(1);
  const handlePrev = () => hasPrev && onPageChange(page - 1);
  const handleNext = () => hasNext && onPageChange(page + 1);
  const handleLast = () => onPageChange(totalPages);

  // Generate page numbers to display (max 7 pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, current, and neighbors
      if (page <= 4) {
        // Near start
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        // Near end
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // Middle
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white border-t border-gray-200">
      {/* Info */}
      <div className="text-sm text-gray-600">
        Hiển thị <span className="font-semibold text-forest-green-primary">{(page - 1) * limit + 1}</span> -{" "}
        <span className="font-semibold text-forest-green-primary">
          {Math.min(page * limit, total)}
        </span>{" "}
        trong tổng số <span className="font-semibold text-forest-green-primary">{total}</span> bản ghi
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* First page */}
        <button
          onClick={handleFirst}
          disabled={!hasPrev || loading}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Trang đầu"
        >
          <FaAngleDoubleLeft className="w-4 h-4 text-gray-600" />
        </button>

        {/* Previous */}
        <button
          onClick={handlePrev}
          disabled={!hasPrev || loading}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Trang trước"
        >
          <FaChevronLeft className="w-3 h-3 text-gray-600" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((num, idx) =>
            num === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={num}
                onClick={() => num !== page && onPageChange(num)}
                disabled={loading}
                className={`px-3 py-1 rounded border transition ${
                  num === page
                    ? "bg-forest-green-primary text-white border-forest-green-primary font-semibold"
                    : "border-gray-300 hover:bg-gray-100 text-gray-700"
                } disabled:opacity-50`}
              >
                {num}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={handleNext}
          disabled={!hasNext || loading}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Trang sau"
        >
          <FaChevronRight className="w-3 h-3 text-gray-600" />
        </button>

        {/* Last page */}
        <button
          onClick={handleLast}
          disabled={!hasNext || loading}
          className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          title="Trang cuối"
        >
          <FaAngleDoubleRight className="w-4 h-4 text-gray-600" />
        </button>

        {/* Jump to page */}
        <form onSubmit={handleJumpToPage} className="ml-4 flex items-center gap-2">
          <span className="text-sm text-gray-600">Đến trang:</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            disabled={loading}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-forest-green-primary disabled:opacity-50"
            placeholder={page.toString()}
          />
          <button
            type="submit"
            disabled={loading || !jumpToPage}
            className="px-3 py-1 bg-forest-green-primary text-white rounded text-sm hover:bg-forest-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Đi
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaginationControls;
