function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}
export function mountCompactUI(state, changed) {
  const get = id => document.getElementById(id);
  const header = document.querySelector('header');
  const search = get('search-input');
  const section = search?.closest('section');
  const categories = get('category-pills');
  const availability = get('availability-filter-row');
  const subtypes = get('subtype-filter-row');
  const town = get('town-select'), area = get('area-select'), sort = get('sort-select');
  const near = get('near-me-btn'), saved = get('saved-filter-btn'), sync = get('sync-btn');
  const dataset = get('dataset-select'), count = get('total-count');
  const view = get('view-cards-btn')?.parentElement;
  if (!header || !section || !categories || !availability || !subtypes || !town || !area || !sort || !near || !saved || !sync || !dataset || !count || !view) {
    console.warn('Compact UI skipped: required controls missing');
    return {refresh() {}};
  }
  const style = element('style');
  style.textContent = `
#compact-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0}
#compact-toolbar h1{font-size:18px;line-height:1.25;font-weight:800;white-space:nowrap}
#compact-toolbar button{min-height:40px}
#compact-root{margin-top:12px;display:grid;gap:10px;min-width:0}
#compact-root [hidden]{display:none!important}
#compact-root input,#compact-root select{min-width:0;width:100%;font-size:16px;min-height:42px}
#compact-root button{min-height:40px}
#compact-root #category-pills,#compact-root #subtype-filter-row{min-width:0;width:100%;margin:0;scrollbar-width:thin}
#compact-root #availability-filter-row{margin:0;min-width:0}
#compact-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
#compact-actions>button,#compact-actions summary{font-size:12px;padding:8px 10px;min-height:40px}
#compact-location summary,#compact-more summary{cursor:pointer;list-style:none}
#compact-location summary::-webkit-details-marker,#compact-more summary::-webkit-details-marker{display:none}
#compact-result-row{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#94a3b8;font-size:12px}
#compact-result-row select{width:auto;max-width:145px;font-size:13px;min-height:40px;padding:6px 10px}
.compact-popup{position:absolute;z-index:50;top:calc(100% + 6px);background:#0f172a;border:1px solid #334155;border-radius:12px;padding:12px;box-shadow:0 12px 30px #0008}
#compact-location .compact-popup{left:0;width:min(340px,calc(100vw - 32px))}
#compact-more .compact-popup{right:0;width:min(270px,calc(100vw - 32px))}
.compact-location-grid{display:grid;grid-template-columns:1fr;gap:8px}
.compact-control{background:#0f172a;border:1px solid #334155;border-radius:8px;color:#cbd5e1;padding:8px 10px}
#compact-active-filters{display:flex;flex-wrap:wrap;gap:6px}
#compact-active-filters button{min-height:32px;font-size:11px;padding:4px 9px;border-radius:16px;border:1px solid #334155;background:#0f172a;color:#cbd5e1}
@media(min-width:640px){#compact-toolbar h1{font-size:22px}.compact-location-grid{grid-template-columns:1fr 1fr}#compact-root input{font-size:14px}}
`;
  document.head.append(style);
  const toolbar = element('div'); toolbar.id = 'compact-toolbar';
  const title = element('h1', 'text-white', 'Shop Small NZ');
  const headerActions = element('div', 'flex items-center gap-2');
  const more = element('details', 'relative'); more.id = 'compact-more';
  const moreSummary = element('summary', 'compact-control text-sm', '⋯');
  moreSummary.setAttribute('aria-label', 'Saved-list sync and data sources');
  const morePanel = element('div', 'compact-popup space-y-3');
  sync.textContent = 'Sync saved merchants';
  sync.className = 'compact-control w-full text-xs font-semibold';
  dataset.className = 'compact-control w-full text-sm';
  const sourceLabel = element('label', 'block text-xs text-slate-400', 'Data source');
  sourceLabel.htmlFor = dataset.id;
  const sourceNote = element('p', 'text-xs text-slate-400', 'Amex is the current directory. The legacy snapshot remains available with its separate saved list.');
  morePanel.append(sync, sourceLabel, dataset, sourceNote);
  more.append(moreSummary, morePanel);
  headerActions.append(view, more);
  toolbar.append(title, headerActions);
  const searchBox = search.parentElement;
  searchBox.className = 'relative min-w-0';
  search.placeholder = 'Search merchants, places or categories…';
  const actions = element('div'); actions.id = 'compact-actions';
  const location = element('details', 'relative'); location.id = 'compact-location';
  const locationSummary = element('summary', 'compact-control font-semibold', 'Location ▾');
  const locationPanel = element('div', 'compact-popup');
  const locationGrid = element('div', 'compact-location-grid');
  const cityLabel = element('label', 'block text-xs text-slate-400', 'City / town');
  cityLabel.htmlFor = town.id;
  const cityBlock = element('div', 'space-y-1'); cityBlock.append(cityLabel, town);
  const areaLabel = element('label', 'block text-xs text-slate-400', 'Suburb / local area');
  areaLabel.htmlFor = area.id;
  const areaBlock = element('div', 'space-y-1'); areaBlock.append(areaLabel, area);
  town.className = area.className = 'compact-control';
  locationGrid.append(cityBlock, areaBlock);
  locationPanel.append(locationGrid);
  location.append(locationSummary, locationPanel);
  const clear = element('button', 'text-xs text-slate-400 hover:text-white', 'Clear');
  clear.type = 'button'; clear.addEventListener('click', () => window.resetAllFilters());
  actions.append(near, location, saved, clear);
  const active = element('div'); active.id = 'compact-active-filters';
  const results = element('div'); results.id = 'compact-result-row';
  const resultText = element('span');
  const sourceHint = element('span', 'text-slate-500');
  resultText.append(count, document.createTextNode(' matches'), sourceHint);
  sort.className = 'compact-control'; sort.setAttribute('aria-label', 'Sort merchants');
  results.append(resultText, sort);
  section.id = 'compact-root'; section.className = '';
  section.replaceChildren(searchBox, availability, actions, categories, subtypes, active, results);
  header.className = 'pb-3 border-b border-slate-800';
  header.replaceChildren(toolbar);
  function chip(text, callback) {
    const button = element('button', '', text + ' ×');
    button.type = 'button'; button.setAttribute('aria-label', 'Clear ' + text);
    button.addEventListener('click', callback); active.append(button);
  }
  function refresh() {
    const online = state.activeAvailability === 'online';
    location.hidden = online; near.disabled = online;
    near.classList.toggle('opacity-50', online);
    if (online) location.open = false;
    areaBlock.hidden = state.activeTown === 'All';
    locationSummary.textContent = (state.activeTown === 'All' ? 'Location' : state.activeTown) + ' ▾';
    sourceHint.textContent = state.availabilitySupported ? '' : ' · legacy';
    for (const option of sort.options) if (option.value === 'distance') option.disabled = online;
    const query = search.value.trim();
    const total = Number(state.activeAvailability !== 'all') + Number(state.activeCategory !== 'All') + Number(state.activeSubtype !== 'All') + Number(state.activeTown !== 'All') + Number(state.activeArea !== 'All') + Number(state.showSavedOnly) + Number(Boolean(query)) + Number(state.currentSort !== 'default');
    clear.hidden = total === 0;
    clear.textContent = 'Clear (' + total + ')';
    active.replaceChildren();
    if (state.activeTown !== 'All') chip(state.activeTown, () => window.clearTown());
    if (state.activeArea !== 'All') chip(state.activeArea, () => {state.activeArea = 'All';area.value = 'All';changed();});
    if (state.showSavedOnly) chip('Saved only', () => window.toggleSavedFilter());
    if (query) chip('Search: ' + query.slice(0, 30), () => window.clearSearch());
    active.hidden = !active.children.length;
  }
  section.addEventListener('input', () => queueMicrotask(refresh));
  section.addEventListener('change', () => queueMicrotask(refresh));
  section.addEventListener('click', () => queueMicrotask(refresh));
  return {refresh};
}
