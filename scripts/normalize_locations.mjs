import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

execFileSync('python3', ['scripts/stable_ids.py', '--test-only'], {stdio:'inherit'});
// Load the exact browser rules as ES modules without changing package.json.
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'amex-locations-'));
try {
  await fs.copyFile(new URL('../js/normalizer.js', import.meta.url), path.join(temp, 'normalizer.mjs'));
  const source = await fs.readFile(new URL('../js/locations.js', import.meta.url), 'utf8');
  if (!source.includes("from './normalizer.js'")) throw new Error('Shared location import changed; review build adapter');
  await fs.writeFile(path.join(temp, 'locations.mjs'), source.replace("from './normalizer.js'", "from './normalizer.mjs'"));
  const { cleanLocationText, normalizeCityTown } = await import(pathToFileURL(path.join(temp, 'normalizer.mjs')).href);
  const { classifyLocation, normalizeLocations, OTHER } = await import(pathToFileURL(path.join(temp, 'locations.mjs')).href);
  assert.equal(cleanLocationText('1010'), '');
  assert.equal(cleanLocationText('& :'), '');
  assert.equal(normalizeCityTown('Wānaka 9305'), 'Wānaka');
  assert.equal(normalizeCityTown('Taupo 3330'), 'Taupō');
  assert.equal(classifyLocation('Northcote', '12 Example Road, Northcote, Christchurch, 8052').canonicalCity, 'Christchurch');
  assert.equal(classifyLocation('Northcote', '12 Example Road, Northcote, Auckland, 0627').canonicalCity, 'Auckland');
  assert.equal(classifyLocation('Northcote', '').canonicalCity, OTHER);
  assert.equal(classifyLocation('Orewa', '12 Example Road, Orewa, Auckland, 0931').canonicalCity, 'Hibiscus Coast');
  assert.equal(classifyLocation('Wānaka', '').canonicalCity, OTHER);
  const preserved = [{city:'Wānaka 9305', address:'12 Example Road, Wānaka, 9305', id:1}];
  normalizeLocations(preserved);
  assert.equal(preserved[0].rawLocation, 'Wānaka 9305');
  assert.equal(preserved[0].localArea, 'Wānaka');
  console.log('Shared location regression checks passed');
  if (!process.argv.includes('--test-only')) {
    execFileSync('python3', ['scripts/stable_ids.py'], {stdio:'inherit'});
    const file = 'data/amex.json';
    const body = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.ok(Array.isArray(body.merchants) && body.merchants.length, 'No merchants to normalize');
    const count = body.merchants.length;
    normalizeLocations(body.merchants);
    for (const merchant of body.merchants) {
      assert.equal(typeof merchant.rawLocation, 'string');
      assert.ok(merchant.canonicalCity && merchant.localArea);
      assert.ok(!/\b\d{4}\b/.test(merchant.canonicalCity + ' ' + merchant.localArea), 'Postcode in normalized location');
    }
    assert.equal(body.merchants.length, count);
    body.meta = {...body.meta, locationNormalization:'shared-browser-rules', ingestionMethod:'direct-http'};
    await fs.writeFile(file + '.tmp', JSON.stringify(body));
    await fs.rename(file + '.tmp', file);
    console.log(JSON.stringify({records:count, normalization:'shared-browser-rules'}));
  }
} finally {
  await fs.rm(temp, {recursive:true, force:true});
}
