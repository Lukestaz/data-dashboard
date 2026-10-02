#!/usr/bin/env python3
"""Build data/amex.json from the latest Amex capture (Amex = source of truth).

- Membership, names, addresses, SENumber, online list: from Amex campaigndata.json.
- Coordinates: NEVER from Amex (scrambled at source). Taken from data/geocache.json,
  keyed by SENumber + address. Cache is seeded from curated cheapies pins (data.json)
  and filled by scripts/geocode.py.

Usage: python3 scripts/build_amex.py [--seed] [--min-ratio 0.95]
"""
import json, re, sys, collections, unicodedata, os, statistics

RAW = 'data/imports/amex-online-raw.json'
OUT = 'data/amex.json'
CACHE = 'data/geocache.json'
LEGACY = 'data.json'
REPORT = 'data/imports/amex-build-report.json'

def fix_mojibake(s):
    try: return s.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError): return s

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(ltd|limited|nz|new zealand|the|and|co)\b', ' ', s.replace('&', ' and '))
    return re.sub(r'[^a-z0-9]', '', s)

def postcode(a):
    m = re.findall(r'\b(\d{4})\b', a or ''); return m[-1] if m else ''

def street(a):
    return norm((a or '').split(',')[0])

def street_variants(a):
    """Street keys tolerant of 'Shop 3/12 X St', '30/32 X St', 'The Mall 19/25 X St'."""
    out = set()
    for part in (a or '').split(',')[:2]:
        p = part.lower()
        m = re.search(r'(\d+[a-z]?)\s+([a-z\' ]+?(street|st|road|rd|avenue|ave|drive|dr|place|pl|lane|ln|terrace|tce|quay|highway|hwy|way|crescent|cres|parade|square|boulevard|esplanade|mall))\b', p)
        if m:
            out.add(norm(m.group(1) + m.group(2)))
            out.add('nonum:' + norm(m.group(2)))
    return out

def town_from_address(addr):
    parts = [p.strip() for p in (addr or '').split(',') if p.strip()]
    parts = [p for p in parts if p.lower() != 'new zealand' and not re.fullmatch(r'\d{4}', p)]
    return parts[-1] if len(parts) >= 2 else ''

def title_case(s):
    return s if any(c.islower() for c in s) else s.title()

def clean_url(u):
    u = (u or '').strip()
    if not u: return ''
    return u.lower() if re.match(r'^https?://', u, re.I) else 'https://' + u.lower()

CAT_MAP = {'Restaurant': 'Restaurants', 'Lodging': 'Travel Related', 'Travel': 'Travel Related',
           'Health Care Services': 'Health Care', 'Auto Rental': 'Car Rental',
           'Education Services': 'Education', 'Professional & Fin Svcs': 'Professional Services',
           'Profession & Fin Svcs': 'Professional Services', 'Commercial Supplier': 'Retail',
           'Services': 'General', 'Communication': 'Telecom'}

def cache_key(se, addr):
    return f"{se}|{norm(addr)}"

