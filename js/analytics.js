const allowed = {
  'merchant-action': {action:['directions'],surface:['cards','map-card','map-popup']},
  'location-opened': {},
  'location-filter-changed': {level:['city','area'],action:['select','clear']},
  'near-me-requested': {source:['button','sort']},
  'near-me-cleared': {},
  'near-me-result': {outcome:['success','denied','unavailable','timeout'],source:['button','sort']},
  'view-changed': {mode:['cards','map'],source:['control','availability']},
  'map-navigated': {action:['pan','zoom']},
  'merchant-selected': {surface:['map-marker','map-card']},
  'map-fit-requested': {}
};
export function trackEvent(name, properties = {}) {
  if (!Object.hasOwn(allowed, name)) return;
  const data = {};
  for (const [key, values] of Object.entries(allowed[name])) {
    if (values.includes(properties[key])) data[key] = properties[key];
  }
  try {
    const result = globalThis.umami?.track?.(name, data);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {}
}
// Record intent only; never inspect or send the link URL or merchant identity.
export function recordMerchantAction(event, surface) {
  if (!event?.isTrusted || !['cards', 'map-card', 'map-popup'].includes(surface)) return;
  const action = event.target?.closest?.('[data-merchant-action]')?.dataset?.merchantAction;
  if (action === 'directions') trackEvent('merchant-action', {action, surface});
}
const boundMaps = new WeakSet();
export function bindMapAnalytics(map) {
  if (boundMaps.has(map)) return;
  boundMaps.add(map);
  const container = map.getContainer();
  let zoomIntent = 0, navigationTimer;
  const navigation = action => {
    clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => trackEvent('map-navigated', {action}), 400);
  };
  const armZoom = event => {
    if (!event.isTrusted) return;
    if (event.type === 'touchstart' && event.touches.length < 2) return;
    if (event.type === 'keydown' && !['+','=','-','_'].includes(event.key)) return;
    if (event.type === 'click' && !event.target.closest('.leaflet-control-zoom-in,.leaflet-control-zoom-out')) return;
    if (event.type === 'dblclick' && event.target.closest('.leaflet-marker-icon,.leaflet-popup,.leaflet-control')) return;
    zoomIntent = performance.now() + 1500;
  };
  for (const type of ['wheel','dblclick','touchstart','keydown','click']) container.addEventListener(type, armZoom, {capture:true,passive:true});
  map.on('dragend', () => navigation('pan'));
  map.on('zoomend', () => {
    if (zoomIntent > performance.now()) navigation('zoom');
    zoomIntent = 0;
  });
  map.eachLayer(layer => {
    if (typeof layer.zoomToShowLayer !== 'function' || typeof layer.getLayers !== 'function') return;
    layer.on('click', event => {
      if (event.layer?.merchantItem && event.originalEvent?.isTrusted) trackEvent('merchant-selected', {surface:'map-marker'});
    });
  });
}
let controlsBound = false;
export function bindControlAnalytics(state) {
  if (controlsBound) return;
  controlsBound = true;
  document.getElementById('compact-location')?.addEventListener('toggle', event => {
    if (event.currentTarget.open && !event.currentTarget.hidden) trackEvent('location-opened');
  });
  document.getElementById('compact-fit')?.addEventListener('click', event => {
    if (event.isTrusted) trackEvent('map-fit-requested');
  });
  document.getElementById('card-grid')?.addEventListener('click', event => {
    recordMerchantAction(event, state.viewMode === 'map' ? 'map-card' : 'cards');
    if (!event.isTrusted || state.viewMode !== 'map' || event.target.closest('button,a,input,select')) return;
    if (event.target.closest('[data-merchant-id]')) trackEvent('merchant-selected', {surface:'map-card'});
  });
}
