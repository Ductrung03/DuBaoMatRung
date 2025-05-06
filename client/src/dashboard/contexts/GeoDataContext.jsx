// src/contexts/GeoDataContext.jsx
import React, { createContext, useContext, useState } from "react";

// Tạo context
const GeoDataContext = createContext();

// Hook tùy chỉnh để dùng context
export const useGeoData = () => useContext(GeoDataContext);

// Provider để bọc quanh App
export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <GeoDataContext.Provider value={{ geoData, setGeoData, loading, setLoading  }}>
      {children}
    </GeoDataContext.Provider>
  );
};
