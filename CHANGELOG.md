# Changelog

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
