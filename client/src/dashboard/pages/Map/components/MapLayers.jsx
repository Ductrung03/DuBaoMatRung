// client/src/dashboard/pages/Map/components/MapLayers.jsx
// 🎯 MỤC ĐÍCH: Component render tất cả các layers trên bản đồ

import React from "react";
import { GeoJSON } from "react-leaflet";
import { getLayerStyle, getColorByStatus } from "../utils/mapStyles";
import {
  buildPopupContent,
  buildMatRungPopup,
  buildDeforestationAlertsPopup
} from "../utils/popupBuilder";
import MapServerLayers from "../../../components/MapServerLayers";

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
      layer.bindPopup(popupContent, { maxWidth: 300, className: 'custom-popup' });
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
      layer.bindPopup(popupContent, { maxWidth: 300, className: 'custom-popup' });
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
      layer.bindPopup(popupContent, { maxWidth: 300, className: 'custom-popup' });
    }

    // Mouse events với style đặc biệt
    layer.on("mouseover", function () {
      this.setStyle({});
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
        }
      }
    }
  };

  return (
    <>
      {/* ===================================
          ⚡ SƠN LA UNIFIED WMS LAYER (STATIC DATA - SUPER FAST!)
          - Hiện trạng rừng: 127k polygons (UNIFIED LAYER)
          ================================== */}
      <MapServerLayers
        visibleLayers={[
          mapLayers.hientrangrung?.visible !== false && 'hientrangrung',
          mapLayers.matrung_verified?.visible !== false && 'matrung_verified'
        ].filter(Boolean)}
      />

      {/* ===================================
          1. DỮ LIỆU MẤT RỪNG MẶC ĐỊNH (MÀU ĐỎ) - GIỮ GEOJSON (DYNAMIC DATA)
          ================================== */}
      {geoData?.type === "FeatureCollection" && geoData.features?.length > 0 && (
        <GeoJSON
          key={`mat-rung-default-${geoData?.loadTimestamp || geoData?.features?.length || 'default'}`}
          data={geoData}
          onEachFeature={onEachMatRungFeature}
          style={(feature) => getLayerStyle(feature, "mat_rung_default", selectedFeature === feature)}
          ref={(layerRef) => handleLayerRef(layerRef, true)}
        />
      )}

      {/* ===================================
          5. LAYER DỰ BÁO MẤT RỪNG TỪ MAPLAYERS
          ================================== */}
      {mapLayers.deforestationAlerts?.data && mapLayers.deforestationAlerts.visible && (
        <GeoJSON
          key={`deforestation-alerts-${mapLayers.deforestationAlerts?.data?.loadTimestamp || 'default'}`}
          data={mapLayers.deforestationAlerts.data}
          onEachFeature={onEachDeforestationAlertsFeature}
          style={(feature) => getLayerStyle(feature, "deforestationAlerts", selectedFeature === feature)}
        />
      )}

      {/* ===================================
          6. FALLBACK: DỰ BÁO MẤT RỪNG TỪ GEODATA
          ================================== */}
      {!mapLayers.deforestationAlerts?.data &&
       geoData?.type === "FeatureCollection" &&
       geoData.features?.length > 0 && (
        <GeoJSON
          key={`deforestation-fallback-${geoData?.loadTimestamp || geoData?.features?.length || 'default'}`}
          data={geoData}
          onEachFeature={(feature, layer) => {
            // Popup cho fallback data
            if (feature.properties) {
              const popupContent = buildPopupContent(feature, "deforestation");
              layer.bindPopup(popupContent, { maxWidth: 300, className: 'custom-popup' });
            }

            // Mouse events
            layer.on("mouseover", function () {
              this.setStyle({});
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
                  l.setStyle({});

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
      )}

      {/* ===================================
          NOTE: Ranh giới hành chính giờ dùng WMS (xem MapServerLayers ở trên)
          Đã loại bỏ GeoJSON layers cho: terrain, forestManagement, forestTypes, administrative
          Tất cả đều chuyển sang WMS để tăng tốc 20-250 lần! ⚡
          ================================== */}
    </>
  );
};

export default MapLayers;