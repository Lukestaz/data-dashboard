#!/usr/bin/env python3
import collections, hashlib, json, pathlib, subprocess, sys
from stable_ids import identity

LISTING = ('title', 'category', 'subType', 'website', 'isOnline', 'inStore')
LOCATION = ('city', 'region', 'canonicalCity', 'localArea', 'rawLocation', 'lat', 'lng', 'loc', 'locationIssue')

def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(',', ':'))

def digest(value):
    return hashlib.sha256(canonical(value).encode('utf-8')).hexdigest()

def snapshot(record):
    return {key: record.get(key) for key in ('id', 'seNumber', 'title', 'address', 'inStore')}

def index(records):
    result = {}
    for record in records:
        key = identity(record)
        if key in result:
            raise ValueError('Duplicate identity in diff input')
        result[key] = record
    return result

def compare(previous, current):
    old, new = index(previous), index(current)
    updated = []
    for key in sorted(old.keys() & new.keys()):
        listing, location = {}, {}
        for fields, destination in ((LISTING, listing), (LOCATION, location)):
            for field in fields:
                if old[key].get(field) != new[key].get(field):
                    destination[field] = {'before': old[key].get(field), 'after': new[key].get(field)}
        if listing or location:
            updated.append({**snapshot(new[key]), 'listingChanges': listing, 'locationChanges': location})
    return {
        'added': [snapshot(new[k]) for k in sorted(new.keys() - old.keys())],
        'removed': [snapshot(old[k]) for k in sorted(old.keys() - new.keys())],
        'updated': updated,
        'listingUpdates': sum(bool(r['listingChanges']) for r in updated),
        'locationUpdates': sum(bool(r['locationChanges']) for r in updated)
    }

def payload(envelope):
    matches = [p['data'] for p in envelope['payloads'] if p.get('url', '').endswith('campaigndata.json')]
    if len(matches) != 1:
        raise ValueError('Expected one campaign payload')
    return matches[0]

def raw_compare(before, after):
    old, new = payload(before), payload(after)
    channels = {}
    for label, a, b in (
        ('inStore', old['merchantData'], new['merchantData']),
        ('online', old['onlineMerchants']['data'], new['onlineMerchants']['data'])
    ):
        x, y = collections.Counter(map(canonical, a)), collections.Counter(map(canonical, b))
        channels[label] = {'beforeRows': len(a), 'afterRows': len(b), 'rowsUnchangedIgnoringOrder': x == y,
                           'recordVersionsIntroduced': sum((y-x).values()), 'recordVersionsSuperseded': sum((x-y).values())}
    return {'beforePayloadSha256': digest(old), 'afterPayloadSha256': digest(new),
            'payloadUnchanged': old == new, 'channels': channels}

def read_committed(sha, path):
    return json.loads(subprocess.check_output(['git', 'show', f'{sha}:{path}'], text=True))

def write(path, value):
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(canonical(value) + '\n', encoding='utf-8')
    temp.replace(path)

def self_test():
    a = {'id': 1, 'seNumber': 'A', 'title': 'Alpha', 'address': '1 Road', 'inStore': True, 'lat': -36.8}
    b = dict(a, id=2, seNumber='B', title='Beta')
    assert not compare([a,b], [b,a])['updated']
    changed = compare([a], [dict(a, title='New', lat=-36.9)])
    assert changed['listingUpdates'] == changed['locationUpdates'] == 1
    assert len(compare([a], [dict(a, address='2 Road')])['added']) == 1
    assert len(compare([a,b], [a])['removed']) == 1
    def envelope(rows, stamp):
        return {'timestamp': stamp, 'payloads': [{'url': 'https://example.test/campaigndata.json', 'data': {'merchantData': rows, 'onlineMerchants': {'data': []}}}]}
    assert raw_compare(envelope([a], 'old'), envelope([a], 'new'))['payloadUnchanged']
    assert raw_compare(envelope([a,b], 'old'), envelope([b,a], 'new'))['channels']['inStore']['rowsUnchangedIgnoringOrder']
    try:
        compare([a,a], [a])
    except ValueError:
        pass
    else:
        raise AssertionError('Duplicate identity accepted')

def main():
    self_test()
    if '--test-only' in sys.argv:
        return
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
    old = read_committed(sha, 'data/amex.json')
    new = json.loads(pathlib.Path('data/amex.json').read_text(encoding='utf-8'))
    history = json.loads(pathlib.Path('data/history.json').read_text(encoding='utf-8'))
    captured = new['meta']['capturedAt']
    entries = [r for r in history if r.get('capturedAt') == captured]
    if len(entries) != 1 or entries[0].get('baselineCommit') != sha:
        raise ValueError('Finalized history baseline mismatch')
    report = {'schemaVersion': 1, 'capturedAt': captured, 'baselineCapturedAt': old['meta'].get('capturedAt'),
              'baselineCommit': sha, 'identityMethod': 'stable_ids.identity',
              'raw': raw_compare(read_committed(sha, 'data/imports/amex-online-raw.json'),
                  json.loads(pathlib.Path('data/imports/amex-online-raw.json').read_text(encoding='utf-8'))),
              **compare(old['merchants'], new['merchants'])}
    if len(report['added']) != entries[0]['addedRecords'] or len(report['removed']) != entries[0]['removedRecords']:
        raise ValueError('Detailed diff disagrees with finalized turnover')
    name = digest(captured)[:24] + '.json'
    relative = 'data/changes/' + name
    entries[0]['detailReport'] = relative
    entries[0]['listingUpdates'] = report['listingUpdates']
    entries[0]['locationUpdates'] = report['locationUpdates']
    entries[0]['rawPayloadUnchanged'] = report['raw']['payloadUnchanged']
    write(relative, report)
    write('data/history.json', history)
    keep = {r.get('detailReport') for r in history}
    for file in pathlib.Path('data/changes').glob('*.json'):
        if str(file) not in keep:
            file.unlink()
    print(canonical({'detailReport': relative, 'listingUpdates': report['listingUpdates'], 'locationUpdates': report['locationUpdates']}))

if __name__ == '__main__':
    main()
