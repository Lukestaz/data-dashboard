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
function fillFooter(footer) {
  const raw = document.querySelector('meta[name="application-build"]')?.content || '';
  const sha = /^[0-9a-f]{40}$/.test(raw) ? raw : '';
  const build = element('span', '', sha ? 'Build ' + sha.slice(0, 7) : 'Local build');
  if (sha) build.title = 'Source commit: ' + sha;
  const link = element('a', '', 'Changelog ↗');
  link.href = 'https://github.com/Lukestaz/data-dashboard/blob/' + (sha || 'main') + '/CHANGELOG.md';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Changelog (opens in a new tab)');
  footer.replaceChildren(build, link);
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
  const ids = ['search-input','compact-root','availability-filter-row','town-select','area-select','sort-select','near-me-btn',
    'compact-location','compact-location-summary','compact-area-block','compact-source-status','compact-build-footer',
    'compact-clear','compact-active-filters','compact-filter-row','compact-card-count','compact-map-count',
    'compact-source-hint','compact-fit','compact-list-slot','compact-map-info'];
  const nodes = Object.fromEntries(ids.map(id => [id, get(id)]));
  const missing = ids.filter(id => !nodes[id]);
  if (missing.length) {
    console.warn('Compact UI skipped: required controls missing', missing);
    return {refresh() {}};
  }
  const search = nodes['search-input'], section = nodes['compact-root'], availability = nodes['availability-filter-row'];
  const area = nodes['area-select'], sort = nodes['sort-select'], near = nodes['near-me-btn'];
  const location = nodes['compact-location'], locationSummary = nodes['compact-location-summary'], areaBlock = nodes['compact-area-block'];
  const sourceStatus = nodes['compact-source-status'], clear = nodes['compact-clear'], active = nodes['compact-active-filters'];
  const filterRow = nodes['compact-filter-row'], cardCount = nodes['compact-card-count'], mapCount = nodes['compact-map-count'];
  const sourceHint = nodes['compact-source-hint'], fit = nodes['compact-fit'], listSlot = nodes['compact-list-slot'];
  const mapInfo = nodes['compact-map-info'];
  fillFooter(nodes['compact-build-footer']);
  sourceStatus.textContent = sourceCaptureLabel(state);
  clear.addEventListener('click', () => {window.resetAllFilters();refresh();});
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
    cardCount.hidden = inMap; mapCount.hidden = !inMap; fit.hidden = !inMap; listSlot.hidden = !inMap; mapInfo.hidden = !inMap;
    if (!inMap) mapInfo.open = false;
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
