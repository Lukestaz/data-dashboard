# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
