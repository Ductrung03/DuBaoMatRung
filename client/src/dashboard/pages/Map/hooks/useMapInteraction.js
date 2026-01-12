import { getLayerStyle, getDefaultMatRungStyle } from "../utils/mapStyles";

export const useMapInteraction = ({
  selectedFeature,
  setSelectedFeature,
  setHighlightedLayerRef,
}) => {

  // Xử lý khi click vào feature
  const handleFeatureClick = (feature, layer) => {
    setSelectedFeature(feature);
    setHighlightedLayerRef(layer);

    // ✅ FIX: Dispatch zoom event để map zoom vào feature khi click
    const bounds = layer.getBounds ? layer.getBounds() : null;
    if (bounds) {
      const center = bounds.getCenter();
      const zoomEvent = new CustomEvent("zoomToFeatureFromMap", {
        detail: {
          feature,
          center: [center.lng, center.lat],
          bounds: [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        },
      });
      window.dispatchEvent(zoomEvent);
    }

    // ✅ FIX: Dispatch event để highlight row trong bảng VÀ đưa row lên đầu
    const event = new CustomEvent("highlightTableRow", {
      detail: { feature, moveToTop: true },
    });
    window.dispatchEvent(event);
  };

  // Xử lý khi hover vào feature
  const handleFeatureMouseOver = (layer, layerType) => {
    const currentStyle = layerType === "default" || layerType === "mat_rung_default" || !layerType
      ? getDefaultMatRungStyle(layer.feature, false)
      : getLayerStyle(layer.feature, layerType, false);

    layer.setStyle({
      ...currentStyle,
      weight: 3,
      color: '#ff7800',
    });
    layer.bringToFront();
  };

  // Xử lý khi mouse out khỏi feature
  const handleFeatureMouseOut = (layer, layerType, currentSelectedFeature) => {
    if (!currentSelectedFeature || layer.feature !== currentSelectedFeature) {
      const originalStyle = layerType === "default" || layerType === "mat_rung_default" || !layerType
        ? getDefaultMatRungStyle(layer.feature, false)
        : getLayerStyle(layer.feature, layerType, false);
      layer.setStyle(originalStyle);
    }
  };

  return {
    handleFeatureClick,
    handleFeatureMouseOver,
    handleFeatureMouseOut,
  };
};
