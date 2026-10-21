import { state } from './store.js';
import { resolveVoteIdentity } from './vote-identity.js';
import { createCommunityVoteReader } from './community-vote-reader.js';
import { createCommunityReportLookup, renderCommunityReportBadge, communityReportsEnabled } from './community-reports.js';
const UPSTASH_URL = "https://faithful-marlin-205810.upstash.io";
const UPSTASH_READ_TOKEN = "ggAAAAAAAyPyAAIgcDKreOL4mFK0Fst4zyF92_N92aPi9A8fc4JPTz5k_x0ztQ";
const VOTE_WORKER_URL = "https://amexss-voter.lukestaz.workers.dev";
export const communityVotes = Object.create(null);
const userVotesKey='amex_user_votes_v1';
export let userVotes={};
try{userVotes=JSON.parse(localStorage.getItem(userVotesKey)||'{}');if(!userVotes||Array.isArray(userVotes)||typeof userVotes!=='object')userVotes={};}catch{userVotes={};}
const pending=new Set();
const identity=(id,title)=>resolveVoteIdentity(id,title,state.merchants||[]);
function notify(callback){if(typeof callback==='function')callback();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('amex-votes-updated'));}
export let communityVoteStatus = 'loading';
let voteRevision = 0, readRevision = 0;
const communityVoteReader = createCommunityVoteReader({
 request: async () => {
  readRevision = voteRevision;
  const response = await fetch(`${UPSTASH_URL}/hgetall/amex:votes`, {headers:{Authorization:`Bearer ${UPSTASH_READ_TOKEN}`}});
  if (!response.ok) throw new Error(`Vote fetch HTTP ${response.status}`);
  return response.json();
 },
 onChange: snapshot => {
  // A read started before a confirmed write must not erase that local update.
  const stale = snapshot.status === 'ready' && readRevision !== voteRevision;
  communityVoteStatus = stale ? 'unavailable' : snapshot.status;
  if (communityVoteStatus === 'ready') {
   for (const key of Object.keys(communityVotes)) delete communityVotes[key];
   // Reader records are frozen; vote submission needs mutable application copies.
   for (const [key, counts] of Object.entries(snapshot.votes)) communityVotes[key] = {...counts};
  }
  notify();
 }
});
export async function fetchCommunityVotes(onUpdate){
 await communityVoteReader.load();
 if (typeof onUpdate === 'function') {
  try {onUpdate();} catch {console.warn('Community vote update callback failed.');}
 }
}
let lookupMerchants, reportLookup;
export function getCommunityReport(id,title) {
 const merchants = state.merchants || [];
 if (merchants !== lookupMerchants) {
  lookupMerchants = merchants;
  reportLookup = createCommunityReportLookup(merchants);
 }
 return reportLookup(id,title,communityVotes,communityVoteStatus);
}
export function getVoteBadge(id,title){
 if(communityReportsEnabled(state))return renderCommunityReportBadge(getCommunityReport(id,title));
 let resolved;try{resolved=identity(id,title);}catch(error){console.warn(error.message);return '';}
 const totals=resolved.aliases.reduce((sum,key)=>{const votes=communityVotes[key]||{};sum.up+=Number(votes.up)||0;sum.down+=Number(votes.down)||0;return sum;},{up:0,down:0});
 if(totals.down>0&&totals.down>=totals.up)return `<span class="bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded text-[11px] font-bold">⚠️ Declined (${totals.down})</span>`;
 if(totals.up>=2)return `<span class="bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded text-[11px] font-bold">✓ Confirmed (${totals.up})</span>`;
 if(totals.up===1&&totals.down===0)return '<span class="bg-sky-950/80 text-sky-300 border border-sky-800/50 px-2 py-0.5 rounded text-[11px] font-bold">👍 Confirmed (1)</span>';
 return '';
}
export async function submitVote(id,title,type,onUpdate){
 if(!['up','down'].includes(type))return;
 let resolved;try{resolved=identity(id,title);}catch(error){alert(error.message);return;}
 const{key,aliases}=resolved;if(!key)return;
 if(pending.has(key)||aliases.some(alias=>userVotes[alias])){alert('You have already submitted feedback for this merchant.');return;}
 pending.add(key);
 try{
 const response=await fetch(`${VOTE_WORKER_URL}/?id=${encodeURIComponent(key)}&type=${type}`,{method:'POST'});
 if(!response.ok)throw new Error(`Vote submission HTTP ${response.status}`);
 voteRevision++;
 userVotes[key]=type;
 try{localStorage.setItem(userVotesKey,JSON.stringify(userVotes));}catch(error){console.warn('Vote saved remotely, but browser storage failed:',error);}
 communityVotes[key]??={up:0,down:0};communityVotes[key][type]=(communityVotes[key][type]||0)+1;notify(onUpdate);
 }catch(error){console.warn('Vote submission did not confirm success:',error);alert('Could not confirm your vote was saved. Refresh to check before trying again.');}
 finally{pending.delete(key);}
}
