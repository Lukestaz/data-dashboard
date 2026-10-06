// Cross-Device Saved Lists Sync (Zero Backend)

export function getSyncUrl(savedIds) {
  const ids = Array.from(savedIds);
  const code = btoa(JSON.stringify(ids));
  return window.location.origin + window.location.pathname + '#sync=' + code;
}

export function parseSyncCode(rawInput) {
  let raw = (rawInput || '').trim();
  if (!raw) return null;
  if (raw.includes('#sync=')) {
    raw = raw.split('#sync=')[1];
  }
  try {
    const ids = JSON.parse(atob(raw));
    return Array.isArray(ids) ? ids : null;
  } catch (e) {
    return null;
  }
}

export function checkUrlSyncOnLoad(onMerge) {
  const hash = window.location.hash;
  if (hash && hash.startsWith('#sync=')) {
    const ids = parseSyncCode(hash);
    if (ids && ids.length > 0) {
      const shouldImport = confirm(`This link contains ${ids.length} saved merchants. Would you like to merge them into your saved list?`);
      if (shouldImport && typeof onMerge === 'function') {
        onMerge(ids);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
}
