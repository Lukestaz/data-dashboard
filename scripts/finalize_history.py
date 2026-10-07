#!/usr/bin/env python3
import collections, json, math, pathlib, re, subprocess, sys
from stable_ids import identity
from build_amex import cache_key

RECOVERY_COMMIT = 'f5a9d9928bb9902a218d2700d802b777fc97f5c9'
RECOVERY_IDS = {1617, 4165, 4575, 4921, 6910, 7314, 10448, 11518}

def numeric_pin(lat, lng):
    if isinstance(lat, bool) or isinstance(lng, bool):
        return None
    try:
        lat, lng = float(lat), float(lng)
    except (TypeError, ValueError):
        return None
    return (lat, lng) if math.isfinite(lat) and math.isfinite(lng) else None

def chatham_pin(lat, lng):
    return -44.6 <= lat <= -43.4 and -177.2 <= lng <= -175.5

def supported_pin(lat, lng):
    point = numeric_pin(lat, lng)
    return bool(point and ((-47.5 <= point[0] <= -34.0 and 166.0 <= point[1] <= 178.8) or chatham_pin(*point)))

def address_parts(address):
    return [p.strip().casefold() for p in (address or '').split(',')]

def rotorua_address(address):
    parts = address_parts(address)
    return 'rotorua' in parts and 'bay of plenty' in parts

def chatham_address(address):
    return 'chatham' in (address or '').casefold()

def overseas_address(address):
    for part in address_parts(address):
        if part == 'victoria' and rotorua_address(address):
            continue
        if re.fullmatch(r'vic|qld|nsw|sa|wa|tas|act|nt|victoria|queensland|new south wales|south australia|western australia|tasmania|australia', part):
            return True
    return False

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
        point = numeric_pin(record.get('lat'), record.get('lng'))
        has_coordinate = record.get('lat') is not None or record.get('lng') is not None
        if not issue and has_coordinate and not supported_pin(record.get('lat'), record.get('lng')):
            issue = 'outside-supported-nz-map-area-or-invalid-coordinate'
        if not issue and point and chatham_address(address) and not chatham_pin(*point):
            issue = 'coordinate-region-mismatch-chathams'
        if not issue and point and chatham_pin(*point) and not chatham_address(address):
            issue = 'coordinate-region-mismatch-mainland'
        if issue:
            cache.pop(cache_key(record.get('seNumber') or record.get('SENumber'), address), None)
            record.update(lat=None, lng=None, loc='none', locationIssue=issue)
            rejected.append({'id':record.get('id'),'seNumber':record.get('seNumber'),'title':record.get('title'),'address':address,'reason':issue})
    return rejected

def recovery_point(record, candidate):
    if identity(record) != identity(candidate) or overseas_address(record.get('address')):
        return None
    point = numeric_pin(candidate.get('lat'), candidate.get('lng'))
    if not point:
        return None
    lat, lng = point
    if chatham_address(record.get('address')):
        if 180 <= lng <= 185:
            lng -= 360
        return (lat, lng) if chatham_pin(lat, lng) else None
    if rotorua_address(record.get('address')) and -38.22 <= lat <= -38.02 and 176.15 <= lng <= 176.35:
        return (lat, lng)
    return None

def recover_audited(records):
    targets = [r for r in records if r.get('id') in RECOVERY_IDS and r.get('loc') != 'exact']
    if not targets:
        return {'baselineCommit':RECOVERY_COMMIT,'restored':[],'unresolved':[]}
    try:
        try:
            snapshot = subprocess.check_output(['git','show',f'{RECOVERY_COMMIT}:data/amex.json'], text=True, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            subprocess.run(['git','fetch','--no-tags','--depth=1','origin',RECOVERY_COMMIT], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            snapshot = subprocess.check_output(['git','show',f'{RECOVERY_COMMIT}:data/amex.json'], text=True, stderr=subprocess.PIPE)
        candidates = {identity(r):r for r in json.loads(snapshot)['merchants']}
    except (subprocess.CalledProcessError, KeyError, ValueError) as error:
        return {'baselineCommit':RECOVERY_COMMIT,'restored':[],'unresolved':[r['id'] for r in targets],'error':str(error)}
    restored, unresolved = [], []
    for record in targets:
        candidate = candidates.get(identity(record))
        point = recovery_point(record, candidate) if candidate else None
        if not point:
            unresolved.append(record['id'])
            continue
        record.update(lat=point[0], lng=point[1], loc='approx', locationIssue='recovered-pin-pending-address-verification')
        restored.append({'id':record['id'],'title':record.get('title'),'lat':point[0],'lng':point[1],'previousStatus':candidate.get('loc'),'status':'approx'})
    return {'baselineCommit':RECOVERY_COMMIT,'restored':restored,'unresolved':unresolved}

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
    compact = destination.name in ('amex.json', 'geocache.json')
    text = json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':') if compact else None, indent=None if compact else 2) + '\n'
    temp = destination.with_suffix(destination.suffix + '.tmp')
    temp.write_text(text, encoding='utf-8')
    temp.replace(destination)

