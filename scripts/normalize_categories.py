#!/usr/bin/env python3
import collections, copy, json, pathlib, sys
from build_amex import RAW, OUT, REPORT, cache_key, fix_mojibake

RULES = pathlib.Path('data/category-rules.json')

def index_rules(rules):
    indexed = {}
    for group in rules['groups']:
        for subtype, display in group['subtypes'].items():
            if subtype in indexed:
                raise ValueError('Duplicate subtype rule: ' + subtype)
            indexed[subtype] = (group['category'], display)
    return indexed

def classify(source_type, source_subtype, rules, indexed):
    if source_subtype in indexed:
        return (*indexed[source_subtype], 'subtype-rule')
    return (rules['sourceTypes'].get(source_type, source_type or 'General'), source_subtype or 'Unspecified', 'source-type-fallback')

def self_test(rules, indexed):
    assert classify('General','Bar/Nightclub',rules,indexed)[:2] == ('Food & drink','Bars & pubs')
    assert classify('Restaurant','Bar/Nightclub',rules,indexed)[:2] == ('Food & drink','Bars & pubs')
    assert classify('Retail','Drug Store/Pharmacy',rules,indexed)[:2] == ('Health & wellbeing','Pharmacies')
    assert classify('Dining','',rules,indexed)[:2] == ('Food & drink','Unspecified')
    assert classify('Retail','Unrecognised subtype',rules,indexed)[:2] == ('Shopping','Unrecognised subtype')
    assert classify('Unknown category','',rules,indexed)[0] == 'Unknown category'
    print('Category regression checks passed: inconsistent source types, pharmacy, online, unknown subtype and unknown type')

def write_json(path, value, compact=False):
    path = pathlib.Path(path)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':') if compact else None, indent=None if compact else 2) + '\n', encoding='utf-8')
    temporary.replace(path)

def main():
    rules = json.loads(RULES.read_text(encoding='utf-8'))
    indexed = index_rules(rules)
    self_test(rules,indexed)
    if '--test-only' in sys.argv:
        return
    raw = json.loads(pathlib.Path(RAW).read_text(encoding='utf-8'))
    campaign = next(p['data'] for p in raw['payloads'] if p['url'].endswith('campaigndata.json'))
    sources = {}
    for record in campaign['merchantData']:
        key = ('instore',cache_key(record['SENumber'],fix_mojibake(record['address'])))
        if key in sources:
            raise ValueError('Duplicate source merchant identity')
        sources[key] = (record['type'],record.get('subType',''))
    for record in campaign['onlineMerchants']['data']:
        sources[('online',str(record['SENumber']))] = (record.get('category',''), '')
    body = json.loads(pathlib.Path(OUT).read_text(encoding='utf-8'))
    before = copy.deepcopy(body['merchants'])
    categories, unmapped, unknown_types = collections.Counter(), collections.Counter(), collections.Counter()
    changed = explicit = 0
    for record in body['merchants']:
        key = ('online',str(record['seNumber'])) if record.get('inStore') is False else ('instore',cache_key(record['seNumber'],record['address']))
        if key not in sources:
            raise ValueError('Built merchant lacks matching raw source: ' + repr(key))
        source_type, source_subtype = sources[key]
        category, display, method = classify(source_type,source_subtype,rules,indexed)
        changed += record.get('category') != category
        explicit += method == 'subtype-rule'
        record.update(sourceType=source_type,sourceSubType=source_subtype,category=category,displaySubType=display,categoryMethod=method)
        categories[category] += 1
        if source_subtype and method == 'source-type-fallback':
            unmapped[source_subtype] += 1
        if source_type not in rules['sourceTypes']:
            unknown_types[source_type] += 1
    allowed = {'sourceType','sourceSubType','category','displaySubType','categoryMethod'}
    assert len(before) == len(body['merchants'])
    for original, updated in zip(before,body['merchants']):
        assert {k:v for k,v in original.items() if k not in allowed} == {k:v for k,v in updated.items() if k not in allowed}, 'Non-category merchant data changed'
    body['meta']['categoryNormalization'] = 'explicit-subtype-rules-v1'
    report = json.loads(pathlib.Path(REPORT).read_text(encoding='utf-8'))
    report['meta'] = body['meta']
    report['categoryCleanup'] = {'rulesVersion':rules['schemaVersion'],'records':len(before),'changedCategories':changed,'explicitSubtypeMatches':explicit,'categoryCounts':dict(sorted(categories.items())),'unmappedSubtypes':dict(sorted(unmapped.items())),'unknownSourceTypes':dict(sorted(unknown_types.items()))}
    write_json(OUT,body,compact=True)
    write_json(REPORT,report)
    print(json.dumps(report['categoryCleanup']))

if __name__ == '__main__':
    main()
