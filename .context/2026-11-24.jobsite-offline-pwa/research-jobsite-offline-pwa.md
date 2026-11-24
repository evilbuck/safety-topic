---
status: active
date: 2026-11-24
subject: 2026-11-24.jobsite-offline-pwa
topics: [PWA, offline, service worker, web manifest, jobsite availability, record durability]
informs: [plan-jobsite-offline-pwa.md]
---

# Research: Jobsite Offline Install (loop 6)

Evaluates the app end-to-end after loops 1–5, compares change candidates for loop 6's ONE major change, verifies every factual claim against the code (file:line cites, fetched 2026-11-24 this session) and primary web sources (all fetched live 2026-11-24; quotes in `research/sources-jobsite-offline-pwa.md`), and specifies the chosen change at build-ready detail. Raw notes: `research/notes-jobsite-offline-pwa.md`.

## Context

Standing directive: each loop delivers ONE major change improving the app's focus/purpose. Loops 1–5 shipped: sign-off sheet + meeting log; Program Pulse; program report (print/CSV); delivery-aware Browse; 10 construction Focus-Four topics (60 topics / 11 categories). Contract: zero-dependency static site, no build step, must keep working on GitHub Pages AND file://; defensive programming; localStorage keys `meetingLog`, `usedTopics` (+ internal `seenTopics`, `topicFilter`).

The app's purpose, from its own hero: "Meeting Openers, Made Easy — pick a category and go" (index.html:20-22) — a tailgate-talk tool used standing on jobsites, now with a compliance-flavored record layer.

## Verified inventory (all checked this session)

### User flows and where they live (app.js unless noted)

- Pick topic: `pickRandom()` app.js:415-443 (cascade unseen+unused → unseen → unused → all); random pick marks seen (app.js:465-470).
- Filter: `buildCategoryDropdown()` app.js:270-292; `rebuildFiltered()` app.js:325-341 (special `__unused__`); `persistFilterState`/`restoreFilterState` app.js:391-428 (key `topicFilter`).
- Record delivery: "I Used This" button handler app.js:1710-1734 calls `markUsed(topic.id)` (app.js:474-481, key `usedTopics` = `Record<topicId, number>`) then `logTalk(topic.id)`.
- `logTalk` app.js:505-519: pushes `{ topicId, date: todayISO() }` (strict YYYY-MM-DD, app.js:490-501) and `localStorage.setItem("meetingLog", JSON.stringify(meetingLog))` at app.js:512. **The compliance-flavored record is one localStorage write.**
- Sign-off sheet: `buildSignoffSheet` app.js:891-965 — printable record with Date prefilled, "Presented by / Location / Company" blanks, attestation, 12-row name/signature attendance table, notes, presenter signature. Names exist ONLY here, on paper; app never stores them.
- Browse delivery status: `browse.html:246-296` reads `usedTopics` + `meetingLog` via `readStoredJSON` (defensive, console.warn on failure); `delivery-data.js:30-67` builds per-topic index; status select + neglect sorting delivery-data.js:125-180.
- Program Pulse: `computeProgramStats` app.js:533-646, `suggestNextTopic` app.js:704-800, `renderProgramPulse` app.js:810-885 (total/this-month, recency cue past 30 days, per-category delivered/total ledger, 5 recent talks, suggested-next + Load button).
- Program report: `buildProgramReport` app.js:1080-1190 (range presets/custom), print `buildProgramReportHtml` app.js:1295-1365, CSV `buildProgramReportCsv` app.js:1211-1240 — columns **Date,Topic,Category,Topic ID**, UTF-8 BOM + CRLF, RFC 4180 escaping — downloaded via Blob+`<a download>` in `exportProgramReportCsv` app.js:1490-1546 (feature-detected, never silent).
- Report footer (app.js:1245-1251) already instructs: "Records of these talks: keep at least 1 year (CA/WA floors); Cal/OSHA's enforcement posture for employers with 10+ employees is 3 years. / Attendance names and signatures: see Safety Talk Records on file."

### Data shapes (exact)

- `meetingLog` entry: `{ topicId: string, date: string }` — app.js:505-507; init restores + sanitizes (drops non-conforming entries with a warn) app.js:197-218.
- `usedTopics`: `{ [topicId]: count:number }` — app.js:474-481; browse reads same shape browse.html:259-263.
- `seenTopics`: JSON array from `Set` of ids — app.js:463-470 (read at app.js:185-189).
- `topicFilter`: string — app.js:391-398.
- Topics: schema-validated per required fields app.js:148-186.

### Hard facts found in the sweep

