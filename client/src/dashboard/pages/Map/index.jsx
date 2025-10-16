// client/src/dashboard/pages/Map/index.jsx - FIXED TABLE DISPLAY FOR ALL PAGES
import { getLayerStyle } from "./utils/mapStyles";
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
import MapLayerLegend from "../../components/MapLayerLegend";

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
  const layerName = getQueryParam(location.search, "layer");

  // ✅ FIX: Luôn hiển thị table khi có dữ liệu, không phụ thuộc vào trang
  const shouldShowTable = geoData?.features?.length > 0;
  const mapHeight = shouldShowTable 
    ? "h-[40vh] md:h-[50vh]"  // Shorter when table is shown
    : "h-[60vh] md:h-[calc(100vh-150px)]"; // Taller when no table

  // ===================================
  // ENHANCED ZOOM TO FEATURE EVENT HANDLER
  // ===================================
  useEffect(() => {
    const handleZoomToFeature = (event) => {
      const { feature, center, bbox, zoom } = event.detail;
      
      if (!feature || !window._leaflet_map) {
        return;
      }

      try {
        const targetGid = feature.properties.gid;
        
        // ✅ FIX: Zoom using bbox if available, fallback to center
        if (bbox && bbox.length === 4) {
          const [west, south, east, north] = bbox;
          const bounds = [[south, west], [north, east]];

          window._leaflet_map.flyToBounds(bounds, {
            padding: [50, 50],
            duration: 2.0,
            animate: true,
            maxZoom: zoom || 16
          });

        } else if (center && center.length === 2) {
          const [lng, lat] = center;
          window._leaflet_map.flyTo([lat, lng], zoom || 16, {
            duration: 2.0,
            animate: true
          });

        }
        
        // ✅ FIX: Highlight target feature with delay
        setTimeout(() => {
          if (geoJsonLayerRef.current) {
            let targetLayer = null;
            
            geoJsonLayerRef.current.eachLayer((layer) => {
              if (layer.feature && layer.feature.properties.gid === targetGid) {
                targetLayer = layer;
                
                // Reset all other layers first
                geoJsonLayerRef.current.eachLayer((l) => {
                  if (l !== layer) {
                    const originalStyle = getLayerStyle(l.feature, "mat_rung_default", false);
                    l.setStyle(originalStyle);
                  }
                });
                
                // Apply highlight style to target
                const highlightStyle = {
                  fillColor: "#ff7800",
                  color: "#ff0000", 
                  weight: 4,
                  fillOpacity: 0.8,
                  dashArray: "5, 5"
                };
                
                layer.setStyle(highlightStyle);
                layer.bringToFront();
                
                // Open popup if available
                if (layer.getPopup) {
                  layer.openPopup();
                }
                
              }
            });
            
            if (targetLayer) {
              setSelectedFeature(feature);
              setHighlightedLayerRef(targetLayer);
            } else {
            }
          }
        }, 1000); // Delay để đảm bảo map đã zoom xong
        
        toast.success(`🗺️ Đã zoom đến CB-${targetGid} trên bản đồ`, { autoClose: 3000 });

      } catch (error) {
        console.error("❌ Error in zoomToFeature:", error);
        toast.error("Không thể zoom đến vị trí trên bản đồ");
      }
    };

    // Add event listener
    window.addEventListener('zoomToFeature', handleZoomToFeature);
    
    // Cleanup
    return () => {
      window.removeEventListener('zoomToFeature', handleZoomToFeature);
    };
  }, [geoJsonLayerRef, setSelectedFeature, setHighlightedLayerRef]);

  // ===================================
  // EFFECTS
  // ===================================

  // Debug logging
  useEffect(() => {
    // Debug removed
  }, [layerName, loading, geoData, location.pathname, shouldShowTable]);

  // Log geoData changes
  useEffect(() => {
    if (geoData) {
      // Debug removed
      if (geoData.features && geoData.features.length > 0) {
        // Debug removed
      }
    }
  }, [geoData]);

  // Auto zoom to data when ready (chỉ cho initial load)
  useEffect(() => {
    if (mapReady && geoData?.features?.length > 0 && window._leaflet_map && !selectedFeature) {
      try {
        const geoJsonLayer = L.geoJSON(geoData);
        const bounds = geoJsonLayer.getBounds();

        if (bounds.isValid()) {
          window._leaflet_map.fitBounds(bounds, { 
            padding: MAP_CONFIG.flyToBoundsPadding 
          });
        } else {
        }
      } catch (err) {
        console.error("❌ Lỗi khi auto zoom:", err);
      }
    }
  }, [mapReady, geoData, selectedFeature]);

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
      <div className={`flex justify-center items-center ${shouldShowTable ? "mb-2 md:mb-5" : ""} relative`}>
        
        {/* Loading Overlay */}
        {loading && (
          <LoadingOverlay message="Đang tải dữ liệu bản đồ..." />
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={MAP_CONFIG.center}
          zoom={MAP_CONFIG.defaultZoom}
          className={`w-full rounded-xl shadow-lg ${mapHeight}`}
          whenCreated={(mapInstance) => {
            window._leaflet_map = mapInstance;
            setTimeout(() => {
              setMapReady(true);
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

          {/* Map Layer Legend Control */}
          <MapLayerLegend
            mapLayers={mapLayers}
            toggleLayerVisibility={toggleLayerVisibility}
          />
        </MapContainer>
      </div>

      {/* ✅ FIX: Table Display - Luôn render khi có dữ liệu, không phụ thuộc trang */}
      <TableDisplay
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