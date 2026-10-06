import { cleanLocationText, normalizeCityTown, aucklandSuburbs, chchSuburbs, wellingtonSuburbs, taurangaSuburbs, dunedinSuburbs } from './normalizer.js';

// Snapshot of Wikipedia's Major and large urban areas table, 7 October 2026.
// https://en.wikipedia.org/wiki/Cities_in_New_Zealand
export const CITIES = Object.freeze(['Auckland','Christchurch','Wellington','Hamilton','Tauranga','Lower Hutt','Dunedin','Palmerston North','Hibiscus Coast','Napier','New Plymouth','Porirua','Rotorua','Whangārei','Invercargill','Nelson','Hastings','Upper Hutt','Whanganui','Gisborne']);
export const OTHER = 'Other towns / areas';
const key = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const cityByKey = new Map(CITIES.map(city => [key(city), city]));
const coast = new Set(['orewa','silverdale','whangaparaoa']);
const groups = [['Auckland',aucklandSuburbs],['Christchurch',chchSuburbs],['Wellington',wellingtonSuburbs],['Tauranga',taurangaSuburbs],['Dunedin',dunedinSuburbs]].map(([city, names]) => [city,new Set([...names].map(key))]);
function label(value) {
  const clean = cleanLocationText(value);
  return clean ? cityByKey.get(key(clean)) || clean.replace(/(^|[\s-])\p{L}/gu, c => c.toUpperCase()) : '';
}
function addressPlaces(address) {
  return String(address || '').split(',').map(label).filter(text => text && !/\d|\b(street|road|avenue|drive|highway|lane|shop|unit|suite)\b/i.test(text));
}
export function classifyLocation(rawLocation, address = '') {
  const raw = label(rawLocation);
  const parts = addressPlaces(address);
  const explicit = [...parts].reverse().find(part => cityByKey.has(key(part)));
  let city = explicit ? cityByKey.get(key(explicit)) : cityByKey.get(key(raw));
  let localArea = raw;
  if (!localArea) localArea = [...parts].reverse().find(part => !cityByKey.has(key(part)) && !/^(new zealand|nz|canterbury|otago|southland|northland|waikato|bay of plenty|tasman|marlborough|west coast|taranaki)$/i.test(part)) || '';
  // Hibiscus Coast is a separate urban area in the chosen reference table.
  if ((!city || city === 'Auckland') && coast.has(key(localArea))) city = 'Hibiscus Coast';
  if (!city && localArea) {
    const candidates = groups.filter(([,names]) => names.has(key(localArea))).map(([parent]) => parent);
    if (candidates.length === 1) city = candidates[0];
    else if (candidates.length > 1) {
      const inferred = normalizeCityTown(localArea, address);
      if (candidates.includes(inferred)) city = inferred;
    }
  }
  if (city && key(localArea) === key(city)) {
    localArea = [...parts].reverse().find(part => key(part) !== key(city) && !/^(new zealand|nz|canterbury|otago|southland|northland|waikato|bay of plenty|tasman|marlborough|west coast|taranaki)$/i.test(part)) || '';
  }
  return { rawLocation: String(rawLocation || ''), canonicalCity: city || OTHER, localArea: localArea || 'Unspecified area' };
}
export function normalizeLocations(merchants) {
  for (const merchant of merchants) {
    const raw = merchant.rawLocation ?? merchant.town ?? merchant.city ?? merchant['City / Town'] ?? '';
    Object.assign(merchant, classifyLocation(raw, merchant.address || merchant.Address || ''));
  }
  return merchants;
}
export function locationMatches(merchant, city = 'All', area = 'All') {
  return (city === 'All' || merchant.canonicalCity === city) && (area === 'All' || merchant.localArea === area);
}
export function cityOptions(merchants) {
  const counts = new Map();
  for (const merchant of merchants) {
    if (merchant.inStore === false) continue;
    const city = merchant.canonicalCity || OTHER;
    counts.set(city, (counts.get(city) || 0) + 1);
  }
  return [...CITIES,OTHER].filter(city => counts.has(city)).map(city => ({value:city,count:counts.get(city)}));
}
export function areaOptions(merchants, city) {
  const counts = new Map();
  for (const merchant of merchants) {
    if (merchant.inStore === false || merchant.canonicalCity !== city) continue;
    const area = merchant.localArea || 'Unspecified area';
    counts.set(area, (counts.get(area) || 0) + 1);
  }
  return [...counts].sort(([a],[b]) => a.localeCompare(b,'en-NZ')).map(([value,count]) => ({value,count}));
}

function fitDesktopFilters() {
  const search = document.getElementById('search-input');
  const city = document.getElementById('town-select');
  const area = document.getElementById('area-select');
  const sort = document.getElementById('sort-select');
  if (!search || !city || !area || !sort) return false;
  let row = search.parentElement;
  while (row && !(row.contains(city) && row.contains(sort))) row = row.parentElement;
  if (!row || row === document.body || row === document.documentElement) return false;
  const directChild = node => { while (node.parentElement !== row) node = node.parentElement; return node; };
  const cityWrapper = directChild(city);
  let areaWrapper = area.parentElement;
  if (areaWrapper === row || areaWrapper.contains(city)) return false;
  if (areaWrapper.parentElement !== row) cityWrapper.after(areaWrapper);
  row.classList.add('merchant-filter-row');
  const wrappers = [directChild(search), cityWrapper, directChild(area), directChild(sort)];
  if (new Set(wrappers).size !== 4) return false;
  wrappers.forEach((wrapper, index) => wrapper.classList.add('merchant-filter-' + index));
  if (!document.getElementById('merchant-filter-layout')) {
    const style = document.createElement('style');
    style.id = 'merchant-filter-layout';
    style.textContent = `@media (min-width:1024px) {
      .merchant-filter-row { display:grid !important; grid-template-columns:minmax(180px,1fr) minmax(0,200px) minmax(0,220px) minmax(0,150px); gap:10px !important; align-items:center; }
      .merchant-filter-row > .merchant-filter-0, .merchant-filter-row > .merchant-filter-1, .merchant-filter-row > .merchant-filter-2, .merchant-filter-row > .merchant-filter-3 { min-width:0 !important; width:100% !important; }
      .merchant-filter-row input, .merchant-filter-row select { min-width:0 !important; width:100% !important; max-width:100%; }
      .merchant-filter-row select { padding-left:10px; font-size:12px; text-overflow:ellipsis; }
    }`;
    document.head.append(style);
  }
  return true;
}
if (typeof document !== 'undefined') {
  const install = () => {
    if (fitDesktopFilters()) return;
    const observer = new MutationObserver(() => { if (fitDesktopFilters()) observer.disconnect(); });
    observer.observe(document.body, {childList:true, subtree:true});
    setTimeout(() => observer.disconnect(), 15000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
}
