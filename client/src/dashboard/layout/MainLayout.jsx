import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet, useLocation } from "react-router-dom";
import { FaTimes } from "react-icons/fa";
import { useIsMobileOrTablet } from "../../hooks/useMediaQuery";
import ClipProgressBanner from "../components/ClipProgressBanner";
import { isWorkspacePage } from './navigation';
import PersistentMapProvider from '../maps/PersistentMapProvider';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobileOrTablet = useIsMobileOrTablet();
  const location = useLocation();
  const isWorkspace = isWorkspacePage(location.pathname);
  const compactMapSidebar=/\/dashboard\/(dubaomatrung|quanlydulieu)(?:\/|$)/.test(location.pathname);

  // Close sidebar when navigating on mobile/tablet
  useEffect(() => {
    if (isMobileOrTablet) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobileOrTablet]);

  return (
    <PersistentMapProvider><div className="vfis-app flex flex-col h-[100dvh]">
      <ClipProgressBanner />
      <Header onMenuClick={isWorkspace ? undefined : () => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Overlay for mobile/tablet */}
        {!isWorkspace && isMobileOrTablet && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          />
        )}

        {/* Sidebar - drawer on mobile/tablet, fixed on desktop */}
        {!isWorkspace && <aside
          className={`
            fixed inset-y-0 lg:relative lg:inset-y-auto z-50 lg:z-auto
             w-80 ${compactMapSidebar?'lg:w-80':'lg:w-96'}
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
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-20"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <FaTimes className="w-6 h-6 text-gray-600" />
            </button>
          )}

          <Sidebar key={location.pathname}/>
        </aside>}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-hidden bg-gray-50">
          <Outlet key={location.pathname}/>
        </main>
      </div>
    </div></PersistentMapProvider>
  );
};

export default MainLayout;
