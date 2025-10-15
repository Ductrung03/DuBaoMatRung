import { WMSTileLayer } from 'react-leaflet';

// WMS Base URL
const WMS_URL = '/api/mapserver'; // Qua API Gateway

// Cấu hình cho các layer
const layerConfigs = [
  { name: 'ranhgioihc', opacity: 0.8 },
  { name: 'rg3lr', opacity: 0.7 },
  { name: 'nendiahinh', opacity: 0.5 },
  { name: 'chuquanly', opacity: 0.6 },
  { name: 'huyen', opacity: 0.9 },
];

export function MapServerLayers({ visibleLayers }) {
  const baseParams = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    CRS: 'EPSG:3857', // Leaflet sử dụng EPSG:3857
  };

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
          />
        ))}
    </>
  );
}
