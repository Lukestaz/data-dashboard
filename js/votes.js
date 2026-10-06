// Upstash Redis Community Verification Client
const UPSTASH_URL = "https://faithful-marlin-205810.upstash.io";
const UPSTASH_READ_TOKEN = "ggAAAAAAAyPyAAIgcDKreOL4mFK0Fst4zyF92_N92aPi9A8fc4JPTz5k_x0ztQ";

export const communityVotes = {};
const userVotesKey = 'amex_user_votes_v1';
export let userVotes = JSON.parse(localStorage.getItem(userVotesKey) || '{}');

export async function fetchCommunityVotes(onUpdate) {
  try {
    const res = await fetch(`${UPSTASH_URL}/hgetall/amex:votes`, {
      headers: { Authorization: `Bearer ${UPSTASH_READ_TOKEN}` }
    });
    const data = await res.json();
    if (Array.isArray(data.result)) {
      for (let i = 0; i < data.result.length; i += 2) {
        const field = data.result[i];
        const val = parseInt(data.result[i + 1], 10) || 0;
        const [mId, voteType] = field.split(':');
        if (!communityVotes[mId]) communityVotes[mId] = { up: 0, down: 0 };
        communityVotes[mId][voteType] = val;
      }
      if (typeof onUpdate === 'function') onUpdate();
    }
  } catch (err) {
    console.warn("Could not load Upstash community votes:", err);
  }
}

export function getVoteBadge(id, title) {
  const key = String(id || title);
  const v = communityVotes[key] || { up: 0, down: 0 };

  if (v.down > 0 && v.down >= v.up) {
    return `<span class="bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded text-[11px] font-bold">⚠️ Declined (${v.down})</span>`;
  }
  if (v.up >= 2) {
    return `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded text-[11px] font-bold">✓ Confirmed (${v.up})</span>`;
  }
  if (v.up === 1 && v.down === 0) {
    return `<span class="bg-sky-950/80 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-[11px] font-bold">👍 Confirmed (1)</span>`;
  }
  return '';
}

export function recordUserVote(id, title, type, onUpdate) {
  const key = String(id || title);
  if (userVotes[key]) {
    alert('You have already recorded a response for this merchant.');
    return;
  }
  userVotes[key] = type;
  localStorage.setItem(userVotesKey, JSON.stringify(userVotes));

  if (!communityVotes[key]) communityVotes[key] = { up: 0, down: 0 };
  communityVotes[key][type] = (communityVotes[key][type] || 0) + 1;

  if (typeof onUpdate === 'function') onUpdate();
}
