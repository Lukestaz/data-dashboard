# Amex Shop Small NZ Dashboard

Find New Zealand merchants in the AMEX Shop Small directory, explore them on a map, save favourites and see how the published dataset changes over time.

This is an independent project, not an official American Express application. Directory inclusion and community votes do not guarantee current AMEX acceptance or offer eligibility. Activate any applicable offer in the Amex app before paying.

[Open dashboard](https://lukestaz.github.io/data-dashboard/) · [Dataset changes](https://lukestaz.github.io/data-dashboard/dataset-changes.html) · [App changelog](CHANGELOG.md)

## Using the dashboard

1. Search by merchant, place or category. Combine category, subtype, availability, city/local-area and saved-only filters.
2. Choose Cards for a list, or Map to explore locations. Desktop shows cards beside the map; smaller screens stack them below it.
3. Use Near Me to request browser location and sort by distance. Online-only filtering disables location controls and distance sorting.
4. Save merchants with the star. Open the ⋯ menu for saved-list transfer, data sources, feedback and the dataset changelog.

In Map view, cards narrow to pins inside the visible area after panning or zooming. Selecting a card opens its available pin; selecting a pin highlights its card. Hide the list for more map space. Switching back to Cards restores the results matching your non-map filters. Merchants without coordinates cannot appear in map-area results; approximate pins can fall in the wrong area.

### Locations and clearing filters

Choose a city/town, then a suburb/local area. The first tier uses a snapshot of major and large NZ urban areas, plus Other towns / areas; Hibiscus Coast is separate from Auckland. Only places with in-store records are offered. These are rule-based groupings, not authoritative geographic boundaries. Ambiguous locations are not forced into a city.

Clear resets search, location tiers, category, subtype, availability, saved-only filtering and sorting. It does not erase saved merchants or votes, change the dataset, reset map bounds or clear the Near Me location. Clearing a city also clears its local area.

### Saved merchants and sharing

Saved lists live in your browser's localStorage. In ⋯ → Sync saved merchants, copy a share link to another device, or import a link/code to merge its saved snapshot. No account is needed.

This is snapshot transfer, not continuous synchronization. Clearing browser storage removes local saved data. Shared links disclose the merchant identifiers they contain. AMEX and legacy datasets have separate saved lists.

### Ideas, bugs and community feedback

Use ⋯ → Idea or bug to submit public feedback without a GitHub account. The form uses a Cloudflare Worker and Turnstile verification. Titles require 3–120 characters and details 10–4,000, excluding leading/trailing spaces. Explicit public-posting consent is required: do not include personal information or credentials.

A confirmed submission links to its GitHub issue. If no confirmation arrives, check existing issues before retrying. Community acceptance votes are reports, not guarantees. The dashboard also includes an offer reminder and Umami analytics.

### Community reports filter status

The Community reports filter is currently disabled following the 18 October 2026 recovery. The standalone classifier and its fixture are development-only; their presence does not enable filtering or change live card/map badges. Do not describe the proposed Accepted / Declined / Mixed / No reports filter as deployed.

## Understanding the data

| Data source | File | Meaning |
|---|---|---|
| Amex Shop Small | `data/amex.json` | Published dataset rebuilt from the official campaign feed |
| Legacy Curated | `data.json` | Historical archive protected from refresh changes |

The browser loads repository JSON, not AMEX's feed directly. Record totals, online entries and unique merchant numbers are different measures; they are not interchangeable counts of physical shops.

### Capture time, build and changelogs

- Source captured is when the AMEX download passed validation, shown in Auckland time. It is not AMEX's last-edit date or independent merchant verification.
- Build identifies the deployed source commit, not dataset freshness.
- Dataset changelog describes published refresh comparisons.
- App changelog describes code changes. The menu's app link is pinned to the deployed build's commit and can omit later entries on main.

Missing capture times are labelled unavailable. Legacy data has no claimed capture date. If AMEX loading falls back to legacy, the menu identifies it rather than showing an AMEX timestamp. Already-open dashboard tabs do not automatically reload data.

### Dataset change history

Open ⋯ → Dataset changelog, or the Dataset changes link above. Refresh entries show capture/baseline times, listing totals, merchant-number additions/removals and location coverage.

For entries with a detailed report, expand Refresh details and choose Load merchant changes:

- Added and removed listings show name, address and merchant number.
- Updated listings show before/after values for tracked listing fields and derived location fields separately.
- Search changed merchants by name, address or merchant number. Longer lists load in batches of 100.
- Raw-input comparisons show payload hashes, per-channel row counts and whether records are identical ignoring array order.

Zero additions/removals does not mean every field is unchanged. A listing can have both listing and location updates, so those update counts can overlap. Address edits remain removal/addition pairs under the current identity contract. Removed means absent from that published dataset, not necessarily closed or no longer accepting AMEX.

Detailed reports start with successful refreshes using the new generator. Older entries remain summary-only; missing detail counts are Not recorded, not zero. No historical backfill was performed in this rollout. History retains up to 50 captures, with detailed report files retained for referenced entries. Failed or unpublished attempts are tracked operationally, not as successful dataset history.

### Map accuracy and geocoding

The builder does not use AMEX's coordinates. It uses cached legacy seeds and OpenStreetMap Nominatim address lookups, then approximate postcode-derived positions where available. No usable location means no pin.

Nominatim queries progressively simplify the supplied address and restrict searches to NZ. The first result passing mainland bounds and rough postcode-latitude checks is cached by merchant number + normalized address. The script pauses after successful HTTP responses and saves every 25 processed merchants.

The internal exact label means a cached/geocoded point, not independently verified storefront accuracy. Simplified searches can still match an incorrect building. Normal failed matches are cached and not automatically retried; network failures remain eligible for a later retry. The geocoder's own bounds exclude the Chathams, while later validation/recovery has separate Chathams handling. Location dictionaries and address parsing remain incomplete.

## For maintainers

Start with [handoff issue #9](https://github.com/Lukestaz/data-dashboard/issues/9), then inspect current source and compare revisions. The handoff records architecture and historical fixes; it is not a replacement for source inspection or proof of current tests. Automatic handoff freshness checking was not installed in this session.

### Architecture and local development

Static GitHub Pages frontend: plain JavaScript modules and repository JSON, with no JavaScript bundler. Compact markup belongs in index.html; compact-ui.js wires controls. Preserve element IDs and stylesheet order: compact.css before tailwind.css.

Serve locally:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 or http://localhost:8000/dataset-changes.html. External tiles, votes, analytics and feedback require network access. Local serving does not stamp a build commit; the menu displays Local build.

Styling uses committed pre-built Tailwind CSS. Pages rebuilds it with Node.js 20 and Tailwind 3.4.17. After changing Tailwind classes, regenerate the local copy before testing:

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i css/tailwind.src.css -o css/tailwind.css --minify
```

Classes must be written in full in the files scanned by tailwind.config.js, not assembled from runtime fragments. The standalone dataset history page uses its own authored CSS.

Pages now runs `scripts/check_frontend.py` on the actual checkout before building and again after build stamping. This checks frontend module syntax and HTML contracts, not browser interactions or the full regression suite. The analytics and community-report fixtures below are runnable locally but are not added to the Pages workflow by this cleanup.

Run checks:

```bash
python3 scripts/check_frontend.py --self-test
python3 scripts/check_frontend.py
node tests/analytics.test.mjs js/analytics.js js/app.js
node tests/community-reports.test.mjs
node scripts/normalize_locations.mjs --test-only
python3 scripts/dataset_diff.py --test-only
python3 scripts/update_changelog.py --test-only
```

Use Node.js 20; the changelog workflow uses Python 3.12. Location checks also invoke stable-ID, history and category fixtures. Diff fixtures cover reordering, additions/removals, tracked field edits, timestamp-only envelopes, raw record ordering and duplicate identity rejection. These fixtures do not replace browser or real-refresh tests.

### Refresh pipeline

```text
Location/identity/history/category and detailed-diff fixtures
  → Download and validate AMEX campaign JSON
  → Build with coordinate cache
  → Geocode uncached addresses
  → Rebuild
  → Shared location normalization, stable IDs, coordinate guards,
    committed-baseline history finalization and category normalization
  → Generate detailed listing and raw-input comparison
  → Protect legacy data
  → Commit and safely publish dataset, cache, raw capture,
    history and detailed reports
  → Pages deployment
```

The downloader retries and atomically replaces the raw capture only after schema/count validation. It rejects empty or incompatible lists and drops greater than 5% against previous in-store/online counts. Failure stops the workflow rather than relabelling old input as new. Historical Playwright scraping is not part of the active refresh workflow.

The refresh workflow is named Refresh Amex directory. Keep its name aligned with Pages and monitoring references. It is scheduled daily at 07:17 Pacific/Auckland. Scheduled runs allow up to 400 geocoding candidates; manual geocode_max defaults to 1,000. Timeout: 120 minutes. Schedule configuration does not prove a run occurred.

Publication uses three fetch/rebase/push attempts, stops on conflicts and never force-pushes. Refreshes share a concurrency group with cancel-in-progress false. Avoid unnecessary overlapping dispatches; an already-running workflow need not include later workflow edits.\n
Pages runs on main pushes, refresh completion and manual dispatch. It rebuilds Tailwind, stamps the checked-out commit in index.html and uploads the repository artifact. Successful refresh publication and deployment are separate outcomes.

### Diff definitions and safeguards

finalize_history.py computes turnover against the immutable checked-out Git baseline, replacing intermediate build history. Added/removed merchant counts use distinct SENumber values; listing identities use channel + merchant number + normalized address in-store, or channel + merchant number online.

dataset_diff.py reuses stable_ids.identity, rejects duplicate identities and checks its additions/removals against finalized turnover. It compares tracked fields on matching identities and records before/after values. Listing fields include title, category, subtype, website and availability; derived fields include location hierarchy, coordinates and location status. This is not a diff of every metadata field.

Raw comparison hashes canonical parsed campaign JSON, excluding the capture envelope. It also compares complete record multisets by channel, preserving duplicates while ignoring array order. Record versions introduced/superseded include edits and must not be described as business additions/removals. Matching payloads show unchanged downloaded content, not guaranteed upstream freshness.

Stable IDs, shared voting identity, coordinate quarantine/recovery and concurrent publication safeguards already exist. See issue #9 and their source rather than treating historical defects as newly discovered. Issue #6's full voting criteria remain unverified in this connector session.

### App changelog and operational monitoring

changelog.yml regenerates the marked automatic section while preserving handwritten content. It runs on application pushes and manual dispatch, excluding data-only/changelog-only pushes. The generator reads first-parent conventional feat/fix/perf/refactor/chore subjects after a fixed baseline, groups by Auckland date and highlights ! breaking subjects. Ordinary merge subjects can omit branch changes; BREAKING CHANGE trailers are not parsed. Entries do not certify deployment or create releases/tags.

Operational snapshots are in data/ops/action-runs.json, separate from dataset history. The documented monitoring setup watches Pages/refresh completions with a 15-minute fallback and manual trigger. Check checkedAt, run SHA, conclusion and the linked run logs before trusting a snapshot. Monitoring commits use [skip ci]; snapshots do not prove browser correctness or monitoring health.

### Verification and safe changes

This README describes committed source, not a guarantee of deployment or runtime success. The 12 October detailed-history rollout was committed; the user reported the page looked good. Fixture execution, the first new detailed-report refresh and full browser interactions were not independently verified in this session.

Before publishing, refresh your branch and inspect concurrent changes. Preserve voting/saved identities, fallback labels and legacy data. Record test revision, environment, method and limitations. Do not submit real votes or public feedback for tests without approval.

Downloading/building modifies datasets; geocoding contacts an external service. Documentation/UI changes do not require a new capture. Keep source checks, local tests, live tests and deployment evidence separate, and update issue #9 after meaningful changes without advancing its reviewed revision beyond actual reconciliation.

### Key files

| Path | Role |
|---|---|
| index.html; css/; tailwind.config.js | Dashboard markup and styling |
| js/app.js; js/store.js | Loading, state, filters and saved merchants |
| js/compact-ui.js; js/filter-controls.js; js/subtype-filters.js | Compact UI and availability/subtype controls |
| js/normalizer.js; js/locations.js | Shared location rules |
| js/cards.js; js/map.js | Cards, map and viewport filtering |
| js/votes.js; js/vote-identity.js; js/sync.js | Voting identity and saved-list transfer |
| js/feedback.js; feedback-worker/ | Public feedback frontend and external Worker |
| scripts/fetch_amex.py; scripts/build_amex.py; scripts/geocode.py | Acquisition, build and coordinate enrichment |
| scripts/stable_ids.py; scripts/finalize_history.py | Persistent identity and authoritative turnover |
| scripts/normalize_locations.mjs; scripts/normalize_categories.py | Final location/category processing |
| scripts/dataset_diff.py | Detailed listing/raw-input reports and fixtures |
| dataset-changes.html; data/history.json; data/changes/ | History UI, capture index and generated detailed reports |
| scripts/update_changelog.py; CHANGELOG.md | App changelog generation and output |
| .github/workflows/ | Refresh, Pages, changelog and operational monitoring |

## Attribution and licensing

Campaign data: American Express public directory. Legacy data: Cheapies archive. Mapping/geocoding: OpenStreetMap contributors and Nominatim. Respect the respective source/service terms.

The earlier README described the project as MIT, but no root LICENSE file was present in the repository listing inspected on 12 October 2026. The intended license needs confirmation; this documentation update does not establish or change a license.

Documentation reorganized and targeted source review: 12 October 2026. This is not a full-repository audit, successful refresh or end-to-end test certification.
