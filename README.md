# NZ Merchant Data Dashboard

An interactive web dashboard for exploring small business merchant data in New Zealand, with support for multiple data sources including American Express Shop Small campaign data.

## Features

- **Interactive Map Visualization** - Browse merchants on a map of New Zealand
- **Multi-source Data Selection** - Switch between legacy merchant database and Amex Shop Small campaign data
- **Search & Filter** - Find merchants by name, category, location, or type
- **Coordinate Quality Indicators** - Visual flags for data quality issues
- **Responsive Design** - Works on desktop and mobile devices

## Data Sources

| Dataset | Description | Records | Status |
|---------|-------------|---------|--------|
| Legacy Merchant Database | Curated merchant locations from existing business data | ~10,000+ | Stable |
| Amex Shop Small (2026-10-02) | American Express Shop Small campaign export | 12,102 | Review |

### Amex Shop Small Data Notes

The Amex Shop Small dataset was captured from the official campaign data feed on 2026-10-02. Notable quality considerations:

- **12,102 unique merchants** identified by `SENumber`
- **13 records** have coordinates outside expected New Zealand bounds (flagged for review)
- Coordinate validation is applied when this dataset is selected
- Address text is generally more reliable than coordinates in this source
- Data includes merchant type, subtype, address, and Google Maps links

## Quick Start

```bash
# No build step required - pure vanilla JS/HTML/CSS
# Serve the directory with any static file server:

# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
data-dashboard/
├── index.html              # Main dashboard application
├── data.json               # Legacy merchant dataset (primary)
├── amex_merchants_all.csv  # Amex data in CSV format
├── data/
│   └── datasets.json       # Dataset registry (source metadata)
├── README.md               # This file
├── CHANGELOG.md            # Release history
└── package.json            # Project metadata
```

## Dataset Selector

The dashboard includes a persistent dataset selector in the toolbar:

- **Legacy merchant database** - Default, stable dataset
- **Amex Shop Small — 2 Oct 2026 (review)** - Campaign snapshot with coordinate validation

Selection persists across sessions via `localStorage`.

## Coordinate Validation

When the Amex dataset is selected, the dashboard applies automatic coordinate screening:

```javascript
function isNewZealandCoordinate(lat, lng) {
  return lat >= -48.5 && lat <= -33.0 &&
         lng >= 165.0 && lng <= 180.5;
}
```

Records failing validation remain searchable by name/address but are excluded from map markers with a "location awaiting validation" indicator.

## Development

### Adding a New Dataset

1. Place the dataset file in the project root or `data/` directory
2. Add an entry to `data/datasets.json`
3. Ensure the dataset has a compatible schema or add a transformer in `index.html`

### Data Schema

Expected merchant record fields:

```json
{
  "name": "Business Name",
  "type": "Retail|Restaurant|General|...",
  "subType": "Specific category",
  "address": "Full street address",
  "city": "City/Town",
  "region": "Region",
  "postcode": "XXXX",
  "latitude": -36.8485,
  "longitude": 174.7633,
  "SENumber": "12345678"  // Amex-specific identifier
}
```

## Attribution

- **Amex Shop Small Data**: © American Express, sourced from public campaign directory
- **Map Tiles**: OpenStreetMap contributors
- **Geocoding**: Nominatim / OpenStreetMap

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request with a clear description

---

*Last updated: October 2026*