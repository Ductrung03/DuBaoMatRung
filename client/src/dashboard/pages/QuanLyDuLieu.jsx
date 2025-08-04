// QuanLyDuLieu.jsx - With Enhanced Scrollbar
import React from "react";
import Map from "./Map";

const QuanLyDuLieu = () => {
  return (
    <div 
      className="quan-ly-du-lieu-container flex flex-col gap-4 overflow-y-auto overflow-x-hidden"
      style={{
        height: 'calc(100vh - 120px)', // Trừ đi chiều cao header + padding
        maxHeight: 'calc(100vh - 120px)',
        scrollBehavior: 'smooth',
        // Custom scrollbar inline styles
        scrollbarWidth: 'thin', // Firefox
        scrollbarColor: '#027e02 #f1f1f1' // Firefox
      }}
    >
      <Map />
    </div>
  );
};

export default QuanLyDuLieu;