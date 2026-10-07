#!/usr/bin/env python3
import copy, json, pathlib, re, subprocess, sys, unicodedata

DATA = pathlib.Path('data/amex.json')
REGISTRY = pathlib.Path('data/imports/amex-id-registry.json')

def identity(record):
    se = str(record.get('seNumber') or record.get('SENumber') or '').strip()
    if not se:
        raise ValueError('Cannot allocate stable ID without SENumber')
    if record.get('inStore') is False:
        return json.dumps(['online', se], ensure_ascii=False, separators=(',', ':'))
    address = unicodedata.normalize('NFC', record.get('address') or '').casefold()
    address = re.sub(r'\s+', ' ', address).strip()
    if not address:
        raise ValueError('Cannot allocate in-store ID without address')
    return json.dumps(['instore', se, address], ensure_ascii=False, separators=(',', ':'))

def assign(current, previous, registry):
    entries = dict(registry.get('entries', {}))
    if any(type(value) is not int or value < 1 for value in entries.values()):
        raise ValueError('Invalid ID registry values')
    if len(set(entries.values())) != len(entries):
        raise ValueError('Duplicate IDs in registry')
    owners = {value: key for key, value in entries.items()}
    seen_previous = set()
    for record in previous:
        key, value = identity(record), record.get('id')
        if key in seen_previous:
            raise ValueError('Duplicate merchant identity in previous published dataset')
        seen_previous.add(key)
        if type(value) is not int or value < 1:
            raise ValueError('Previous published ID is not a positive integer')
        if key in entries and entries[key] != value:
            raise ValueError('Registry and published IDs disagree')
        if value in owners and owners[value] != key:
            raise ValueError('Published ID belongs to a different registry identity')
        entries[key] = value
        owners[value] = key
    next_id = max(max(owners, default=0) + 1, registry.get('nextId', 1))
    seen = set()
    for record in current:
        key = identity(record)
        if key in seen:
            raise ValueError('Duplicate merchant identity in new capture; refusing to merge records')
        seen.add(key)
        if key not in entries:
            entries[key] = next_id
            next_id += 1
        record['id'] = entries[key]
    return {'schemaVersion': 1, 'nextId': next_id, 'entries': entries}

def self_test():
    def merchant(se, address, ident):
        return {'seNumber': se, 'address': address, 'id': ident, 'inStore': True}
    old = [merchant('A', '1 Main Road', 7), merchant('B', '2 Main Road', 12)]
    reordered = [merchant('B', '2 Main Road', 1), merchant('A', '1 Main Road', 2)]
    registry = assign(reordered, old, {})
    assert [r['id'] for r in reordered] == [12, 7]
    changed = [merchant('A', '1 Main Road', 1), merchant('C', '3 Main Road', 2)]
    registry = assign(changed, reordered, registry)
    assert [r['id'] for r in changed] == [7, 13]
    returning = [merchant('B', '2 Main Road', 1)]
    registry = assign(returning, changed, registry)
    assert returning[0]['id'] == 12
    moved = [merchant('A', '9 Main Road', 1)]
    registry = assign(moved, returning, registry)
    assert moved[0]['id'] == 14
    online = [{'seNumber':'A', 'inStore':False, 'id':1}]
    assign(online, moved, registry)
    assert online[0]['id'] == 15
    try:
        assign(copy.deepcopy(old + old), [], {})
    except ValueError:
        pass
    else:
        raise AssertionError('Duplicate identity was accepted')
    print('Stable ID checks passed: reorder, removal, addition, return, move, online and duplicate rejection')

def main():
    self_test()
    if '--test-only' in sys.argv:
        return
    body = json.loads(DATA.read_text(encoding='utf-8'))
    previous = json.loads(subprocess.check_output(['git', 'show', 'HEAD:data/amex.json'], text=True))
    registry = json.loads(REGISTRY.read_text(encoding='utf-8')) if REGISTRY.exists() else {}
    updated = assign(body['merchants'], previous['merchants'], registry)
    body['meta']['idStrategy'] = 'persistent-registry-v1'
    for destination, payload in [(DATA, body), (REGISTRY, updated)]:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temp = destination.with_suffix(destination.suffix + '.tmp')
        temp.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        temp.replace(destination)
    print(json.dumps({'records':len(body['merchants']), 'reservedIdentities':len(updated['entries']), 'nextId':updated['nextId']}))

if __name__ == '__main__':
    main()
