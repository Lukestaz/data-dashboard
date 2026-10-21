import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root = path.resolve(process.argv[2] || '.');
const sources = await Promise.all(['votes.js','community-vote-reader.js','vote-identity.js','community-reports.js'].map(name => fs.readFile(path.join(root,'js',name),'utf8')));
const scratch = await fs.mkdtemp(path.join(os.tmpdir(),'amex-vote-integration-'));
const originals = Object.fromEntries(['window','document','CustomEvent','localStorage','fetch','alert','__amexVoteState'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const originalWarn = console.warn;
const passed = [];
let fixtureNumber = 0, mockedReads = 0, mockedWrites = 0;
const deferred = () => {let resolve;const promise = new Promise(done => {resolve=done;});return {promise,resolve};};
const ok = result => ({ok:true,status:200,json:async () => ({result})});
async function fixture({stored={},storageFails=false} = {}) {
 const directory = path.join(scratch,String(++fixtureNumber));
 await fs.mkdir(directory);
 await fs.writeFile(path.join(directory,'package.json'),'{"type":"module"}');
 for (let i=0;i<sources.length;i++) await fs.writeFile(path.join(directory,['votes.js','community-vote-reader.js','vote-identity.js','community-reports.js'][i]),sources[i]);
 await fs.writeFile(path.join(directory,'store.js'),'export const state = globalThis.__amexVoteState;');
 const state = {merchants:[{id:'card-a',SENumber:'merchant:1',title:'Shop'},{id:'map-b',SENumber:'merchant:1',title:'Shop'}]};
 globalThis.__amexVoteState=state;
 const storage=new Map([['amex_user_votes_v1',JSON.stringify(stored)]]), calls=[], events=[], alerts=[], warnings=[];
 globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{if(storageFails)throw Error('mock storage failure');storage.set(key,value);}};
 globalThis.document={getElementById:()=>null};
 globalThis.CustomEvent=class {constructor(type){this.type=type;}};
 let listener = () => {};
 globalThis.window={addEventListener(){},dispatchEvent(event){events.push([event.type,app.communityVoteStatus]);listener(event);}};
 globalThis.alert=message=>alerts.push(message);
 console.warn=(...args)=>warnings.push(args);
 let request=async()=>ok([]);
 globalThis.fetch=(url,options={})=>{
  const parsed=new URL(url);calls.push({url:parsed,options});
  if(options.method==='POST'){mockedWrites++;assert.equal(parsed.hostname,'amexss-voter.lukestaz.workers.dev');}
  else {mockedReads++;assert.equal(parsed.hostname,'faithful-marlin-205810.upstash.io');assert.equal(parsed.pathname,'/hgetall/amex:votes');assert.match(options.headers.Authorization,/^Bearer .+/);}
  return request(parsed,options);
 };
 const app=await import(pathToFileURL(path.join(directory,'votes.js')));
 return {app,state,storage,calls,events,alerts,warnings,setRequest:fn=>{request=fn;},listen:fn=>{listener=fn;}};
}
async function test(name,run){await run();passed.push(name);}
try {
 await test('initial status is loading and cache is prototype-safe',async()=>{
  const {app}=await fixture();assert.equal(app.communityVoteStatus,'loading');assert.equal(Object.getPrototypeOf(app.communityVotes),null);
 });
 await test('success sends one GET, publishes two states, and calls completion once',async()=>{
  const f=await fixture();f.setRequest(async()=>ok(['merchant:1:up','2','merchant:1:down',1]));
  const reference=f.app.communityVotes, completions=[];
  await f.app.fetchCommunityVotes(()=>completions.push(f.app.communityVoteStatus));
  assert.equal(f.calls.length,1);assert.equal(f.app.communityVotes,reference);
  assert.deepEqual(reference['merchant:1'],{up:2,down:1});assert.equal(Object.isFrozen(reference['merchant:1']),false);
  assert.deepEqual(f.events,[['amex-votes-updated','loading'],['amex-votes-updated','ready']]);assert.deepEqual(completions,['ready']);
 });
 await test('successful empty read clears old entries and is ready',async()=>{
  const f=await fixture();f.setRequest(async()=>ok(['merchant:1:up','1']));await f.app.fetchCommunityVotes();
  f.setRequest(async()=>ok([]));await f.app.fetchCommunityVotes();assert.equal(f.app.communityVoteStatus,'ready');assert.deepEqual(Object.keys(f.app.communityVotes),[]);
 });
 for(const [name,response] of [
  ['HTTP error',()=>({ok:false,status:503})],
  ['network rejection',()=>{throw Error('mock network failure');}],
  ['JSON rejection',()=>({ok:true,json:async()=>{throw Error('mock JSON failure');}})],
  ['malformed count',()=>ok(['merchant:1:up','broken'])],
  ['incomplete pair',()=>ok(['merchant:1:up'])],
  ['Redis error envelope',()=>({ok:true,json:async()=>({error:'mock service failure',result:[]})})],
 ]) await test(name+' is unavailable and preserves last data',async()=>{
  const f=await fixture();f.setRequest(async()=>ok(['merchant:1:up','2']));await f.app.fetchCommunityVotes();
  let callbacks=0;f.setRequest(async()=>response());await f.app.fetchCommunityVotes(()=>callbacks++);
  assert.equal(f.app.communityVoteStatus,'unavailable');assert.deepEqual(f.app.communityVotes['merchant:1'],{up:2,down:0});assert.equal(callbacks,1);
  f.setRequest(async()=>ok([]));await f.app.fetchCommunityVotes();assert.equal(f.app.communityVoteStatus,'ready');
 });
 await test('invalid trailing data never publishes a partial hash',async()=>{
  const f=await fixture();f.setRequest(async()=>ok(['merchant:1:up','2','other:down','broken']));await f.app.fetchCommunityVotes();
  assert.equal(f.app.communityVoteStatus,'unavailable');assert.deepEqual(Object.keys(f.app.communityVotes),[]);
 });
 await test('reserved Redis keys cannot change cache prototypes',async()=>{
  const f=await fixture();f.setRequest(async()=>ok(['__proto__:up','1','constructor:down','2']));await f.app.fetchCommunityVotes();
  assert.equal(Object.getPrototypeOf(f.app.communityVotes),null);assert.equal(f.app.communityVotes.__proto__.up,1);assert.equal(f.app.communityVotes.constructor.down,2);assert.equal(Object.prototype.up,undefined);
 });
 await test('overlapping callers share a read and each completes once',async()=>{
  const f=await fixture(),gate=deferred();f.setRequest(()=>gate.promise);let callbacks=0;
  const first=f.app.fetchCommunityVotes(()=>callbacks++),second=f.app.fetchCommunityVotes(()=>callbacks++);
  await Promise.resolve();assert.equal(f.calls.length,1);gate.resolve(ok([]));await Promise.all([first,second]);assert.equal(callbacks,2);assert.equal(f.events.length,2);
 });
 await test('reentrant loading notification shares the established request',async()=>{
  const f=await fixture();let nested;
  f.listen(()=>{if(f.app.communityVoteStatus==='loading')nested=f.app.fetchCommunityVotes();});
  await f.app.fetchCommunityVotes();await nested;assert.equal(f.calls.length,1);assert.equal(f.events.length,2);
 });
 await test('completion callback failure does not change transport success',async()=>{
  const f=await fixture();await f.app.fetchCommunityVotes(()=>{throw Error('mock observer failure');});assert.equal(f.app.communityVoteStatus,'ready');assert.equal(f.warnings.length,1);
 });
 for(const [up,down,label] of [[1,0,'Confirmed (1)'],[2,0,'Confirmed (2)'],[2,2,'Declined (2)'],[2,3,'Declined (3)'],[3,1,'Confirmed (3)'],[0,0,'']]) {
  await test(`existing badge precedence ${up}/${down} is preserved`,async()=>{
   const f=await fixture();f.setRequest(async()=>ok(['merchant:1:up',up,'merchant:1:down',down]));await f.app.fetchCommunityVotes();
   const badge=f.app.getVoteBadge('card-a','Shop');if(label)assert.ok(badge.includes(label));else assert.equal(badge,'');
   assert.equal(f.app.getVoteBadge('merchant:1','Shop'),badge);assert.equal(f.app.getVoteBadge('map-b','Shop'),badge);
  });
 }
 await test('post-read vote mutates copies, keeps canonical worker key and blocks map repeat',async()=>{
  const f=await fixture();f.setRequest(async(url,options)=>options.method==='POST'?{ok:true}:ok(['merchant:1:up','1']));
  await f.app.fetchCommunityVotes();await f.app.submitVote('card-a','Shop','up');
  assert.equal(f.app.communityVotes['merchant:1'].up,2);assert.equal(f.app.userVotes['merchant:1'],'up');assert.equal(f.alerts.length,0);
  const post=f.calls.find(call=>call.options.method==='POST');assert.equal(post.url.searchParams.get('id'),'merchant:1');assert.equal(post.url.searchParams.get('type'),'up');
  await f.app.submitVote('map-b','Shop','down');assert.equal(f.calls.filter(call=>call.options.method==='POST').length,1);assert.equal(f.alerts.length,1);
  assert.equal(JSON.parse(f.storage.get('amex_user_votes_v1'))['merchant:1'],'up');
 });
 await test('stored canonical vote blocks repeats after module reload',async()=>{
  const f=await fixture({stored:{'merchant:1':'up'}});await f.app.submitVote('card-a','Shop','down');assert.equal(f.calls.length,0);assert.equal(f.alerts.length,1);
 });
 await test('pending card vote blocks a concurrent map vote',async()=>{
  const f=await fixture(),gate=deferred();f.setRequest(()=>gate.promise);
  const first=f.app.submitVote('card-a','Shop','up');await f.app.submitVote('map-b','Shop','down');assert.equal(f.calls.length,1);gate.resolve({ok:true});await first;
 });
 await test('failed POST does not increment counts or persist a vote',async()=>{
  const f=await fixture();f.setRequest(async()=>({ok:false,status:503}));await f.app.submitVote('card-a','Shop','up');assert.equal(f.app.userVotes['merchant:1'],undefined);assert.equal(f.app.communityVotes['merchant:1'],undefined);assert.equal(f.alerts.length,1);
 });
 await test('confirmed vote survives browser storage failure',async()=>{
  const f=await fixture({storageFails:true});f.setRequest(async()=>({ok:true}));await f.app.submitVote('card-a','Shop','up');assert.equal(f.app.communityVotes['merchant:1'].up,1);assert.equal(f.app.userVotes['merchant:1'],'up');assert.equal(f.alerts.length,0);
 });
 await test('confirmed write during pending read invalidates stale result and later read recovers',async()=>{
  const f=await fixture(),gate=deferred();f.setRequest(async(url,options)=>options.method==='POST'?{ok:true}:gate.promise);
  const loading=f.app.fetchCommunityVotes();await Promise.resolve();await f.app.submitVote('card-a','Shop','up');gate.resolve(ok([]));await loading;
  assert.equal(f.app.communityVoteStatus,'unavailable');assert.equal(f.app.communityVotes['merchant:1'].up,1);
  f.setRequest(async()=>ok(['merchant:1:up','1']));await f.app.fetchCommunityVotes();assert.equal(f.app.communityVoteStatus,'ready');assert.equal(f.app.communityVotes['merchant:1'].up,1);
 });
 await test('confirmed write during JSON wait also invalidates stale result',async()=>{
  const f=await fixture(),gate=deferred(),reading=deferred();
  f.setRequest(async(url,options)=>options.method==='POST'?{ok:true}:{ok:true,json:()=>{reading.resolve();return gate.promise;}});
  const loading=f.app.fetchCommunityVotes();await reading.promise;await f.app.submitVote('card-a','Shop','down');gate.resolve({result:[]});await loading;
  assert.equal(f.app.communityVoteStatus,'unavailable');assert.equal(f.app.communityVotes['merchant:1'].down,1);
 });
 await test('failed write does not invalidate an otherwise successful pending read',async()=>{
  const f=await fixture(),gate=deferred();f.setRequest(async(url,options)=>options.method==='POST'?{ok:false,status:503}:gate.promise);
  const loading=f.app.fetchCommunityVotes();await Promise.resolve();await f.app.submitVote('card-a','Shop','up');gate.resolve(ok([]));await loading;assert.equal(f.app.communityVoteStatus,'ready');
 });
 console.log(JSON.stringify({passed:passed.length,tests:passed,mockedReads,mockedWrites,realNetworkRequests:0,limitations:'Store and DOM are fixtures; no browser, Leaflet, deployment or real service interaction.'}));
} finally {
 console.warn=originalWarn;
 for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
 await fs.rm(scratch,{recursive:true,force:true});
}
