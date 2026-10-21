export function hasVisiblePixels(rgba){for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0)return true;return false;}
