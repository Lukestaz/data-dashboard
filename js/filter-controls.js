import { subtypeOptions } from './subtype-filters.js';
import { mountCompactUI } from './compact-ui.js';

function categoryColour(category) {
  const palette = ['#f97316','#3b82f6','#22c55e','#a78bfa','#ec4899','#f59e0b','#06b6d4','#94a3b8'];
  const key = category.toLowerCase();
  if (/food|drink|restaurant|cafe|dining/.test(key)) return palette[0];
  if (/retail|shop/.test(key)) return palette[1];
  if (/health|medical|wellness/.test(key)) return palette[2];
  if (/service/.test(key)) return palette[3];
  if (/stay|travel|accommodation|hotel/.test(key)) return palette[4];
  if (/club|fun|entertainment/.test(key)) return palette[5];
  let hash = 0;
  for (const character of key) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return key === 'other' ? palette[7] : palette[hash % palette.length];
}

function colourCategoryChips(categories) {
  for (const control of categories.querySelectorAll('button')) {
    const category = control.textContent.trim();
    const selected = control.getAttribute('aria-pressed') === 'true';
    if (category === 'All') {
      control.style.color = '#e2e8f0';
      control.style.backgroundColor = selected ? '#334155' : '#0f172a';
      control.style.borderColor = selected ? '#94a3b8' : '#1e293b';
      continue;
    }
    const colour = categoryColour(category);
    control.classList.add('category-colour-chip');
    control.style.setProperty('--category-colour', colour);
    control.style.color = '#e2e8f0';
    control.style.backgroundColor = selected ? colour + '26' : '#0f172a';
    control.style.borderColor = selected ? colour : '#334155';
  }
}

function polishCompactUI() {
  const view = document.getElementById('view-cards-btn')?.parentElement;
  if (view) {view.id = 'compact-view-toggle';view.className = 'flex items-center';}
  document.getElementById('reset-filters-visible')?.remove();
  document.querySelector('.merchant-filter-row')?.classList.remove('merchant-filter-row');
  const style = document.createElement('style');
  style.textContent = `
#compact-toolbar{align-items:center;gap:8px;padding:0 0 8px;min-height:44px}
#compact-toolbar h1{font-size:18px;line-height:1.25;margin:0}
#compact-toolbar>div{align-items:center;gap:6px}
#compact-view-toggle{height:40px;padding:2px;border:1px solid #263244;border-radius:9px;background:#0f172a;box-sizing:border-box}
#compact-view-toggle button{height:34px;min-height:34px;padding:0 10px;font-size:12px;line-height:1;border-radius:6px}
#compact-more>summary{height:40px;min-height:40px;width:36px;display:flex;align-items:center;justify-content:center;padding:0;border-color:#263244;box-sizing:border-box}
#compact-root{gap:8px;margin-top:10px}
#compact-actions>button,#compact-actions summary{border-color:#263244;border-radius:8px;box-shadow:none;font-weight:500}
#compact-root #availability-filter-row{border:1px solid #263244;background:#0f172a;border-radius:10px;padding:3px}
#compact-root #availability-filter-row button{font-size:12px;min-height:40px;border-radius:7px}
#compact-root #category-pills button{font-size:12px;font-weight:500;padding:6px 11px}
#compact-result-row{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding-top:8px}
#compact-result-row>span{font-size:12px;line-height:1.5}
#compact-result-tools{gap:6px}
#compact-result-tools>select,#compact-result-tools button,#compact-map-info summary{font-size:12px;min-height:40px;padding:6px 8px;border-color:#263244;border-radius:7px;background:#0f172a;color:#cbd5e1;box-sizing:border-box}
#compact-map-info{position:relative;margin-left:auto}
#compact-map-info[hidden]{display:none!important}
#compact-map-info summary{cursor:pointer;list-style:none;display:flex;align-items:center;border:1px solid #263244}
#compact-map-info summary::-webkit-details-marker{display:none}
#compact-map-info p{position:absolute;right:0;top:calc(100% + 6px);z-index:1050;width:220px;padding:10px;border:1px solid #334155;border-radius:8px;background:#0f172a;box-shadow:0 8px 20px #0006;font-size:12px;line-height:1.5}
@media(min-width:640px){#compact-toolbar h1{font-size:22px}#compact-result-row{display:flex}}
@media(max-width:359px){#compact-toolbar h1{font-size:16px}#compact-view-toggle button{padding:0 7px}}
`;
  document.head.append(style);
  const note = document.querySelector('#compact-root .compact-map-note');
  const tools = document.getElementById('compact-result-tools');
  if (note && tools) {
    const info = document.createElement('details');info.id = 'compact-map-info';
    const summary = document.createElement('summary');summary.textContent = 'Map info';
    info.append(summary,note);tools.append(info);
    const sync = () => {info.hidden = note.hidden;if (note.hidden) info.open = false;};
    new MutationObserver(sync).observe(note,{attributes:true,attributeFilter:['hidden']});sync();
  }
}

