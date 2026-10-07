#!/usr/bin/env python3
import collections, json, math, pathlib, re, subprocess, sys
from stable_ids import identity
from build_amex import cache_key

def supported_pin(lat, lng):
    if isinstance(lat, bool) or isinstance(lng, bool):
        return False
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return False
    return math.isfinite(lat) and math.isfinite(lng) and -47.5 <= lat <= -34.0 and 166.0 <= lng <= 178.8

def overseas_address(address):
    return any(re.fullmatch(r'vic|qld|nsw|sa|wa|tas|act|nt|victoria|queensland|new south wales|south australia|western australia|tasmania|australia', part.strip(), re.I) for part in (address or '').split(','))

def guard_locations(records, cache):
    rejected = []
    for key, value in list(cache.items()):
        if value.get('lat') is not None and not supported_pin(value.get('lat'), value.get('lng')):
            del cache[key]
    for record in records:
        if record.get('inStore') is False:
            continue
        address = record.get('address') or ''
        issue = 'suspected-overseas-address' if overseas_address(address) else None
        if not issue and (record.get('lat') is not None or record.get('lng') is not None) and not supported_pin(record.get('lat'), record.get('lng')):
            issue = 'outside-supported-nz-map-area-or-invalid-coordinate'
        if issue:
            cache.pop(cache_key(record.get('seNumber') or record.get('SENumber'), address), None)
            record.update(lat=None, lng=None, loc='none', locationIssue=issue)
            rejected.append({'id':record.get('id'),'seNumber':record.get('seNumber'),'title':record.get('title'),'address':address,'reason':issue})
    return rejected

def turnover(current, previous):
    def numbers(records):
        return {str(r.get('seNumber') or r.get('SENumber')).strip() for r in records if r.get('seNumber') or r.get('SENumber')}
    current_se, previous_se = numbers(current), numbers(previous)
    current_records = {identity(r) for r in current}
    previous_records = {identity(r) for r in previous}
    return {'added':len(current_se - previous_se), 'removed':len(previous_se - current_se),
            'addedRecords':len(current_records - previous_records), 'removedRecords':len(previous_records - current_records)}

def merge_history(history, entry):
    return [entry] + [item for item in history if item.get('capturedAt') != entry['capturedAt']][:49]

def write_json(destination, value):
    destination = pathlib.Path(destination)
    temp = destination.with_suffix(destination.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(destination)

def self_test():
    a={'seNumber':'A','address':'1 Road','inStore':True}
    b={'seNumber':'B','address':'2 Road','inStore':True}
    c={'seNumber':'C','address':'3 Road','inStore':True}
    assert turnover([b,a],[a,b]) == {'added':0,'removed':0,'addedRecords':0,'removedRecords':0}
    assert turnover([a,c],[a,b]) == {'added':1,'removed':1,'addedRecords':1,'removedRecords':1}
    moved={**a,'address':'9 Road'}
    assert turnover([moved],[a]) == {'added':0,'removed':0,'addedRecords':1,'removedRecords':1}
    baseline=[a,b]
    assert turnover([a,c],baseline) == turnover([dict(a,loc='exact'),dict(c,loc='exact')],baseline)
    entry={'capturedAt':'new','added':1}
    assert merge_history([{'capturedAt':'new','added':0},{'capturedAt':'old'}],entry)==[entry,{'capturedAt':'old'}]
    records=[dict(a,id=7,address='27 Power Ave, Vic, Ashwood, 3147, New Zealand',lat=-37.87,lng=145.09),
             dict(b,id=12,address='Unit 1/86 Burnside Rd, Qld, Ormeau, 4208, New Zealand',lat=-36.85,lng=174.76),
             dict(c,id=13,lat=-36.85,lng=174.76,loc='exact'),
             dict(a,id=14,address='4 Road',lat=-37.87,lng=145.09,loc='exact')]
    cache={cache_key(r['seNumber'],r['address']):{'lat':r['lat'],'lng':r['lng']} for r in records}
    rejected=guard_locations(records,cache)
    assert len(rejected)==3 and [r['id'] for r in records]==[7,12,13,14]
    assert records[0]['lat'] is None and records[1]['lat'] is None and records[3]['lat'] is None
    assert records[2]['loc']=='exact' and len(cache)==1
    assert not supported_pin(float('nan'),174.7) and not supported_pin(None,None)
    assert not overseas_address('1 Victoria Street, Auckland, 1010, New Zealand')
    print('History and coordinate guard regression checks passed')

def main():
    self_test()
    if '--test-only' in sys.argv:
        return
    baseline_sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
    previous=json.loads(subprocess.check_output(['git','show',f'{baseline_sha}:data/amex.json'],text=True))
    history=json.loads(subprocess.check_output(['git','show',f'{baseline_sha}:data/history.json'],text=True))
    if not isinstance(history,list):
        raise ValueError('Committed history must be an array')
    body=json.loads(pathlib.Path('data/amex.json').read_text(encoding='utf-8'))
    captured=body['meta'].get('capturedAt')
    if not captured:
        raise ValueError('Final dataset lacks capturedAt')
    report_path=pathlib.Path('data/imports/amex-build-report.json')
    report=json.loads(report_path.read_text(encoding='utf-8'))
    cache_path=pathlib.Path('data/geocache.json')
    cache=json.loads(cache_path.read_text(encoding='utf-8')) if cache_path.exists() else {}
    records=body['merchants']
    rejected=guard_locations(records,cache)
    body['meta']['coordinateGuard']='supported-nz-area-and-overseas-address-v1'
    diff=turnover(records,previous['merchants'])
    counts=collections.Counter(r.get('loc','none') for r in records if r.get('inStore') is not False)
    entry={'capturedAt':captured,'date':captured[:10], 'records':len(records),
           'inStore':body['meta']['inStoreCount'],'online':body['meta']['onlineCount'],
           'exactLocations':counts['exact'],'approxLocations':counts['approx'],'noLocation':counts['none'],
           **diff,'baselineCommit':baseline_sha,'baselineCapturedAt':previous.get('meta',{}).get('capturedAt'),
           'turnoverMethod':'committed-baseline-v1',
           'countDefinitions':{'addedRemoved':'distinct SENumber','addedRemovedRecords':'channel + SENumber + normalized address (in-store), channel + SENumber (online)'}}
    report['meta']=body['meta']
    report['diff']={**diff,'baselineCommit':baseline_sha,'method':'committed-baseline-v1'}
    report['coordinateRejections']=rejected
    report.setdefault('stats',{}).update({'loc_exact':counts['exact'],'loc_approx':counts['approx'],'loc_none':counts['none']})
    write_json('data/amex.json',body)
    if cache_path.exists():
        write_json(cache_path,cache)
    write_json('data/history.json',merge_history(history,entry))
    write_json(report_path,report)
    print(json.dumps({**entry,'rejectedLocations':len(rejected)}))

if __name__ == '__main__':
    main()
