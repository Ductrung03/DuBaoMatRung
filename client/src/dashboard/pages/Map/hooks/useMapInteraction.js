import { getLayerStyle, getDefaultMatRungStyle } from "../utils/mapStyles";

export const useMapInteraction = ({
  selectedFeature,
  setSelectedFeature,
  setHighlightedLayerRef,
}) => {

  // Xử lý khi click vào feature
  const handleFeatureClick = (feature, layer) => {
    console.log("Feature clicked:", feature);
    setSelectedFeature(feature);
    setHighlightedLayerRef(layer);
  };

  // Xử lý khi hover vào feature
  const handleFeatureMouseOver = (layer, layerType) => {
    const currentStyle = layerType === "default" || layerType === "mat_rung_default" || !layerType 
      ? getDefaultMatRungStyle(layer.feature, false)
      : getLayerStyle(layer.feature, layerType, false);
      
    layer.setStyle({
      ...currentStyle,
      weight: currentStyle.weight + 1,
      color: "#ff7800",
      fillOpacity: Math.min(currentStyle.fillOpacity + 0.2, 1),
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
