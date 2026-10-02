# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Multi-dataset architecture with dataset registry (`data/datasets.json`)
- Persistent dataset selector in UI toolbar
- Amex Shop Small campaign data as secondary source (2026-10-02 capture)
- Coordinate validation for Amex dataset (NZ bounds checking)
- Source-aware map rendering and search
- `localStorage` persistence for dataset selection
- Visual indicators for coordinate quality issues

### Changed
- Refactored data loading to support multiple sources
- Updated map marker rendering to handle source-specific coordinate rules
- Improved search to work across all datasets

### Fixed
- Coordinate outliers in Amex dataset no longer pollute map view

## [1.0.0] - 2026-10-03

### Added
- Initial dashboard release
- Interactive merchant map with clustering
- Search and filter functionality
- Category-based filtering
- Google Maps integration for directions
- Responsive design for mobile/desktop
- Legacy merchant dataset (~10,840 records)
- Amex merchants CSV export (1.9 MB)

### Data Sources
- Legacy curated merchant database
- American Express Shop Small campaign data (CSV format)

---

## Release Notes Template

### [Version] - YYYY-MM-DD

#### Added
- New features

#### Changed
- Changes to existing functionality

#### Deprecated
- Soon-to-be removed features

#### Removed
- Removed features

#### Fixed
- Bug fixes

#### Security
- Security improvements