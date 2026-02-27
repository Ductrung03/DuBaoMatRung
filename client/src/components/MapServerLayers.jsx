import React from 'react';
import { WMSTileLayer } from 'react-leaflet';
import config from '../config';

// WMS Base URL - Qua API Gateway với full URL
const WMS_URL = `${config.API_URL}/api/mapserver`;

// Cấu hình cho layer (unified forest status layer)
const layerConfigs = [
  { name: 'hientrangrung', opacity: 0.85 },
  { name: 'matrung_verified', opacity: 0.85 },
];

// Base params - memoized to prevent re-creation
const baseParams = {
  SERVICE: 'WMS',
  VERSION: '1.3.0',
  REQUEST: 'GetMap',
  FORMAT: 'image/png',
  TRANSPARENT: true,
  CRS: 'EPSG:3857', // Leaflet sử dụng EPSG:3857
};

// Memoized component to prevent unnecessary re-renders
export const MapServerLayers = React.memo(function MapServerLayers({ visibleLayers }) {
  return (
    <>
      {layerConfigs
        .filter((layer) => visibleLayers.includes(layer.name))
        .map((layer) => (
          <WMSTileLayer
            key={layer.name}
            url={WMS_URL}
            params={{
              ...baseParams,
              LAYERS: layer.name,
            }}
            layers={layer.name}
            format="image/png"
            transparent={true}
            opacity={layer.opacity}
            // Performance optimizations
            updateInterval={200}  // Throttle tile updates during zoom/pan
            keepBuffer={2}        // Keep 2 screens of tiles cached
            tileSize={256}        // Standard tile size
            maxNativeZoom={18}    // Limit zoom to prevent too many requests
            minZoom={8}           // Minimum zoom level
            zIndex={10}           // Ensure correct layer order
          />
        ))}
    </>
  );
});
