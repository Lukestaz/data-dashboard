import { state, savedKey, loadSavedIds, toggleSave } from './store.js';
import { normalizeCityTown } from './normalizer.js';
import { getSyncUrl, parseSyncCode, checkUrlSyncOnLoad } from './sync.js';
import { fetchCommunityVotes, getVoteBadge, submitVote } from './votes.js';
import { initMap, updateMapMarkers } from './map.js';
import { renderCardsChunk } from './cards.js';

// Expose global methods for HTML onclick attributes
window.submitVote = submitVote;
window.toggleSave = (id) => {
  toggleSave(id);
  renderCardsChunk();
};
window.toggleSaveFromMap = (id, btnEl) => {
  toggleSave(id);
  const isSaved = state.savedIds.has(id);
  if (btnEl) {
    btnEl.innerHTML = isSaved ? '★ Saved' : '☆ Save';
    btnEl.className = `text-xs px-2 py-0.5 rounded border transition ${
      isSaved ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
    }`;
  }
};
window.setViewMode = (mode) => {
  state.viewMode = mode;
  const cardsWrapper = document.getElementById('cards-wrapper');
  const mapWrapper = document.getElementById('map-wrapper');
  const cardsBtn = document.getElementById('view-cards-btn');
  const mapBtn = document.getElementById('view-map-btn');

  if (mode === 'map') {
    if (cardsWrapper) cardsWrapper.classList.add('hidden');
    if (mapWrapper) mapWrapper.classList.remove('hidden');
    if (mapBtn) { mapBtn.classList.add('bg-blue-600', 'text-white'); mapBtn.classList.remove('text-slate-400'); }
    if (cardsBtn) { cardsBtn.classList.remove('bg-blue-600', 'text-white'); cardsBtn.classList.add('text-slate-400'); }
    initMap();
    setTimeout(() => { updateMapMarkers(); }, 150);
  } else {
    if (mapWrapper) mapWrapper.classList.add('hidden');
    if (cardsWrapper) cardsWrapper.classList.remove('hidden');
    if (cardsBtn) { cardsBtn.classList.add('bg-blue-600', 'text-white'); cardsBtn.classList.remove('text-slate-400'); }
    if (mapBtn) { mapBtn.classList.remove('bg-blue-600', 'text-white'); mapBtn.classList.add('text-slate-400'); }
  }
};
window.toggleSavedFilter = () => {
  state.showSavedOnly = !state.showSavedOnly;
  const btn = document.getElementById('saved-filter-btn');
  if (btn) {
    if (state.showSavedOnly) {
      btn.classList.add('bg-amber-500/20', 'border-amber-500/50', 'text-amber-300');
    } else {
      btn.classList.remove('bg-amber-500/20', 'border-amber-500/50', 'text-amber-300');
    }
  }
  applyFilters();
};
window.changeSort = (val) => {
  state.currentSort = val;
  if (val === 'distance' && state.userLat === null) {
    window.toggleNearMe();
    return;
  }
  applyFilters();
};
window.toggleNearMe = () => {
  const label = document.getElementById('near-me-label');
  const btn = document.getElementById('near-me-btn');
  if (state.userLat !== null) {
    state.userLat = null;
    state.userLng = null;
    if (label) label.textContent = 'Near Me';
    if (btn) btn.classList.remove('bg-rose-500/20', 'border-rose-500/50', 'text-rose-300');
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'default';
    state.currentSort = 'default';
    applyFilters();
    return;
  }
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  if (label) label.textContent = 'Locating...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      if (label) label.textContent = 'Nearby Active';
      if (btn) btn.classList.add('bg-rose-500/20', 'border-rose-500/50', 'text-rose-300');
      const sortSelect = document.getElementById('sort-select');
      if (sortSelect) sortSelect.value = 'distance';
      state.currentSort = 'distance';
      calculateDistances();
      applyFilters();
    },
    (err) => {
      alert('Location access denied: ' + err.message);
      if (label) label.textContent = 'Near Me';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};

