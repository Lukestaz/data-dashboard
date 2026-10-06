import { state, savedKey, loadSavedIds, toggleSave } from './store.js';
import { normalizeCityTown } from './normalizer.js';
import { getSyncUrl, parseSyncCode, checkUrlSyncOnLoad } from './sync.js';
import { fetchCommunityVotes, getVoteBadge, submitVote } from './votes.js';
import { initMap, updateMapMarkers } from './map.js';
import { renderCardsChunk } from './cards.js';

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

  try {
    const res = await fetch('./data/amex.json');
    if (res.ok) {
      state.merchants = await res.json();
    } else {
      const fallback = await fetch('./data.json');
      state.merchants = await fallback.json();
    }
  } catch (err) {
    console.error('Failed to load merchant data', err);
  }

  populateFilters();
  applyFilters();
  setupInfiniteScroll();
}

function populateFilters() {
  const categories = ['All', ...new Set(state.merchants.map(m => m.category || m.Type).filter(Boolean))].sort();
  const catContainer = document.getElementById('category-pills');
  if (catContainer) {
    catContainer.innerHTML = categories.map(cat => `
      <button onclick="window.selectCategory('${cat}')" class="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
        state.activeCategory === cat ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
      }">${cat}</button>
    `).join('');
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
    const cat = m.category || m.Type || '';
    const isSaved = state.savedIds.has(m.id);

    if (state.showSavedOnly && !isSaved) return false;
    if (state.activeCategory !== 'All' && cat !== state.activeCategory) return false;

    if (query) {
      const matchTitle = (m.title || m.Name || '').toLowerCase().includes(query);
      const matchAddr = (m.address || m.Address || '').toLowerCase().includes(query);
      if (!matchTitle && !matchAddr) return false;
    }
    return true;
  });

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
