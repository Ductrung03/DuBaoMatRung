import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet, useLocation } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { useIsMobileOrTablet } from "../../hooks/useMediaQuery";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobileOrTablet = useIsMobileOrTablet();
  const location = useLocation();

  // Close sidebar when navigating on mobile/tablet
  useEffect(() => {
    if (isMobileOrTablet) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobileOrTablet]);

  return (
    <div className="flex flex-col h-screen">
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay for mobile/tablet */}
        {isMobileOrTablet && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Sidebar - drawer on mobile/tablet, fixed on desktop */}
        <aside
          className={`
            fixed lg:relative z-50 lg:z-auto
            w-80 lg:w-96
            h-full
            bg-white border-r border-gray-200
            overflow-y-auto
            transform transition-transform duration-300 ease-in-out
            ${isMobileOrTablet ? (isSidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
          `}
        >
          {/* Close button on mobile/tablet */}
          {isMobileOrTablet && (
            <button
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <FaTimes className="w-6 h-6 text-gray-600" />
            </button>
          )}

          <Sidebar />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-hidden bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;