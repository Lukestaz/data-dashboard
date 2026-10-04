# NZ Merchant Data Dashboard

An interactive web dashboard for exploring small business merchant data in New Zealand, with support for multiple data sources including American Express Shop Small campaign data.

## Features

- **Interactive Map Visualization** - Browse merchants on a map of New Zealand with clustering and direct save toggles
- **Cross-Device Saved Lists** - Share and transfer favorites across devices with zero-backend sync links
- **Multi-source Data Selection** - Switch between legacy merchant database and Amex Shop Small campaign data
- **Search & Filter** - Find merchants by name, category, location, or type
- **Near Me Geolocation** - Sort merchants by real-time distance from your location
- **Amex Offer Reminder** - Built-in reminder to activate offers before paying
- **Privacy-First Analytics** - Cookieless, lightweight telemetry via Umami
- **Responsive Design** - Optimized for mobile and desktop

## Cross-Device Sync (Zero Backend)

Saved merchants are stored locally in the browser (`localStorage`). To transfer your saved list to another phone or computer without creating an account:
1. Tap the **Sync** button in the header toolbar.
2. Tap **Copy** to grab your unique sync link (e.g. `https://lukestaz.github.io/data-dashboard/#sync=...`).
3. Open the link on your other device to merge your saved merchants automatically.

## Data Sources

| Dataset | Description | Records | Status |
|---|---|---|---|
| Legacy Merchant Database | Curated merchant locations from existing business data | ~10,000+ | Stable |
| Amex Shop Small (2026-10-02) | American Express Shop Small campaign export | 12,102 | Review |

## Quick Start

```bash
# Pure vanilla JS/HTML/CSS - serve with any static server:
python -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## License

MIT License - see LICENSE file for details.