def self_test():
    a={'seNumber':'A','address':'1 Road','inStore':True}
    b={'seNumber':'B','address':'2 Road','inStore':True}
    c={'seNumber':'C','address':'3 Road','inStore':True}
    assert turnover([b,a],[a,b]) == {'added':0,'removed':0,'addedRecords':0,'removedRecords':0}
    assert turnover([a,c],[a,b]) == {'added':1,'removed':1,'addedRecords':1,'removedRecords':1}
    assert turnover([dict(a,address='9 Road')],[a]) == {'added':0,'removed':0,'addedRecords':1,'removedRecords':1}
    assert turnover([a,c],[a,b]) == turnover([dict(a,loc='exact'),dict(c,loc='exact')],[a,b])
    entry={'capturedAt':'new','added':1}
    assert merge_history([{'capturedAt':'new','added':0},{'capturedAt':'old'}],entry)==[entry,{'capturedAt':'old'}]
    assert len(merge_history([{'capturedAt':str(i)} for i in range(70)],entry))==50
    for street in ('35 Te Ngae Road','37 Te Ngae Road','6 Union Street','11 Ti Street','59 Ranolf Street','252 Fenton Street','R1/21 Victoria Street'):
        assert not overseas_address(street + ', Victoria, Bay Of Plenty, Rotorua, 3010, New Zealand')
    for address in ('Shop 3A/26/44 Kippax St, Nsw, Surry Hills, 2010, New Zealand','27 Power Ave, Vic, Ashwood, 3147, New Zealand','Unit 1/86 Burnside Rd, Qld, Ormeau, 4208, New Zealand','124 Abbott Rd, Vic, Hallam, 3803, New Zealand'):
        assert overseas_address(address)
    assert not overseas_address('1 Victoria Street, Auckland, 1010, New Zealand')
    assert supported_pin(-43.95,-176.56) and not supported_pin(-37.87,145.09)
    assert not supported_pin(float('nan'),174.7) and not supported_pin(None,None)
    records=[dict(a,id=7,address='27 Power Ave, Vic, Ashwood, 3147, New Zealand',lat=-37.87,lng=145.09),dict(b,id=12,lat=-36.85,lng=174.76,loc='exact'),dict(c,id=13,lat=-37.87,lng=145.09,loc='exact')]
    cache={cache_key(r['seNumber'],r['address']):{'lat':r['lat'],'lng':r['lng']} for r in records}
    assert len(guard_locations(records,cache))==2 and len(cache)==1
    assert [r['id'] for r in records]==[7,12,13] and records[1]['loc']=='exact'
    local=dict(a,address='35 Te Ngae Road, Victoria, Bay Of Plenty, Rotorua, 3010, New Zealand')
    assert recovery_point(local,dict(local,lat=-38.14,lng=176.25))
    assert not recovery_point(local,dict(local,lat=-36.85,lng=174.76))
    island=dict(a,address='Waitangi Wharf Owenga Road, Chatham Islands Territory, 0, 8016, New Zealand')
    assert recovery_point(island,dict(island,lat=-43.95,lng=183.44))
    assert not recovery_point(island,dict(island,lat=-43.53,lng=172.63))
    mismatch=dict(local,lat=-43.95,lng=-176.56)
    assert guard_locations([mismatch],{}) and mismatch['lat'] is None
    print('History, audited address, Chathams and conservative recovery checks passed')

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
    recovery=recover_audited(records)
    body['meta']['coordinateGuard']='supported-nz-area-and-contextual-address-v2'
    diff=turnover(records,previous['merchants'])
    counts=collections.Counter(r.get('loc','none') for r in records if r.get('inStore') is not False)
    body['meta'].update(exactCount=counts['exact'],approxCount=counts['approx'])
    entry={'capturedAt':captured,'date':captured[:10],'records':len(records),
           'inStore':body['meta']['inStoreCount'],'online':body['meta']['onlineCount'],
           'exactLocations':counts['exact'],'approxLocations':counts['approx'],'noLocation':counts['none'],
           **diff,'baselineCommit':baseline_sha,'baselineCapturedAt':previous.get('meta',{}).get('capturedAt'),
           'turnoverMethod':'committed-baseline-v1',
           'countDefinitions':{'addedRemoved':'distinct SENumber','addedRemovedRecords':'channel + SENumber + normalized address (in-store), channel + SENumber (online)'}}
    report['meta']=body['meta']
    report['diff']={**diff,'baselineCommit':baseline_sha,'method':'committed-baseline-v1'}
    report['coordinateRejections']=rejected
    report['coordinateRecovery']=recovery
    report.setdefault('stats',{}).update({'loc_exact':counts['exact'],'loc_approx':counts['approx'],'loc_none':counts['none']})
    write_json('data/amex.json',body)
    if cache_path.exists():
        write_json(cache_path,cache)
    write_json('data/history.json',merge_history(history,entry))
    write_json(report_path,report)
    print(json.dumps({**entry,'rejectedLocations':len(rejected),'recoveredLocations':len(recovery['restored']),'unresolvedRecovery':recovery['unresolved']}))

if __name__ == '__main__':
    main()