def main():
    args = sys.argv[1:]
    min_ratio = float(args[args.index('--min-ratio') + 1]) if '--min-ratio' in args else 0.95
    raw = json.load(open(RAW, encoding='utf-8'))
    camp = next(p for p in raw['payloads'] if p['url'].endswith('campaigndata.json'))['data']
    instore, online = camp['merchantData'], camp['onlineMerchants']['data']
    for r in instore:
        r['name'] = fix_mojibake(r['name']); r['address'] = fix_mojibake(r['address'])

    # Safety: schema + count guard vs previous build
    assert instore and all('SENumber' in r and 'address' in r for r in instore), 'Unexpected Amex schema'
    if os.path.exists(OUT):
        prev = json.load(open(OUT, encoding='utf-8'))
        prev_n = prev['meta']['inStoreCount']
        if len(instore) < prev_n * min_ratio:
            sys.exit(f'ABORT: in-store count {len(instore)} < {min_ratio:.0%} of previous {prev_n}')

    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    stats = collections.Counter()

    if '--seed' in args:
        legacy = json.load(open(LEGACY, encoding='utf-8'))
        by_np, by_sv = collections.defaultdict(list), collections.defaultdict(list)
        for m in legacy:
            if not (m.get('lat') and m.get('lng')): continue
            pc = postcode(m['address'])
            by_np[(street(m['address']), pc)].append(m)
            by_np[('name:' + norm(m['title']), pc)].append(m)
            for v in street_variants(m['address']):
                by_sv[(v, pc)].append(m)
        for r in instore:
            k = cache_key(r['SENumber'], r['address'])
            if k in cache: continue
            pc = postcode(r['address']); nm = norm(r['name'])
            hit, how = None, None
            c = by_np.get((street(r['address']), pc), [])
            if len(c) == 1: hit, how = c[0], 'street+postcode'
            elif c:
                n2 = [m for m in c if norm(m['title']) == nm or (nm and (nm in norm(m['title']) or norm(m['title']) in nm))]
                if n2: hit, how = n2[0], 'street+postcode+name'
            if not hit:
                c = by_np.get(('name:' + nm, pc), [])
                if len(c) == 1: hit, how = c[0], 'name+postcode'
            if not hit:
                for v in street_variants(r['address']):
                    c = [m for m in by_sv.get((v, pc), []) if not v.startswith('nonum:') or norm(m['title']) == nm]
                    if len(c) == 1: hit, how = c[0], 'street-variant+postcode'; break
            if hit:
                cache[k] = {'lat': hit['lat'], 'lng': hit['lng'], 'src': 'cheapies', 'how': how}
                stats['seeded_' + how] += 1

    # Postcode centroids (fallback, approximate)
    pcs = collections.defaultdict(list)
    for r in instore:
        g = cache.get(cache_key(r['SENumber'], r['address']))
        if g and g.get('src') in ('cheapies', 'nominatim'):
            pcs[postcode(r['address'])].append((g['lat'], g['lng']))
    centroid = {pc: (statistics.median(a for a, _ in v), statistics.median(b for _, b in v)) for pc, v in pcs.items() if pc}

    online_by_se = {o['SENumber']: o for o in online}
    online_by_name = collections.defaultdict(list)
    for o in online: online_by_name[norm(o['name'])].append(o)

    out, used_online, nid = [], set(), 1
    for r in instore:
        g = cache.get(cache_key(r['SENumber'], r['address']))
        lat = lng = None; loc = 'none'
        if g and g.get('lat') is not None:
            lat, lng, loc = g['lat'], g['lng'], 'exact'
        elif centroid.get(postcode(r['address'])):
            lat, lng = centroid[postcode(r['address'])]; loc = 'approx'
        stats['loc_' + loc] += 1
        o = online_by_se.get(r['SENumber'])
        if not o:
            hits = online_by_name.get(norm(r['name']), [])
            o = hits[0] if len(hits) == 1 else None
        rec = {'id': nid, 'seNumber': r['SENumber'], 'title': title_case(r['name']),
               'category': CAT_MAP.get(r['type'], r['type']), 'subType': r.get('subType', ''),
               'city': town_from_address(r['address']), 'region': '', 'address': r['address'],
               'lat': lat, 'lng': lng, 'loc': loc, 'inStore': True, 'isOnline': bool(o),
               'website': clean_url(o['url']) if o else ''}
        if o: used_online.add(o['SENumber']); stats['instore_also_online'] += 1
        out.append(rec); nid += 1
    for o in online:
        if o['SENumber'] in used_online: continue
        out.append({'id': nid, 'seNumber': o['SENumber'], 'title': title_case(fix_mojibake(o['name'])),
                    'category': CAT_MAP.get(o['category'], o['category']), 'subType': '', 'city': '',
                    'region': '', 'address': '', 'lat': None, 'lng': None, 'loc': 'none',
                    'inStore': False, 'isOnline': True, 'website': clean_url(o['url'])})
        nid += 1; stats['online_only'] += 1

    meta = {'source': 'Amex Shop Small NZ campaigndata.json', 'capturedAt': raw.get('timestamp'),
            'inStoreCount': len(instore), 'onlineCount': len(online), 'records': len(out)}
    json.dump({'meta': meta, 'merchants': out}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'meta': meta, 'stats': dict(stats)}, open(REPORT, 'w'), indent=2)
    print(json.dumps({'meta': meta, 'stats': dict(stats)}, indent=2))

if __name__ == '__main__':
    main()
