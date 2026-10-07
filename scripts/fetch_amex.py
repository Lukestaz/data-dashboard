#!/usr/bin/env python3
import datetime, json, os, pathlib, time, urllib.request

URL = 'https://www.americanexpress.com/content/dam/gcst/merchantmapslite/en-NZ/shop-small/campaigndata.json'
OUT = pathlib.Path('data/imports/amex-online-raw.json')

def validate(data):
    if not isinstance(data, dict):
        raise ValueError('Campaign payload must be an object')
    instore = data.get('merchantData')
    online = data.get('onlineMerchants', {}).get('data')
    if not isinstance(instore, list) or not instore:
        raise ValueError('merchantData must be a non-empty array')
    if not isinstance(online, list) or not online:
        raise ValueError('onlineMerchants.data must be a non-empty array')
    for record in instore:
        if not isinstance(record, dict) or any(key not in record for key in ('SENumber', 'name', 'address', 'type')):
            raise ValueError('Unexpected in-store record schema')
        if not isinstance(record['name'], str) or not isinstance(record['address'], str):
            raise ValueError('Name and address must be strings')
    for record in online:
        if not isinstance(record, dict) or any(key not in record for key in ('SENumber', 'name', 'url', 'category')):
            raise ValueError('Unexpected online record schema')
    previous = pathlib.Path('data/amex.json')
    if previous.exists():
        meta = json.loads(previous.read_text(encoding='utf-8')).get('meta', {})
        for field, count in [('inStoreCount', len(instore)), ('onlineCount', len(online))]:
            baseline = meta.get(field, 0)
            if baseline and count < baseline * 0.95:
                raise ValueError(f'{field} dropped below 95% of previous capture: {count} vs {baseline}')
    return len(instore), len(online)

def main():
    payload = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(URL, headers={'User-Agent': 'Lukestaz-data-dashboard/1.3 (https://github.com/Lukestaz/data-dashboard)', 'Accept': 'application/json'})
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode('utf-8-sig'))
            instore, online = validate(payload)
            break
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** (attempt + 1))
    captured = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
    envelope = {'timestamp': captured, 'captureMethod': 'direct-http', 'payloads': [{'url': URL, 'data': payload}]}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    temp = OUT.with_suffix('.json.tmp')
    temp.write_text(json.dumps(envelope, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temp, OUT)
    print(json.dumps({'capturedAt': captured, 'inStoreCount': instore, 'onlineCount': online, 'method': 'direct-http'}))

if __name__ == '__main__':
    main()