1. **Zero PWA surface** — grep for `serviceWorker|sw\.js|manifest|workbox|beforeinstallprompt` across the repo: **no matches**. No manifest link, no icon, no favicon link (index.html:10 loads only style.css). A no-signal jobsite therefore gets a browser error page: the app cannot even open.
2. **No backup/restore path** — localStorage keys are written by the app and read only by the app itself (init, browse). `exportProgramReportCsv` exports a report (Date, Topic, Category, Topic ID), so a diligent user holds a partial machine-readable copy of the log (topicId + date reconstructable by hand), but **no code imports anything back**.
3. `server.js:6-12` MIME map has `.svg` but **no `.webmanifest`** entry (would fall through to `text/plain`; GH Pages serves it correctly, so only a local-dev nit).
4. No real bugs surfaced in the flows: defensive guards from the 2026-04-16 pass are all present and wired (assertDomElements app.js:221-267, isRendering debounce app.js:1567-1569, malformed-log sanitize app.js:203-218, CSV/clipboard feature detection). Mobile CSS is responsive (container max-width 860px, browse @media max-width:600px browse.html:154-157); buttons are ≥36px tall (style.css:228). Nothing here beats candidates a–c.

## Candidate analysis

### Candidate A — Meeting-log durability (backup/restore)

**Gap is real (code-verified):** the record lives only in localStorage (`meetingLog` app.js:512; `usedTopics` app.js:479). Clearing browser data or switching phones destroys it; there is no import/restore anywhere.

**Regulation framing (verified live 2026-11-24):** 8 CCR §1509(e) mandates the meeting cadence but contains **no recordkeeping subsection** — the official DIR page carries only subsections (a)–(e) plus authority/history notes. The record duty arrives via §1509(a) → 8 CCR §3203(b)(2): documentation "including employee name or other identifier, training dates, type(s) of training, and training providers. This documentation shall be maintained for at least one (1) year." (dir.ca.gov, fetched; full quotes in sources file.) So a record must be kept ≥1 year — losing the log matters. But the per-employee "name or other identifier" documentation is exactly what the **printed** Safety Talk Record provides (app.js:926-942), and the shipped report footer already routes names to the paper file (app.js:1246). The digital log is the cadence/coverage layer on top.

**Sharpest durability threat (verified live):** WebKit ITP deletes "LocalStorage" and even "Service Worker registrations and cache" after "seven days of Safari use without user interaction on the site" — and explicitly exempt-practically: "Web applications added to the home screen ... have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer. We do not expect the first-party in such a web application to have its website data deleted." (webkit.org ITP 2.3 post, fetched.) On iOS — the dominant field phone — an un-installed tab can lose the whole log after a quiet fortnight.

**Verdict:** real gap, but its worst failure mode (iOS 7-day eviction) is *directly fixed by Candidate B*, and the remaining gap (manual backup/restore of `meetingLog`+`usedTopics` as JSON) is a coherent standalone follow-up that becomes *more* valuable once the app is installed and long-lived. Recommended to backlog as loop 7 candidate. Not chosen for loop 6.

### Candidate B — PWA / offline install (manifest + hand-written sw.js)

**The moment-of-use failure:** the app's entire value happens at the jobsite meeting. Today, with no signal, the browser can't even fetch index.html — no topic, no talk, no record. Raken (loop-4-verified vendor; re-verified live this session) states the norm as industry reality: "Construction sites don't always have reliable cell service or Wi-Fi — and Raken is built for that reality. The mobile app lets you document issues, log time, capture photos, and complete daily reports even when you're fully offline." Offline mode is free on all their plans. SafetyTopic is the outlier: its offline capability is zero.

**Zero-dep feasibility (verified):** hand-written `sw.js` + `manifest.webmanifest` are plain static files — no build step, no dependency. GitHub Pages works: "You can enforce HTTPS for your GitHub Pages site to transparently redirect all HTTP requests to HTTPS" (docs.github.com, fetched). MDN installability: a PWA "must be served using the https protocol, or from a local development environment using localhost or 127.0.0.1 — with or without a port number. This is a more stringent requirement than secure context" — i.e., file:// (a secure context) still can't register a SW, so registration MUST be protocol-guarded (exact guard below). Relative `./` paths keep it correct under GitHub Pages project subpaths; MDN documents both the default scope ("The default scope for a service worker is the directory where the worker is located") and manifest `src` resolution ("If src is relative, the path is resolved relative to the manifest file's URL"). MDN documents SVG manifest icons with `sizes: "any"` ("SVG icons maintain their quality at larger sizes. These icons are ideal for high-resolution displays like in progressive web apps") — one icon file, no raster generation.

