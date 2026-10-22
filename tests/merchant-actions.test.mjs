import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../js/analytics.js');
const {trackEvent, recordMerchantAction, bindControlAnalytics, bindMapAnalytics} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const events=[], passed=[];
const test=async(name,run)=>{events.length=0;globalThis.umami={track:(name,data)=>events.push({name,data})};await run();passed.push(name);};
const target=action=>({closest:selector=>selector==='[data-merchant-action]'?{dataset:{merchantAction:action}}:selector==='button,a,input,select'?{}:null});
const click=(action='directions',isTrusted=true)=>({isTrusted,target:target(action)});
const expected=surface=>({name:'merchant-action',data:{action:'directions',surface}});
for(const surface of ['cards','map-card','map-popup']) await test('trusted action: '+surface,()=>{
 recordMerchantAction(click(),surface);assert.deepEqual(events,[expected(surface)]);
});
await test('synthetic, missing and unknown actions/surfaces ignored',()=>{
 for(const event of [click('directions',false),click('phone'),{},null]) recordMerchantAction(event,'cards');
 recordMerchantAction(click(),'unknown');assert.equal(events.length,0);
});
await test('tracker receives only allowlisted categories, not sensitive data',()=>{
 const element={dataset:{merchantAction:'directions',merchantId:'SECRET'}};
 Object.defineProperty(element,'href',{get(){throw Error('URL must not be inspected');}});
 recordMerchantAction({isTrusted:true,target:{closest:()=>element}},'cards');
 trackEvent('merchant-action',{action:'directions',surface:'map-popup',url:'SECRET',lat:1,search:'SECRET',merchantId:'SECRET'});
 assert.deepEqual(events,[expected('cards'),expected('map-popup')]);
});
await test('absent, throwing and rejecting trackers do not interrupt the action',async()=>{
 delete globalThis.umami;recordMerchantAction(click(),'cards');
 globalThis.umami={track(){throw Error('blocked');}};recordMerchantAction(click(),'cards');
 globalThis.umami={track:()=>Promise.reject(Error('offline'))};recordMerchantAction(click(),'cards');
 await new Promise(resolve=>setTimeout(resolve,0));
});
const handlers={},state={viewMode:'cards'};
globalThis.document={getElementById:id=>({addEventListener:(type,fn)=>{(handlers[id+':'+type]??=[]).push(fn);}})};
bindControlAnalytics(state);
const gridClick=event=>handlers['card-grid:click'].forEach(fn=>fn(event));
await test('delegated cards link emits once without preventing navigation',()=>{
 const event=click();event.preventDefault=()=>assert.fail('navigation blocked');event.stopPropagation=()=>assert.fail('propagation stopped');
 gridClick(event);assert.deepEqual(events,[expected('cards')]);
});
await test('delegated map-card link is not also a merchant selection',()=>{
 state.viewMode='map';gridClick(click());assert.deepEqual(events,[expected('map-card')]);
});
await test('map card-body selection remains unchanged',()=>{
 gridClick({isTrusted:true,target:{closest:selector=>selector==='[data-merchant-id]'?{}:null}});
 assert.deepEqual(events,[{name:'merchant-selected',data:{surface:'map-card'}}]);
});
await test('control binding remains idempotent',()=>{
 bindControlAnalytics(state);assert.equal(handlers['card-grid:click'].length,1);
 gridClick(click());assert.deepEqual(events,[expected('map-card')]);
});
await test('cards-only body clicks remain untracked',()=>{
 state.viewMode='cards';gridClick({isTrusted:true,target:{closest:()=>null}});assert.equal(events.length,0);
});
await test('existing location and Fit controls retain guards',()=>{
 handlers['compact-location:toggle'][0]({currentTarget:{open:true,hidden:false}});
 handlers['compact-location:toggle'][0]({currentTarget:{open:false,hidden:false}});
 handlers['compact-fit:click'][0]({isTrusted:false});handlers['compact-fit:click'][0]({isTrusted:true});
 assert.deepEqual(events,[{name:'location-opened',data:{}},{name:'map-fit-requested',data:{}}]);
});
const mapHandlers={},inputs={},groupHandlers={};
const group={zoomToShowLayer(){},getLayers(){return[];},on:(name,fn)=>{groupHandlers[name]=fn;}};
const map={getContainer:()=>({addEventListener:(name,fn)=>{inputs[name]=fn;}}),on:(name,fn)=>{mapHandlers[name]=fn;},eachLayer:fn=>fn(group)};
bindMapAnalytics(map);
const wait=()=>new Promise(resolve=>setTimeout(resolve,450));
await test('automatic zoom remains ignored',async()=>{mapHandlers.zoomend();await wait();assert.equal(events.length,0);});
await test('pan debounce remains intact',async()=>{mapHandlers.dragend();mapHandlers.dragend();await wait();assert.deepEqual(events,[{name:'map-navigated',data:{action:'pan'}}]);});
await test('trusted wheel zoom remains attributed',async()=>{inputs.wheel({isTrusted:true,type:'wheel'});mapHandlers.zoomend();await wait();assert.deepEqual(events,[{name:'map-navigated',data:{action:'zoom'}}]);});
await test('marker selection keeps its existing event and excludes clusters',()=>{
 groupHandlers.click({layer:{merchantItem:{}},originalEvent:{isTrusted:true}});
 groupHandlers.click({layer:{},originalEvent:{isTrusted:true}});
 assert.deepEqual(events,[{name:'merchant-selected',data:{surface:'map-marker'}}]);
});
const merchant={id:1,SENumber:'PRIVATE',title:'Private title',address:'Private address',lat:-36,lng:174};
await test('real card renderer tags Directions without changing its URL',()=>{
 const grid={innerHTML:''};
 const context={state:{filteredList:[merchant],displayedCount:10,savedIds:new Set()},getVoteBadge:()=>'',onlineBadge:()=>'',document:{getElementById:id=>id==='card-grid'?grid:null}};
 vm.runInNewContext(read('../js/cards.js').replace(/^import .*;\n/gm,'').replace(/^export /gm,''),context);
 context.renderCardsChunk();
 assert.match(grid.innerHTML,/data-merchant-action="directions" href="https:\/\/www.google.com\/maps\/search\/\?api=1&query=-36,174"/);
 assert.equal(events.length,0);
});
await test('real popup renderer tags and wires only Directions',()=>{
 const created=[];
 const document={createElement:tag=>{const node={tag,dataset:{},style:{},children:[],handlers:{},append(...items){this.children.push(...items);},addEventListener(name,fn){this.handlers[name]=fn;},setAttribute(){}};created.push(node);return node;}};
 const context={state:{savedIds:new Set()},document,getVoteBadge:()=>'',recordMerchantAction,trackEvent};
 vm.runInNewContext(read('../js/map.js').replace(/^import .*;\n/gm,'').replace(/^export /gm,''),context);
 context.popupFor(merchant);const link=created.find(node=>node.tag==='a');
 assert.equal(link.href,'https://www.google.com/maps/search/?api=1&query=-36%2C174');
 assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');
 assert.equal(link.dataset.merchantAction,'directions');assert.equal(events.length,0);
 link.handlers.click({isTrusted:true,target:{closest:()=>link}});assert.deepEqual(events,[expected('map-popup')]);
 events.length=0;link.handlers.click({isTrusted:false,target:{closest:()=>link}});assert.equal(events.length,0);
});
console.log(JSON.stringify({passed:passed.length,tests:passed}));
