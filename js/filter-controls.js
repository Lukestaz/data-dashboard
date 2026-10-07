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
