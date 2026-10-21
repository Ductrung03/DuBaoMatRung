import { useEffect, useMemo, useState } from 'react';
import { getSonLaXa, getSonLaTieuKhu, getSonLaKhoanh } from '../../utils/dropdownService';
import { useAuth } from '../contexts/AuthContext';
import { useGeoData } from '../contexts/GeoDataContext';
import { STATUS, optionsFor, forestFunctionOptions, isManager, monthRange } from '../monitoring/monitoring-data';
import { FOREST_FILTER_GROUPS } from './forest-filter-groups';

function Select({label,value,onChange,options,disabled=false,empty='Tất cả'}) {
  return <label className="monitor-input"><span>{label}</span><select aria-label={label} value={value||''} onChange={event=>onChange(event.target.value)} disabled={disabled}><option value="">{empty}</option>{options.map(option=>{
    const item=typeof option==='string'?{value:option,label:option}:option;
    return <option key={item.value} value={item.value} disabled={item.disabled}>{item.label}</option>;
  })}</select></label>;
}

export default function AlertFilters({rows,filters,setFilters,section='data'}) {
  const {user}=useAuth();
  const {sourceAccess}=useGeoData();
  const actor=sourceAccess||user;
  const restricted=sourceAccess?!sourceAccess.province:!isManager(user);
  const commune=filters.commune||(restricted?actor?.xa:'')||'';
  const compartment=filters.compartment||(restricted?actor?.tieukhu:'')||'';
  const [units,setUnits]=useState({communes:[],compartments:[],subcompartments:[],commune:'',compartment:''});
  const [catalogError,setCatalogError]=useState('');
  useEffect(()=>{
    if(section!=='boundary'&&section!=='quick')return;
    let active=true;
    getSonLaXa().then(data=>{if(active)setUnits(old=>({...old,communes:Array.isArray(data)?data:[]}));}).catch(()=>{if(active)setCatalogError('Danh mục địa bàn chưa tải được; đang dùng địa bàn có trong dữ liệu.');});
    return()=>{active=false;};
  },[section]);
  useEffect(()=>{
    if(section!=='boundary'&&section!=='quick')return;
    let active=true;
    setCatalogError('');
    setUnits(old=>({...old,compartments:[],subcompartments:[],commune,compartment}));
    if(commune)Promise.all([getSonLaTieuKhu(commune),compartment?getSonLaKhoanh(commune,compartment):Promise.resolve([])]).then(([tk,kh])=>{if(active)setUnits(old=>({...old,commune,compartment,compartments:Array.isArray(tk)?tk:[],subcompartments:Array.isArray(kh)?kh:[]}));}).catch(()=>{if(active)setCatalogError('Không tải được danh mục địa bàn.');});
    return()=>{active=false;};
  },[section,commune,compartment]);
  const communeRows=useMemo(()=>rows.filter(row=>!commune||row.commune===commune),[rows,commune]);
  const scopedRows=useMemo(()=>communeRows.filter(row=>!compartment||row.compartment===compartment),[communeRows,compartment]);
  const change=(field,next)=>setFilters(current=>({...current,[field]:next,...(field==='commune'?{village:'',compartment:'',subcompartment:''}:field==='compartment'?{subcompartment:''}:{})}));
  if(section==='quick'){
    return <>
      <Select label="Trạng thái" value={filters.status} onChange={next=>change('status',next)} options={['pending','processing','verified'].map(value=>({value,label:STATUS[value].label}))}/>
      <Select label="Xã" value={filters.commune} onChange={next=>change('commune',next)} options={restricted&&actor?.xa?[actor.xa]:units.communes.length?units.communes:optionsFor(rows,'commune')} disabled={restricted&&Boolean(actor?.xa)} empty={restricted&&actor?.xa?actor.xa:'Tất cả xã trong phạm vi quyền'}/>
      <Select label="Tiểu khu" value={filters.compartment} onChange={next=>change('compartment',next)} options={commune&&units.commune===commune&&units.compartments.length?units.compartments:optionsFor(communeRows,'compartment')} disabled={restricted&&Boolean(actor?.tieukhu)} empty={restricted&&actor?.tieukhu?actor.tieukhu:'Tất cả'}/>
      <Select label="Loại rừng" value={filters.forestKind} onChange={next=>change('forestKind',next)} options={FOREST_FILTER_GROUPS}/>
      <details><summary>Thời gian và địa bàn</summary><Select label="Khoảnh" value={filters.subcompartment} onChange={next=>change('subcompartment',next)} options={optionsFor(scopedRows,'subcompartment')} disabled={!compartment||(restricted&&Boolean(actor?.khoanh))}/><label className="monitor-input"><span>Từ ngày</span><input aria-label="Từ ngày" type="date" value={filters.from} max={filters.to||undefined} onChange={event=>change('from',event.target.value)}/></label><label className="monitor-input"><span>Đến ngày</span><input aria-label="Đến ngày" type="date" value={filters.to} min={filters.from||undefined} onChange={event=>change('to',event.target.value)}/></label></details>
    </>;
  }
  if(section==='boundary')return <>
    <Select label="Xã" value={filters.commune} onChange={next=>change('commune',next)} options={restricted&&actor?.xa?[actor.xa]:units.communes.length?units.communes:optionsFor(rows,'commune')} disabled={restricted&&Boolean(actor?.xa)} empty={restricted&&actor?.xa?actor.xa:'Tất cả xã trong phạm vi quyền'}/>
    <Select label="Tiểu khu" value={filters.compartment} onChange={next=>change('compartment',next)} options={!commune?[]:units.commune===commune&&units.compartments.length?units.compartments:optionsFor(communeRows,'compartment')} disabled={!commune||(restricted&&Boolean(actor?.tieukhu))} empty={restricted&&actor?.tieukhu?actor.tieukhu:'Tất cả tiểu khu'}/>
    <Select label="Khoảnh" value={filters.subcompartment} onChange={next=>change('subcompartment',next)} options={!commune||!compartment?[]:units.commune===commune&&units.compartment===compartment&&units.subcompartments.length?units.subcompartments:optionsFor(scopedRows,'subcompartment')} disabled={!commune||!compartment||(restricted&&Boolean(actor?.khoanh))} empty={restricted&&actor?.khoanh?actor.khoanh:'Tất cả khoảnh'}/>
    {catalogError&&<p className="monitor-caption">{catalogError}</p>}
  </>;
  const range=monthRange(filters.from?.slice(0,7)||'');
  const month=range?.from===filters.from&&range?.to===filters.to?filters.from.slice(0,7):'';
  return <>
    <label className="monitor-input"><span>Chọn nhanh tháng</span><input aria-label="Chọn nhanh tháng" type="month" value={month} onChange={event=>{const next=monthRange(event.target.value);setFilters(current=>({...current,from:next?.from||'',to:next?.to||''}));}}/></label>
    <label className="monitor-input"><span>Từ ngày (kết thúc kỳ ảnh sau)</span><input aria-label="Từ ngày (kết thúc kỳ ảnh sau)" type="date" value={filters.from} max={filters.to||undefined} onChange={event=>change('from',event.target.value)}/></label>
    <label className="monitor-input"><span>Đến ngày</span><input aria-label="Đến ngày" type="date" value={filters.to} min={filters.from||undefined} onChange={event=>change('to',event.target.value)}/></label>
    <Select label="Trạng thái xác minh" value={filters.status} onChange={next=>change('status',next)} options={Object.entries(STATUS).map(([value,status])=>({value,label:status.label}))}/>
    <Select label="Nguyên nhân mất rừng" value={filters.reason} onChange={next=>change('reason',next)} options={optionsFor(rows,'reason')}/>
    <Select label="Chức năng rừng" value={filters.purpose} onChange={next=>change('purpose',next)} options={forestFunctionOptions(rows)} empty={forestFunctionOptions(rows).length?'Tất cả':'Chưa có kết quả giao lớp hiện trạng'}/>
    <details><summary>Bộ lọc bổ sung</summary><Select label="Đơn vị quản lý" value={filters.unit} onChange={next=>change('unit',next)} options={optionsFor(rows,'unit')}/><Select label="Thôn/Bản" value={filters.village} onChange={next=>change('village',next)} options={optionsFor(rows,'village')}/><Select label="Nguồn gốc rừng" value={filters.origin} onChange={next=>change('origin',next)} options={optionsFor(rows,'origin')}/></details>
  </>;
}
