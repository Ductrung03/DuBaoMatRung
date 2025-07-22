// client/src/dashboard/pages/Map/index.jsx
// 🎯 MỤC ĐÍCH: Map component chính đã được refactor (chỉ ~150 dòng)


import { getLayerStyle } from "./utils/mapStyles"; // Import hàm getLayerStyle
import { toast } from "react-toastify";
import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, WMSTileLayer } from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Components
import LoadingOverlay from "./components/LoadingOverlay";
import MapUpdater from "./components/MapUpdater";
import MapLayers from "./components/MapLayers";
import TableDisplay from "./components/TableDisplay";
import MapLegendControl from "../../components/MapLegendControl";

// Hooks
import { useMapState } from "./hooks/useMapState";
import { useMapInteraction } from "./hooks/useMapInteraction";
import { useFeatureMatching } from "./hooks/useFeatureMatching";

// Context & Utils
import { useGeoData } from "../../contexts/GeoDataContext";
import { MAP_CONFIG } from "./constants/mapConstants";

// Helper function để lấy query param từ URL
const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key);
};

// ===================================
// MAP COMPONENT CHÍNH
// ===================================
const Map = () => {
  // ===================================
  // HOOKS & STATE
  // ===================================
  const { geoData, loading, mapLayers, toggleLayerVisibility } = useGeoData();
  const location = useLocation();
  const geoJsonLayerRef = useRef(null);

  // Map state
  const {
    mapType,
    setMapType,
    mapReady,
    setMapReady,
    selectedFeature,
    setSelectedFeature,
    selectedRowFeature,
    setSelectedRowFeature,
    highlightedLayerRef,
    setHighlightedLayerRef,
    loadingDetails,
    setLoadingDetails,
    loadingMessage,
    setLoadingMessage,
  } = useMapState();

  // Map interactions
  const {
    handleFeatureClick,
    handleFeatureMouseOver,
    handleFeatureMouseOut,
  } = useMapInteraction({
    selectedFeature,
    setSelectedFeature,
    setHighlightedLayerRef,
  });

  // Feature matching (table row click)
  const { handleRowClick } = useFeatureMatching({
    geoData,
    setSelectedFeature,
    setSelectedRowFeature,
    setHighlightedLayerRef,
    setLoadingDetails,
    setLoadingMessage,
    highlightedLayerRef,
    geoJsonLayerRef,
  });

  // ===================================
  // DERIVED STATE
  // ===================================
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const layerName = getQueryParam(location.search, "layer");

  // ===================================
  // EFFECTS
  // ===================================


  // Thêm useEffect này vào Map component để lắng nghe event zoom
useEffect(() => {
  const handleZoomToFeature = (event) => {
    const { feature } = event.detail;
    
    if (feature && feature.geometry && window._leaflet_map) {
      try {
        console.log("🔍 Zooming to feature:", feature.properties.gid);
        
        // Tạo layer tạm thời từ geometry
        const geojsonFeature = {
          type: "Feature",
          geometry: feature.geometry,
          properties: feature.properties,
        };

        const tempLayer = L.geoJSON(geojsonFeature);
        const bounds = tempLayer.getBounds();

        if (bounds.isValid()) {
          // Zoom đến feature với animation
          window._leaflet_map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 2.0,
            animate: true,
            maxZoom: 16
          });
          
          // Highlight feature trên map nếu có
          if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.eachLayer((layer) => {
              if (layer.feature && layer.feature.properties.gid === feature.properties.gid) {
                // Reset tất cả styles trước
                geoJsonLayerRef.current.eachLayer((l) => {
                  const originalStyle = getLayerStyle(l.feature, "mat_rung_default", false);
                  l.setStyle(originalStyle);
                });
                
                // Apply highlight style
                const highlightStyle = getLayerStyle(feature, "mat_rung_default", true);
                layer.setStyle({
                  ...highlightStyle,
                  weight: 4,
                  color: "#ff7800",
                  fillOpacity: 0.8,
                  fillColor: "#ff7800"
                });
                layer.bringToFront();
                
                // Mở popup
                if (layer.getPopup) {
                  layer.openPopup();
                }
                
                // Set selected feature
                setSelectedFeature(feature);
                
                console.log("✅ Feature highlighted on map");
              }
            });
          }
          
          toast.success(`🗺️ Đã zoom đến lô CB-${feature.properties.gid} trên bản đồ`);
        }
      } catch (error) {
        console.error("❌ Error zooming to feature:", error);
        toast.error("Không thể zoom đến vị trí trên bản đồ");
      }
    }
  };

  // Thêm event listener
  window.addEventListener('zoomToFeature', handleZoomToFeature);
  
  // Cleanup
  return () => {
    window.removeEventListener('zoomToFeature', handleZoomToFeature);
  };
}, [geoJsonLayerRef, setSelectedFeature]);

  // Debug logging
  useEffect(() => {
    console.log("🔍 MAP DEBUG - Current state:", {
      isDataPage,
      layerName,
      loading,
      geoDataExists: !!geoData,
      geoDataFeatures: geoData?.features?.length || 0,
      geoDataType: geoData?.type,
      currentPath: location.pathname,
    });
  }, [isDataPage, layerName, loading, geoData, location.pathname]);

  // Log geoData changes
  useEffect(() => {
    if (geoData) {
      console.log("📊 Dữ liệu GeoJSON nhận được:", geoData);
      console.log("📊 Số lượng features:", geoData.features?.length || 0);
      
      if (geoData.features && geoData.features.length > 0) {
        console.log("📊 Feature đầu tiên:", geoData.features[0]);
        console.log(`🎉 Hiển thị ${geoData.features.length} khu vực mất rừng trên bản đồ`);
      }
    }
  }, [geoData]);

  // Auto zoom to data when ready
  useEffect(() => {
    if (mapReady && geoData?.features?.length > 0 && window._leaflet_map) {
      try {
        console.log("🔍 Auto zoom đến dữ liệu...");
        const geoJsonLayer = L.geoJSON(geoData);
        const bounds = geoJsonLayer.getBounds();

        if (bounds.isValid()) {
          console.log("✅ Bounds hợp lệ, thực hiện fitBounds");
          window._leaflet_map.fitBounds(bounds, { 
            padding: MAP_CONFIG.flyToBoundsPadding 
          });
        } else {
          console.log("⚠️ Bounds không hợp lệ từ GeoJSON");
        }
      } catch (err) {
        console.error("❌ Lỗi khi auto zoom:", err);
      }
    }
  }, [mapReady, geoData]);

  // ===================================
  // RENDER
  // ===================================
  return (
    <div className="p-2 md:p-5 font-sans relative">
      {/* Header */}
      <h2 className="text-center text-lg md:text-xl font-bold mb-2 md:mb-5">
        Bản đồ khu vực
      </h2>

      {/* Map Container */}
      <div className={`flex justify-center items-center ${isDataPage ? "mb-2 md:mb-5" : ""} relative`}>
        
        {/* Loading Overlay */}
        {loading && (
          <LoadingOverlay message="Đang tải dữ liệu bản đồ..." />
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={MAP_CONFIG.center}
          zoom={MAP_CONFIG.defaultZoom}
          className={`w-full rounded-xl shadow-lg ${
            isDataPage
              ? "h-[40vh] md:h-[50vh]"
              : "h-[50vh] md:h-[calc(100vh-150px)]"
          }`}
          whenCreated={(mapInstance) => {
            console.log("🗺️ Map instance created");
            window._leaflet_map = mapInstance;
            setTimeout(() => {
              setMapReady(true);
              console.log("✅ Map ready");
            }, 500);
          }}
        >
          {/* Base Tile Layers */}
          {mapType === "normal" ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          ) : (
            <>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
            </>
          )}

          {/* Map Updater for table row selection */}
          <MapUpdater selectedFeature={selectedRowFeature} />

          {/* WMS Layer from GeoServer (if layerName exists) */}
          {layerName ? (
            <WMSTileLayer
              url="http://localhost:8080/geoserver/rung/wms"
              layers={layerName}
              format="image/png"
              transparent={true}
              version="1.1.0"
              attribution="GeoServer"
            />
          ) : (
            /* All Map Layers */
            <MapLayers
              geoData={geoData}
              mapLayers={mapLayers}
              selectedFeature={selectedFeature}
              geoJsonLayerRef={geoJsonLayerRef}
              mapReady={mapReady}
              onFeatureClick={handleFeatureClick}
              onFeatureMouseOver={handleFeatureMouseOver}
              onFeatureMouseOut={handleFeatureMouseOut}
            />
          )}

          {/* Map Legend Control */}
          <MapLegendControl
            setMapType={setMapType}
            mapLayers={mapLayers}
            toggleLayerVisibility={toggleLayerVisibility}
          />
        </MapContainer>
      </div>

      {/* Table Display */}
      <TableDisplay
        isDataPage={isDataPage}
        loading={loading}
        geoData={geoData}
        loadingDetails={loadingDetails}
        loadingMessage={loadingMessage}
        onRowClick={handleRowClick}
      />
    </div>
  );
};

export default Map;