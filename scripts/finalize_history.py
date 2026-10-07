#!/usr/bin/env python3
import collections, json, pathlib, subprocess, sys
from stable_ids import identity

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
    first=turnover([a,c],baseline)
    final=turnover([dict(a,loc='exact'),dict(c,loc='exact')],baseline)
    assert first == final
    entry={'capturedAt':'new','added':1}
    assert merge_history([{'capturedAt':'new','added':0},{'capturedAt':'old'}],entry)==[entry,{'capturedAt':'old'}]
    print('History checks passed: reorder, additions/removals, address change, two builds and one entry per capture')

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
    records=body['merchants']
    diff=turnover(records,previous['merchants'])
    counts=collections.Counter(r.get('loc','none') for r in records if r.get('inStore') is not False)
    entry={'capturedAt':captured,'date':captured[:10], 'records':len(records),
           'inStore':body['meta']['inStoreCount'],'online':body['meta']['onlineCount'],
           'exactLocations':counts['exact'],'approxLocations':counts['approx'],'noLocation':counts['none'],
           **diff,'baselineCommit':baseline_sha,'baselineCapturedAt':previous.get('meta',{}).get('capturedAt'),
           'turnoverMethod':'committed-baseline-v1',
           'countDefinitions':{'addedRemoved':'distinct SENumber','addedRemovedRecords':'channel + SENumber + normalized address (in-store), channel + SENumber (online)'}}
    report_path=pathlib.Path('data/imports/amex-build-report.json')
    report=json.loads(report_path.read_text(encoding='utf-8'))
    report['meta']=body['meta']
    report['diff']={**diff,'baselineCommit':baseline_sha,'method':'committed-baseline-v1'}
    write_json('data/history.json',merge_history(history,entry))
    write_json(report_path,report)
    print(json.dumps(entry))

if __name__ == '__main__':
    main()
