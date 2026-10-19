import assert from 'node:assert/strict';
import fs from 'node:fs';
const importSource = text => import('data:text/javascript;base64,' + Buffer.from(text).toString('base64'));
const {decodeCommunityVoteHash:decode, createCommunityVoteReader:createReader} = await importSource(fs.readFileSync(process.argv[2] || 'js/community-vote-reader.js', 'utf8'));
const {summarizeCommunityReports:summary, communityReportMatches:matches} = await importSource(fs.readFileSync(process.argv[3] || 'js/community-reports.js', 'utf8'));
const passed = [];
async function test(name, run) {await run();passed.push(name);}
const plain = object => JSON.parse(JSON.stringify(object));

await test('decodes numeric and string counts without changing keys', () => {
  assert.deepEqual(plain(decode({result:['merchant:up','2','merchant:down',1]})), {merchant:{up:2,down:1}});
});
await test('splits at the final colon for legacy keys', () => {
  assert.deepEqual(plain(decode({result:['legacy:key:up','1']})), {'legacy:key':{up:1,down:0}});
});
await test('accepts genuine empty and explicit zero results', () => {
  assert.deepEqual(plain(decode({result:[]})), {});
  assert.deepEqual(plain(decode({result:['m:up','0']})), {m:{up:0,down:0}});
});
await test('returned records are immutable', () => {
  const votes = decode({result:['m:up','1']});
  assert.ok(Object.isFrozen(votes));assert.ok(Object.isFrozen(votes.m));
  assert.throws(() => {votes.m.up = 9;}, TypeError);
});
await test('reserved merchant keys cannot mutate prototypes', () => {
  const votes = decode({result:['__proto__:up','1','constructor:down','2']});
  assert.equal(Object.getPrototypeOf(votes), null);
  assert.equal(votes.__proto__.up, 1);assert.equal(votes.constructor.down, 2);
  assert.equal(Object.prototype.up, undefined);
});
for (const [name, payload] of [
  ['null payload',null], ['array payload',[]], ['missing result',{}],
  ['service error',{error:'redacted',result:[]}], ['non-array result',{result:{}}],
  ['incomplete pair',{result:['m:up']}], ['non-string field',{result:[1,'1']}],
  ['missing merchant key',{result:[':up','1']}], ['missing suffix',{result:['m','1']}],
  ['unknown suffix',{result:['m:other','1']}], ['duplicate field',{result:['m:up','1','m:up','2']}],
]) await test('rejects ' + name, () => assert.throws(() => decode(payload)));
for (const raw of [-1, 1.5, Infinity, NaN, true, false, null, {}, [], '', ' ', '-1', '+1', '1.5', '1x', '1e2', '9007199254740992']) {
  await test('rejects invalid count ' + String(raw), () => assert.throws(() => decode({result:['m:up',raw]})));
}
await test('rejects an invalid pair without publishing a partial result', () => {
  assert.throws(() => decode({result:['good:up','1','bad:down','broken']}));
});
await test('initial loading is not No reports', () => {
  const reader = createReader({request:() => ({result:[]})});
  const snapshot = reader.getSnapshot();
  assert.equal(snapshot.status, 'loading');
  const report = summary(['m'], snapshot.votes, snapshot.status);
  assert.equal(matches(report, 'none'), false);assert.equal(matches(report, 'all'), true);
});
await test('publishes loading then ready using a mocked response', async () => {
  const states = [];
  const reader = createReader({request:() => ({result:['m:up','1']}),onChange:snapshot => states.push(snapshot.status)});
  const result = await reader.load();
  assert.deepEqual(states, ['loading','ready']);assert.equal(result.status,'ready');
  assert.equal(summary(['m'],result.votes,result.status).kind,'accepted');
});
await test('overlapping loads share a single request', async () => {
  let requests = 0, resolve;
  const reader = createReader({request:() => {requests++;return new Promise(done => {resolve=done;});}});
  const first = reader.load(), second = reader.load();
  assert.equal(first,second);await Promise.resolve();assert.equal(requests,1);
  resolve({result:[]});await first;
});
await test('synchronous request failures become unavailable', async () => {
  const reader = createReader({request:() => {throw new Error('mock failure');}});
  const snapshot = await reader.load();assert.equal(snapshot.status,'unavailable');
  const report = summary(['m'],snapshot.votes,snapshot.status);
  for (const filter of ['accepted','declined','mixed','none']) assert.equal(matches(report,filter),false);
  assert.equal(matches(report,'all'),true);
});
await test('rejected requests and JSON errors become unavailable', async () => {
  for (const request of [() => Promise.reject(new Error('mock HTTP failure')), () => JSON.parse('{')]) {
    const reader = createReader({request});assert.equal((await reader.load()).status,'unavailable');
  }
});
await test('malformed response is unavailable rather than No reports', async () => {
  const reader = createReader({request:() => ({result:['m:up','broken']})});
  const snapshot = await reader.load();
  assert.equal(snapshot.status,'unavailable');assert.equal(matches(summary(['m'],snapshot.votes,snapshot.status),'none'),false);
});
await test('only a successful empty read permits No reports', async () => {
  const reader = createReader({request:() => ({result:[]})});
  const snapshot = await reader.load();assert.equal(snapshot.status,'ready');
  assert.equal(matches(summary(['m'],snapshot.votes,snapshot.status),'none'),true);
});
await test('failed refresh retains last data but does not classify it as current', async () => {
  let fail = false;
  const reader = createReader({request:() => {if(fail) throw new Error('mock failure');return {result:['m:up','2']};}});
  await reader.load();fail=true;const snapshot=await reader.load();
  assert.equal(snapshot.votes.m.up,2);assert.equal(snapshot.status,'unavailable');
  assert.equal(matches(summary(['m'],snapshot.votes,snapshot.status),'accepted'),false);
});
await test('a later successful read recovers from unavailable to mixed', async () => {
  let recover = false;
  const reader = createReader({request:() => {if(!recover) throw new Error('mock failure');return {result:['m:up','2','m:down','1']};}});
  await reader.load();recover=true;const snapshot=await reader.load();
  assert.equal(snapshot.status,'ready');assert.equal(summary(['m'],snapshot.votes,snapshot.status).kind,'mixed');
});
await test('observer failures do not strand loading or suppress results', async () => {
  const reader = createReader({request:() => ({result:['m:down','1']}),onChange:() => {throw new Error('mock observer failure');}});
  assert.equal((await reader.load()).status,'ready');assert.equal((await reader.load()).votes.m.down,1);
});
await test('reentrant observer loads share the already established request', async () => {
  let reader, requests=0, reentrant;
  reader = createReader({request:() => {requests++;return {result:[]};},onChange:snapshot => {if(snapshot.status==='loading') reentrant=reader.load();}});
  const first=reader.load();assert.equal(first,reentrant);await first;assert.equal(requests,1);
});
await test('snapshots and reader API cannot be mutated by observers', async () => {
  const reader=createReader({request:() => ({result:[]})});
  const snapshot=await reader.load();assert.ok(Object.isFrozen(reader));assert.ok(Object.isFrozen(snapshot));
  assert.throws(() => {snapshot.status='ready-again';},TypeError);
});
await test('invalid callback configuration is rejected', () => {
  assert.throws(() => createReader({request:null}),TypeError);
  assert.throws(() => createReader({request:() => ({}),onChange:null}),TypeError);
});
console.log(JSON.stringify({passed:passed.length,tests:passed,networkRequests:0}));