**Durability bonus (verified):** the same change moves the app into the WebKit home-screen exemption quoted under Candidate A — install protects the log on iOS as a side effect. (It does not protect against Android/desktop data wipes or device switches — that's Candidate A's remaining scope, backlog.)

**Verdict: CHOSEN.** Fixes the failure at the exact moment the app must work, compounds durability, no data-shape changes, no migration risk.

### Candidate C — Attendee headcount (count-only per talk)

- §3203(b)(2) requires per-employee "employee name or other identifier" — a per-talk headcount does **not** satisfy that identifier duty; names already live on the printed sheet. (WA attendance-documentation and OR attendee-names rules were verified in loop 4 sources; inherited this loop.)
- Adds a "workers reached" metric to Pulse/report/CSV at the cost of a data-shape change (optional `headcount` on log entries), a migration/defensive-read pattern across five consumers (Pulse, report, CSV, browse, suggest), and an extra field on the one-tap record flow.
- Verdict: rejected — a metric enhancement, not a gap fix; strictly weaker than B this loop. Parked.

### Candidate D — inventory sweep findings

See hard facts 3–4 above: the only genuine finding is the missing `.webmanifest` MIME line in server.js (absorbed into the chosen change as a one-line edit). No bug beats a–c.

## Comparison

| Candidate | Value to core purpose | Risk | Effort | Zero-dep/static/file:// fit | Evidence strength |
|---|---|---|---|---|---|
| **B. Offline PWA install** | **Fixes the app failing to open at the moment of use (no-signal jobsite); vendor norm is offline-first [Raken]; also shields the log from iOS ITP eviction via home-screen install** | Moderate: cache staleness managed with version-bumped cache + activate cleanup; guarded no-op keeps file:///plain-HTTP safe | 4 new files, 2 HTML edits, 1 server.js line, ~12 tests | Perfect: hand-written files, relative paths, guard makes file:// a strict no-op | Strong: repo grep (zero PWA), MDN + WebKit + GitHub docs fetched live, vendor norm live |
| A. Backup/restore | Protects the digital record; worse worst-case (iOS eviction) already fixed by B | Low-moderate (import parsing risk) | UI + JSON export/import + defensive parsing + tests | Good | Real but second-order: record duty partially satisfied by printed sheet; no import path verified |
| C. Headcount | Metric only; identifier duty already on paper | Data-shape migration across 5 consumers | Medium | Good | Regulation does not need it; names exist on paper |
| D. Sweep items | Nit (server MIME) | — | One line | — | Verified; absorbed |

## DECISION

**Loop 6's one major change: make SafetyTopic installable and fully offline-capable on jobsites — add a hand-written service worker (`sw.js`), a web app manifest (`manifest.webmanifest` + `icon.svg`), a shared PWA asset/version file (`pwa-assets.js`) and a guarded registration helper (`pwa.js`), wired into both pages, so the app installs to a home screen and opens, runs, records, and prints with zero signal — while remaining a byte-for-byte no-op on file:// and plain non-localhost HTTP.**

**Why it beats the alternatives (strongest verified facts):**
1. **Offline is the moment-of-use failure.** The repo has zero service-worker/manifest surface (grep: no matches); with no signal the app cannot open at all. The category-defining competitor states the requirement as ground truth: "Construction sites don't always have reliable cell service or Wi-Fi — and Raken is built for that reality ... complete daily reports even when you're fully offline." (help.rakenapp.com, fetched 2026-11-24.)
2. **The same change protects the compliance-flavored record on iOS.** WebKit deletes LocalStorage — including under ITP's 7-day rule — "after seven days of Safari use without user interaction on the site", while "Web applications added to the home screen ... have their own counter of days of use ... We do not expect the first-party in such a web application to have its website data deleted." (webkit.org ITP 2.3, fetched.) B fixes the scariest durability failure as a side effect; A only patches a subset afterwards.
3. **It fits the contract exactly.** Zero dependencies, no build step; GitHub Pages serves HTTPS ("enforce HTTPS ... transparently redirect all HTTP requests to HTTPS" — docs.github.com, fetched); the protocol-guarded registration makes file:// and non-localhost HTTP strict no-ops (MDN: installability requires https or localhost — "more stringent requirement than secure context"), and relative `./` paths survive GitHub Pages project subpaths (MDN scope + manifest-src resolution quotes).

## Build-ready spec

### Files

**NEW `pwa-assets.js`** (plain global script, mirrors `delivery-data.js` "no ES modules" pattern — delivery-data.js:1-6):

