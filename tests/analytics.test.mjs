import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(process.argv[2], 'utf8');
const appSource = fs.readFileSync(process.argv[3], 'utf8');
const {trackEvent,bindMapAnalytics,bindControlAnalytics} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const events = [], results = [];
const test = async (name, run) => {await run();results.push(name);};
const reset = () => {events.length=0;globalThis.umami={track:(name,data)=>events.push({name,data})};};
const wait = () => new Promise(resolve=>setTimeout(resolve,450));
await test('unknown names rejected and sensitive/unapproved properties removed',()=>{
 reset();trackEvent('secret-event',{lat:1});trackEvent('merchant-selected',{surface:'map-marker',id:'SECRET',lat:1});
 assert.deepEqual(events,[{name:'merchant-selected',data:{surface:'map-marker'}}]);
});
await test('absent, throwing and rejecting trackers do not interrupt actions',async()=>{
 delete globalThis.umami;trackEvent('location-opened');globalThis.umami={track(){throw Error('blocked');}};trackEvent('location-opened');
 globalThis.umami={track:()=>Promise.reject(Error('offline'))};trackEvent('location-opened');await new Promise(resolve=>setTimeout(resolve,0));
});
const containerHandlers={}, mapHandlers={}, groupHandlers={};
const group={zoomToShowLayer(){},getLayers(){return [];},on:(name,fn)=>{groupHandlers[name]=fn;}};
const map={getContainer:()=>({addEventListener:(name,fn)=>{containerHandlers[name]=fn;}}),on:(name,fn)=>{mapHandlers[name]=fn;},eachLayer:fn=>fn(group)};
bindMapAnalytics(map);
await test('automatic zoom changes without user input do not emit navigation',async()=>{
 reset();mapHandlers.zoomend();await wait();assert.equal(events.length,0);
});
await test('rapid deliberate pans debounce to one event',async()=>{
 reset();mapHandlers.dragend();mapHandlers.dragend();await wait();assert.deepEqual(events,[{name:'map-navigated',data:{action:'pan'}}]);
});
await test('trusted wheel zoom emits once and clears intent',async()=>{
 reset();containerHandlers.wheel({isTrusted:true,type:'wheel'});mapHandlers.zoomend();await wait();mapHandlers.zoomend();await wait();
 assert.deepEqual(events,[{name:'map-navigated',data:{action:'zoom'}}]);
});
await test('synthetic inputs and non-zoom keys do not arm zoom tracking',async()=>{
 reset();containerHandlers.wheel({isTrusted:false,type:'wheel'});mapHandlers.zoomend();
 containerHandlers.keydown({isTrusted:true,type:'keydown',key:'ArrowRight'});mapHandlers.zoomend();await wait();assert.equal(events.length,0);
});
await test('direct marker clicks count; clusters and synthetic popup activity do not',()=>{
 reset();groupHandlers.click({layer:{merchantItem:{}},originalEvent:{isTrusted:true}});groupHandlers.click({layer:{},originalEvent:{isTrusted:true}});groupHandlers.click({layer:{merchantItem:{}},originalEvent:{isTrusted:false}});
 assert.deepEqual(events,[{name:'merchant-selected',data:{surface:'map-marker'}}]);
});
await test('map binding is idempotent',()=>{
 const previous=mapHandlers.dragend;bindMapAnalytics(map);assert.equal(mapHandlers.dragend,previous);
});
const handlers={};
globalThis.document={getElementById:id=>({addEventListener:(type,fn)=>{handlers[id+':'+type]=fn;}})};
const state={viewMode:'map'};bindControlAnalytics(state);
await test('location only records open states, not closing or hidden menus',()=>{
 reset();handlers['compact-location:toggle']({currentTarget:{open:true,hidden:false}});handlers['compact-location:toggle']({currentTarget:{open:false,hidden:false}});handlers['compact-location:toggle']({currentTarget:{open:true,hidden:true}});
 assert.deepEqual(events,[{name:'location-opened',data:{}}]);
});
await test('map card selection excludes embedded actions and cards-only mode',()=>{
 reset();const cardTarget={closest:selector=>selector==='[data-merchant-id]'?{}:null};
 handlers['card-grid:click']({isTrusted:true,target:cardTarget});handlers['card-grid:click']({isTrusted:true,target:{closest:()=>({})}});
 state.viewMode='cards';handlers['card-grid:click']({isTrusted:true,target:cardTarget});
 assert.deepEqual(events,[{name:'merchant-selected',data:{surface:'map-card'}}]);
});
await test('Fit results requires a trusted click',()=>{
 reset();handlers['compact-fit:click']({isTrusted:true});handlers['compact-fit:click']({isTrusted:false});assert.deepEqual(events,[{name:'map-fit-requested',data:{}}]);
});
let success, failure;
const appState={viewMode:'cards',userLat:null,userLng:null,activeTown:'All',merchants:[],savedIds:new Set(),filteredList:[],currentSort:'default'};
const context={state:appState,trackEvent,bindMapAnalytics:()=>{},bindControlAnalytics:()=>{},document:{getElementById:()=>null},navigator:{geolocation:{getCurrentPosition:(ok,bad)=>{success=ok;failure=bad;}}},alert:()=>{},setTimeout:()=>{},submitVote:()=>{},initMap:()=>map,updateMapMarkers:()=>{},renderCardsChunk:()=>{},availabilityMatches:()=>true,subtypeMatches:()=>true,locationMatches:()=>true,subtypeLabel:()=>'',window:{addEventListener:()=>{}}};
const runnable=appSource.replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
vm.runInNewContext(runnable,context);
await test('Near Me success and button origin',()=>{
 reset();context.window.toggleNearMe();success({coords:{latitude:-36,longitude:174}});
 assert.deepEqual(events,[{name:'near-me-requested',data:{source:'button'}},{name:'near-me-result',data:{outcome:'success',source:'button'}}]);
 assert.equal(appState.userLat,-36);
});
await test('clearing Near Me does not request geolocation again',()=>{
 reset();context.window.toggleNearMe();assert.deepEqual(events,[{name:'near-me-cleared',data:{}}]);assert.equal(appState.userLat,null);
});
for(const [code,outcome] of [[1,'denied'],[2,'unavailable'],[3,'timeout']]) await test('Near Me error '+outcome,()=>{
 reset();context.window.toggleNearMe();failure({code,message:'private-message'});
 assert.deepEqual(events,[{name:'near-me-requested',data:{source:'button'}},{name:'near-me-result',data:{outcome,source:'button'}}]);
});
await test('unsupported geolocation produces unavailable outcome',()=>{
 reset();const previous=context.navigator.geolocation;delete context.navigator.geolocation;context.window.toggleNearMe();context.navigator.geolocation=previous;
 assert.equal(events[1].data.outcome,'unavailable');
});
await test('Nearest sort request is attributed to sort, not button',()=>{
 reset();context.window.changeSort('distance');assert.deepEqual(events,[{name:'near-me-requested',data:{source:'sort'}}]);
});
await test('view events only occur on transitions and distinguish availability changes',()=>{
 reset();context.window.setViewMode('cards');context.window.setViewMode('map');context.window.setViewMode('cards','availability');
 assert.deepEqual(events,[{name:'view-changed',data:{mode:'map',source:'control'}},{name:'view-changed',data:{mode:'cards',source:'availability'}}]);
});
await test('city selection and clear omit location values and ignore no-op changes',()=>{
 reset();context.window.handleTownChange('Private City');context.window.handleTownChange('Private City');context.window.clearTown();
 assert.deepEqual(events,[{name:'location-filter-changed',data:{level:'city',action:'select'}},{name:'location-filter-changed',data:{level:'city',action:'clear'}}]);
});
console.log(JSON.stringify({passed:results.length,tests:results}));
