---
status: completed
date: 2026-11-24
subject: 2026-11-24.jobsite-offline-pwa
related: [plan-jobsite-offline-pwa.md, research-jobsite-offline-pwa.md]
---

# Iterate: Jobsite Offline Install (loop 6)

Review subagent `PwaReview` (read-only, 3m13s): **VERDICT: PASS** — zero DEFECTs, zero WARNINGs, 3 NITs. Suite 212 passed / 3 files at review time (213 after NIT-2 fix below).

## Orchestrator-found defect fixed before review (live-verification gate failure)

The plan's version-bump acceptance criterion FAILED live: bumping `PWA_CACHE_VERSION` in `pwa-assets.js` did nothing — `caches.keys()` stayed `safetytopic-v1` across reloads. Root cause: the browser only reinstalls a service worker when `sw.js`'s **own bytes** change; a version constant in an `importScripts()`'d file never propagates (and default `updateViaCache: 'imports'` can additionally serve the import stale from the HTTP cache). Fix, verified live:

- `PWA_CACHE_VERSION` moved into `sw.js` (byte change = guaranteed update trigger; single source of truth for the cache name). `pwa-assets.js` now holds only `PWA_PRECACHE_ASSETS`.
- `pwa.js` registers with `{ updateViaCache: 'none' }` so `sw.js` and its imports bypass the HTTP cache on update checks.
- Tests re-pinned: sw.js source contract asserts the integer literal + cache-name construction; register tests assert the `updateViaCache` option; the pwa-assets version test was removed (constant no longer there).
- Live re-verification: v1→v2 swap via forced `reg.update()` deletes the old cache and precaches v2 (11 entries, page controlled); revert v2→v1 swaps back; offline smoke passes after the revert. Note: production propagation rides Chrome's navigation update check (throttled to once per 24h), which is the standard PWA update cadence — documented in the sw.js header comment and the AGENTS.md offline cache rule.

## Review findings and resolutions

| # | Class | Finding | Resolution |
|---|---|---|---|
| 1 | NIT | `tests/pwa.test.js:64-69` dead `called` spy in the absent-container test (no callback could ever set it) | Fixed inline: spy removed |
| 2 | NIT | Guard's localhost/127.0.0.1 branch didn't check protocol, so a `file://localhost/…` fake location with an injected container would pass; no explicit `file:` test | Fixed inline: branch tightened to `l.protocol === 'http:' && (localhost \|\| 127.0.0.1)`; new test asserts `file:` (empty hostname and `localhost` hostname) returns false with no register call. Suite 213 passed; live localhost SW still activates/controls; LAN-IP and file:// no-op behavior unchanged (re-checked live) |
| 3 | NIT | Research/plan artifacts still said `PWA_CACHE_VERSION` lives in `pwa-assets.js` | Handled in docs stage: AGENTS.md offline cache rule records the bump discipline against `sw.js` (done); research/plan artifacts left as historical record — the deviation is documented here and in the commit body |

## Live verification (Chromium @ localhost:3000, engine-level error/console listeners)

- SW registered → `activated`, page controlled; `caches.keys()` = `['safetytopic-v1']`; precache exactly the 11 `PWA_PRECACHE_ASSETS` entries.
- Manifest fetches and parses with all installability members (name, short_name, start_url/scope `./`, standalone, any+maskable icons). `beforeinstallprompt` did not fire — headless Chromium never shows install UI; installability panel check is not automatable here. No installability *error* was observed and all documented criteria are present, so the pre-approved PNG fallback was NOT triggered. Honest limit: the install affordance itself is verified only against the documented criteria, not a live prompt.
- **Offline (Network cut via `page.setOfflineMode(true)`, then reload):** full render (60 topics, 15 filter options), Get a Topic picked "Electrical Safety Basics", "I Used This" wrote `meetingLog` (1→2, date 2026-11-24), sign-off sheet populated + `window.print` invoked, browse.html served from SW (60 rows), Program Pulse rendered "2 talks recorded". Zero page errors, zero console entries.
- **`file://`**: `registerPwa()` returned false, no registration, app fully rendered (60 topics), zero console entries.
- **`http://192.168.1.168:3000` (LAN IP)**: `registerPwa()` false, no SW, zero console noise; (`caches` API absent on insecure origins — probe detail, not app behavior).

## Skipped

None — every plan acceptance criterion was exercised; the only unverifiable item (install prompt UI in headless Chromium) is recorded above.
