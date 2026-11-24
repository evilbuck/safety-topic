---
status: completed
date: 2026-11-24
subject: 2026-11-24.jobsite-offline-pwa
topics: [PWA, offline, service worker, web manifest, jobsite availability, installability]
research: [research-jobsite-offline-pwa.md]
iterations: [iterate-jobsite-offline-pwa.md]
spec:
memory: [jobsite-offline-pwa-2026-11-24.md]
---

# Plan: Jobsite offline install (loop 6)

## User Goal

Deliver loop 6's one major change: make SafetyTopic installable and fully offline-capable on jobsites, so a crew boss with zero signal can still open the app, run a talk, record it, and print the sign-off sheet. Today the app cannot even open offline (zero service-worker/manifest surface, repo-verified). The same change shields the `meetingLog`/`usedTopics` record from Safari/WebKit's 7-day ITP localStorage eviction via the home-screen install exemption (verified live from webkit.org). Strict no-op on `file://` and plain non-localhost HTTP, per the repo's static/file:// contract.

## Scope

**In:**
- New files: `pwa-assets.js` (shared constants: `PWA_CACHE_VERSION`, `PWA_PRECACHE_ASSETS`), `pwa.js` (protocol-guarded `registerPwa(nav, loc)` with JSDoc, warns on failure), `sw.js` (hand-written: install precaches `PWA_PRECACHE_ASSETS` via `importScripts('./pwa-assets.js')`; activate deletes foreign caches + `skipWaiting`/`clients.claim`; fetch handler GET-only, same-origin only, cache-first with background revalidate, navigation fallback to cached `./index.html`), `manifest.webmanifest` (relative `./` paths, standalone display, existing brand tokens `#f4f5f7`/`#0096C7`), `icon.svg` (512 viewBox, brand mark inside maskable safe zone, no external refs).
- Edits: `index.html` + `browse.html` head (manifest link, icon link, theme-color meta) + `<script src="pwa.js"></script>`; `server.js` MIME map + one line (`.webmanifest` → `application/manifest+json`).
- Tests: new `tests/pwa.test.js` per research test plan (~12 tests: injected-fake guard unit tests, precache-list disk-existence guard, sw.js source-contract regexes, manifest JSON contract).
- Docs (docs stage): README offline/install note, CHANGELOG, AGENTS.md file map + cache-version rule.

**Out:** no data-shape changes (`meetingLog`/`usedTopics`/topic schema untouched), no backup/restore import (backlogged as loop-7 candidate), no headcount field (parked), no topic content changes, no dependency, no build step, no Lighthouse/DevTools workflow automation (manual gate only).

**Bug rule:** any bug found along the way (e.g., the verified `server.js` MIME gap) gets fixed within the loop if it belongs to the change's surface; otherwise logged to backlog.

## Acceptance criteria

- [x] `sw.js`, `manifest.webmanifest`, `pwa.js`, `pwa-assets.js`, `icon.svg` exist and follow the research spec exactly; registration is guarded: absent `serviceWorker` container → false; non-https non-localhost/127.0.0.1 origin → false; secure origin → registers `./sw.js`, warn-not-throw on failure. (Deviation from spec, live-verified defect fix: `PWA_CACHE_VERSION` lives in `sw.js`, not `pwa-assets.js` — see iterate artifact.)
- [x] Precache list is truthful and guarded by a test: every `PWA_PRECACHE_ASSETS` entry except `'./'` exists on disk, and the sw.js source contract (importScripts, versioned cache name, activate cleanup, fetch handler, skipWaiting/clients.claim) is asserted.
- [x] `index.html` and `browse.html` both link the manifest, icon, theme-color and load `pwa.js`; `server.js` serves `.webmanifest` with the correct MIME type.
- [x] Live Chromium @ localhost:3000: manifest valid with no installability errors observed (SVG-only icons; PNG fallback not triggered — install-prompt UI itself unverifiable in headless Chromium) and SW activated; Network → Offline + hard reload: app renders and Get a Topic, filter, "I Used This", sign-off sheet preview, Browse, Pulse all work with zero network; version-bump swap check passes (old cache deleted on activate — verified via forced `reg.update()` since Chrome throttles navigation update checks to once per 24h).
- [x] `file://` open: no console errors, no registration attempt, existing behaviors unchanged (AGENTS.md checklist spot-check).
- [x] Full vitest suite green: existing 198 + 15 new PWA tests, zero failures (213 passed).

## Verification

- `npx vitest run` — full suite green (198 + ~12 new; the new tests are real contracts: guard behavior via injected fakes, disk-existence of the precache list, sw.js source contract, manifest JSON — not tautologies).
- Live Chromium @ localhost:3000 per acceptance criteria (DevTools manifest/SW panels, offline reload, record + print offline, version bump).
- `file://` spot-check of index.html (no console errors).
- Plain `http://<LAN-IP>:3000` spot-check: works, no SW registered (guarded no-op).

## Risks

- Chromium may refuse SVG-only icons for installability: pre-approved fallback (commit `icon-192.png`/`icon-512.png` exported once from icon.svg); gated by DevTools installability check, not improvisation.
- Cache staleness on content updates: mitigated by `PWA_CACHE_VERSION` bump discipline (encoded as an AGENTS.md rule in docs stage) + activate-time old-cache deletion + background revalidation.
- jsdom cannot execute the real SW: mitigated by source-contract tests + the live manual gate; the guard function itself is fully unit-tested.
