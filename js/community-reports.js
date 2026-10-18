const text = value => value == null ? '' : String(value).trim();
const canonicalOf = merchant => text(merchant.seNumber) || text(merchant.SENumber) || text(merchant.id) || text(merchant.title || merchant.name || merchant.Name);
const count = value => {const number = Number(value);return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;};
export const COMMUNITY_FILTERS = [
  ['all','All reports'], ['accepted','Accepted reports'], ['declined','Declined reports'],
  ['mixed','Mixed reports'], ['none','No reports']
];
export function summarizeCommunityReports(aliases, votes, status = 'ready') {
  if (status !== 'ready') return {status,kind:status,up:0,down:0};
  let up = 0, down = 0;
  for (const alias of new Set(aliases)) {up += count(votes[alias]?.up);down += count(votes[alias]?.down);}
  return {status:'ready',kind:up && down ? 'mixed' : up ? 'accepted' : down ? 'declined' : 'none',up,down};
}
export function communityReportMatches(report, filter = 'all') {
  return filter === 'all' || (report.status === 'ready' && report.kind === filter);
}
export function createCommunityReportLookup(merchants) {
  const candidates = new Map(), owners = new Map();
  for (const merchant of merchants) {
    const key = canonicalOf(merchant);
    for (const alias of new Set([text(merchant.id),text(merchant.seNumber),text(merchant.SENumber)])) {
      if (!candidates.has(alias)) candidates.set(alias, []);
      candidates.get(alias).push(merchant);
      if (!owners.has(alias)) owners.set(alias, new Set());
      owners.get(alias).add(key);
    }
  }
  return (id, title, votes, status = 'ready') => {
    if (status !== 'ready') return summarizeCommunityReports([], votes, status);
    const supplied = text(id) || text(title), possible = candidates.get(supplied) || [];
    const named = possible.filter(merchant => text(merchant.title || merchant.name || merchant.Name) === text(title));
    const matches = named.length ? named : possible;
    if (matches.length && new Set(matches.map(canonicalOf)).size !== 1) return summarizeCommunityReports([], votes, 'unavailable');
    const merchant = matches[0];
    if (!merchant) return summarizeCommunityReports(supplied ? [supplied] : [], votes, status);
    const key = canonicalOf(merchant);
    const aliases = [...new Set([key,text(merchant.id),text(merchant.seNumber),text(merchant.SENumber)].filter(Boolean))]
      .filter(alias => ![...(owners.get(alias) || [])].some(owner => owner !== key));
    if (!aliases.includes(key)) aliases.unshift(key);
    return summarizeCommunityReports(aliases, votes, status);
  };
}
export function renderCommunityReportBadge(report) {
  const label = {accepted:'Accepted reports',declined:'Declined reports',mixed:'Mixed reports',none:'No reports',loading:'Reports loading…',unavailable:'Reports unavailable'}[report.kind] || 'Reports unavailable';
  const colors = {accepted:'#86efac',declined:'#fda4af',mixed:'#fcd34d'};
  const totals = report.status === 'ready' && report.kind !== 'none' ? ` · ${report.up} accepted · ${report.down} declined` : '';
  return `<span class="community-report-badge" data-report-state="${Object.hasOwn(colors,report.kind) || ['none','loading','unavailable'].includes(report.kind) ? report.kind : 'unavailable'}" style="display:inline-block;border:1px solid #475569;border-radius:6px;padding:2px 6px;font-size:11px;line-height:1.5;color:${colors[report.kind] || '#94a3b8'}" title="Community reports are not a guarantee of AMEX acceptance or offer eligibility.">${label}${totals}</span>`;
}
