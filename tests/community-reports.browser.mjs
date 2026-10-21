import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(process.argv[2]||'.'),deps=process.env.AMEX_BROWSER_DEPS;
if(!deps)throw Error('Set AMEX_BROWSER_DEPS to test node_modules');
const {chromium}=await import(pathToFileURL(path.join(deps,'playwright/index.mjs')));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser,posts=0,failed=false;
const errors=[],passed=[],blocked=new Set();
const fixture={merchants:[
 {id:1,SENumber:'s1',title:'Alpha',category:'Retail',address:'1 Queen Street, Auckland 1010',rawLocation:'Auckland',lat:-36.8485,lng:174.7633},
 {id:2,SENumber:'s2',title:'Beta',category:'Retail',address:'2 Queen Street, Auckland 1010',rawLocation:'Auckland',lat:-36.8486,lng:174.7634},
 {id:3,SENumber:'s3',title:'Gamma',category:'Retail',address:'3 Queen Street, Auckland 1010',rawLocation:'Auckland',lat:-36.8487,lng:174.7635},
 {id:4,SENumber:'s4',title:'Delta',category:'Retail',address:'4 Queen Street, Auckland 1010',rawLocation:'Auckland',lat:-36.8488,lng:174.7636}
]};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function eventually(check){let last;for(let i=0;i<100;i++){try{await check();return;}catch(e){last=e;await wait(100);}}throw last;}
try{
 await eventually(async()=>assert.equal((await fetch('http://127.0.0.1:8765/')).ok,true));
 browser=await chromium.launch({headless:true});
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},permissions:['geolocation'],geolocation:{latitude:-36.8485,longitude:174.7633}});
  await context.addInitScript(()=>localStorage.setItem('shop_small_offer_notice_2026','1'));
  let fields=['s1:up',2,'s2:down',1,'s3:up',3,'s3:down',1];failed=false;
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname==='faithful-marlin-205810.upstash.io')return failed?route.fulfill({status:503,body:'unavailable'}):route.fulfill({json:{result:fields}});
   if(url.hostname==='amexss-voter.lukestaz.workers.dev'){
    assert.equal(req.method(),'POST');posts++;const key=url.searchParams.get('id')+':'+url.searchParams.get('type'),i=fields.indexOf(key);if(i<0)fields.push(key,1);else fields[i+1]=Number(fields[i+1])+1;return route.fulfill({json:{ok:true}});
   }
   if(url.hostname==='unpkg.com'){
    const files={'/leaflet@1.9.4/dist/leaflet.js':['leaflet/dist/leaflet.js','application/javascript'],'/leaflet@1.9.4/dist/leaflet.css':['leaflet/dist/leaflet.css','text/css'],'/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js':['leaflet.markercluster/dist/leaflet.markercluster.js','application/javascript'],'/leaflet.markercluster@1.5.3/dist/MarkerCluster.css':['leaflet.markercluster/dist/MarkerCluster.css','text/css'],'/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css':['leaflet.markercluster/dist/MarkerCluster.Default.css','text/css']};
    const file=files[url.pathname];if(file)return route.fulfill({body:await fs.readFile(path.join(deps,file[0])),contentType:file[1]});
   }
   if(url.hostname==='tile.openstreetmap.org')return route.fulfill({body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY9sAAAAASUVORK5CYII=','base64'),contentType:'image/png'});
   if(url.origin==='http://127.0.0.1:8765'){
    if(url.pathname==='/data/amex.json')return route.fulfill({json:fixture});
    if(url.pathname==='/data.json')return route.fulfill({json:[{id:99,title:'Legacy',category:'Retail'}]});
    return route.continue();
   }
   blocked.add(url.hostname);return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.dismiss());
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  const ids=()=>page.evaluate(async()=>(await import('./js/store.js')).state.filteredList.map(m=>m.id));
  await eventually(async()=>assert.deepEqual(await ids(),[1,2,3,4]));
  for(const [filter,wanted]of [['accepted',[1]],['declined',[2]],['mixed',[3]],['none',[4]],['all',[1,2,3,4]]]){await page.selectOption('#community-reports-select',filter);await eventually(async()=>assert.deepEqual(await ids(),wanted));}
  passed.push(width+': five filters');
  await page.selectOption('#community-reports-select','accepted');await page.fill('#search-input','Beta');await eventually(async()=>assert.deepEqual(await ids(),[]));await page.click('#compact-clear');assert.equal(await page.inputValue('#search-input'),'');
  passed.push(width+': search and Clear');
  await page.click('#view-map-btn');await eventually(async()=>assert.equal(await page.evaluate(()=>window.__mapPerformance?.pins),4));
  await page.evaluate(async()=>{const {initMap}=await import('./js/map.js'),map=initMap();let group;map.eachLayer(l=>{if(typeof l.zoomToShowLayer==='function')group=l;});const marker=group.getLayers().find(m=>m.merchantItem.id===1);await new Promise(done=>group.zoomToShowLayer(marker,()=>{marker.openPopup();done();}));});
  await page.locator('.leaflet-popup-content button[aria-label="Amex declined / not accepted"]').click();
  await eventually(async()=>assert.match(await page.locator('.leaflet-popup-content .community-report-badge').innerText(),/Mixed reports.*2 accepted.*1 declined/));passed.push(width+': real Leaflet popup update');
  await page.selectOption('#community-reports-select','accepted');await eventually(async()=>assert.equal(await page.evaluate(()=>window.__mapPerformance?.pins),0));assert.equal(await page.locator('.leaflet-popup').count(),0);passed.push(width+': pin/popup removal');
  failed=true;await page.evaluate(async()=>{await (await import('./js/votes.js')).fetchCommunityVotes();});await page.selectOption('#community-reports-select','none');assert.equal(await page.locator('#empty-state').isVisible(),false);await page.click('#community-reports-show-all');failed=false;await page.click('#community-reports-retry');await eventually(async()=>assert.equal(await page.locator('#community-reports-status').isVisible(),false));passed.push(width+': failure and retry');
  await page.click('#view-cards-btn');await page.evaluate(()=>window.toggleNearMe());await eventually(async()=>assert.equal(await page.evaluate(async()=>(await import('./js/store.js')).state.currentSort),'distance'));passed.push(width+': controlled Near Me');
  await page.evaluate(async()=>{await window.switchDataset('legacy');});assert.equal(await page.locator('#community-reports-control').isVisible(),false);await page.evaluate(async()=>{await window.switchDataset('amex');});assert.equal(await page.inputValue('#community-reports-select'),'all');passed.push(width+': dataset boundaries');
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:passed.length,tests:passed,mockedPosts:posts,blockedExternalHosts:[...blocked],pageErrors:errors,limitations:'Controlled network, datasets, tiles and geolocation; no real votes, feedback, analytics, physical devices or saved-sharing protocol test.'}));
}finally{await browser?.close();server.kill();}
