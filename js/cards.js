import { state, toggleSave } from './store.js';
import { getVoteBadge, submitVote } from './votes.js';

export function renderCardsChunk() {
  const grid = document.getElementById('card-grid');
  const empty = document.getElementById('empty-state');
  const sentinelText = document.getElementById('sentinel-text');
  if (!grid) return;

  if (state.filteredList.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    if (sentinelText) sentinelText.textContent = '';
    return;
  }

  if (empty) empty.classList.add('hidden');
  const slice = state.filteredList.slice(0, state.displayedCount);

  grid.innerHTML = slice.map(item => {
    const title = item.title || item.Name || 'Merchant';
    const cat = item.category || item.Type || 'Retail';
    const subType = item.subType || item['Sub-type (original)'] || '';
    const city = item.city || item['City / Town'] || '';
    const address = item.address || item.Address || '';
    const lat = item.lat || item.Latitude;
    const lng = item.lng || item.Longitude;
    const isSaved = state.savedIds.has(item.id);
    const voteBadge = getVoteBadge(item.SENumber || item.id, title);

    const mapsUrl = lat && lng
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + ' ' + address)}`;

    let distanceBadge = '';
    if (item._dist !== undefined && item._dist !== Infinity) {
      distanceBadge = item._dist < 1
        ? `<span class="bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded text-[11px] font-bold">${Math.round(item._dist * 1000)}m away</span>`
        : `<span class="bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded text-[11px] font-bold">${item._dist.toFixed(1)} km</span>`;
    }

    return `
      <div class="bg-slate-900 border border-slate-800/90 hover:border-slate-700 rounded-xl p-5 transition shadow-sm flex flex-col justify-between relative group">
        <div>
          <div class="flex items-center justify-between text-xs mb-3 gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 font-medium border border-blue-900/40">${cat}</span>
              ${distanceBadge}
              ${voteBadge}
            </div>
            <button onclick="window.toggleSave(${item.id})" class="p-1 rounded-md text-slate-500 hover:text-amber-400 transition" title="Save to Favorites">
              <svg class="w-5 h-5 ${isSaved ? 'text-amber-400 fill-current' : 'fill-none stroke-current'}" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </button>
          </div>
          <h3 class="text-base font-bold text-white mb-1 leading-snug">${title}</h3>
          ${subType ? `<p class="text-xs text-blue-400/90 mb-2 font-medium">${subType}</p>` : ''}
          <p class="text-xs text-slate-400 mb-4 line-clamp-2">${address}</p>
        </div>
        <div class="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-slate-400">
            <span>Takes Amex?</span>
            <button onclick="window.submitVote('${item.SENumber || item.id}', '${title}', 'up')" class="hover:text-emerald-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 transition" title="Confirmed working">👍</button>
            <button onclick="window.submitVote('${item.SENumber || item.id}', '${title}', 'down')" class="hover:text-rose-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 transition" title="Amex declined / not accepted">👎</button>
          </div>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1">
            Directions &rarr;
          </a>
        </div>
      </div>
    `;
  }).join('');

  if (sentinelText) {
    sentinelText.textContent = state.displayedCount >= state.filteredList.length
      ? `Showing all ${state.filteredList.length.toLocaleString()} matches`
      : `Showing ${state.displayedCount} of ${state.filteredList.length.toLocaleString()} (scroll down for more)`;
  }
}
