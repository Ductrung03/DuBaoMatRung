import { useState } from "react";

export const useMapState = () => {
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedRowFeature, setSelectedRowFeature] = useState(null);
  const [highlightedLayerRef, setHighlightedLayerRef] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  return {
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
  };
};
