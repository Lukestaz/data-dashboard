# Amex Shop Small NZ Dashboard

Explore New Zealand merchants using searchable cards, an interactive map, saved lists and community Amex-acceptance feedback. This is an independent project, not an official American Express application.

[Open dashboard](https://lukestaz.github.io/data-dashboard/) · [Changelog](CHANGELOG.md) · [Actions](https://github.com/Lukestaz/data-dashboard/actions)

## Current state and build identification

This README describes the implementation on `main`, not a guarantee that every change has deployed or passed a browser test. A committed workflow is not proof of successful execution; a successful deployment is not a browser test.

The compact menu shows `Build <short commit>` and a Changelog link. The Pages workflow stamps the checked-out commit into the deployment artifact's HTML, without committing generated build metadata. The link opens `CHANGELOG.md` at that same commit in a new tab. Without build metadata, the footer displays `Local build`.

A build identifier describes the site's source snapshot. It is separate from the merchant-data capture time and does not certify that merchant details are current.

## Browsing merchants

| Feature | Behaviour |
|---|---|
| Cards | Filtered merchant list with save, directions and voting controls |
| Map | Compact cards beside the map on desktop; map above cards on smaller screens |
| Map-area filtering | Cards narrow to stored coordinates inside visible bounds after zooming or panning |
| Linked selection | A card opens its available pin; a pin highlights its card |
| Hide/show list | Collapses cards to give the map more space |
| Search and categories | Combine with city/local-area, subtype, availability and saved-only filters |
| Near Me | Browser geolocation and distance sorting |
| Compact menu | Feedback, saved-list sync, data-source selection, source capture status and build/changelog information |

Switching back to Cards restores merchants matching the non-map filters. Map-area results exclude merchants without coordinates. Approximate coordinates can place a merchant in the wrong visible area. Markers use clustered, chunked loading rather than the former 1,500-pin cap; performance varies by dataset and device.

## Locations and clear controls

The first location tier contains a snapshot of the [major and large urban areas listed on Wikipedia](https://en.wikipedia.org/wiki/Cities_in_New_Zealand), plus Other towns / areas. Only top-tier places with in-store records are offered. Hibiscus Coast is separate from Auckland.

The second tier lists suburbs/local areas for the selected city, or individual places in Other towns / areas. Unknown or ambiguous places are not automatically assigned to a city. These are rule-based mappings, not authoritative geographic boundaries.

The shared normalizer removes postcode and punctuation-only labels, preserves macrons and uses address context where available. `rawLocation` preserves the supplied label; `canonicalCity` and `localArea` support the hierarchy. Raw captures remain available separately.

The compact layout shows active-filter chips and a Clear control. Search and location clear actions remove the relevant selection; clearing a city also clears its local area. Clear resets search, both location tiers, category, subtype, availability, saved-only filtering and sorting. It does not erase saved merchants or votes, change the dataset or reset map bounds. Near Me location is not cleared by that reset.

Online-only filtering hides location selection and disables Near Me and distance sorting. Compact controls adapt to smaller screens.

## Data sources and capture time

| Selector | Repository file | Refresh behaviour |
|---|---|---|
| Amex Shop Small | `data/amex.json` | Rebuilt from the official campaign JSON by the refresh workflow |
| Legacy Curated | `data.json` | Historical archive protected against changes by the refresh workflow |

The browser loads repository JSON, not the upstream feed directly. Direct HTTP and historical Playwright capture are acquisition methods, not separate merchant datasets.

The menu displays `Source captured: <date and time>` for successfully loaded Amex data, formatted in `Pacific/Auckland` with a timezone indication. It uses the dataset's `meta.capturedAt`, which comes from the UTC timestamp recorded after the upstream download passes validation.

This timestamp means the source was downloaded and validated. It is not the site's deployment time, Amex's own last-edit time, or an independent verification date for individual merchants. An old capture remains old even if the site is redeployed.

Missing or invalid timestamps display `Source capture date unavailable.` Legacy data displays `Snapshot date unavailable.` If Amex loading falls back to legacy data, the menu explicitly identifies the fallback and does not display an Amex capture timestamp. Already-open tabs do not automatically reload the dataset.

## Refresh pipeline and coordinates

```text
Shared location regression checks
  -> Direct HTTP download of campaigndata.json
  -> Validate schema and capture counts
  -> Store compatible raw-capture envelope
  -> Build dataset with coordinate cache
  -> Geocode missing/changed addresses
  -> Rebuild and apply shared location hierarchy
  -> Validate output and protect legacy file
  -> Commit and safely publish dataset, cache, capture and history
  -> Pages deployment
```

[Official campaign feed](https://www.americanexpress.com/content/dam/gcst/merchantmapslite/en-NZ/shop-small/campaigndata.json). `scripts/fetch_amex.py` retries downloads and atomically replaces `data/imports/amex-online-raw.json` only after validation. It rejects missing/empty lists, incompatible required fields and drops greater than 5% against previous in-store or online capture counts. Failure stops the workflow rather than relabelling an old capture as new.

Playwright installation and `scripts/scrape-online.mjs` execution are not part of the active refresh workflow. Historical scraper files may remain in the repository.

`scripts/normalize_locations.mjs` uses the shared browser location modules for regression checks and final dataset normalization. Browser loading reapplies the same rules, avoiding a separate set of location mappings.

The pipeline does not use upstream Amex coordinates. Coordinates come from the cache, legacy seeds and Nominatim lookups, with approximate postcode-derived fallback positions. Geocoded or cached does not mean independently verified address accuracy. Consult dataset metadata for current record counts; combined records and online entries are not necessarily counts of distinct physical shops.

## Daily schedule and deployment

The refresh workflow is named `Refresh Amex directory`. Keep that name aligned with Pages and monitoring `workflow_run` references.

Refresh is scheduled daily at 07:17 in `Pacific/Auckland`, with the timezone configured explicitly. Manual execution is available in [the refresh workflow](https://github.com/Lukestaz/data-dashboard/actions/workflows/refresh-amex.yml). A schedule is an intended trigger, not proof that a run started or succeeded.

Scheduled runs allow up to 400 new/changed-address geocoding attempts. Manual runs default to 1,000 through `geocode_max`. The job timeout is 120 minutes. Existing cached coordinates are retained.

Publication uses up to three fetch/rebase/push attempts to handle concurrent commits on `main`. A rebase conflict aborts publication with an explicit error; the workflow does not force-push. This reduces the earlier non-fast-forward publishing risk but does not eliminate all concurrency failures.

Pages is configured for pushes to `main`, refresh-workflow completion and manual dispatch. A capture becomes public only after successful publication and deployment. Completion of a refresh workflow alone is not proof of a successful refresh.

## Ideas and bug reports

Open the compact menu (`⋯`) and choose Idea or bug. Visitors can submit without a GitHub account through a Cloudflare Worker, with Cloudflare Turnstile spam verification.

- Choose Idea or Bug and enter a short title and details.
- Titles require 3 to 120 characters; details require 10 to 4,000. Leading/trailing spaces do not count towards the validated length.
- Length guidance, live counts and inline errors explain incomplete fields.
- Explicit consent is required because feedback is posted publicly on GitHub. Do not include personal information, credentials or private merchant/customer details.
- On confirmed success, the form links to the created issue.
- If submission ends without confirmation, check existing issues before retrying to avoid duplicates.

The form sends the feedback type, title, details, selected dataset and view, plus submission-control fields. Selecting a dataset does not prove that dataset loaded without fallback. The feedback endpoint is an external service, separate from the static Pages frontend; copying the frontend alone does not configure a new Worker or its Turnstile integration.

## Saved lists, votes and analytics

Saved merchants live in browser `localStorage`. Open Sync saved merchants, copy the link and open it on another device to merge the snapshot, or use the import field. No account is needed. This is snapshot transfer, not continuous synchronization. Clearing browser storage removes local saved data; shared links disclose the identifiers they contain.

Acceptance votes are community reports, not guarantees. Directory inclusion does not establish current Amex acceptance or offer eligibility. The app also includes an offer reminder and Umami analytics integration.

## Automated changelog

`changelog.yml` runs on application pushes to `main` and manual dispatch, excluding pushes that only change `CHANGELOG.md`, `data/**` or `data.json`. It regenerates the marked automatic section of `CHANGELOG.md`, preserves handwritten content and publishes only when output changes.

The generator reads first-parent commit history after a fixed baseline. It includes `feat`, `fix`, `perf`, `refactor` and `chore` subjects, including optional scopes. Entries are grouped by Auckland date and category; subjects with `!` appear first under Breaking changes for that day. Commit descriptions are escaped for Markdown.

Meaningful conventional subjects on `main` are required. With ordinary merge commits, individual branch commits can be excluded by first-parent traversal and a non-conventional merge subject can leave a change undocumented. The generator currently reads subjects, not `BREAKING CHANGE:` trailers in commit bodies.

Changelog entries are not release or deployment confirmations. The generator does not automatically assign release versions or create tags. The menu's commit-pinned changelog reflects the deployed source snapshot and may omit later entries generated on `main`.

## Monitoring and troubleshooting

`monitor-actions.yml` records Pages and refresh workflow status in `data/ops/action-runs.json` and an Actions job summary. The monitoring setup is intended to run after watched workflows complete, with a 15-minute scheduled fallback and manual trigger.

The documented snapshot contains up to 30 recent runs per watched workflow, including status, conclusion, SHA, timestamps, run URL and unsuccessful job/step details where available. Failed job lookups are recorded; full logs and validation annotations remain on the run page.

1. Check `checkedAt` before treating a snapshot as current.
2. Match the run SHA to the change under investigation.
3. Distinguish Pages deployment failures from data-refresh failures.
4. Open the run URL for full logs or YAML annotations.
5. Check `data/amex.json` metadata and `meta.capturedAt` against the source status displayed in the menu.

A status file's existence proves only that a snapshot was written. Status-file commits use `[skip ci]`. Operational snapshots are separate from merchant turnover history in `data/history.json`. This is inspectable status, not proactive alert delivery. Monitoring does not establish its own health or browser correctness.

## Committed safeguards

The following fixes were committed on 7 October 2026 and should not be treated as untouched review findings:

| Area | Committed change | Evidence |
|---|---|---|
| Voting identity | Unified voting identity across cards and map, with legacy compatibility | [e6b4fd8](https://github.com/Lukestaz/data-dashboard/commit/e6b4fd80271e3465e6b971987a311652156e04d6) |
| Saved-merchant identity | Persistent registry to preserve published merchant IDs across refreshes | [1c15026](https://github.com/Lukestaz/data-dashboard/commit/1c1502698155164a2f9d89eca090fb053ddf22d2) |
| Turnover history | Finalization against an immutable pre-refresh baseline | [b4eea7f](https://github.com/Lukestaz/data-dashboard/commit/b4eea7f9221a6f7855d0f02053a6d11b2eac1fdc) |
| Concurrent publication | Controlled retry after concurrent updates to `main` | [833dd66](https://github.com/Lukestaz/data-dashboard/commit/833dd66d9d01eb45d56428411082f5ce6d2ec005) |
| Coordinate quality | Overseas-address quarantine and invalid cached-pin rejection | [c1f6957](https://github.com/Lukestaz/data-dashboard/commit/c1f6957156f7c9743082360c3edabca93fd2e115) |
| Location and pin recovery | Additional Rotorua/Chathams handling and conservative recovery of audited NZ pins | [5d69b50](https://github.com/Lukestaz/data-dashboard/commit/5d69b50b1531df26e08a26d8b6bd1272cec3a35e) |

These links establish committed fixes, not a fresh certification of current deployment or end-to-end test results. Inspect the full pipeline, including post-build identity/history stages, rather than inferring the published dataset's behaviour from an intermediate builder alone.

## Ongoing limitations and verification

- Location coverage: suburb dictionaries and address parsing remain incomplete. Other towns / areas is intentional; investigate incorrect mappings rather than forcing a guess. Approximate coordinates remain approximate despite validation safeguards.
- Concurrent publication: controlled retry/rebase exists, but conflicts still require intervention.
- Regression checks: retain coverage for voting identity across views, saved/sync IDs through additions/removals/reordering, and turnover counts across multi-stage refreshes. These are checks of implemented safeguards, not claims that the original defects remain unfixed.
- Browser verification: automated location/changelog assertions do not cover voting, map interaction, mobile layout, anonymous feedback or every filter/fallback combination. Deployment and browser verification are separate from code commits.
- Source accuracy: directory inclusion and capture freshness do not guarantee current merchant acceptance, offer eligibility or address accuracy.

## Local development and checks

Serve the repository over HTTP; there is no frontend bundling step:

```bash
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000). External map tiles, votes, analytics and feedback services require network access. Local serving does not run the Pages build-stamping step, so the menu displays Local build.

Run shared location checks with Node.js 20 and changelog checks with Python 3.12, matching the workflows:

```bash
node scripts/normalize_locations.mjs --test-only
python3 scripts/update_changelog.py --test-only
```

Location checks cover postcode-only and punctuation-only values, macrons, ambiguous Northcote addresses, Hibiscus Coast handling and raw-field preservation. Changelog checks cover scoped/breaking subjects, NZ date boundaries, Markdown escaping, exclusions, manual preservation, repeatability and marker safety.

Downloading, building and geocoding modify local dataset files and may contact external services. Use the workflow for controlled refreshes. A UI-only documentation or code change does not require a new source capture.

## Project structure

| Path | Role |
|---|---|
| `index.html` | Dashboard markup and dependencies |
| `js/app.js`, `js/store.js` | Initialization, filters, loaded-source metadata, state and saved merchants |
| `js/compact-ui.js` | Compact controls, menu, source capture status and build/changelog footer |
| `js/filter-controls.js`, `js/subtype-filters.js` | Availability and subtype filtering |
| `js/normalizer.js`, `js/locations.js` | Shared location rules and hierarchy |
| `js/map.js`, `js/cards.js` | Map/sidebar, visible-area filtering and merchant cards |
| `js/votes.js`, `js/sync.js` | Community acceptance votes and saved-list transfer |
| `js/feedback.js` | Anonymous idea/bug modal and external feedback submission |
| `scripts/fetch_amex.py` | Direct campaign download and capture validation |
| `scripts/build_amex.py`, `scripts/geocode.py` | Build/history and coordinate enrichment |
| `scripts/normalize_locations.mjs` | Shared cleanup and regression checks |
| `scripts/update_changelog.py` | Automated changelog generation and self-tests |
| `.github/workflows/pages.yml` | Build stamping and Pages deployment |
| `.github/workflows/refresh-amex.yml` | Daily data refresh and safe publication |
| `.github/workflows/changelog.yml` | Changelog regeneration and publication |
| `.github/workflows/monitor-actions.yml` | Operational status snapshots |

## Attribution and license

Campaign data: American Express public directory. Legacy data: Cheapies archive. Mapping/geocoding: OpenStreetMap contributors and Nominatim. These sources retain their respective terms.

Project license: MIT; see [LICENSE](LICENSE) for details.

Last documentation review: 8 October 2026. This date records a documentation review, not a successful deployment, data refresh or end-to-end browser test.
