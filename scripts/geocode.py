#!/usr/bin/env python3
"""Geocode Amex merchants missing from data/geocache.json via OpenStreetMap Nominatim.

Respects Nominatim policy: 1 request/second, identifying User-Agent. Resumable: saves
progress every 25 lookups. Results outside NZ or far from the postcode band are rejected.
Usage: python3 scripts/geocode.py [--max N]
"""
import json, re, sys, time, urllib.parse, urllib.request, os
sys.path.insert(0, os.path.dirname(__file__))
from build_amex import RAW, CACHE, cache_key, fix_mojibake, postcode

UA = 'Lukestaz-data-dashboard/1.0 (https://github.com/Lukestaz/data-dashboard)'
BAND = {'0': (-36.95, -34.3), '1': (-37.0, -36.7), '2': (-37.4, -36.8), '3': (-39.3, -36.7),
        '4': (-41.0, -38.4), '5': (-41.5, -40.3), '6': (-41.4, -41.1), '7': (-43.6, -40.4),
        '8': (-44.0, -43.3), '9': (-47.4, -44.3)}

def plausible(lat, lng, pc):
    if not (-47.5 <= lat <= -34.0 and 166.0 <= lng <= 178.8): return False
    if pc and pc[0] in BAND:
        lo, hi = BAND[pc[0]]
        return lo - 0.3 <= lat <= hi + 0.3
    return True

def queries(addr):
    parts = [p.strip() for p in addr.split(',') if p.strip() and p.strip().lower() != 'new zealand']
    pc = postcode(addr)
    no_pc = [p for p in parts if not re.fullmatch(r'\d{4}', p)]
    st = re.sub(r'^(shop|unit|level|suite|tenancy)\s*\S+\s*', '', no_pc[0], flags=re.I) if no_pc else ''
    st = re.sub(r'^\d+[a-z]?/', '', st, flags=re.I)
    town = no_pc[-1] if len(no_pc) > 1 else ''
    seen = []
    for q in [', '.join(no_pc + [pc]), f'{st}, {town} {pc}', f'{st}, {pc}', f'{st}, {town}']:
        q = q.strip(', ')
        if q and q not in seen: seen.append(q)
    return seen

def lookup(q):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'json', 'limit': 1, 'countrycodes': 'nz'})
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        res = json.load(r)
    time.sleep(1.1)
    return (float(res[0]['lat']), float(res[0]['lon'])) if res else None

def main():
    mx = int(sys.argv[sys.argv.index('--max') + 1]) if '--max' in sys.argv else 10**9
    raw = json.load(open(RAW, encoding='utf-8'))
    camp = next(p for p in raw['payloads'] if p['url'].endswith('campaigndata.json'))['data']
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    todo = []
    for r in camp['merchantData']:
        addr = fix_mojibake(r['address']); k = cache_key(r['SENumber'], addr)
        if k not in cache: todo.append((k, addr))
    print(f'{len(todo)} merchants need geocoding; doing up to {mx}')
    done = ok = errs = 0
    for k, addr in todo[:mx]:
        pc = postcode(addr); hit = None; failed_net = False
        for q in queries(addr):
            try:
                g = lookup(q); errs = 0
            except Exception as e:
                print('error', e, flush=True); errs += 1; failed_net = True
                time.sleep(min(60, 5 * errs)); g = None
                if errs >= 10:
                    print('Too many errors (rate limited?); saving and stopping.')
                    json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
                    return
                break
            if g and plausible(*g, pc):
                hit = g; break
        if failed_net and not hit:
            continue  # retry next run rather than caching a failure
        cache[k] = {'lat': hit[0], 'lng': hit[1], 'src': 'nominatim'} if hit else {'lat': None, 'lng': None, 'src': 'failed'}
        ok += bool(hit); done += 1
        if done % 25 == 0:
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
            print(f'{done}/{min(mx, len(todo))} ok={ok}', flush=True)
    json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'done {done}, found {ok}')

if __name__ == '__main__':
    main()
