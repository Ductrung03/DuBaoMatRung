// Display groups selected by the user from template 1, not new data classifications.
export const FOREST_FILTER_GROUPS=[
  {value:'rich',label:'Rừng giàu',codes:['HG1','HG2','HGD']},
  {value:'planted',label:'Rừng trồng',codes:['RTG','RTN','RTK','TXG','TXN','TXK']},
  {value:'bare',label:'Đất trống',codes:['DT1','DT1D','DT2','DT2D','DTR','DTRD','DNN','NND']},
  {value:'rice',label:'Lúa',codes:['LKG','LKN','LKK']},
];
export function matchesForestGroup(row,group){
  const definition=FOREST_FILTER_GROUPS.find(item=>item.value===group);
  if(!definition)return false;
  return (row.forestTypeCodes||[]).some(code=>definition.codes.includes(String(code).toUpperCase()));
}
