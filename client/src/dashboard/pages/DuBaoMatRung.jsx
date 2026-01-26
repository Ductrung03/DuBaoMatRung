// DuBaoMatRung.jsx - Responsive with Mobile Sidebar Pattern
import React, { useState } from "react";
import Map from "./Map";
import DuBaoMatRungTuDong from "../components/sidebars/dubaomatrung/DuBaoMatRungTuDong";
import DuBaoMatRungTuyBien from "../components/sidebars/dubaomatrung/DuBaoMatRungTuyBien";
import { useIsMobileOrTablet } from "../../hooks/useMediaQuery";

const DuBaoMatRung = () => {
  const [activeSidebar, setActiveSidebar] = useState('auto');
  const isMobile = useIsMobileOrTablet(); // Use 1023px breakpoint for better mobile/tablet detection

  const sidebarButtons = [
    { id: 'auto', label: 'Tự động', icon: '🤖' },
    { id: 'custom', label: 'Tùy chỉnh', icon: '⚙️' }
  ];

  return (
    <div
      className="du-bao-mat-rung-container flex flex-col gap-2 sm:gap-4 overflow-y-auto overflow-x-hidden"
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
                <div className="p-3 relative">
                  {/* Close button */}
                  <button
                    onClick={() => setActiveSidebar(null)}
                    className="sticky top-0 right-0 float-right p-2 text-gray-500 hover:text-gray-700 bg-white rounded-full z-10"
                  >
                    ✕
                  </button>

                  {activeSidebar === 'auto' && <DuBaoMatRungTuDong />}
                  {activeSidebar === 'custom' && <DuBaoMatRungTuyBien />}
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

export default DuBaoMatRung;
