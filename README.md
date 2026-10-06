# Amex Shop Small NZ Dashboard

An interactive web dashboard for exploring small business merchant data in New Zealand.

[Open the dashboard](https://lukestaz.github.io/data-dashboard/) · [Changelog](CHANGELOG.md)

## Features

- Cards view for browsing merchants, saving favourites and submitting Amex acceptance votes.
- Combined map view: compact scrollable cards beside the map on desktop; map above cards on smaller screens.
- Automatic map-area filtering: zooming or panning updates the cards to merchants inside the visible map bounds. Search, city, local-area and category filters still apply.
- Linked selection: a card opens its available map pin; a pin highlights its corresponding card. Save and vote controls remain available.
- Hide/show merchant list control for a larger map.
- Two-tier location filtering: city or Other towns / areas, then suburb/local area. Only top-tier places with in-store records are offered.
- Location cleanup removes postcode-only labels and malformed punctuation, preserves macrons and uses address context where available.
- Visible Reset filters button and contextual clear buttons for search, city and local area. Clearing a city also clears the local area.
- Multiple datasets: current Amex-derived data and the Cheapies legacy archive.
- Near Me geolocation and distance sorting.
- Browser-local saved merchants and cross-device sync links without accounts.
- Amex offer reminder and Umami analytics integration.

## Using the map

1. Select Map view.
2. Zoom or pan to the area you want to explore.
3. Browse the matching cards; the toolbar distinguishes merchants in the map area from all merchants matching your filters.
4. Click a card to open its pin, or click a pin to highlight its card.
5. Switch to Cards view to restore the full filtered list, including records without map coordinates.

Map-area filtering uses each merchant's stored coordinates. Approximate locations can therefore place a merchant inside or outside an area imperfectly. Merchants without coordinates are excluded from the map-area list, but remain available in Cards view. The former 1,500-pin cap has been removed; markers use clustered, chunked loading. Performance depends on the number of matching records and the device.

## Locations and reset controls

The top tier uses a snapshot of the [major and large urban areas listed on Wikipedia](https://en.wikipedia.org/wiki/Cities_in_New_Zealand), with Other towns / areas for places outside that list or not confidently mapped. The second tier lists local areas within the selected top-tier place. Hibiscus Coast is listed separately from Auckland.

Raw location text is preserved in rawLocation; canonicalCity and localArea support filtering. Suburb mappings are rule-based, not authoritative geographic boundaries, and need refinement as ambiguous data is found.

Reset filters clears search, both location tiers, category and saved-only filtering, and restores default sorting. It does not erase saved merchants or votes. Per-field × controls appear when their field is active. Resetting filters does not reset the map bounds.

## Cross-device saved lists

Saved merchants are stored locally in the browser using localStorage.

1. Open Sync in the header.
2. Copy the sync link.
3. Open it on another device and follow the merge prompt, or paste the link/code into the import field.

This transfers a saved-list snapshot; it is not continuous synchronization. Clearing browser storage removes locally saved data. Treat a shared link as disclosure of the saved-list identifiers it contains.

## Data sources and pipeline

| Dataset | File | Purpose |
|---|---|---|
| Amex-derived dataset | data/amex.json | Campaign merchant records and online availability, enriched with cached coordinates |
| Cheapies legacy archive | data.json | Historical curated merchant dataset |

The browser loads repository JSON, not the upstream campaign feed directly. The refresh workflow captures the [Amex NZ campaign feed](https://www.americanexpress.com/content/dam/gcst/merchantmapslite/en-NZ/shop-small/campaigndata.json), builds data/amex.json, geocodes missing addresses, rebuilds and commits the results. A minimum-count guard and legacy-file safeguard protect the refresh.

Historical reference: the 2 October 2026 build contained 12,102 in-store records and 3,487 online-only records, for 15,589 combined records. The upstream online list contained 4,462 entries, some matched to in-store records. These are snapshot counts, not current totals or a count of distinct physical shops. Check dataset metadata for the latest capture time and counts.

The pipeline deliberately does not use upstream Amex coordinates. It uses the coordinate cache, seeded from legacy data and supplemented with Nominatim lookups; postcode-derived fallback positions are marked approximate. Cached or geocoded coordinates should not be treated as guaranteed address accuracy.

## Deployment and run monitoring

- pages.yml: GitHub Pages deployment, configured for pushes to main and completion of the Amex refresh workflow.
- refresh-amex.yml: twice-weekly capture/build/geocode workflow, also manually runnable. Its schedule is Monday and Thursday at 18:00 UTC; local times vary with daylight saving.
- monitor-actions.yml: records Pages and refresh run status on completion, with a scheduled 15-minute check and manual trigger.

The monitor writes data/ops/action-runs.json after a successful execution. It records the latest run and up to 30 recent runs for each watched workflow: status, conclusion, commit SHA, timestamps, URLs and failed jobs/steps where available. Job lookup errors are recorded. Runs with no jobs direct readers to the run page for validation errors. Full logs and annotations are not copied into this file.

Check checkedAt before treating the monitor snapshot as current. A committed workflow is not proof that it has run successfully. This monitoring supports on-demand inspection; it does not send proactive alerts or independently verify live UI behaviour. Status commits use [skip ci]. Merchant-data turnover history remains separate in data/history.json.

## Local development

No frontend build step is required. Serve the repository over HTTP so the JavaScript modules and JSON can load:

```bash
python -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). External map tiles and community services require network access.

## Project structure

| Path | Role |
|---|---|
| index.html | Dashboard markup and external dependencies |
| js/app.js | Initialization, datasets and shared filtering |
| js/store.js | Shared state and saved merchants |
| js/normalizer.js | Location text cleanup and city normalization |
| js/locations.js | Location hierarchy and filter controls/layout |
| js/map.js | Map clusters, sidebar and visible-area filtering |
| js/cards.js | Merchant card rendering |
| js/votes.js | Community voting integration |
| js/sync.js | Saved-list sharing and importing |
| scripts/build_amex.py | Dataset build, safeguards and turnover history |
| scripts/geocode.py | Coordinate-cache enrichment |
| .github/workflows/ | Deployment, refresh and monitoring |

## Attribution and license

Merchant campaign data: American Express public campaign directory. Legacy merchant data: Cheapies archive. Mapping and geocoding: OpenStreetMap contributors and Nominatim. These data and services retain their respective terms. This is not an official American Express application; directory membership and community votes do not guarantee acceptance or offer eligibility.

Project license: MIT; see LICENSE for details.

Last updated: 7 October 2026.