export function availabilityMatches(merchant, mode) {
  if (mode === 'instore') return merchant.inStore !== false;
  if (mode === 'online') return merchant.isOnline === true || merchant.online === true || merchant.availableOnline === true;
  return true;
}

function button(label, selected, callback, prominent = false) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  element.setAttribute('aria-pressed', String(selected));
  element.className = prominent
    ? 'flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition focus:outline-none focus:ring-2 focus:ring-blue-500 ' + (selected ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800')
    : 'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border focus:outline-none focus:ring-2 focus:ring-blue-500 ' + (selected ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800');
  element.addEventListener('click', callback);
  return element;
}

export function createFilterControls(state, changed, onlineSelected) {
  const categories = document.getElementById('category-pills');
  if (!categories) return {refresh() {}};
  if (!document.getElementById('category-colour-style')) {
    const style = document.createElement('style');
    style.id = 'category-colour-style';
    style.textContent = '#category-pills .category-colour-chip::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--category-colour);margin-right:7px;vertical-align:baseline;box-shadow:0 0 0 1px #ffffff26}';
    document.head.append(style);
  }
  document.getElementById('avail-select')?.remove();
  document.getElementById('subtype-select')?.remove();
  let availability = document.getElementById('availability-filter-row');
  if (!availability) { availability = document.createElement('div'); availability.id = 'availability-filter-row'; }
  availability.className = 'flex w-full sm:w-fit gap-1 p-1 mb-3 rounded-xl border border-blue-800/60 bg-blue-950/40';
  availability.setAttribute('role', 'group');
  availability.setAttribute('aria-label', 'Shop availability');
  categories.before(availability);
  let subtypes = document.getElementById('subtype-filter-row');
  if (!subtypes) { subtypes = document.createElement('div'); subtypes.id = 'subtype-filter-row'; }
  subtypes.className = 'w-full min-w-0 mt-2';
  const chips = document.createElement('div');
  chips.className = 'flex gap-2 overflow-x-auto pb-1 min-w-0';
  chips.style.scrollbarWidth = 'thin';
  chips.setAttribute('role', 'group');
  chips.title = 'Subtype counts reflect availability and category, before location, search and saved filters';
  subtypes.replaceChildren(chips);
  categories.after(subtypes);
  const layout = mountCompactUI(state, changed);
  polishCompactUI();
  let lastCategory, lastAvailability;
  return {
    refresh() {
      colourCategoryChips(categories);
      const merchants = state.merchants || [];
      if (!state.availabilitySupported && state.activeAvailability === 'online') state.activeAvailability = 'all';
      availability.replaceChildren();
      for (const [mode, label] of [['all','All'], ['instore','In-store'], ['online','Available online']]) {
        const disabled = mode === 'online' && !state.availabilitySupported;
        const control = button(disabled ? 'Online (Amex only)' : label, state.activeAvailability === mode, () => {
          if (disabled) return;
          state.activeAvailability = mode;
          state.activeSubtype = 'All';
          if (mode === 'online') {
            state.activeTown = 'All';
            state.activeArea = 'All';
            state.userLat = null;
            state.userLng = null;
            for (const merchant of state.merchants) delete merchant._dist;
            if (state.currentSort === 'distance') {state.currentSort = 'default';const sort=document.getElementById('sort-select');if(sort)sort.value='default';}
            const label=document.getElementById('near-me-label');if(label)label.textContent='Near Me';
            document.getElementById('near-me-btn')?.classList.remove('bg-rose-500/20','border-rose-500/50','text-rose-300');
            onlineSelected();
          }
          changed();
        }, true);
        control.disabled = disabled;
        control.title = disabled ? 'Online availability is not supplied by the legacy dataset' : merchants.filter(m => availabilityMatches(m, mode)).length.toLocaleString() + ' merchant records before other filters';
        if (disabled) control.classList.add('opacity-50','cursor-not-allowed');
        availability.append(control);
      }
      const hidden = state.activeCategory === 'All';
      subtypes.classList.toggle('hidden', hidden);
      chips.setAttribute('aria-label', 'Subtypes for ' + state.activeCategory);
      const candidates = merchants.filter(m => availabilityMatches(m, state.activeAvailability));
      const options = hidden ? [] : subtypeOptions(candidates, state.activeCategory);
      if (hidden || !options.some(option => option.value === state.activeSubtype)) state.activeSubtype = 'All';
      chips.replaceChildren();
      if (!hidden) {
        chips.append(button('All', state.activeSubtype === 'All', () => {state.activeSubtype = 'All';changed();}));
        for (const option of options) chips.append(button(option.value + ' (' + option.count.toLocaleString() + ')', state.activeSubtype === option.value, () => {state.activeSubtype = option.value;changed();}));
      }
      if (lastCategory !== state.activeCategory || lastAvailability !== state.activeAvailability) chips.scrollLeft = 0;
      lastCategory = state.activeCategory;
      lastAvailability = state.activeAvailability;
      layout.refresh();
    }
  };
}