```js
'use strict';
// Shared PWA constants. Loaded by sw.js via importScripts() and by tests
// as a classic script. Bump PWA_CACHE_VERSION whenever any precached file
// changes; the old cache is deleted on service-worker activation.
const PWA_CACHE_VERSION = 1;
const PWA_PRECACHE_ASSETS = [
  './',
  './index.html',
  './browse.html',
  './style.css',
  './app.js',
  './topics-data.js',
  './delivery-data.js',
  './pwa.js',
  './pwa-assets.js',
  './manifest.webmanifest',
  './icon.svg',
];
```

**NEW `pwa.js`** (plain global script; dependency-injected for testability):

```js
'use strict';
/**
 * Registers the service worker when the environment supports it:
 * - no ServiceWorkerContainer → false (file://, old browsers): silent no-op.
 * - insecure context (not https:, not localhost/127.0.0.1) → false: silent
 *   no-op (LAN-IP plain HTTP, plain HTTP hosting).
 * - secure context → registers './sw.js' resolved relative to the page, so
 *   GitHub Pages project subpaths work. A rejected registration is warned,
 *   never swallowed or thrown.
 * @param {Navigator} [nav] - Dependency injection point (tests).
 * @param {Location} [loc] - Dependency injection point (tests).
 * @returns {boolean} True iff a registration was attempted.
 */
function registerPwa(nav, loc) {
  const n = nav || (typeof navigator !== 'undefined' ? navigator : null);
  const l = loc || (typeof location !== 'undefined' ? location : null);
  if (!n || !l || !('serviceWorker' in n)) return false;
  const secure =
    l.protocol === 'https:' ||
    l.hostname === 'localhost' ||
    l.hostname === '127.0.0.1';
  if (!secure) return false;
  try {
    n.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[SafetyTopic] Service worker registration failed:', err);
    });
    return true;
  } catch (err) {
    console.warn('[SafetyTopic] Service worker registration failed:', err);
    return true;
  }
}
registerPwa();
```

**NEW `sw.js`** (root, hand-written; `importScripts` is the classic-worker script loader per MDN — quote in sources):

```js
/* SafetyTopic offline service worker. Cache-first for precached assets
   (revalidate in background so updates land on the next online visit);
   navigation requests fall back to the cached index. Versioned via
   PWA_CACHE_VERSION in pwa-assets.js — bump it on any content change. */
importScripts('./pwa-assets.js');
const CACHE_NAME = 'safetytopic-v' + PWA_CACHE_VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PWA_PRECACHE_ASSETS); // a 404 here fails install: old SW stays; never silent
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = (await cache.match(req)) || (await cache.match('./index.html'));
        if (cached) { // stale-while-revalidate for navigations
          event.waitUntil(cache.add(req).catch(() => {}));
          return cached;
        }
        return fetch(req);
      })(),
    );
    return;
  }
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        event.waitUntil(cache.add(req).catch(() => {}));
        return cached;
      }
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
      return res;
    })(),
  );
});
```

**NEW `manifest.webmanifest`** (all paths relative → resolves against the manifest URL per MDN; survives project subpaths):

```json
{
  "name": "SafetyTopic",
  "short_name": "SafetyTopic",
  "description": "Quick, credible safety briefs for meeting openers.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f4f5f7",
  "theme_color": "#0096C7",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" },
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "maskable" }
  ]
}
```
Colors are the existing tokens (style.css:8, style.css:13 `#f4f5f7`, `#0096C7`). Chromium's install criteria (MDN, fetched) require name/short_name, icons (192px + 512px), start_url, display — the SVG `sizes:"any"` icon is the documented scalable form; **build-stage gate:** Chrome DevTools → Application → Manifest must show "Installability: no errors"; if a given Chromium refuses SVG-only and blocks install, the pre-approved fallback is to add `icon-192.png`/`icon-512.png` exported once from icon.svg and committed as static files (still zero runtime dependency) with matching manifest entries — do not improvise beyond that.

**NEW `icon.svg`** — square viewBox `0 0 512 512`, background `#0096C7` rounded-rect, centered white "✦" brand mark (matches index.html:14), glyph kept inside a ~20% safe zone so the maskable variant crops cleanly. No external references.

**EDIT `index.html`** (after `<link rel="stylesheet">`, line 10 area): add
`<link rel="manifest" href="manifest.webmanifest">`,
`<link rel="icon" href="icon.svg" type="image/svg+xml">`,
`<meta name="theme-color" content="#0096C7">`;
scripts block (index.html:125-127): append `<script src="pwa.js"></script>`.

**EDIT `browse.html`**: same three link/meta lines in `<head>`; append `<script src="pwa.js"></script>` next to its existing script tags.

