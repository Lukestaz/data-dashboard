# Analytics event contract

## Publication and interpretation

Directions tracking was prepared against main
923776c47903cca958de16b34df2def871b30c6f. It is not yet verified in production.
Record the deployed revision and first verified receipt after publication.
Do not label the development date as the first production receipt.

The supplied export first records the older custom events at
2026-10-12 12:26:40 (timestamp as stored). This is observed receipt, not a proven
installation time. Compare features within matching tracking windows.
Report distinct visit IDs containing each action, not event share as user share.
Visits can contain multiple actions, so their percentages overlap.

## Directions intent: merchant-action

- Trigger: a trusted click on an explicitly tagged Directions link.
- action: directions.
- surface: cards (cards-only view), map-card (list beside/below map), map-popup.
- Meaning: intent to open the existing Google Maps search link. Not proof of a
  route calculation, external-page load, arrival, purchase or AMEX acceptance.
- Default link behaviour is unchanged. Trusted keyboard-generated clicks are
  eligible; middle-button auxclick is not instrumented in this tranche.
- Synthetic clicks and unknown actions/surfaces are ignored.
- No merchant identity, link URL, coordinates, search text or saved contents are
  sent. Properties are allowlisted. This is not an audit of pageview URL capture.

## Existing events (unchanged)

| Event | Meaning and properties |
| --- | --- |
| location-opened | Location disclosure opens while not hidden |
| location-filter-changed | level: city/area; action: select/clear; location values omitted |
| near-me-requested | source: button/sort |
| near-me-result | outcome: success/denied/unavailable/timeout; source: button/sort |
| near-me-cleared | Existing Near Me position cleared |
| view-changed | Transition to mode: cards/map; source: control/availability |
| map-navigated | Debounced action: pan/zoom; not every movement |
| merchant-selected | surface: map-marker/map-card; not cards-only browsing |
| map-fit-requested | Trusted click on Fit control |

Near Me success records the geolocation success callback, not useful nearby
shops. Area-chip/reset paths are not guaranteed individual location-change
coverage. Map automatic/user attribution still needs real-browser verification.

## Excluding development traffic

On the dashboard origin, in each routine development browser/profile:

```js
localStorage.setItem('umami.disabled', 1);
```

To re-enable tracking in that browser/profile:

```js
localStorage.removeItem('umami.disabled');
```

Use a separate tracked profile for explicitly recorded analytics verification
windows. This is a browser-local setting, not site-wide exclusion or historical
cleanup. The code change does not alter anyone's browser setting.

## Validation

```sh
node tests/merchant-actions.test.mjs
node tests/analytics.test.mjs js/analytics.js js/app.js
python3 scripts/check_frontend.py
```

The new fixtures cover the full helper, delegated card handler, card markup and
popup wiring using mocked DOM objects. They do not replace real browser/Leaflet
integration or the existing app-level fixtures. Verify one event per Directions
activation on all three surfaces, unchanged navigation with analytics blocked,
and no merchant-selected event caused by embedded links. Use controlled tracker
responses; production test events require approval.

Empty-result, dataset-load and saved-list events are deferred to separate work.
