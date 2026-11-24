---
date: 2026-11-24
domains: [pwa, javascript, testing, research, ops]
topics: [service worker, offline, web manifest, installability, cache versioning, jobsite availability]
subject: 2026-11-24.jobsite-offline-pwa
artifacts: [plan-jobsite-offline-pwa.md, iterate-jobsite-offline-pwa.md, research-jobsite-offline-pwa.md]
related: [field-hazard-topics-2026-11-24.md, browse-delivery-status-2026-11-24.md, safety-meeting-log-2026-11-24.md]
priority: high
status: active
---

# Session: 2026-11-24.jobsite-offline-pwa — offline installable PWA

## What happened

Loop 6 of the "one major change per loop" directive, full Buck cycle (research → plan → build → review → iterate → docs → save → commit), subagent-orchestrated. Delivered **Jobsite Offline Install**: SafetyTopic is now a progressive web app — a hand-written service worker precaches the whole site, a web manifest + SVG icon make it installable to a phone's home screen, and a protocol-guarded `registerPwa()` keeps `file://` and plain non-localhost HTTP as strict no-ops. On GitHub Pages (HTTPS) the app now opens, runs, records, and prints with zero signal — the moment-of-use case (a crew boss standing on a jobsite) where the app's entire value happens. Side benefit, verified live from the WebKit ITP 2.3 source: installed web apps are exempt from Safari's 7-day deletion of non-installed sites' localStorage, which was the scariest threat to the recorded talk log on iOS.

**Files:** new `sw.js`, `pwa.js`, `pwa-assets.js`, `manifest.webmanifest`, `icon.svg`, `tests/pwa.test.js` (15 tests); edits to `index.html`/`browse.html` (manifest/icon/theme-color + pwa.js), `server.js` (`.webmanifest` MIME). No data-shape changes anywhere. Suite 198 → **213 passed**.

## Research decision and why

`Loop6Research` (7m29s, 12 live sources): candidates evaluated with live verification — meeting-log backup/restore (real but second-order: §1509(e) has no recordkeeping subsection; the duty comes via §3203(b)(2), and per-employee names already live on the printed sign-off sheet; its worst failure mode, iOS 7-day eviction, is fixed *by* the PWA), attendee headcount (rejected: a count doesn't satisfy "employee name or other identifier"), inventory sweep (only the server MIME nit). Raken states the industry norm: "Construction sites don't always have reliable cell service or Wi-Fi — and Raken is built for that reality." Backup/restore backlogged as the strongest loop-7 candidate.

## Bugs found and fixed

- **Live-verification gate caught a real spec defect**: the plan's version-bump acceptance FAILED — bumping `PWA_CACHE_VERSION` in `pwa-assets.js` never propagated (cache stayed v1 across reloads). Root cause: browsers only reinstall a service worker when `sw.js`'s own bytes change; a version constant in an `importScripts()`'d file is invisible to that check, and default `updateViaCache: 'imports'` can serve the import stale. **Fix**: `PWA_CACHE_VERSION` moved into `sw.js` (byte change = guaranteed trigger) + `register('./sw.js', { updateViaCache: 'none' })`. Live-verified v1→v2→v1 swaps with old-cache deletion each time; encoded as an AGENTS.md "Offline cache rule" so the discipline survives.
- **Review NITs fixed inline** (VERDICT: PASS, 0 defects, 0 warnings): dead test spy removed; localhost guard branch tightened to `http:`-only so a `file://localhost` fake location can't pass, with a new `file:` guard test.

## Verification evidence

- `npx vitest run` → **213 passed / 3 files** (after NIT fixes), re-confirmed at close.
- Live Chromium @ localhost:3000: SW activated + controlling, precache = exactly the 11 assets; offline (network cut + reload): full render, Get a Topic, "I Used This" → `meetingLog` entry, sign-off sheet + print, browse.html 60 rows, Pulse — zero page errors, zero console entries; `file://` and LAN-IP plain HTTP both no-op with zero console noise. Honest limit: the install-prompt UI itself is not automatable in headless Chromium (no installability error observed; all documented manifest criteria present; PNG fallback not triggered).
- Chrome's navigation update check is throttled to once per 24h — production version bumps land within that standard PWA cadence; the swap was verified via forced `reg.update()`.

## Tool-quirk lesson (durable)

Service-worker updates: a register option change (`updateViaCache`) does not retroactively apply to an existing registration until the page re-registers; and update-on-navigation is throttled to once per 24h in Chrome, so same-session bump tests must force `registration.update()`. Function-form `tab.evaluate(fn)` fails in this harness — use IIFE strings; `caches` is undefined on insecure origins (probe detail, not app behavior).