**EDIT `server.js`** (MIME map, line 6-12): add `".webmanifest": "application/manifest+json"` (also add `".json"` already present — unchanged). One line.

### Data shapes / migration

None. No localStorage key changes, no topic schema change, no meetingLog change. Defensive read pattern unchanged (app.js:197-218, browse.html:249-262).

### Contract guardrails honored

- file://: `registerPwa` returns false before any SW API touch (no `'serviceWorker' in navigator` on file:// in any case; protocol guard makes it belt-and-braces). Manifest link on file:// is inert (browser ignores; no error surfaced by app code).
- Plain HTTP LAN (`http://192.168.x.x`): hostname guard → no-op, no console noise.
- GitHub Pages: HTTPS + relative paths work at root or project subpath; scope default = sw.js's directory (MDN quote in sources) = the site root/subpath.
- Defensive programming: every sw.js cache write/read is failure-tolerant (`catch(() => {})` on background revalidate paths only — the foreground respond path never swallows: addAll install failure fails the install so the previous SW survives, logged by the platform); `pwa.js` warns on rejection; JSDoc on `registerPwa`.

### Test plan (vitest + jsdom; suite is currently 198 tests)

**NEW `tests/pwa.test.js`** (~12 tests), mirroring the jsdom-source-injection style of tests/setup.js:26-35:
1. `registerPwa` returns false and never calls `register` when `navigator.serviceWorker` is absent (plain object fake).
2. Returns false for `http://` + hostname `192.168.1.5` (no register call).
3. Returns true and registers exactly `./sw.js` for `https://app/` fake.
4. Registers for `http://localhost:3000` and `http://127.0.0.1` fakes (secure-origin localhost per MDN quote).
5. Rejected register promise → `console.warn` called with "[SafetyTopic]", no throw.
6. Synchronously throwing register → warn + returns true (caught).
7. `pwa-assets.js` loaded as classic script (jsdom): `PWA_CACHE_VERSION` is a positive integer; `PWA_PRECACHE_ASSETS` is a string array; every entry except `'./'` exists on disk (`fs.existsSync(path.join(repoRoot, entry))`) — this test is the guard that keeps the precache list truthful across future renames.
8. sw.js source-contract checks (read file, regex): contains `importScripts('./pwa-assets.js')`, builds cache name from `PWA_CACHE_VERSION`, has an `activate` handler deleting foreign caches, has a `fetch` handler and `skipWaiting`/`clients.claim`.
9. Manifest JSON parses; `start_url`/`scope` are `"./"`; icons array non-empty with `src` that exists on disk; required members present (name, display).

**Regression:** full `npx vitest run` green (existing 198 + new). jsdom never executes the real SW, so the source-contract + disk-existence tests are the meaningful coverage; the guard function is unit-tested with injected fakes via `registerPwa(nav, loc)`.

### Acceptance criteria (build-stage manual gate, `npm run dev` at http://localhost:3000)

1. DevTools Application panel: manifest valid (no installability errors); SW `activated and running`; precache contains exactly `PWA_PRECACHE_ASSETS`.
2. DevTools Network → Offline, then hard reload: app fully renders; "Get a Topic", category filter, "I Used This" (writes `meetingLog`), Sign-Off Sheet print preview, Browse page, Pulse all work with zero network.
3. `file://` open of index.html: no console errors, no registration attempt; all existing behaviors unchanged (AGENTS.md validation checklist).
4. Plain `http://<LAN-IP>:3000` from another device: page works, no SW registered, no console errors.
5. Version bump check: bump `PWA_CACHE_VERSION`, reload online → new cache replaces old (old cache name gone from caches).
6. Chrome install affordance appears (address-bar install / DevTools check); installed app launches to `start_url` standalone and works offline.
7. Existing 198 tests + new tests all green.

### Blast radius (docs stages own these)

- `README.md`: add "Works offline / installable" note (how to install on iOS/Android/desktop).
- `CHANGELOG.md`: `[Unreleased] → Added`: offline install (service worker + manifest + icon).
- `AGENTS.md` file map: add the four new files + one-line rule: "Bump PWA_CACHE_VERSION in pwa-assets.js whenever any precached file changes."
- No changes to topics-data.js, delivery-data.js, safety-topics.csv, tests/app.test.js, tests/browse-delivery.test.js.

## Open items

- Chromium's exact SVG-icon installability behavior is platform-internal (MDN documents SVG `sizes:"any"` as valid manifest practice; the DevTools install check is the gate, with the pre-approved PNG fallback above). No further research needed.
- Backup/restore (Candidate A remainder) → backlog for a future loop; headcount (C) parked.
