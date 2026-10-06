import { state, toggleSave } from './store.js';
import { getVoteBadge, submitVote } from './votes.js';

let mapInstance = null;
let clusterGroup = null;

export function initMap(onToggleSave) {
  if (mapInstance) return mapInstance;

  mapInstance = L.map('map', {
    center: state.userLat && state.userLng ? [state.userLat, state.userLng] : [-36.85, 174.76],
    zoom: 12
  });

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(mapInstance);

  clusterGroup = L.markerClusterGroup({
    chunkedLoading: true,
    maxClusterRadius: 50
  });
  mapInstance.addLayer(clusterGroup);

  return mapInstance;
}

export function updateMapMarkers(onRender) {
  if (!mapInstance || !clusterGroup) return;
  clusterGroup.clearLayers();

  const markers = [];
  const matches = state.filteredList.filter(m => m.lat && m.lng).slice(0, 1500);

  for (const item of matches) {
    const title = item.title || item.Name || 'Merchant';
    const cat = item.category || item.Type || '';
    const address = item.address || '';
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;
    const isSaved = state.savedIds.has(item.id);
    const voteBadge = getVoteBadge(item.SENumber || item.id, title);

    const marker = L.marker([item.lat, item.lng]);
    marker.bindPopup(`
      <div class="text-slate-100 font-sans">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/40">${cat}</span>
          <button 
            onclick="window.toggleSaveFromMap(${item.id}, this)" 
            class="text-xs px-2 py-0.5 rounded border transition ${isSaved ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'}"
          >
            ${isSaved ? '★ Saved' : '☆ Save'}
          </button>
        </div>
        <h4 class="text-sm font-bold text-white mt-1.5">${title}</h4>
        ${voteBadge ? `<div class="mt-1">${voteBadge}</div>` : ''}
        <p class="text-xs text-slate-400 mt-1">${address}</p>
        <div class="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 text-slate-400">
            <span>Takes Amex?</span>
            <button onclick="window.submitVote('${item.SENumber || item.id}', '${title}', 'up')" class="hover:text-emerald-400 px-1 py-0.5 rounded bg-slate-800">👍</button>
            <button onclick="window.submitVote('${item.SENumber || item.id}', '${title}', 'down')" class="hover:text-rose-400 px-1 py-0.5 rounded bg-slate-800">👎</button>
          </div>
          <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 font-bold hover:underline">Directions &rarr;</a>
        </div>
      </div>
    `);
    markers.push(marker);
  }

  clusterGroup.addLayers(markers);

  if (matches.length > 0 && !state.userLat) {
    const bounds = L.latLngBounds(matches.map(m => [m.lat, m.lng]));
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }
}
