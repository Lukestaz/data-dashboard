import { availabilityMatches } from './filter-controls.js';

export function onlineBadge(merchant) {
  if (!availabilityMatches(merchant, 'online')) return '';
  const label = merchant.inStore === false ? 'Online only' : 'Available online';
  const title = merchant.inStore === false ? 'Online-only merchant listed by Amex' : 'Listed by Amex as available online as well as in-store';
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50 text-[11px] font-medium" title="${title}"><svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18Z"/></svg>${label}</span>`;
}
