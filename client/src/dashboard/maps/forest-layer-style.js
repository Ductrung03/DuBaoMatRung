// Existing lookup WMS classes: sonla-windows-optimized.map, layer hientrangrung.
// These are rendering rules, not a new forest-function name/code dictionary.
const classes = [
  [/^HG1$/i, [0,130,0], .90, [0,80,0], .8, .95],
  [/^HG2$/i, [34,170,34], .85, [20,120,20], .7, .90],
  [/^HGD$/i, [0,150,0], .92, [0,100,0], .8, .95],
  [/^RTG$/i, [60,220,60], .85, [40,160,40], .6, .90],
  [/^RTN$/i, [120,160,50], .80, [90,120,40], .6, .85],
  [/^RTK$/i, [140,255,50], .80, [100,200,30], .6, .85],
  [/^TXG$/i, [160,250,160], .75, [80,200,120], .5, .85],
  [/^TXN$/i, [160,200,160], .75, [100,140,60], .5, .80],
  [/^TXK$/i, [170,255,170], .70, [120,180,50], .5, .80],
  [/^LKG$/i, [210,200,130], .75, [160,150,50], .5, .85],
  [/^LKN$/i, [240,180,50], .70, [200,140,20], .5, .80],
  [/^LKK$/i, [250,245,190], .70, [210,200,130], .4, .80],
  [/^LKP$/i, [250,240,160], .70, [210,190,120], .4, .80],
  [/^DT1[D]?$/i, [255,180,110], .70, [230,120,50], .5, .80],
  [/^DT2[D]?$/i, [255,240,220], .65, [230,200,160], .4, .75],
  [/^DTR[D]?$/i, [255,230,190], .70, [240,200,150], .5, .80],
  [/^(DNN|NND)$/i, [255,252,220], .65, [210,200,130], .4, .75],
  [/^DKH$/i, [240,240,240], .60, [180,180,180], .4, .70],
  [/.*/, [220,220,220], .55, [180,180,180], .3, .65],
];
export function forestLayerStyle(feature, opacity = 1) {
  const [, fill, fillOpacity, outline, weight, outlineOpacity] = classes.find(([pattern]) => pattern.test(feature.properties?.ldlr_23 || ''));
  return { fillColor:`rgb(${fill.join(',')})`, fillOpacity:fillOpacity*opacity, color:`rgb(${outline.join(',')})`, weight, opacity:outlineOpacity*opacity };
}
