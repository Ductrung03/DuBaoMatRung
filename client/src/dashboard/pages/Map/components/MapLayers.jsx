// client/src/dashboard/pages/Map/components/MapLayers.jsx
// 🎯 MỤC ĐÍCH: Component render tất cả các layers trên bản đồ

import React from "react";
import { GeoJSON } from "react-leaflet";
import { getLayerStyle } from "../utils/mapStyles";
import { 
  buildPopupContent, 
  buildMatRungPopup, 
  buildDeforestationAlertsPopup 
} from "../utils/popupBuilder";

const MapLayers = ({
  geoData,
  mapLayers,
  selectedFeature,
  geoJsonLayerRef,
  mapReady,
  onFeatureClick,
  onFeatureMouseOver,
  onFeatureMouseOut,
}) => {

  // ===================================
  // XỬ LÝ SỰ KIỆN CHO MỖI FEATURE
  // ===================================
  const onEachFeature = (feature, layer, layerType) => {
    // Bind popup
    if (feature.properties) {
      const popupContent = buildPopupContent(feature, layerType);
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup-container",
      });
    }

    // Mouse events
    layer.on("mouseover", function () {
      onFeatureMouseOver && onFeatureMouseOver(this, layerType);
    });

    layer.on("mouseout", function () {
      onFeatureMouseOut && onFeatureMouseOut(this, layerType, selectedFeature);
    });

    // Click event
    layer.on("click", () => {
      onFeatureClick && onFeatureClick(feature, layer);
    });
  };

  // ===================================
  // XỬ LÝ SỰ KIỆN CHO DỮ LIỆU MẤT RỪNG MẶC ĐỊNH
  // ===================================
  const onEachMatRungFeature = (feature, layer) => {
    // Bind popup cho dữ liệu mất rừng
    if (feature.properties) {
      const popupContent = buildMatRungPopup(feature);
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup-container",
      });
    }

    // Mouse events
    layer.on("mouseover", function () {
      onFeatureMouseOver && onFeatureMouseOver(this, "mat_rung_default");
    });

    layer.on("mouseout", function () {
      onFeatureMouseOut && onFeatureMouseOut(this, "mat_rung_default", selectedFeature);
    });

    // Click event
    layer.on("click", () => {
      onFeatureClick && onFeatureClick(feature, layer);
    });
  };

  // ===================================
  // XỬ LÝ SỰ KIỆN CHO DỰ BÁO MẤT RỪNG TỪ LAYER
  // ===================================
  const onEachDeforestationAlertsFeature = (feature, layer) => {
    // Bind popup cho dự báo mất rừng
    if (feature.properties) {
      const popupContent = buildDeforestationAlertsPopup(feature);
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup-container",
      });
    }

    // Mouse events với style đặc biệt
    layer.on("mouseover", function () {
      this.setStyle({
        weight: 4,
        color: "#ff7800",
        dashArray: "",
        fillOpacity: 0.9,
      });
      this.bringToFront();
    });

    layer.on("mouseout", function () {
      if (!selectedFeature || this.feature !== selectedFeature) {
        const originalStyle = getLayerStyle(this.feature, "deforestationAlerts", false);
        this.setStyle(originalStyle);
      }
    });

    // Click event
    layer.on("click", () => {
      onFeatureClick && onFeatureClick(feature, layer);
    });
  };

  // ===================================
  // HELPER: XỬ LÝ REF CHO GEOJSON LAYER
  // ===================================
  const handleLayerRef = (layerRef, shouldFitBounds = true) => {
    if (layerRef && shouldFitBounds) {
      if (geoJsonLayerRef) {
        geoJsonLayerRef.current = layerRef;
      }

      if (mapReady && window._leaflet_map) {
        const bounds = layerRef.getBounds();
        if (bounds.isValid()) {
          window._leaflet_map.fitBounds(bounds, { padding: [20, 20] });
          console.log("✅ Đã zoom đến dữ liệu layer");
        }
      }
    }
  };

  return (
    <>
      {/* ===================================
          1. DỮ LIỆU MẤT RỪNG MẶC ĐỊNH (MÀU ĐỎ)
          ================================== */}
      {geoData?.type === "FeatureCollection" && geoData.features?.length > 0 && (
        <>
          {console.log("🔴 Rendering dữ liệu mat_rung mặc định với", geoData.features.length, "features")}
          <GeoJSON
            key={`mat-rung-default-${Date.now()}`}
            data={geoData}
            onEachFeature={onEachMatRungFeature}
            style={(feature) => {
              const style = getLayerStyle(feature, "mat_rung_default", selectedFeature === feature);
              console.log("🔴 Default mat_rung style applied:", style);
              return style;
            }}
            ref={(layerRef) => handleLayerRef(layerRef, true)}
          />
        </>
      )}

      {/* ===================================
          2. LAYER NỀN ĐỊA HÌNH (DƯỚI CÙNG)
          ================================== */}
      {mapLayers.terrain?.data && mapLayers.terrain.visible && (
        <GeoJSON
          key={`terrain-${Date.now()}`}
          data={mapLayers.terrain.data}
          onEachFeature={(feature, layer) => onEachFeature(feature, layer, "terrain")}
          style={(feature) => getLayerStyle(feature, "terrain", selectedFeature === feature)}
        />
      )}

      {/* ===================================
          3. LAYER CHỦ QUẢN LÝ RỪNG
          ================================== */}
      {mapLayers.forestManagement?.data && mapLayers.forestManagement.visible && (
        <GeoJSON
          key={`forest-management-${Date.now()}`}
          data={mapLayers.forestManagement.data}
          onEachFeature={(feature, layer) => onEachFeature(feature, layer, "forestManagement")}
          style={(feature) => getLayerStyle(feature, "forestManagement", selectedFeature === feature)}
        />
      )}

      {/* ===================================
          4. LAYER 3 LOẠI RỪNG
          ================================== */}
      {mapLayers.forestTypes?.data && mapLayers.forestTypes.visible && (
        <GeoJSON
          key={`forest-types-${Date.now()}`}
          data={mapLayers.forestTypes.data}
          onEachFeature={(feature, layer) => onEachFeature(feature, layer, "forestTypes")}
          style={(feature) => getLayerStyle(feature, "forestTypes", selectedFeature === feature)}
        />
      )}

      {/* ===================================
          5. LAYER DỰ BÁO MẤT RỪNG TỪ MAPLAYERS
          ================================== */}
      {mapLayers.deforestationAlerts?.data && mapLayers.deforestationAlerts.visible && (
        <>
          {console.log("✅ Rendering deforestation alerts layer with", mapLayers.deforestationAlerts.data.features?.length, "features")}
          <GeoJSON
            key={`deforestation-alerts-${Date.now()}`}
            data={mapLayers.deforestationAlerts.data}
            onEachFeature={onEachDeforestationAlertsFeature}
            style={(feature) => {
              const style = getLayerStyle(feature, "deforestationAlerts", selectedFeature === feature);
              console.log("🎨 Deforestation style for feature:", style);
              return style;
            }}
          />
        </>
      )}

      {/* ===================================
          6. FALLBACK: DỰ BÁO MẤT RỪNG TỪ GEODATA
          ================================== */}
      {!mapLayers.deforestationAlerts?.data && 
       geoData?.type === "FeatureCollection" && 
       geoData.features?.length > 0 && (
        <>
          {console.log("📋 Using fallback geoData for deforestation with", geoData.features.length, "features")}
          <GeoJSON
            key={`deforestation-fallback-${Date.now()}`}
            data={geoData}
            onEachFeature={(feature, layer) => {
              // Popup cho fallback data
              if (feature.properties) {
                const popupContent = buildPopupContent(feature, "deforestation");
                layer.bindPopup(popupContent, {
                  maxWidth: 300,
                  className: "custom-popup-container",
                });
              }

              // Mouse events
              layer.on("mouseover", function () {
                this.setStyle({
                  weight: 3,
                  color: "#ff7800",
                  dashArray: "",
                  fillOpacity: 0.7,
                });
                this.bringToFront();
              });

              layer.on("mouseout", function () {
                if (!selectedFeature || this.feature !== selectedFeature) {
                  if (geoJsonLayerRef?.current) {
                    geoJsonLayerRef.current.resetStyle(this);
                  }
                }
              });

              // Click event với style đặc biệt
              layer.on("click", () => {
                if (geoJsonLayerRef?.current) {
                  geoJsonLayerRef.current.eachLayer((l) => {
                    l.setStyle({
                      weight: l === layer ? 3 : 1,
                      color: l === layer ? "#ff7800" : "#3388ff",
                      fillOpacity: l === layer ? 0.7 : 0.2,
                    });

                    if (l === layer) {
                      l.bringToFront();
                    }
                  });
                }

                onFeatureClick && onFeatureClick(feature, layer);
              });
            }}
            style={(feature) => {
              // Style cho fallback sử dụng logic cũ
              const fillColor = getColorByStatus(feature.properties);
              return {
                fillColor,
                weight: selectedFeature && feature === selectedFeature ? 3 : 1,
                opacity: 1,
                color: selectedFeature && feature === selectedFeature ? "#ff7800" : "#ffffff",
                fillOpacity: 0.7,
              };
            }}
            ref={(layerRef) => handleLayerRef(layerRef, true)}
          />
        </>
      )}

      {/* ===================================
          7. LAYER RANH GIỚI HÀNH CHÍNH (TRÊN CÙNG)
          ================================== */}
      {mapLayers.administrative?.data && mapLayers.administrative.visible && (
        <GeoJSON
          key={`administrative-${Date.now()}`}
          data={{
            type: "FeatureCollection",
            features: mapLayers.administrative.data.features || [],
          }}
          onEachFeature={(feature, layer) => {
            console.log(`🔗 Adding administrative feature to map:`, feature.properties);
            onEachFeature(feature, layer, "administrative");
          }}
          style={(feature) => {
            const style = getLayerStyle(feature, "administrative", selectedFeature === feature);
            console.log(`🎨 Administrative feature style:`, style);
            return style;
          }}
        />
      )}
    </>
  );
};

export default MapLayers;