import { normalizeCityTown } from './normalizer.js';
import { getSyncUrl, parseSyncCode, checkUrlSyncOnLoad } from './sync.js';
import { fetchCommunityVotes, getVoteBadge, submitVote } from './votes.js';

// Application State
export const state = {
  merchants: [],
  filteredList: [],
  displayedCount: 60,
  PAGE_CHUNK: 60,
  offerNoticeKey: 'shop_small_offer_notice_2026',
  activeCategory: 'All',
  activeTown: 'All',
  activeDataset: 'amex',
  currentSort: 'default',
  showSavedOnly: false,
  viewMode: 'cards',
  userLat: null,
  userLng: null,
  savedIds: new Set()
};

export function savedKey() {
  return state.activeDataset === 'amex' ? 'amex_saved_merchants_v2' : 'amex_saved_merchants';
}

export function loadSavedIds() {
  state.savedIds = new Set(JSON.parse(localStorage.getItem(savedKey()) || '[]'));
  updateSavedCount();
}

export function updateSavedCount() {
  const el = document.getElementById('saved-count');
  if (el) el.textContent = state.savedIds.size;
}

export function toggleSave(id) {
  if (state.savedIds.has(id)) {
    state.savedIds.delete(id);
  } else {
    state.savedIds.add(id);
  }
  localStorage.setItem(savedKey(), JSON.stringify([...state.savedIds]));
  updateSavedCount();
}
