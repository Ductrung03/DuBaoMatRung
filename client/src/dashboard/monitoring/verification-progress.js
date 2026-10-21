export function verificationPercent(verified,total){return total>0?Math.min(100,Math.max(0,verified/total*100)):0;}
