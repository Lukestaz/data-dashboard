# Amex Shop Small NZ Dashboard

Explore New Zealand merchants using searchable cards, an interactive map, saved lists and community Amex-acceptance feedback. This is an independent project, not an official American Express application.

[Open dashboard](https://lukestaz.github.io/data-dashboard/) · [Changelog](CHANGELOG.md) · [Actions](https://github.com/Lukestaz/data-dashboard/actions)

## Version and current state

- Tag v1.3.0 points to commit cde105b0eee7da38e32f8029f6bf667647439ebe.
- That tag includes the location-filter, map/sidebar, viewport-filtering and initial monitoring changes.
- Current main additionally contains direct campaign-JSON ingestion and the daily refresh schedule. Those later changes are not part of v1.3.0.
- The monitor output data/ops/action-runs.json exists. Its presence proves a status snapshot was written, not that every deployment or refresh succeeded. Read checkedAt, SHA and conclusion.
- A workflow committed to main is not proof of a successful execution, and a successful deployment is not a browser test.

## Browsing merchants

| Feature | Behaviour |
|---|---|
| Cards | Full filtered merchant list with save, directions and voting controls |
| Map | Compact cards beside the map on desktop; map above cards on smaller screens |
| Map-area filtering | Cards automatically narrow to stored coordinates inside the visible bounds after zooming or panning |
| Linked selection | A card opens its available pin; a pin highlights its card |
| Hide/show list | Collapses the cards to give the map more space |
| Search and categories | Apply alongside city/local-area filters and map bounds |
| Near Me | Browser geolocation and distance sorting |

Switching back to Cards restores all merchants matching the non-map filters. Map-area results exclude merchants without coordinates. Approximate coordinates can place a merchant in the wrong visible area. The 1,500-pin cap has been removed; markers use clustered, chunked loading, so performance varies by dataset and device.

## Locations and reset controls

The first location tier contains a snapshot of the [major and large urban areas listed on Wikipedia](https://en.wikipedia.org/wiki/Cities_in_New_Zealand), plus Other towns / areas. Only top-tier places with in-store records are offered. Hibiscus Coast is separate from Auckland.

The second tier lists suburbs/local areas for the selected city, or individual places in Other towns / areas. Unknown or ambiguous places are not automatically assigned to a city. These are rule-based mappings, not authoritative geographic boundaries.

The shared normalizer removes postcode and punctuation-only labels, preserves macrons and uses address context where available. rawLocation preserves the supplied location label; canonicalCity and localArea support the hierarchy. Raw captures remain available separately.

- Search × clears search text.
- City × clears both location tiers.
- Local-area × clears only the second tier.
- Reset filters clears search, location tiers, category and saved-only filtering, and restores default sorting. It does not erase saved merchants or votes, change the dataset or reset map bounds.

The clear buttons appear when their field is active. Desktop controls use a compact single-row layout; smaller screens use a stacked layout.

## Sources and refresh pipeline

| Selector | Repository file | Refresh behaviour |
|---|---|---|
| Amex | data/amex.json | Rebuilt from the official campaign JSON by the refresh workflow |
| Cheapies legacy | data.json | Historical archive protected against changes by the refresh workflow |

The source selector does not distinguish JSON ingestion from Playwright capture: these are acquisition methods, not separate merchant datasets. The browser continues to load repository JSON, not the upstream URL directly.

Current main uses this pipeline:

```text
Shared location regression checks
  -> Direct HTTP download of campaigndata.json
  -> Validate schema and capture counts
  -> Store compatible raw-capture envelope
  -> Build dataset with coordinate cache
  -> Geocode missing/changed addresses
  -> Rebuild and apply shared location hierarchy
  -> Validate output and protect legacy file
  -> Commit dataset, cache, capture and history
  -> Pages deployment
```

[Official campaign feed](https://www.americanexpress.com/content/dam/gcst/merchantmapslite/en-NZ/shop-small/campaigndata.json). scripts/fetch_amex.py downloads it with retries and atomically replaces data/imports/amex-online-raw.json only after validation. It rejects missing/empty lists, incompatible required fields and drops greater than 5% against previous in-store or online capture counts. Failure stops the workflow; it does not silently publish an old capture as new.

Playwright installation and scripts/scrape-online.mjs execution have been removed from the active refresh workflow. Historical scraper files may remain in the repository but are not the current acquisition path.

scripts/normalize_locations.mjs loads the exact browser modules as temporary ES modules, runs regression checks and writes rawLocation, canonicalCity and localArea to the final dataset. Browser loading reapplies the same rules. This avoids maintaining a second set of location mappings.

The pipeline does not use upstream Amex coordinates. Coordinates come from the cache, legacy seeds and Nominatim lookups, with approximate postcode-derived fallback positions. Geocoded or cached does not mean independently verified address accuracy.

Historical reference only: the 2 October 2026 build had 12,102 in-store records and 3,487 online-only records, totalling 15,589 combined records. The upstream online list had 4,462 entries, some matched to in-store records. These are not current totals or counts of distinct physical shops; consult dataset metadata.

## Daily schedule and deployment

Amex refresh is scheduled daily at 07:17 in Pacific/Auckland, with the timezone explicitly configured. Scheduled execution is best-effort, not a guaranteed start time. Manual execution remains available in [the refresh workflow](https://github.com/Lukestaz/data-dashboard/actions/workflows/refresh-amex.yml).

The historical display name remains Refresh Amex dataset (twice weekly) because Pages and monitoring reference it in workflow_run. Its actual schedule is daily. Rename all dependent references together if changing that name.

Scheduled runs allow up to 400 new/changed-address geocoding attempts. Manual runs default to 1,000 through geocode_max. The timeout is 120 minutes. Existing cached coordinates are retained.

Pages is configured for pushes to main and refresh-workflow completion. A fresh capture becomes public only after a successful publish/deployment. Already-open tabs do not automatically reload the dataset.

## Monitoring and troubleshooting

monitor-actions.yml checks Pages and refresh workflows after completion, with a 15-minute scheduled fallback and manual trigger. It writes data/ops/action-runs.json and an Actions job summary.

The snapshot includes up to 30 recent runs per watched workflow: status, conclusion, commit SHA, timestamps, run URL and unsuccessful job/step details where available. Failed job lookups are recorded explicitly. Runs without jobs direct readers to the run page for validation errors. Full logs and validation annotations are not copied into the snapshot.

1. Check checkedAt for freshness.
2. Match the run SHA to the change being investigated.
3. Distinguish Pages deployment failures from Amex refresh failures.
4. Open the run URL for full logs or YAML annotations.
5. Check data/amex.json metadata to confirm ingestionMethod is direct-http and locationNormalization is shared-browser-rules after the first successful new-pipeline refresh.

Status-file commits use [skip ci]. Monitoring records are separate from merchant turnover history in data/history.json. This is on-demand inspectable status, not proactive alert delivery. The monitor currently watches Pages and refresh, not its own health or the version-tag workflow.

## Saved lists and community votes

Saved merchants live in browser localStorage. Open Sync, copy the link and open it on another device to merge the snapshot, or use the import field. No account is needed. This is snapshot transfer, not continuous synchronization; clearing browser storage removes local saved data. Shared links disclose the identifiers they contain.

Acceptance votes are community reports, not guarantees. Directory inclusion does not establish current Amex acceptance or offer eligibility. The app also includes an offer reminder and Umami analytics integration.

## Review findings and limitations

The following were identified during the 7 October review and are not claimed fixed by this documentation change:

- Concurrent writes: the monitor commits to main regularly, while refresh ends with a plain git push. A newer monitor commit can cause a non-fast-forward refresh push to fail. Add controlled retry/rebase or separate operational-status storage.
- Voting identifiers: cards use SENumber or id, while map popups also prefer seNumber. Standardize the key across views and validate that votes for the same merchant agree.
- Saved identifiers: the current builder assigns sequential record IDs. Validate favourite/sync stability when upstream records are added, removed or reordered.
- History precision: the builder runs before and after geocoding. Review whether the second build replaces the first build's turnover counts for the same capture.
- Location coverage: suburb dictionaries and address parsing are incomplete. Other towns / areas is intentional; investigate incorrect mappings rather than forcing a guess.
- Browser verification: automated location assertions do not cover voting, map interaction, mobile layout or all filter combinations.

## Local development and checks

Serve the repository over HTTP; there is no frontend bundling step:

```bash
python -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). External map tiles and community services need network access.

Run shared location regression checks with Node.js 20:

```bash
node scripts/normalize_locations.mjs --test-only
```

The checks cover postcode-only and punctuation-only values, macrons, ambiguous Northcote addresses, Hibiscus Coast handling and raw-field preservation. Direct downloading/building/geocoding modifies local dataset files and may contact external services; use the workflow for controlled refreshes.

## Project structure

| Path | Role |
|---|---|
| index.html | Dashboard markup and dependencies |
| js/app.js, js/store.js | Initialization, shared filters, state and saved merchants |
| js/normalizer.js, js/locations.js | Shared location rules, hierarchy and filter UI |
| js/map.js, js/cards.js | Map/sidebar, visible-area filtering and merchant cards |
| js/votes.js, js/sync.js | Community feedback and saved-list transfer |
| scripts/fetch_amex.py | Direct campaign download and capture validation |
| scripts/build_amex.py, scripts/geocode.py | Build/history and coordinate enrichment |
| scripts/normalize_locations.mjs | Shared cleanup and regression checks |
| .github/workflows/pages.yml | Pages deployment |
| .github/workflows/refresh-amex.yml | Daily data refresh |
| .github/workflows/monitor-actions.yml | Operational status snapshots |
| .github/workflows/tag-v1.3.0.yml | Version-specific tag creation |

## Attribution and license

Campaign data: American Express public directory. Legacy data: Cheapies archive. Mapping/geocoding: OpenStreetMap contributors and Nominatim. These sources retain their respective terms.

Project license: MIT; see LICENSE for details.

Last reviewed: 7 October 2026.
