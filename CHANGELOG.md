# Changelog

<!-- AUTO-CHANGELOG:START -->
## Automated changes

Generated from commit messages; these are not release or deployment confirmations.

### 2026-10-07 (NZ time)

Features

- add category-dependent subtype filter to cards and map ([`9561776`](https://github.com/Lukestaz/data-dashboard/commit/956177631150d338cbb842e1d7aa2e4925f80daf)).
- derive browsing categories after import with audited subtype rules ([`53b9826`](https://github.com/Lukestaz/data-dashboard/commit/53b98260313f535a987eea704ecad0132af64a9d)).
- ingest Amex JSON directly and normalize locations during refresh ([`6288829`](https://github.com/Lukestaz/data-dashboard/commit/6288829b47e9454c5345db7b3db69430a563dc3d)).

Fixes

- restore prominent availability filters and two-tier category chips ([`7bd0f97`](https://github.com/Lukestaz/data-dashboard/commit/7bd0f97483d5f7f721cb819523ed0dd97f745dbb)).
- place subtype below categories and align dropdown styles and labels ([`e6660c3`](https://github.com/Lukestaz/data-dashboard/commit/e6660c3a8562843be982461a73514afbe212881e)).
- recognise Rotorua Victoria and Chathams; recover audited NZ pins conservatively ([`5d69b50`](https://github.com/Lukestaz/data-dashboard/commit/5d69b50b1531df26e08a26d8b6bd1272cec3a35e)).
- quarantine overseas addresses and reject invalid cached map pins ([`c1f6957`](https://github.com/Lukestaz/data-dashboard/commit/c1f6957156f7c9743082360c3edabca93fd2e115)).
- finalize turnover history against immutable pre-refresh baseline ([`b4eea7f`](https://github.com/Lukestaz/data-dashboard/commit/b4eea7f9221a6f7855d0f02053a6d11b2eac1fdc)).
- preserve published merchant IDs across refreshes with persistent registry ([`1c15026`](https://github.com/Lukestaz/data-dashboard/commit/1c1502698155164a2f9d89eca090fb053ddf22d2)).
- unify voting identity across cards and map with legacy compatibility ([`e6b4fd8`](https://github.com/Lukestaz/data-dashboard/commit/e6b4fd80271e3465e6b971987a311652156e04d6)).
- safely retry refresh publication after concurrent main updates ([`833dd66`](https://github.com/Lukestaz/data-dashboard/commit/833dd66d9d01eb45d56428411082f5ce6d2ec005)).

Maintenance

- record Actions run status \[skip ci\] ([`8c44b35`](https://github.com/Lukestaz/data-dashboard/commit/8c44b35a87a8ff0dfda402d6c5c3c2bd2437c135)).
- rename Amex refresh workflow and dependent triggers ([`cc12dd0`](https://github.com/Lukestaz/data-dashboard/commit/cc12dd0b6f08f5b3cd98889b0035dc70ed899f78)).
- record Actions run status \[skip ci\] ([`6b85c90`](https://github.com/Lukestaz/data-dashboard/commit/6b85c900f4980d45b5744bfaaa0150ff8a5e3eeb)).
- record Actions run status \[skip ci\] ([`91c8f9c`](https://github.com/Lukestaz/data-dashboard/commit/91c8f9c83792e9ab377b3996969655c22d63d539)).
- record Actions run status \[skip ci\] ([`2a8371b`](https://github.com/Lukestaz/data-dashboard/commit/2a8371b2530cadb6e4a87a836caa8f06c3c22a25)).
- record Actions run status \[skip ci\] ([`25376dc`](https://github.com/Lukestaz/data-dashboard/commit/25376dc8274079d05c505c8fea683d2ee46c76fe)).
- record Actions run status \[skip ci\] ([`5f6a7bc`](https://github.com/Lukestaz/data-dashboard/commit/5f6a7bc3be4ab290b3011bd45d22d3d9f4e1b24a)).
- record Actions run status \[skip ci\] ([`028cca8`](https://github.com/Lukestaz/data-dashboard/commit/028cca8f2099abff54f8ff4bf8b2afa3d29a8dd1)).
- record Actions run status \[skip ci\] ([`69e5e30`](https://github.com/Lukestaz/data-dashboard/commit/69e5e30f5914a3c5bd13699b2343fd083ee9897f)).
- record Actions run status \[skip ci\] ([`67bd429`](https://github.com/Lukestaz/data-dashboard/commit/67bd429ee1ce4a6cdc00ea2f0f1508d4c61a7168)).
- record Actions run status \[skip ci\] ([`78b00d2`](https://github.com/Lukestaz/data-dashboard/commit/78b00d2b9aa469138196bff95b7add58adc610cc)).
- record Actions run status \[skip ci\] ([`cd6d938`](https://github.com/Lukestaz/data-dashboard/commit/cd6d93807ab97366880f3d57f7dcd12d90b07a31)).
- record Actions run status \[skip ci\] ([`e73b314`](https://github.com/Lukestaz/data-dashboard/commit/e73b314e7b238bd8d05cc7784da0f8a8388e2a9b)).
- compact generated dataset and cache JSON after refresh ([`9e46e69`](https://github.com/Lukestaz/data-dashboard/commit/9e46e6900407888184d793fc5ffdbe438a4009a0)).
- record Actions run status \[skip ci\] ([`01e6641`](https://github.com/Lukestaz/data-dashboard/commit/01e6641c3703f0ba9ee11e4eb768fb5232a1c1d6)).
- record Actions run status \[skip ci\] ([`9aea0f0`](https://github.com/Lukestaz/data-dashboard/commit/9aea0f02594bc3da1903959708dce4eff9c3d098)).
- record Actions run status \[skip ci\] ([`f5a9d99`](https://github.com/Lukestaz/data-dashboard/commit/f5a9d9928bb9902a218d2700d802b777fc97f5c9)).
- record Actions run status \[skip ci\] ([`42ed43e`](https://github.com/Lukestaz/data-dashboard/commit/42ed43ea2a48d86c9e0d9b0ac857f39175b520c2)).
- record Actions run status \[skip ci\] ([`54fe67c`](https://github.com/Lukestaz/data-dashboard/commit/54fe67c6cc539bd4294ae5a53a439694247c2682)).
- record Actions run status \[skip ci\] ([`597fe41`](https://github.com/Lukestaz/data-dashboard/commit/597fe41b6d3b2da0efaf36b11dc955e1c16573a3)).
- record Actions run status \[skip ci\] ([`43168e8`](https://github.com/Lukestaz/data-dashboard/commit/43168e8b8043c322ea621a02d4af0e658d57023d)).
- record Actions run status \[skip ci\] ([`56bb9fc`](https://github.com/Lukestaz/data-dashboard/commit/56bb9fcb7ef1d58109c6301fd2f705ff184ec034)).
- record Actions run status \[skip ci\] ([`ffdef3c`](https://github.com/Lukestaz/data-dashboard/commit/ffdef3ce8d2b32f1c1de077cb691e56d79e30d28)).
- record Actions run status \[skip ci\] ([`5977316`](https://github.com/Lukestaz/data-dashboard/commit/597731616d52d0059026ae8b5e6e2d9e19ed4d27)).
- record Actions run status \[skip ci\] ([`dbbc007`](https://github.com/Lukestaz/data-dashboard/commit/dbbc007ef84def9a5b21fbdbb7a1886728a29aa1)).
- record Actions run status \[skip ci\] ([`cde105b`](https://github.com/Lukestaz/data-dashboard/commit/cde105b0eee7da38e32f8029f6bf667647439ebe)).

<!-- AUTO-CHANGELOG:END -->


All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — 2026-10-07

- Two-tier city and suburb/local-area filtering, with Other towns / areas and a Wikipedia-based major/large urban-area list.
- Separate rawLocation, canonicalCity and localArea fields in browser-normalized records.
- Combined map and cards view: scrollable desktop sidebar, stacked mobile layout and hide/show list control.
- Linked card/pin selection while retaining save and voting controls.
- Automatic map-bound filtering of sidebar cards after zooming or panning; Cards view restores the full filtered list.
- Visible Reset filters control and contextual search, city and local-area clear buttons.
- Deployment/refresh monitoring workflow with completion triggers, scheduled checks and persistent status in data/ops/action-runs.json after successful execution.

### Changed — 2026-10-07

- Extracted application behaviour into JavaScript modules.
- Condensed desktop search, both location tiers, sorting and reset into a single responsive row.
- Removed the 1,500-pin cap in favour of clustered, chunked loading.
- Limited automatic map fit to the initial display rather than repeatedly resetting the user's map area.
- Updated README with current behaviour, data-count distinctions, operational monitoring and limitations.

### Fixed — 2026-10-07

- Location cleanup regression: postcode and punctuation-only labels, macron handling and address-context disambiguation.
- Missing UI controls for clearing filters and the second location tier.
- Dataset loading support for both plain arrays and objects containing merchants.
- Global wiring for dataset switching and saved-list sync controls.
- Malformed literal newline sequences in three Amex refresh YAML blocks; retained legacy-data safeguards and data/history.json commits.

### Notes

- Run monitoring is separate from merchant turnover history. Its installation does not establish that a monitoring or refresh run succeeded.
- Map-area filtering excludes records without coordinates and inherits uncertainty from approximate positions.
- These changes are recorded under Unreleased; no new release tag is created by this documentation update.

## [1.2.0] - 2026-10-05

### Added
- **Save from Map View**: Leaflet marker popups now feature an interactive save/favorite toggle (`★ Saved` / `☆ Save`) that immediately syncs with the user's saved list and localStorage.
- **Cross-Device Saved List Sync**: Share and transfer saved merchants across phones, tablets, or browsers without accounts, passwords, or centralized databases using URL-encoded hash tokens (`#sync=...`).
- **Sync / Share Modal**: Dedicated UI toolbar button and modal dialog for copying sync links and importing codes.
- **Auto-import on Launch**: Opening a sync URL prompts the user to seamlessly merge shared merchants into their existing list.

## [1.1.0] - 2026-10-04

### Added
- **Amex Offer Reminder Modal**: One-time dismissible notice reminding shoppers to activate their Amex offer in the mobile app before paying to receive cashback.
- **Dismissal Persistence**: Reminder state stored in `localStorage` under `shop_small_offer_notice_2026`.
- **Privacy-First Analytics**: Cookieless, privacy-preserving telemetry integration via Umami Cloud.

## [1.0.0] - 2026-10-03

### Added
- Initial dashboard release
- Interactive merchant map with clustering
- Search and filter functionality (city, category, in-store vs online)
- Geolocation distance calculation ("Near Me")
- Local favorites and saved merchants filter
- Multi-dataset architecture with dataset switcher
- Legacy merchant database (~10,840 records) and Amex Shop Small export
