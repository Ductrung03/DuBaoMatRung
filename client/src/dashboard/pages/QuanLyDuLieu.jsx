// QuanLyDuLieu.jsx - Responsive with Mobile Sidebar Pattern
import React, { useState } from "react";
import Map from "./Map";
import TraCuuDuLieuDuBaoMatRung from "../components/sidebars/quanlydulieu/TraCuuDuLieuDuBaoMatRung";
import TraCuuAnhVeTinh from "../components/sidebars/quanlydulieu/TraCuuAnhVeTinh";
import XacMinhDuBaoMatRung from "../components/sidebars/quanlydulieu/XacMinhDuBaoMatRung";
import CapNhatDuLieu from "../components/sidebars/quanlydulieu/CapNhatDuLieu";
import { useIsMobileOrTablet } from "../../hooks/useMediaQuery";

const QuanLyDuLieu = () => {
  const [activeSidebar, setActiveSidebar] = useState('search');
  const isMobile = useIsMobileOrTablet(); // Use 1023px breakpoint for better mobile/tablet detection

  const sidebarButtons = [
    { id: 'search', label: 'Tra cứu', icon: '🔍' },
    { id: 'satellite', label: 'Ảnh VT', icon: '🛰️' },
    { id: 'verify', label: 'Xác minh', icon: '✓' },
    { id: 'update', label: 'Cập nhật', icon: '📊' }
  ];

  return (
    <div
      className="quan-ly-du-lieu-container flex flex-col gap-2 sm:gap-4 overflow-y-auto overflow-x-hidden"
      style={{
        height: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 120px)',
        maxHeight: isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 120px)',
        scrollBehavior: 'smooth',
        scrollbarWidth: 'thin',
        scrollbarColor: '#027e02 #f1f1f1'
      }}
    >
      {isMobile ? (
        // Mobile: Bottom navigation + conditional sidebar over map
        <>
          {/* Map takes full space with bottom padding for navigation */}
          <div className="flex-1 relative pb-20">
            <Map />
          </div>

          {/* Bottom navigation bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-300 shadow-lg">
            <div className="flex gap-1 p-2">
              {sidebarButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setActiveSidebar(activeSidebar === btn.id ? null : btn.id)}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors ${activeSidebar === btn.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-base">{btn.icon}</span>
                    <span>{btn.label}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Conditional sidebar panel */}
            {activeSidebar && (
              <div className="bg-white border-t border-gray-200 max-h-[60vh] overflow-y-auto">
                <div className="p-3 pb-20 relative">
                  {/* Close button */}
                  <button
                    onClick={() => setActiveSidebar(null)}
                    className="sticky top-0 right-0 float-right p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full z-10"
                  >
                    ✕
                  </button>

                  {activeSidebar === 'search' && <TraCuuDuLieuDuBaoMatRung />}
                  {activeSidebar === 'satellite' && <TraCuuAnhVeTinh />}
                  {activeSidebar === 'verify' && <XacMinhDuBaoMatRung />}
                  {activeSidebar === 'update' && <CapNhatDuLieu />}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // Desktop: Map only - sidebars are rendered by MainLayout's Sidebar component
        <Map />
      )}
    </div>
  );
};

export default QuanLyDuLieu;