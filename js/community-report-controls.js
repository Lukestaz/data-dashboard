import { COMMUNITY_FILTERS, communityReportsEnabled } from './community-reports.js';
import { communityVoteStatus, fetchCommunityVotes } from './votes.js';

export function mountCommunityReportControls(state, changed) {
  const get = id => document.getElementById(id);
  const control = get('community-reports-control'), select = get('community-reports-select');
  const status = get('community-reports-status'), message = get('community-reports-message');
  const retry = get('community-reports-retry'), showAll = get('community-reports-show-all');
  if (![control,select,status,message,retry,showAll].every(Boolean)) throw new Error('Missing community report controls');
  select.addEventListener('change', () => {
    if (!communityReportsEnabled(state)) return;
    state.activeCommunityReport = COMMUNITY_FILTERS.some(([value]) => value === select.value) ? select.value : 'all';
    changed();
  });
  retry.addEventListener('click', () => {fetchCommunityVotes().catch(console.warn);});
  showAll.addEventListener('click', () => {state.activeCommunityReport = 'all';changed();});
  return {refresh() {
    const enabled = communityReportsEnabled(state), waiting = enabled && communityVoteStatus !== 'ready';
    control.hidden = !enabled;
    select.value = state.activeCommunityReport || 'all';
    status.hidden = !waiting;
    const text = state.communityReportMessage || (communityVoteStatus === 'loading' ? 'Loading community reports… All merchants remain visible.' : 'Community reports unavailable. All merchants remain visible.');
    if (message.textContent !== text) message.textContent = text;
    retry.hidden = !waiting || communityVoteStatus !== 'unavailable';
    showAll.hidden = !waiting || select.value === 'all';
  }};
}
