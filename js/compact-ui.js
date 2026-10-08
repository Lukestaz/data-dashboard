import { initMap } from './map.js';

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
function sourceCaptureLabel(state) {
  if (!state.loadedDataSource) return 'Loading source information…';
  if (state.loadedDataSource === 'legacy') {
    return state.activeDataset === 'amex' ? 'Legacy snapshot loaded (Amex unavailable). Snapshot date unavailable.' : 'Snapshot date unavailable.';
  }
  const captured = typeof state.dataCapturedAt === 'string' ? Date.parse(state.dataCapturedAt) : NaN;
  if (!Number.isFinite(captured)) return 'Source capture date unavailable.';
  const formatted = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
  }).format(new Date(captured));
  return 'Source captured: ' + formatted;
}
function buildFooter() {
  const raw = document.querySelector('meta[name="application-build"]')?.content || '';
  const sha = /^[0-9a-f]{40}$/.test(raw) ? raw : '';
  const footer = element('div', 'compact-build-footer');
  const build = element('span', '', sha ? 'Build ' + sha.slice(0, 7) : 'Local build');
  if (sha) build.title = 'Source commit: ' + sha;
  const link = element('a', '', 'Changelog ↗');
  link.href = 'https://github.com/Lukestaz/data-dashboard/blob/' + (sha || 'main') + '/CHANGELOG.md';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Changelog (opens in a new tab)');
  footer.append(build, link);
  return footer;
}
export function clearFilterCount(state, query = '') {
  return Number(state.activeAvailability !== 'all') + Number(state.activeTown !== 'All') + Number(state.activeArea !== 'All') + Number(state.activeCategory !== 'All') + Number(state.activeSubtype !== 'All') + Number(state.showSavedOnly) + Number(Boolean(query.trim())) + Number(state.currentSort !== 'default');
}
function nzPosition(item) {
  const lat = Number(item.lat), rawLng = Number(item.lng);
  const lng = rawLng < -175 ? rawLng + 360 : rawLng;
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -48 && lat <= -33 && lng >= 165 && lng <= 185 ? [lat, lng] : null;
}
export function mountCompactUI(state, changed) {
  const get = id => document.getElementById(id);
  const header = document.querySelector('header'), search = get('search-input');
  const section = search?.closest('section'), categories = get('category-pills');
  const availability = get('availability-filter-row'), subtypes = get('subtype-filter-row');
  const town = get('town-select'), area = get('area-select'), sort = get('sort-select');
  const near = get('near-me-btn'), saved = get('saved-filter-btn'), sync = get('sync-btn');
  const dataset = get('dataset-select'), count = get('total-count'), view = get('view-cards-btn')?.parentElement;
  if (!header || !section || !categories || !availability || !subtypes || !town || !area || !sort || !near || !saved || !sync || !dataset || !count || !view) {
    console.warn('Compact UI skipped: required controls missing');
    return {refresh() {}};
  }
  for (const control of document.querySelectorAll('button')) {
    if (control.textContent.trim().toLowerCase() === 'reset filters') control.remove();
  }
  const style = element('style');
  style.textContent = `
#compact-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
#compact-toolbar h1{font-size:18px;line-height:1.25;font-weight:800;white-space:nowrap}
#compact-toolbar button{min-height:40px}
#compact-root{margin-top:12px;display:grid;gap:8px;min-width:0}
#compact-root [hidden]{display:none!important}
#compact-root input,#compact-root select{min-width:0;width:100%;font-size:16px;min-height:42px}
#compact-root button{min-height:40px}
#compact-root #category-pills,#compact-root #subtype-filter-row{min-width:0;width:100%;margin:0;scrollbar-width:thin}
#compact-root #availability-filter-row{margin:0;min-width:0}
#compact-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
#compact-actions>button,#compact-actions summary{font-size:12px;padding:8px 10px;min-height:40px}
#compact-location summary,#compact-more summary{cursor:pointer;list-style:none}
#compact-location summary::-webkit-details-marker,#compact-more summary::-webkit-details-marker{display:none}
#compact-result-row{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#94a3b8;font-size:12px;flex-wrap:wrap;border-top:1px solid #1e293b;padding-top:6px}
#compact-result-row select{width:auto;max-width:130px;font-size:12px;min-height:40px;padding:6px 8px}
#compact-result-tools{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
#compact-result-tools button{font-size:12px;min-height:40px;padding:6px 8px}
.compact-popup{position:absolute;z-index:1050;top:calc(100% + 6px);background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px;box-shadow:0 12px 30px #0008}
#compact-location .compact-popup{left:0;width:min(340px,calc(100vw - 32px))}
#compact-more .compact-popup{right:0;width:min(270px,calc(100vw - 32px))}
.compact-build-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid #334155;padding-top:4px;font-size:11px;color:#94a3b8}
.compact-build-footer a{display:inline-flex;align-items:center;min-height:44px;color:#93c5fd;text-decoration:underline}
.compact-build-footer a:focus-visible{outline:2px solid #60a5fa;outline-offset:2px;border-radius:4px}
.compact-location-grid{display:grid;grid-template-columns:1fr;gap:8px}
.compact-control{background:#0f172a;border:1px solid #334155;border-radius:8px;color:#cbd5e1;padding:8px 10px}
#compact-filter-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
#compact-active-filters{display:flex;flex-wrap:wrap;gap:6px;min-width:0}
#compact-active-filters button{min-height:32px;font-size:11px;padding:4px 9px;border-radius:16px;border:1px solid #334155;background:#0f172a;color:#cbd5e1}
#compact-clear{flex-shrink:0;font-size:12px;padding:6px 8px;color:#cbd5e1}
#merchant-split>.map-list-toolbar{display:none!important}
#compact-root .compact-map-note{font-size:11px;color:#94a3b8;margin:0}
@media(min-width:640px){#compact-toolbar h1{font-size:22px}.compact-location-grid{grid-template-columns:1fr 1fr}#compact-root input{font-size:14px}}
`;
  document.head.append(style);
  const toolbar = element('div'); toolbar.id = 'compact-toolbar';
  const title = element('div', 'flex items-center gap-2 min-w-0');
  const badge = element('span', 'shrink-0 rounded bg-blue-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white', 'AMEX');
  title.append(badge, element('h1', 'text-white', 'Shop Small NZ'));
  const headerActions = element('div', 'flex items-center gap-2');
  const more = element('details', 'relative'); more.id = 'compact-more';
  const moreSummary = element('summary', 'compact-control text-sm', '⋯');
  moreSummary.setAttribute('aria-label', 'More options, saved-list sync, data sources and changelog');
  const morePanel = element('div', 'compact-popup space-y-3');
  sync.textContent = 'Sync saved merchants';
  sync.className = 'compact-control w-full text-xs font-semibold';
  dataset.className = 'compact-control w-full text-sm';
  const sourceLabel = element('label', 'block text-xs text-slate-400', 'Data source'); sourceLabel.htmlFor = dataset.id;
  const sourceStatus = element('p', 'text-xs text-slate-400', sourceCaptureLabel(state));
  sourceStatus.id = 'compact-source-status';
  sourceStatus.setAttribute('role', 'status');
  sourceStatus.setAttribute('aria-live', 'polite');
  sourceStatus.setAttribute('aria-atomic', 'true');
  sourceStatus.title = 'Capture time records when the directory was downloaded and validated, not when individual merchant details were verified.';
  const sourceNote = element('p', 'text-xs text-slate-400', 'Amex is the current directory. The legacy snapshot remains available with its separate saved list.');
  morePanel.append(sync, sourceLabel, dataset, sourceStatus, sourceNote, buildFooter()); more.append(moreSummary, morePanel);
  headerActions.append(view, more); toolbar.append(title, headerActions);
  const searchBox = search.parentElement; searchBox.className = 'relative min-w-0';
  search.placeholder = 'Search merchants, places or categories…';
  const actions = element('div'); actions.id = 'compact-actions';
  const location = element('details', 'relative'); location.id = 'compact-location';
  const locationSummary = element('summary', 'compact-control font-semibold', 'Location ▾');
  const locationPanel = element('div', 'compact-popup'), locationGrid = element('div', 'compact-location-grid');
  const cityLabel = element('label', 'block text-xs text-slate-400', 'City / town'); cityLabel.htmlFor = town.id;
  const cityBlock = element('div', 'space-y-1'); cityBlock.append(cityLabel, town);
  const areaLabel = element('label', 'block text-xs text-slate-400', 'Suburb / local area'); areaLabel.htmlFor = area.id;
  const areaBlock = element('div', 'space-y-1'); areaBlock.append(areaLabel, area);
  town.className = area.className = 'compact-control';
  locationGrid.append(cityBlock, areaBlock); locationPanel.append(locationGrid); location.append(locationSummary, locationPanel);
  actions.append(near, location, saved);
  const clear = element('button', '', 'Clear'); clear.id = 'compact-clear'; clear.type = 'button';
  clear.addEventListener('click', () => {window.resetAllFilters();refresh();});
  const active = element('div'); active.id = 'compact-active-filters';
  const filterRow = element('div'); filterRow.id = 'compact-filter-row'; filterRow.append(active, clear);
  const results = element('div'); results.id = 'compact-result-row';
  const resultText = element('span');
  const cardCount = element('span'); cardCount.append(count, document.createTextNode(' matches'));
  const mapCount = element('span');
  const sourceHint = element('span', 'text-slate-500'); resultText.append(cardCount, mapCount, sourceHint);
  const tools = element('div'); tools.id = 'compact-result-tools';
  sort.className = 'compact-control'; sort.setAttribute('aria-label', 'Sort merchants');
  const fit = element('button', 'compact-control', 'Fit results'); fit.type = 'button';
  fit.setAttribute('aria-label', 'Fit map to matching New Zealand merchant pins');
  const listSlot = element('span'); tools.append(sort, fit, listSlot); results.append(resultText, tools);
  const mapNote = element('p', 'compact-map-note', 'Hollow pin centre = approximate location');
  section.id = 'compact-root'; section.className = '';
  section.replaceChildren(searchBox, availability, actions, categories, subtypes, filterRow, results, mapNote);
  header.className = 'pb-3 border-b border-slate-800'; header.replaceChildren(toolbar);
  let framed = false, observedStatus = null;
  function matchingPositions(map) {
    let group = null;
    map.eachLayer(layer => {if (typeof layer.zoomToShowLayer === 'function' && typeof layer.getLayers === 'function') group = layer;});
    return group ? group.getLayers().map(marker => {const point = marker.getLatLng();return nzPosition({lat:point.lat,lng:point.lng});}).filter(Boolean) : [];
  }
  fit.addEventListener('click', () => {
    const map = initMap(), points = matchingPositions(map);
    if (points.length) map.fitBounds(L.latLngBounds(points), {padding:[24,24],maxZoom:14});
  });
  function syncMapControls() {
    const inMap = state.viewMode === 'map';
    cardCount.hidden = inMap; mapCount.hidden = !inMap; fit.hidden = !inMap; listSlot.hidden = !inMap; mapNote.hidden = !inMap;
    const status = get('map-list-status');
    if (status) {
      const match = status.textContent.match(/^([\d,]+) merchants in map area · ([\d,]+) match filters$/);
      mapCount.textContent = match ? match[1] + ' in view · ' + match[2] + ' matches' : status.textContent;
      if (observedStatus !== status) {
        observedStatus = status;
        new MutationObserver(syncMapControls).observe(status, {childList:true,characterData:true,subtree:true});
      }
      const toggle = status.parentElement?.querySelector('button');
      if (toggle && !listSlot.contains(toggle)) {
        toggle.className = 'compact-control';listSlot.append(toggle);
        const label = () => {const expanded = toggle.getAttribute('aria-expanded') === 'true';toggle.textContent = expanded ? 'List ▾' : 'List ▸';toggle.setAttribute('aria-label', expanded ? 'Hide merchant list' : 'Show merchant list');};
        toggle.addEventListener('click', label); label();
      }
    } else if (inMap) mapCount.textContent = 'Loading map…';
    if (inMap && !framed && get('merchant-split') && state.merchants.length) {
      framed = true;
      requestAnimationFrame(() => {
        const map = initMap();map.invalidateSize();
        if (map.getZoom() < 4 && !state.userLat) {
          const points = matchingPositions(map);
          if (points.length) map.fitBounds(L.latLngBounds(points), {padding:[24,24],maxZoom:14});
          else map.setView([-41,173],5);
        }
      });
    }
  }
  function chip(text, callback) {
    const control = element('button', '', text + ' ×'); control.type = 'button';
    control.setAttribute('aria-label', 'Clear ' + text); control.addEventListener('click', callback); active.append(control);
  }
  function refresh() {
    const captureLabel = sourceCaptureLabel(state);
    if (sourceStatus.textContent !== captureLabel) sourceStatus.textContent = captureLabel;
    const online = state.activeAvailability === 'online';
    location.hidden = online; near.disabled = online; near.classList.toggle('opacity-50', online);
    if (online) location.open = false;
    areaBlock.hidden = state.activeTown === 'All';
    locationSummary.textContent = (state.activeTown === 'All' ? 'Location' : state.activeTown) + ' ▾';
    sourceHint.textContent = state.availabilitySupported ? '' : ' · legacy';
    for (const option of sort.options) if (option.value === 'distance') option.disabled = online;
    for (const control of availability.querySelectorAll('button')) if (control.textContent === 'Available online') control.textContent = 'Online';
    const query = search.value.trim(), total = clearFilterCount(state, query);
    clear.hidden = total === 0; clear.textContent = 'Clear';clear.setAttribute('aria-label', 'Clear all ' + total + ' active filters and sort');
    active.replaceChildren();
    if (state.activeTown !== 'All') chip(state.activeTown, () => window.clearTown());
    if (state.activeArea !== 'All') chip(state.activeArea, () => {state.activeArea = 'All';area.value = 'All';changed();});
    if (state.showSavedOnly) chip('Saved only', () => window.toggleSavedFilter());
    if (query) chip('Search: ' + query.slice(0,30), () => window.clearSearch());
    active.hidden = !active.children.length; filterRow.hidden = total === 0; syncMapControls();
  }
  section.addEventListener('input', () => queueMicrotask(refresh));
  section.addEventListener('change', () => queueMicrotask(refresh));
  section.addEventListener('click', () => queueMicrotask(refresh));
  const wrapper = get('map-wrapper');
  if (wrapper) new MutationObserver(refresh).observe(wrapper, {attributes:true,attributeFilter:['class']});
  if (wrapper?.parentElement) new MutationObserver(syncMapControls).observe(wrapper.parentElement, {childList:true});
  return {refresh};
}
