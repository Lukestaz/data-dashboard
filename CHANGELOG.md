# Changelog

<!-- AUTO-CHANGELOG:START -->
## Automated changes

Generated from commit messages; these are not release or deployment confirmations.

### 2026-10-08 (NZ time)

Features

- display source capture time in compact menu ([`c3cf4ad`](https://github.com/Lukestaz/data-dashboard/commit/c3cf4adc5f240bd85d8bab21567b3cc560dcda4e)).
- retain loaded dataset source and capture timestamp ([`bfce69a`](https://github.com/Lukestaz/data-dashboard/commit/bfce69ac03afd90ef92d9be6908d3255e7e309f3)).
- add deployed build and changelog to compact menu ([`cd64863`](https://github.com/Lukestaz/data-dashboard/commit/cd6486379baf7c130b34fe40809a9d0059496fc4)).
- connect anonymous feedback modal to Cloudflare Worker ([`f9af659`](https://github.com/Lukestaz/data-dashboard/commit/f9af659617baa644100f35140ffd82951129b934)).
- add protected anonymous feedback Worker for GitHub issues ([`aacf758`](https://github.com/Lukestaz/data-dashboard/commit/aacf75858a5592a94da3127ee3b022a85737700a)).

Fixes

- highlight breaking changes and strengthen changelog tests ([`833b9f2`](https://github.com/Lukestaz/data-dashboard/commit/833b9f28ecaeeafd38d8df031f63024a52c65304)).
- explain feedback length requirements with inline trimmed validation ([`0e0b43c`](https://github.com/Lukestaz/data-dashboard/commit/0e0b43c1f4787d85e6be6f742f60551525ca6d3a)).

Maintenance

- record Actions run status \[skip ci\] ([`7683168`](https://github.com/Lukestaz/data-dashboard/commit/7683168cc17c58065bf1182c3b96f08129d923f4)).
- retire historical v1.3.0 tagging workflow ([`2b8146e`](https://github.com/Lukestaz/data-dashboard/commit/2b8146e6d451b534cff2613311e5dcf34d8069b7)).
- record Actions run status \[skip ci\] ([`9dc0590`](https://github.com/Lukestaz/data-dashboard/commit/9dc0590e57a60979ad146797e95406470c13f057)).
- record Actions run status \[skip ci\] ([`9e11030`](https://github.com/Lukestaz/data-dashboard/commit/9e110308c2eb0aa08e7cf9f45f8c6b0f541e40ed)).
- record Actions run status \[skip ci\] ([`39a5f32`](https://github.com/Lukestaz/data-dashboard/commit/39a5f3237bb0e74935f53d2314399a17ea6763b0)).
- record Actions run status \[skip ci\] ([`d8037b9`](https://github.com/Lukestaz/data-dashboard/commit/d8037b960f310ecabca445cebd1431675d698318)).
- record Actions run status \[skip ci\] ([`a7f4367`](https://github.com/Lukestaz/data-dashboard/commit/a7f4367f79d3d14328e3333df1cb55f45ff98c40)).
- record Actions run status \[skip ci\] ([`71fa2a9`](https://github.com/Lukestaz/data-dashboard/commit/71fa2a95bcc87a033e487a3146af82694659bf0d)).
- record Actions run status \[skip ci\] ([`d7781c3`](https://github.com/Lukestaz/data-dashboard/commit/d7781c3d94dfc9f09e86ccf8d5bca6cb14f5b12f)).
- record Actions run status \[skip ci\] ([`f37993d`](https://github.com/Lukestaz/data-dashboard/commit/f37993dbdc11e1152c91d7fca3da4ed760d1b84a)).
- record Actions run status \[skip ci\] ([`7a4e5d9`](https://github.com/Lukestaz/data-dashboard/commit/7a4e5d9d29a26b2d8cec1a10e5ac83594390d5d2)).
- record Actions run status \[skip ci\] ([`6a693df`](https://github.com/Lukestaz/data-dashboard/commit/6a693df14846046f6dd8128c533f699f0d5e29e5)).
- record Actions run status \[skip ci\] ([`591358c`](https://github.com/Lukestaz/data-dashboard/commit/591358cbe841023131bfdaec2144fe7c0bfa2904)).
- record Actions run status \[skip ci\] ([`1a92b45`](https://github.com/Lukestaz/data-dashboard/commit/1a92b45f801b6f869e3995ee4c6d8678fba06a99)).
- record Actions run status \[skip ci\] ([`cc9c558`](https://github.com/Lukestaz/data-dashboard/commit/cc9c558d67a6f51de1fac29858f13eaba20276fe)).
- record Actions run status \[skip ci\] ([`20a12c8`](https://github.com/Lukestaz/data-dashboard/commit/20a12c885ebc2422f9e5771585610e2b25436e70)).

### 2026-10-07 (NZ time)

Features

- match category chip dots to map pin colours ([`ab01819`](https://github.com/Lukestaz/data-dashboard/commit/ab018192a09f8acd081a3733785c89afae73b7da)).
- compact mobile toolbar and move source selection to secondary menu ([`cc8778b`](https://github.com/Lukestaz/data-dashboard/commit/cc8778b5cb934d84e1790582a3092699b4fd418b)).
- show online availability globe badges on merchant cards ([`602160b`](https://github.com/Lukestaz/data-dashboard/commit/602160b50c2834c11fe80fcb7c91be183c738433)).
- add category-dependent subtype filter to cards and map ([`9561776`](https://github.com/Lukestaz/data-dashboard/commit/956177631150d338cbb842e1d7aa2e4925f80daf)).
- derive browsing categories after import with audited subtype rules ([`53b9826`](https://github.com/Lukestaz/data-dashboard/commit/53b98260313f535a987eea704ecad0132af64a9d)).
- ingest Amex JSON directly and normalize locations during refresh ([`6288829`](https://github.com/Lukestaz/data-dashboard/commit/6288829b47e9454c5345db7b3db69430a563dc3d)).

Fixes

- standardise availability controls and keep dialogs above menus and map ([`74548d1`](https://github.com/Lukestaz/data-dashboard/commit/74548d1ed79eae542480daccfe6d5e9eee59ae2e)).
- remove legacy filter DOM observer and polish compact controls ([`c775a07`](https://github.com/Lukestaz/data-dashboard/commit/c775a07a77959ca27731e816a6815fb803810dda)).
- wrap Chathams map longitudes consistently and hide legacy reset ([`ddf5df0`](https://github.com/Lukestaz/data-dashboard/commit/ddf5df0ebe8865bbd681ab20774cef6e73cac812)).
- preserve map filter results before viewport list updates ([`05ec889`](https://github.com/Lukestaz/data-dashboard/commit/05ec889e21f6b22c22c21c4e2908dc4d65fcb428)).
- consolidate reset and map controls in compact mobile layout ([`0e486f4`](https://github.com/Lukestaz/data-dashboard/commit/0e486f44ca0659aadb40d42f6a7f60d3980af0c7)).
- simplify subtype reset and exclude type-only selections from Clear ([`dcacc07`](https://github.com/Lukestaz/data-dashboard/commit/dcacc0794eb18cd5eda992fe2e3e6a5803cf3451)).
- restore prominent availability filters and two-tier category chips ([`7bd0f97`](https://github.com/Lukestaz/data-dashboard/commit/7bd0f97483d5f7f721cb819523ed0dd97f745dbb)).
- place subtype below categories and align dropdown styles and labels ([`e6660c3`](https://github.com/Lukestaz/data-dashboard/commit/e6660c3a8562843be982461a73514afbe212881e)).
- recognise Rotorua Victoria and Chathams; recover audited NZ pins conservatively ([`5d69b50`](https://github.com/Lukestaz/data-dashboard/commit/5d69b50b1531df26e08a26d8b6bd1272cec3a35e)).
- quarantine overseas addresses and reject invalid cached map pins ([`c1f6957`](https://github.com/Lukestaz/data-dashboard/commit/c1f6957156f7c9743082360c3edabca93fd2e115)).
- finalize turnover history against immutable pre-refresh baseline ([`b4eea7f`](https://github.com/Lukestaz/data-dashboard/commit/b4eea7f9221a6f7855d0f02053a6d11b2eac1fdc)).
- preserve published merchant IDs across refreshes with persistent registry ([`1c15026`](https://github.com/Lukestaz/data-dashboard/commit/1c1502698155164a2f9d89eca090fb053ddf22d2)).
- unify voting identity across cards and map with legacy compatibility ([`e6b4fd8`](https://github.com/Lukestaz/data-dashboard/commit/e6b4fd80271e3465e6b971987a311652156e04d6)).
- safely retry refresh publication after concurrent main updates ([`833dd66`](https://github.com/Lukestaz/data-dashboard/commit/833dd66d9d01eb45d56428411082f5ce6d2ec005)).

Performance

- reuse map markers, lazy-load popups and colour category pins ([`34b5ba8`](https://github.com/Lukestaz/data-dashboard/commit/34b5ba829d6f05987354e46e8cb3de49af7b32bc)).

Maintenance

- record Actions run status \[skip ci\] ([`0939b3d`](https://github.com/Lukestaz/data-dashboard/commit/0939b3dee0a8844e84bcd8f62a2998a72f711bb6)).
- record Actions run status \[skip ci\] ([`102b866`](https://github.com/Lukestaz/data-dashboard/commit/102b866b33596975801aa2aa41279ea36c9a1822)).
- record Actions run status \[skip ci\] ([`6d2e023`](https://github.com/Lukestaz/data-dashboard/commit/6d2e0233ded8a1af98a73b4c7087178b4e532efc)).
- record Actions run status \[skip ci\] ([`83beff8`](https://github.com/Lukestaz/data-dashboard/commit/83beff81cfa75e5870680e703ef33f2f61d1448c)).
- record Actions run status \[skip ci\] ([`4ac0d69`](https://github.com/Lukestaz/data-dashboard/commit/4ac0d691cd75610b58974dfb061aacf43e01256c)).
- record Actions run status \[skip ci\] ([`bd17664`](https://github.com/Lukestaz/data-dashboard/commit/bd176641b44627fbfc2cea9c1f7d5f622a71ac76)).
- record Actions run status \[skip ci\] ([`97242d5`](https://github.com/Lukestaz/data-dashboard/commit/97242d56ab20b649f4ce52beb4d558c2bcf16d30)).
- record Actions run status \[skip ci\] ([`204747e`](https://github.com/Lukestaz/data-dashboard/commit/204747e614784610cb5a3ec97247e34e63abc7e0)).
- record Actions run status \[skip ci\] ([`8bd1ab7`](https://github.com/Lukestaz/data-dashboard/commit/8bd1ab739af132647dd018fb05f1974aed20ad79)).
- record Actions run status \[skip ci\] ([`2828a7a`](https://github.com/Lukestaz/data-dashboard/commit/2828a7aa4c35c3fb7865efee1e1faf6a94444829)).
- record Actions run status \[skip ci\] ([`b77b0b4`](https://github.com/Lukestaz/data-dashboard/commit/b77b0b4ada42a485bbd4a8b4913ed9cdacee57f6)).
- record Actions run status \[skip ci\] ([`73392d6`](https://github.com/Lukestaz/data-dashboard/commit/73392d65878e25d3f1cb83ddc4d356989cee404e)).
- record Actions run status \[skip ci\] ([`0cf8965`](https://github.com/Lukestaz/data-dashboard/commit/0cf8965ac2dd8dc68529f37e0873917fcc14d98a)).
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
