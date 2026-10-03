# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automatic run-over-run diff and history logging to `data/history.json`
- Scraper records turnover metrics (added/removed merchants, new geocoded locations)
- Updated documentation noting that Amex upstream coordinates are discarded in favor of verified cache and OpenStreetMap Nominatim

## [1.0.0] - 2026-10-03

### Added
- Initial dashboard release with interactive merchant map and clustering
- Search and filter functionality with category-based filtering
- Google Maps and Google Reviews integrations
- Legacy merchant dataset (~10,840 records from Cheapies 1 Oct archive)
- Automated twice-weekly refresh workflow for Amex Shop Small campaign
- Dataset selector enabling switching between Amex Live and Cheapies Archive