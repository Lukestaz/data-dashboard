import { state } from './store.js';
import { getVoteBadge } from './votes.js';
import { renderCardsChunk } from './cards.js';
let mapInstance=null,clusterGroup=null,split=null,selectedId=null;
let baseMatches=[],viewportList=null,initialFit=false,busy=false,pending=false;
const markersById=new Map(),icons=new Map();
const get=id=>document.getElementById(id);
const hasPin=item=>item.lat!=null&&item.lng!=null&&Number.isFinite(Number(item.lat))&&Number.isFinite(Number(item.lng))&&Number(item.lat)!==0&&Number(item.lng)!==0;
const categoryOf=item=>String(item.category||item.Type||'Other');
const diagnostics={};
function record(key,value){diagnostics[key]=value;window.__mapPerformance={...diagnostics};}
function categoryColour(category){
 const palette=['#f97316','#3b82f6','#22c55e','#a78bfa','#ec4899','#f59e0b','#06b6d4','#94a3b8'];
 const key=category.toLowerCase();
 if(/food|drink|restaurant|cafe|dining/.test(key))return palette[0];
 if(/retail|shop/.test(key))return palette[1];
 if(/health|medical|wellness/.test(key))return palette[2];
 if(/service/.test(key))return palette[3];
 if(/stay|travel|accommodation|hotel/.test(key))return palette[4];
 if(/club|fun|entertainment/.test(key))return palette[5];
 let hash=0;for(const character of key)hash=(hash*31+character.charCodeAt(0))>>>0;
 return key==='other'?palette[7]:palette[hash%palette.length];
}
function pinIcon(item){
 const colour=categoryColour(categoryOf(item)),approx=item.loc==='approx',key=colour+':'+approx;
 if(!icons.has(key))icons.set(key,L.divIcon({className:'merchant-category-pin',html:`<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${approx?'#0f172a':colour};border:3px solid ${approx?colour:'#fff'};box-shadow:0 1px 4px #0008;box-sizing:border-box"></span>`,iconSize:[18,18],iconAnchor:[9,18],popupAnchor:[0,-18]}));
 return icons.get(key);
}
function popupFor(item){
 const title=item.title||item.Name||'Merchant',category=categoryOf(item),address=item.address||'',voteKey=item.seNumber||item.SENumber||item.id;
 const popup=document.createElement('div');popup.className='text-slate-100 font-sans';
 const categoryLabel=document.createElement('p');categoryLabel.className='text-xs';categoryLabel.style.color=categoryColour(category);categoryLabel.textContent=category;
 const heading=document.createElement('h4');heading.className='text-sm font-bold mt-1';heading.textContent=title;
 const addressLabel=document.createElement('p');addressLabel.className='text-xs text-slate-400 mt-1';addressLabel.textContent=address;
 const badge=document.createElement('div');badge.innerHTML=getVoteBadge(voteKey,title)||'';
 const controls=document.createElement('div');controls.className='flex flex-wrap items-center gap-2 mt-3 text-xs';
 const save=document.createElement('button');save.type='button';save.className='px-2 py-1 rounded bg-slate-800';save.textContent=state.savedIds.has(item.id)?'★ Saved':'☆ Save';save.addEventListener('click',()=>{window.toggleSaveFromMap(item.id,save);renderCardsChunk();});
 const prompt=document.createElement('span');prompt.textContent='Takes Amex?';controls.append(save,prompt);
 for(const[text,direction]of[['👍','up'],['👎','down']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.className='px-2 py-1 rounded bg-slate-800';button.setAttribute('aria-label',direction==='up'?'Confirmed Amex accepted':'Amex declined / not accepted');button.addEventListener('click',()=>window.submitVote(String(voteKey),title,direction));controls.append(button);}
 const directions=document.createElement('a');directions.textContent='Directions →';directions.className='text-blue-400';directions.target='_blank';directions.rel='noopener noreferrer';directions.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(item.loc==='approx'?title+' '+address:item.lat+','+item.lng);controls.append(directions);
 popup.append(categoryLabel,heading,badge,addressLabel);
 if(item.loc==='approx'){const approximate=document.createElement('p');approximate.className='text-xs text-amber-300';approximate.textContent='Approximate location';popup.append(approximate);}
 popup.append(controls);return popup;
}
function updateViewport(){
 if(!mapInstance||state.viewMode!=='map')return;
 const bounds=mapInstance.getBounds(),visible=baseMatches.filter(item=>hasPin(item)&&bounds.contains([Number(item.lat),Number(item.lng)]));
 const changed=!viewportList||visible.length!==viewportList.length||visible.some((item,index)=>item!==viewportList[index]);
 if(changed){viewportList=visible;state.filteredList=viewportList;state.displayedCount=state.PAGE_CHUNK;renderCardsChunk();get('cards-wrapper')?.scrollTo({top:0});}else state.filteredList=viewportList;
 if(get('total-count'))get('total-count').textContent=visible.length.toLocaleString();
 if(get('map-list-status'))get('map-list-status').textContent=`${visible.length.toLocaleString()} merchants in map area · ${baseMatches.length.toLocaleString()} match filters`;
 tagCards();
}
function selectCard(id,scroll=false){selectedId=String(id);const grid=get('card-grid');if(!grid)return;const index=state.filteredList.findIndex(item=>String(item.id)===selectedId);if(index>=state.displayedCount){state.displayedCount=Math.min(state.filteredList.length,index+state.PAGE_CHUNK);renderCardsChunk();}tagCards();const card=[...grid.children].find(node=>node.dataset.merchantId===selectedId);if(scroll&&card&&state.viewMode==='map'){const panel=get('cards-wrapper');panel.scrollTo({top:Math.max(0,card.offsetTop-panel.offsetTop-12),behavior:'smooth'});}}
function tagCards(){const grid=get('card-grid');if(!grid)return;[...grid.children].forEach((card,index)=>{const item=state.filteredList[index];if(!item)return;card.dataset.merchantId=String(item.id);card.classList.toggle('map-card-selected',String(item.id)===selectedId);});}
function focusMerchant(id){const marker=markersById.get(String(id));selectCard(id);if(!marker||!clusterGroup)return;clusterGroup.zoomToShowLayer(marker,()=>{mapInstance.panTo(marker.getLatLng());marker.openPopup();});}
function syncSplit(){if(!split)return;const active=state.viewMode==='map'&&!get('map-wrapper').classList.contains('hidden');split.classList.toggle('merchant-split-active',active);if(active){get('cards-wrapper').classList.remove('hidden');requestAnimationFrame(()=>{mapInstance?.invalidateSize();updateViewport();});}else if(viewportList&&state.filteredList===viewportList){state.filteredList=baseMatches;viewportList=null;state.displayedCount=state.PAGE_CHUNK;renderCardsChunk();if(get('total-count'))get('total-count').textContent=baseMatches.length.toLocaleString();}}
function setupSplit(){
 if(split)return;const cards=get('cards-wrapper'),map=get('map-wrapper'),grid=get('card-grid');if(!cards||!map||!grid)return;
 split=document.createElement('section');split.id='merchant-split';map.before(split);split.append(cards,map);
 const toolbar=document.createElement('div');toolbar.className='map-list-toolbar';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Hide merchant list';toggle.setAttribute('aria-expanded','true');toggle.addEventListener('click',()=>{const collapsed=split.classList.toggle('map-list-collapsed');toggle.textContent=collapsed?'Show merchant list':'Hide merchant list';toggle.setAttribute('aria-expanded',String(!collapsed));mapInstance?.invalidateSize();updateViewport();});
 const status=document.createElement('span');status.id='map-list-status';toolbar.append(status,toggle);split.prepend(toolbar);
 const style=document.createElement('style');style.textContent=`
 #merchant-split .map-list-toolbar{display:none;}
 #merchant-split.merchant-split-active{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;}
 .merchant-split-active .map-list-toolbar{display:flex!important;grid-column:1/-1;justify-content:space-between;align-items:center;gap:12px;color:#94a3b8;font-size:12px;}
 .map-list-toolbar button{padding:6px 10px;border:1px solid #475569;border-radius:6px;background:#1e293b;color:#e2e8f0;cursor:pointer;}
 .merchant-split-active #map-wrapper{grid-row:2;min-width:0;height:46vh;min-height:300px;margin:0!important;}
 .merchant-split-active #map{height:100%!important;min-height:0!important;}
 .merchant-split-active #cards-wrapper{grid-row:3;min-width:0;max-height:55vh;overflow-y:auto;overscroll-behavior:contain;margin:0!important;}
 .merchant-split-active #card-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:8px!important;}
 .merchant-split-active #card-grid>div{padding:12px!important;cursor:pointer;}
 .merchant-split-active #card-grid h3{font-size:14px;}
 .merchant-split-active #card-grid .map-card-selected{border-color:#60a5fa!important;box-shadow:0 0 0 1px #60a5fa;}
 .merchant-split-active.map-list-collapsed #cards-wrapper{display:none!important;}
 @media(min-width:1024px){
 #merchant-split.merchant-split-active{grid-template-columns:340px minmax(0,1fr);}
 .merchant-split-active #cards-wrapper{grid-column:1;grid-row:2;height:68vh;max-height:none;min-height:420px;}
 .merchant-split-active #map-wrapper{grid-column:2;grid-row:2;height:68vh;min-height:420px;}
 #merchant-split.merchant-split-active.map-list-collapsed{grid-template-columns:minmax(0,1fr);}
 .merchant-split-active.map-list-collapsed #map-wrapper{grid-column:1;}
 }`;document.head.append(style);
 new MutationObserver(syncSplit).observe(map,{attributes:true,attributeFilter:['class']});
 new MutationObserver(tagCards).observe(grid,{childList:true});
 grid.addEventListener('click',event=>{if(state.viewMode!=='map'||event.target.closest('button,a,input,select'))return;const card=event.target.closest('[data-merchant-id]');if(card)focusMerchant(card.dataset.merchantId);});
 cards.addEventListener('scroll',()=>{if(state.viewMode==='map'&&cards.scrollTop+cards.clientHeight>=cards.scrollHeight-160&&state.displayedCount<state.filteredList.length){state.displayedCount=Math.min(state.filteredList.length,state.displayedCount+state.PAGE_CHUNK);renderCardsChunk();}});tagCards();
}
export function initMap(){
 setupSplit();if(mapInstance){syncSplit();return mapInstance;}
 const start=performance.now();
 mapInstance=L.map('map',{center:state.userLat&&state.userLng?[state.userLat,state.userLng]:[-36.85,174.76],zoom:12});
 const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',maxZoom:19});
 let tileStart=start;tiles.on('loading',()=>{tileStart=performance.now();});tiles.on('load',()=>record('tilesMs',performance.now()-tileStart));tiles.addTo(mapInstance);
 clusterGroup=L.markerClusterGroup({chunkedLoading:true,chunkInterval:50,chunkDelay:20,maxClusterRadius:50,chunkProgress:(processed,total,elapsed)=>{if(processed===total){record('clusteringMs',elapsed);busy=false;if(pending){pending=false;queueMicrotask(updateMapMarkers);}}}});
 mapInstance.addLayer(clusterGroup);mapInstance.on('moveend',updateViewport);record('mapInitMs',performance.now()-start);return mapInstance;
}
export function updateMapMarkers(){
 if(!mapInstance||!clusterGroup)return;
 if(state.filteredList!==viewportList)baseMatches=[...state.filteredList];
 if(busy){pending=true;return;}
 const start=performance.now(),matches=baseMatches.filter(hasPin),wanted=new Set(matches.map(item=>String(item.id))),remove=[],add=[];
 let reused=0;
 for(const[id,marker]of markersById){if(!wanted.has(id)){remove.push(marker);markersById.delete(id);}}
 if(remove.length)clusterGroup.removeLayers(remove);
 for(const item of matches){
 const id=String(item.id),position=[Number(item.lat),Number(item.lng)],icon=pinIcon(item);
 let marker=markersById.get(id);
 if(marker){
 reused++;marker.merchantItem=item;
 const previous=marker.getLatLng();if(previous.lat!==position[0]||previous.lng!==position[1])marker.setLatLng(position);
 if(marker.options.icon!==icon)marker.setIcon(icon);
 if(marker.isPopupOpen())marker.setPopupContent(popupFor(item));
 }else{
 marker=L.marker(position,{icon,title:item.title||item.Name||'Merchant'});marker.merchantItem=item;
 marker.bindPopup(()=>popupFor(marker.merchantItem));
 marker.on('click',()=>selectCard(marker.merchantItem.id,true));markersById.set(id,marker);add.push(marker);
 }
 }
 record('markerPreparationMs',performance.now()-start);record('pins',matches.length);record('created',add.length);record('reused',reused);record('removed',remove.length);
 if(add.length){busy=true;clusterGroup.addLayers(add);}else record('clusteringMs',0);
 if(!initialFit&&matches.length){initialFit=true;if(!state.userLat)mapInstance.fitBounds(L.latLngBounds(matches.map(item=>[Number(item.lat),Number(item.lng)])),{padding:[40,40],maxZoom:14});}
 syncSplit();updateViewport();record('updateSyncMs',performance.now()-start);
}
