// Group only aliases sharing the existing mapfile color; never reclassify data.
export const FOREST_COLOR_CODES={HG1:['HG1'],HG2:['HG2'],HGD:['HGD'],RTG:['RTG'],RTN:['RTN'],RTK:['RTK'],TXG:['TXG'],TXN:['TXN'],TXK:['TXK'],DT1:['DT1','DT1D'],DT2:['DT2','DT2D'],DTR:['DTR','DTRD'],DNN:['DNN','NND'],LKG:['LKG'],LKN:['LKN'],LKK:['LKK'],DKH:['DKH']};
export function forestColorHidden(layers,code){const hidden=new Set((layers.hiddenForestTypes||[]).map(value=>value.toUpperCase()));return (FOREST_COLOR_CODES[code]||[]).every(value=>hidden.has(value));}
export function toggleForestColor(layers,code){
  const aliases=FOREST_COLOR_CODES[code];if(!aliases)return layers;
  const matching=[...new Set([...aliases,...(layers.forestTypeCatalog||[]).filter(value=>aliases.includes(value.toUpperCase()))])];
  const hidden=layers.hiddenForestTypes||[];
  return {...layers,hiddenForestTypes:forestColorHidden(layers,code)?hidden.filter(value=>!aliases.includes(value.toUpperCase())):[...new Set([...hidden,...matching])]};
}
export function visibleForestTypes(layers){
  if(!layers.hiddenForestTypes?.length)return null;
  const hidden=new Set(layers.hiddenForestTypes.map(value=>value.toUpperCase()));
  return (layers.forestTypeCatalog||[]).filter(value=>!hidden.has(value.toUpperCase()));
}
export function alertColorKind(row){return row.rawStatus==='Đã xử lý'?'processed':'verified';}