// Cross-device sync modal handlers
window.openSyncModal = () => {
  const modal = document.getElementById('sync-modal');
  const exportInput = document.getElementById('sync-export-input');
  const importInput = document.getElementById('sync-import-input');
  const copyStatus = document.getElementById('copy-status');
  const importStatus = document.getElementById('import-status');

  if (exportInput) exportInput.value = getSyncUrl(state.savedIds);
  if (importInput) importInput.value = '';
  if (copyStatus) copyStatus.classList.add('hidden');
  if (importStatus) importStatus.classList.add('hidden');

  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeSyncModal = () => {
  const modal = document.getElementById('sync-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.copySyncLink = () => {
  const input = document.getElementById('sync-export-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const status = document.getElementById('copy-status');
    if (status) {
      status.classList.remove('hidden');
      setTimeout(() => status.classList.add('hidden'), 3000);
    }
  });
};

window.importSyncCode = () => {
  const input = document.getElementById('sync-import-input');
  const status = document.getElementById('import-status');
  if (!input || !status) return;
  const ids = parseSyncCode(input.value);
  if (ids && ids.length > 0) {
    let count = 0;
    ids.forEach(id => {
      if (!state.savedIds.has(id)) {
        state.savedIds.add(id);
        count++;
      }
    });
    localStorage.setItem(savedKey(), JSON.stringify([...state.savedIds]));
    loadSavedIds();
    applyFilters();
    status.textContent = `✓ Successfully merged ${count} new merchants (${state.savedIds.size} total saved)!`;
    status.className = 'text-[11px] mt-1 text-emerald-400';
    status.classList.remove('hidden');
  } else {
    status.textContent = '✗ Invalid sync link or code format.';
    status.className = 'text-[11px] mt-1 text-rose-400';
    status.classList.remove('hidden');
  }
};

function calculateDistances() {
  if (state.userLat === null) return;
  for (const m of state.merchants) {
    if (m.lat && m.lng) {
      m._dist = haversine(state.userLat, state.userLng, m.lat, m.lng);
    } else {
      m._dist = Infinity;
    }
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function init() {
  checkUrlSyncOnLoad((ids) => {
    ids.forEach(id => state.savedIds.add(id));
    localStorage.setItem(savedKey(), JSON.stringify([...state.savedIds]));
    loadSavedIds();
  });

  if (!localStorage.getItem(state.offerNoticeKey)) {
    const el = document.getElementById('offer-notice');
    if (el) { el.classList.remove('hidden'); el.classList.add('flex'); }
  }

  loadSavedIds();

  // Load votes from Upstash
  fetchCommunityVotes(() => {
    renderCardsChunk();
    if (state.viewMode === 'map') updateMapMarkers();
  });

  await loadActiveDataset();

  // Wire search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.addEventListener('input', applyFilters);

  const townSelect = document.getElementById('town-select');
  if (townSelect) townSelect.addEventListener('change', (e) => {
    state.activeTown = e.target.value;
    applyFilters();
  });

  setupInfiniteScroll();
}

export async function switchDataset(name) {
  state.activeDataset = name;
  localStorage.setItem('amex_active_dataset', name);
  await loadActiveDataset();
}
window.switchDataset = switchDataset;

async function loadActiveDataset() {
  try {
    const isAmex = state.activeDataset === 'amex';
    const path = isAmex ? './data/amex.json' : './data.json';
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();
    
    // Support direct array, .merchants, or .data
    const items = Array.isArray(rawData) ? rawData : (rawData.merchants || rawData.data || []);
    
    state.merchants = items.map((m, idx) => ({
      id: m.id || m.SENumber || idx,
      SENumber: m.SENumber || m.id || '',
      title: m.title || m.name || m.Name || 'Merchant',
      category: m.category || m.Category || m.type || m.Type || 'Retail',
      subType: m.subType || m['Sub-type (original)'] || '',
      city: normalizeCityTown(m.city || m['City / Town'] || m.City || '', m.address || m.Address || ''),
      address: m.address || m.Address || '',
      lat: parseFloat(m.lat || m.Latitude),
      lng: parseFloat(m.lng || m.Longitude),
      website: m.website || m.url || m.GoogleMapsUrl || '',
      online: Boolean(m.online || m.availableOnline)
    }));
  } catch (err) {
    console.warn('Dataset load failed, falling back to data.json', err);
    try {
      const fallback = await fetch('./data.json');
      const rawFallback = await fallback.json();
      const fallbackItems = Array.isArray(rawFallback) ? rawFallback : (rawFallback.merchants || []);
      state.merchants = fallbackItems.map((m, idx) => ({
        id: m.id || m.SENumber || idx,
        SENumber: m.SENumber || m.id || '',
        title: m.title || m.name || m.Name || 'Merchant',
        category: m.category || m.Category || m.type || m.Type || 'Retail',
        subType: m.subType || m['Sub-type (original)'] || '',
        city: normalizeCityTown(m.city || m['City / Town'] || m.City || '', m.address || m.Address || ''),
        address: m.address || m.Address || '',
        lat: parseFloat(m.lat || m.Latitude),
        lng: parseFloat(m.lng || m.Longitude),
        website: m.website || m.url || m.GoogleMapsUrl || '',
        online: Boolean(m.online || m.availableOnline)
      }));
    } catch (e) {
      console.error('All dataset loads failed', e);
    }
  }

  populateFilters();
  applyFilters();
}

function populateFilters() {
  const categories = ['All', ...new Set(state.merchants.map(m => m.category).filter(Boolean))].sort();
  const catContainer = document.getElementById('category-pills');
  if (catContainer) {
    catContainer.innerHTML = categories.map(cat => `
      <button onclick="window.selectCategory('${cat}')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
        state.activeCategory === cat ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
      }">${cat}</button>
    `).join('');
  }

  const towns = ['All', ...new Set(state.merchants.map(m => m.city).filter(Boolean))].sort();
  const townSelect = document.getElementById('town-select');
  if (townSelect) {
    townSelect.innerHTML = towns.map(t => `<option value="${t}" ${state.activeTown === t ? 'selected' : ''}>${t}</option>`).join('');
  }
}

window.selectCategory = (cat) => {
  state.activeCategory = cat;
  populateFilters();
  applyFilters();
};

export function applyFilters() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  state.filteredList = state.merchants.filter(m => {
    const cat = m.category || '';
    const city = m.city || '';
    const isSaved = state.savedIds.has(m.id);

    if (state.showSavedOnly && !isSaved) return false;
    if (state.activeCategory !== 'All' && cat !== state.activeCategory) return false;
    if (state.activeTown !== 'All' && city !== state.activeTown) return false;

    if (query) {
      const matchTitle = (m.title || '').toLowerCase().includes(query);
      const matchAddr = (m.address || '').toLowerCase().includes(query);
      const matchCity = city.toLowerCase().includes(query);
      if (!matchTitle && !matchAddr && !matchCity) return false;
    }
    return true;
  });

  if (state.currentSort === 'distance') {
    calculateDistances();
    state.filteredList.sort((a, b) => (a._dist || Infinity) - (b._dist || Infinity));
  } else if (state.currentSort === 'name') {
    state.filteredList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }

  const totalCount = document.getElementById('total-count');
  if (totalCount) totalCount.textContent = state.filteredList.length.toLocaleString();

  state.displayedCount = state.PAGE_CHUNK;
  renderCardsChunk();

  if (state.viewMode === 'map') {
    updateMapMarkers();
  }
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('sentinel');
  if (!sentinel) return;
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      if (state.displayedCount < state.filteredList.length) {
        state.displayedCount += state.PAGE_CHUNK;
        renderCardsChunk();
      }
    }
  }, { rootMargin: '300px' });
  observer.observe(sentinel);
}

window.addEventListener('DOMContentLoaded', init);
