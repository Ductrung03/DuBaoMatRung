// MapServerLayers.jsx - WMS layers from MapServer
import { WMSTileLayer } from 'react-leaflet';
import PropTypes from 'prop-types';
import config from '../../config';

// ✅ WMS Base URL - Qua API Gateway với full URL
const WMS_URL = `${config.API_URL}/api/mapserver`;

/**
 * MapServer WMS Layers Component
 * Renders static layers from MapServer for better performance
 */
export function MapServerLayers({ visibleLayers = [] }) {
  const baseParams = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    CRS: 'EPSG:3857' // Leaflet uses EPSG:3857
  };

  return (
    <>
      {/* SƠN LA LAYER 1: Ranh Giới Xã (75 xã) */}
      {visibleLayers.includes('ranhgioixa') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'ranhgioixa'
          }}
          layers="ranhgioixa"
          format="image/png"
          transparent={true}
          opacity={0.8}
        />
      )}

      {/* SƠN LA LAYER 2: Tiểu Khu Khoảnh Lô (30k khoảnh) */}
      {visibleLayers.includes('tieukukhoanh') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'tieukukhoanh'
          }}
          layers="tieukukhoanh"
          format="image/png"
          transparent={true}
          opacity={0.7}
        />
      )}

      {/* SƠN LA LAYER 3: Hiện Trạng Rừng (280k khoảnh - PRIMARY) */}
      {visibleLayers.includes('hientrangrung') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'hientrangrung'
          }}
          layers="hientrangrung"
          format="image/png"
          transparent={true}
          opacity={0.75}
        />
      )}
    </>
  );
}

MapServerLayers.propTypes = {
  visibleLayers: PropTypes.arrayOf(PropTypes.string)
};

export default MapServerLayers;
