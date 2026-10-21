// MapServerLayers.jsx - WMS layers from MapServer
import { WMSTileLayer } from 'react-leaflet';
import PropTypes from 'prop-types';
import { useMemo } from 'react';
import config from '../../config';

// ✅ WMS Base URL - Qua API Gateway với full URL
const WMS_URL = `${config.API_URL}/api/mapserver`;

/**
 * MapServer WMS Layers Component
 * Renders static layers from MapServer for better performance
 */
export function MapServerLayers({ visibleLayers = [], forestOpacity = 0.75, forestTypes = null }) {
  const baseParams = useMemo(()=>({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    CRS: 'EPSG:3857' // Leaflet uses EPSG:3857
  }),[]);
  const typeKey=forestTypes===null?null:forestTypes.join(',');
  const forestParams=useMemo(()=>({...baseParams,LAYERS:'hientrangrung',...(typeKey===null?{}:{forest_types:typeKey})}),[baseParams,typeKey]);
  const boundaryParams=useMemo(()=>({...baseParams,LAYERS:'ranhgioixa'}),[baseParams]);
  const compartmentParams=useMemo(()=>({...baseParams,LAYERS:'tieukukhoanh'}),[baseParams]);

  return (
    <>
      {/* SƠN LA LAYER 1: Ranh Giới Xã (75 xã) */}
      {visibleLayers.includes('ranhgioixa') && (
        <WMSTileLayer
          url={WMS_URL}
          params={boundaryParams}
          layers="ranhgioixa"
          version="1.3.0"
          format="image/png"
          transparent={true}
          opacity={0.8}
        />
      )}

      {/* SƠN LA LAYER 2: Tiểu Khu Khoảnh Lô (30k khoảnh) */}
      {visibleLayers.includes('tieukukhoanh') && (
        <WMSTileLayer
          url={WMS_URL}
          params={compartmentParams}
          layers="tieukukhoanh"
          version="1.3.0"
          format="image/png"
          transparent={true}
          opacity={0.7}
        />
      )}

      {/* SƠN LA LAYER 3: Hiện Trạng Rừng (280k khoảnh - PRIMARY) */}
      {visibleLayers.includes('hientrangrung') && (forestTypes===null||forestTypes.length>0) && (
        <WMSTileLayer
          key={forestTypes===null?'forest-all':forestTypes.join(',')}
          url={WMS_URL}
          params={forestParams}
          layers="hientrangrung"
          version="1.3.0"
          format="image/png"
          transparent={true}
          opacity={forestOpacity}
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={2}
        />
      )}
    </>
  );
}

MapServerLayers.propTypes = {
  visibleLayers: PropTypes.arrayOf(PropTypes.string),
  forestOpacity: PropTypes.number,
  forestTypes: PropTypes.arrayOf(PropTypes.string)
};

export default MapServerLayers;
