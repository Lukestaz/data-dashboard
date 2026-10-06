import { cleanLocationText, normalizeCityTown, aucklandSuburbs, chchSuburbs, wellingtonSuburbs, taurangaSuburbs, dunedinSuburbs } from './normalizer.js';
// City reference: https://en.wikipedia.org/wiki/Cities_in_New_Zealand (7 October 2026).
export const CITIES=Object.freeze(['Auckland','Christchurch','Wellington','Hamilton','Tauranga','Lower Hutt','Dunedin','Palmerston North','Hibiscus Coast','Napier','New Plymouth','Porirua','Rotorua','Whangārei','Invercargill','Nelson','Hastings','Upper Hutt','Whanganui','Gisborne']);
export const OTHER='Other towns / areas';
const key=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
const cityByKey=new Map(CITIES.map(city=>[key(city),city]));
const coast=new Set(['orewa','silverdale','whangaparaoa']);
const groups=[['Auckland',aucklandSuburbs],['Christchurch',chchSuburbs],['Wellington',wellingtonSuburbs],['Tauranga',taurangaSuburbs],['Dunedin',dunedinSuburbs]].map(([city,names])=>[city,new Set([...names].map(key))]);
function label(value){const clean=cleanLocationText(value);return clean?cityByKey.get(key(clean))||clean.replace(/(^|[\s-])\p{L}/gu,c=>c.toUpperCase()):'';}
function addressPlaces(address){return String(address||'').split(',').map(label).filter(text=>text&&!/\d|\b(street|road|avenue|drive|highway|lane|shop|unit|suite)\b/i.test(text));}
const region=/^(new zealand|nz|canterbury|otago|southland|northland|waikato|bay of plenty|tasman|marlborough|west coast|taranaki)$/i;
export function classifyLocation(rawLocation,address=''){
 const raw=label(rawLocation),parts=addressPlaces(address),explicit=[...parts].reverse().find(part=>cityByKey.has(key(part)));
 let city=explicit?cityByKey.get(key(explicit)):cityByKey.get(key(raw));let localArea=raw;
 if(!localArea)localArea=[...parts].reverse().find(part=>!cityByKey.has(key(part))&&!region.test(part))||'';
 if((!city||city==='Auckland')&&coast.has(key(localArea)))city='Hibiscus Coast';
 if(!city&&localArea){const candidates=groups.filter(([,names])=>names.has(key(localArea))).map(([parent])=>parent);if(candidates.length===1)city=candidates[0];else if(candidates.length>1){const inferred=normalizeCityTown(localArea,address);if(candidates.includes(inferred))city=inferred;}}
 if(city&&key(localArea)===key(city))localArea=[...parts].reverse().find(part=>key(part)!==key(city)&&!region.test(part))||'';
 return {rawLocation:String(rawLocation||''),canonicalCity:city||OTHER,localArea:localArea||'Unspecified area'};
}
export function normalizeLocations(merchants){for(const merchant of merchants){const raw=merchant.rawLocation??merchant.town??merchant.city??merchant['City / Town']??'';Object.assign(merchant,classifyLocation(raw,merchant.address||merchant.Address||''));}return merchants;}
export function locationMatches(merchant,city='All',area='All'){return(city==='All'||merchant.canonicalCity===city)&&(area==='All'||merchant.localArea===area);}
export function cityOptions(merchants){const counts=new Map();for(const merchant of merchants){if(merchant.inStore===false)continue;const city=merchant.canonicalCity||OTHER;counts.set(city,(counts.get(city)||0)+1);}return[...CITIES,OTHER].filter(city=>counts.has(city)).map(city=>({value:city,count:counts.get(city)}));}
export function areaOptions(merchants,city){const counts=new Map();for(const merchant of merchants){if(merchant.inStore===false||merchant.canonicalCity!==city)continue;const area=merchant.localArea||'Unspecified area';counts.set(area,(counts.get(area)||0)+1);}return[...counts].sort(([a],[b])=>a.localeCompare(b,'en-NZ')).map(([value,count])=>({value,count}));}
const get=id=>document.getElementById(id);
function refreshClearButtons(){
 for(const [field,button] of [['search-input','clear-search-btn'],['town-select','clear-town-btn'],['area-select','clear-area-btn']]){const input=get(field),clear=get(button);if(!input||!clear)continue;clear.classList.remove('hidden');clear.hidden=field==='search-input'?!input.value:input.value==='All'||input.disabled;}
}
function addClear(input,id,title,action){
 let button=get(id);if(!button){button=document.createElement('button');button.id=id;}
 if(button.dataset.filterClearBound!=='true'){button.removeAttribute('onclick');button.replaceChildren();button.type='button';button.textContent='×';button.title=title;button.setAttribute('aria-label',title);button.className='merchant-field-clear'+(input.tagName==='INPUT'?' merchant-search-clear':'');button.dataset.filterClearBound='true';button.addEventListener('click',event=>{event.preventDefault();action();refreshClearButtons();input.focus();});input.parentElement.append(button);}
 input.parentElement.style.position='relative';
}
function fitDesktopFilters(){
 const search=get('search-input'),city=get('town-select'),area=get('area-select'),sort=get('sort-select');if(!search||!city||!area||!sort)return false;
 let row=search.parentElement;while(row&&!(row.contains(city)&&row.contains(sort)))row=row.parentElement;if(!row||row===document.body||row===document.documentElement)return false;
 const directChild=node=>{while(node.parentElement!==row)node=node.parentElement;return node;};const cityWrapper=directChild(city),areaWrapper=area.parentElement;if(areaWrapper===row||areaWrapper.contains(city))return false;if(areaWrapper.parentElement!==row)cityWrapper.after(areaWrapper);
 const wrappers=[directChild(search),cityWrapper,directChild(area),directChild(sort)];if(new Set(wrappers).size!==4)return false;row.classList.add('merchant-filter-row');wrappers.forEach((wrapper,index)=>wrapper.classList.add('merchant-filter-'+index));
 addClear(search,'clear-search-btn','Clear search',()=>window.clearSearch());
 addClear(city,'clear-town-btn','Clear city and local area',()=>window.clearTown());
 addClear(area,'clear-area-btn','Clear suburb / local area',()=>{area.value='All';area.dispatchEvent(new Event('change',{bubbles:true}));});
 if(!get('reset-filters-visible')){const reset=document.createElement('button');reset.id='reset-filters-visible';reset.type='button';reset.className='merchant-filter-reset';reset.textContent='Reset filters';reset.addEventListener('click',()=>{window.resetAllFilters();refreshClearButtons();});row.append(reset);}
 if(!get('merchant-filter-layout')){const style=document.createElement('style');style.id='merchant-filter-layout';style.textContent=`
 .merchant-field-clear{position:absolute;right:28px;top:50%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:6px;background:#334155;color:#f8fafc;font-size:21px;line-height:1;cursor:pointer;z-index:2;}
 .merchant-search-clear{right:8px;}
 .merchant-field-clear[hidden]{display:none!important;}
 .merchant-field-clear:hover{background:#475569;}
 .merchant-field-clear:focus-visible,.merchant-filter-reset:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;}
 .merchant-filter-row #search-input{padding-right:44px;}
 .merchant-filter-row #town-select,.merchant-filter-row #area-select{padding-right:64px;}
 .merchant-filter-reset{display:block;white-space:nowrap;padding:10px 12px;border:1px solid #475569;border-radius:8px;background:#1e293b;color:#f8fafc;font-size:12px;font-weight:600;cursor:pointer;}
 .merchant-filter-reset:hover{background:#334155;}
 @media(min-width:1024px){
 .merchant-filter-row{display:grid!important;grid-template-columns:minmax(150px,1fr) minmax(0,190px) minmax(0,210px) minmax(0,135px) auto;gap:8px!important;align-items:center;}
 .merchant-filter-row>.merchant-filter-0,.merchant-filter-row>.merchant-filter-1,.merchant-filter-row>.merchant-filter-2,.merchant-filter-row>.merchant-filter-3{min-width:0!important;width:100%!important;}
 .merchant-filter-row input,.merchant-filter-row select{min-width:0!important;width:100%!important;max-width:100%;}
 .merchant-filter-row select{padding-left:10px;font-size:12px;text-overflow:ellipsis;}
 }`;document.head.append(style);}
 refreshClearButtons();return true;
}
if(typeof document!=='undefined'){
 const install=()=>{
  const observer=new MutationObserver(()=>{if(fitDesktopFilters())refreshClearButtons();});observer.observe(document.body,{childList:true,subtree:true});fitDesktopFilters();
  document.addEventListener('input',event=>{if(event.target.id==='search-input')refreshClearButtons();});
  document.addEventListener('change',event=>{if(['town-select','area-select'].includes(event.target.id))refreshClearButtons();});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
}
