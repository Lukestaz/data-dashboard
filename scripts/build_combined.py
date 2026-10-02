#!/usr/bin/env python3
"""Build the combined merchant dataset.

Inputs
  data-legacy.json                    curated cheapies.nz export (trusted names + coordinates)
  data/imports/amex-online-raw.json   Amex campaigndata.json capture (trusted SENumber, names,
                                      addresses, online list; coordinates are scrambled by Amex)
Outputs
  data.json                           combined dataset used by the site
  data/imports/merge-report.json      audit of how every record was matched
"""
import json, re, collections, unicodedata

LEGACY = 'data-legacy.json'
RAW = 'data/imports/amex-online-raw.json'

def fix_mojibake(s):
    try:
        return s.encode('latin-1').decode('utf-8')
    except (UnicodeEncodeError, UnicodeDecodeError):
        return s

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'\b(ltd|limited|nz|new zealand|the|and|co)\b', ' ', s.replace('&', ' and '))
    return re.sub(r'[^a-z0-9]', '', s)

def street_key(addr):
    first = norm((addr or '').split(',')[0])
    pcs = re.findall(r'\b(\d{4})\b', addr or '')
    return (first, pcs[-1] if pcs else '')

def town_from_address(addr):
    parts = [p.strip() for p in (addr or '').split(',') if p.strip()]
    parts = [p for p in parts if p.lower() != 'new zealand' and not re.fullmatch(r'\d{4}', p)]
    return parts[-1] if len(parts) >= 2 else ''

def title_case(s):
    return s if any(c.islower() for c in s) else s.title()

legacy = json.load(open(LEGACY, encoding='utf-8'))
raw = json.load(open(RAW, encoding='utf-8'))
camp = next(p for p in raw['payloads'] if p['url'].endswith('campaigndata.json'))['data']
captured_at = raw.get('timestamp')
amex = camp['merchantData']
online = camp['onlineMerchants']['data']
for r in amex:
    r['name'] = fix_mojibake(r['name']); r['address'] = fix_mojibake(r['address'])

# Category mapping Amex type -> legacy category, learned from matched pairs
amex_by_street = collections.defaultdict(list)
for r in amex:
    amex_by_street[street_key(r['address'])].append(r)

used_se = set()
report = collections.Counter()
out = []
type_votes = collections.defaultdict(collections.Counter)

for m in legacy:
    rec = dict(m)
    rec['category'] = 'Retail' if rec.get('category') == 'RETAIL' else rec.get('category')
    cands = [c for c in amex_by_street.get(street_key(m['address']), []) if c['SENumber'] not in used_se]
    match = None
    if len(cands) == 1:
        match = cands[0]; report['legacy_matched_street_postcode'] += 1
    elif len(cands) > 1:
        nm = norm(m['title'])
        best = [c for c in cands if norm(c['name']) == nm] or \
               [c for c in cands if nm and (nm in norm(c['name']) or norm(c['name']) in nm)]
        if len(best) >= 1:
            match = best[0]; report['legacy_matched_street_postcode_name'] += 1
        else:
            report['legacy_ambiguous_street'] += 1
    else:
        report['legacy_unmatched'] += 1
    if match:
        used_se.add(match['SENumber'])
        rec['seNumber'] = match['SENumber']
        type_votes[match['type']][rec['category']] += 1
    rec['inStore'] = True
    rec['locVerified'] = bool(m.get('lat') and m.get('lng'))
    rec['source'] = 'curated'
    out.append(rec)

type_map = {t: v.most_common(1)[0][0] for t, v in type_votes.items()}
fallback = {'Lodging': 'Travel Related', 'Restaurant': 'Restaurants', 'Health Care Services': 'Health Care',
            'Auto Rental': 'Car Rental', 'Travel': 'Travel Related', 'Education Services': 'Education',
            'Professional & Fin Svcs': 'Professional Services', 'Profession & Fin Svcs': 'Professional Services',
            'Commercial Supplier': 'General', 'Services': 'General', 'Communication': 'Telecom'}
def map_type(t):
    return type_map.get(t) or fallback.get(t) or t

next_id = max(m['id'] for m in legacy) + 1
for r in amex:
    if r['SENumber'] in used_se:
        continue
    out.append({
        'id': next_id, 'title': title_case(r['name']), 'category': map_type(r['type']),
        'subType': r.get('subType', ''), 'city': town_from_address(r['address']), 'region': '',
        'address': r['address'], 'lat': None, 'lng': None,
        'seNumber': r['SENumber'], 'inStore': True, 'locVerified': False, 'source': 'amex-2026-10-02',
    })
    used_se.add(r['SENumber']); next_id += 1
    report['amex_added_unverified_location'] += 1

# Online flag
by_se = {o['seNumber']: o for o in out if o.get('seNumber')}
by_name = collections.defaultdict(list)
for o in out:
    by_name[norm(o['title'])].append(o)

def clean_url(u):
    u = (u or '').strip()
    if not u: return ''
    u = u.lower() if re.match(r'^https?://', u, re.I) else 'https://' + u.lower()
    return u

for r in online:
    url = clean_url(r.get('url'))
    target = by_se.get(r['SENumber'])
    how = 'online_matched_se'
    if not target:
        hits = by_name.get(norm(r['name']), [])
        if hits and norm(r['name']):
            target, how = hits, 'online_matched_name'
    if target:
        for t in (target if isinstance(target, list) else [target]):
            t['isOnline'] = True; t['website'] = url
            t.setdefault('onlineSeNumber', r['SENumber'])
        report[how] += 1
    else:
        out.append({
            'id': next_id, 'title': title_case(fix_mojibake(r['name'])), 'category': map_type(r['category']),
            'subType': '', 'city': '', 'region': '', 'address': '', 'lat': None, 'lng': None,
            'seNumber': r['SENumber'], 'inStore': False, 'isOnline': True, 'website': url,
            'locVerified': False, 'source': 'amex-online-2026-10-02',
        })
        next_id += 1; report['online_only_added'] += 1

for o in out:
    o.setdefault('isOnline', False)

json.dump(out, open('data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
summary = {
    'capturedAt': captured_at, 'legacyRecords': len(legacy), 'amexInStore': len(amex),
    'amexOnline': len(online), 'combinedRecords': len(out), 'counts': dict(report),
    'categoryMapLearned': type_map,
    'notes': 'Amex coordinates are scrambled at source (verified: Canzac Christchurch pin shows in Takapuna on Amex map). '
             'Curated coordinates kept; Amex-only records have no pin.',
}
json.dump(summary, open('data/imports/merge-report.json', 'w'), indent=2)
print(json.dumps(summary, indent=2))
