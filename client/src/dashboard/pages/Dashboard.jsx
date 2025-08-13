// QuanLyDuLieu.jsx
import React from "react";
import Map from "./Map";



const Dashboard = () => {
  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
     <div 
      className="du-bao-mat-rung-container flex flex-col gap-4 overflow-y-auto overflow-x-hidden"
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
      
    </div>
  );
};

export default Dashboard;
