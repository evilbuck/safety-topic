# Raw notes — 2026-11-24.jobsite-offline-pwa (loop 6 research)

All line numbers read from the working tree at HEAD d964333 on 2026-11-24 this session.

## Code inventory (file:line)

### index.html (141 lines)
- :10 `<link rel="stylesheet" href="style.css">` — only head link; NO manifest, NO icon, NO theme-color.
- :20-22 hero: "Meeting Openers, Made Easy" / "Quick, credible safety briefs from OSHA, DOE & NIOSH — pick a category and go."
- :78 signoff-sheet section; :87 program-pulse; :90 program-report.
- :125-127 scripts: topics-data.js, app.js only (no pwa.js yet).

### browse.html (437 lines)
- :246-263 inline `'use strict'` script; `readStoredJSON(key)` :249-259 defensive try/catch + console.warn.
- `usedTopics` plain-object check :259-263; `meetingLog` array check :266-269.
- :154-157 `@media (max-width: 600px)` responsive rows.
- script tags near :425-428: topics-data.js, delivery-data.js, then inline.

### app.js (1945 lines)
- :185-189 restore seenTopics; :191-195 usedTopics; :197-218 meetingLog restore + sanitize (drops malformed, warns with count).
- :148-186 `validateTopics` schema (id/title/category/source/source_ref/duration/summary/key_points).
- :221-267 `assertDomElements` — includes program-pulse + program-report ids.
- :270-292 `buildCategoryDropdown`; :325-341 `rebuildFiltered`; :391-398 persistFilterState (`topicFilter`); :410-428 restoreFilterState.
- :415-443 `pickRandom` cascade; :465-470 markSeen (`seenTopics`); :474-481 markUsed (`usedTopics`, `Record<id, count>`).
- :490-501 todayISO; :505-519 logTalk: push `{ topicId, date: todayISO() }`; setItem meetingLog app.js:512; re-renders Pulse; live report update when open.
- :533-646 computeProgramStats (never throws; malformed-date entries count toward total only).
- :704-800 suggestNextTopic (never-delivered categories first, oldest-last wins).
- :810-885 renderProgramPulse (stats trio, recency cue >30 days, ledger, 5 recent, suggestion + Load, Program Report button).
- :891-965 buildSignoffSheet — Date prefilled; Presented by/Location-Crew/Company blanks; attestation; 12-row Name/Signature table :926-930; notes; presenter signature. Names never stored.
- :968-1000 openSignoffSheet/closeSignoffSheet (closes program report first; body.sheet-open print mode; afterprint close :319-321).
- :1022-1041 resolveReportRange (month/quarter/year/all/custom); REPORT_DEFAULT_RANGE year.
- :1080-1190 buildProgramReport (rows chronological, coverage per category, excludedDates count surfaced).
- :1197-1214 escapeCsvCell (RFC 4180); :1211-1240 buildProgramReportCsv — header `Date,Topic,Category,Topic ID`, BOM, CRLF.
- :1245-1251 buildReportFooterHtml — retention note verbatim: "Records of these talks: keep at least 1 year (CA/WA floors); Cal/OSHA's enforcement posture for employers with 10+ employees is 3 years." + "Attendance names and signatures: see Safety Talk Records on file."
- :1295-1365 buildProgramReportHtml (+ cadence line CA 10 working days / WA weekly / OR monthly).
- :1380-1470 renderProgramReport (controls; Print/Download CSV/Close; live body rebuild keeps focus).
- :1490-1546 exportProgramReportCsv — Blob + objectURL + `<a download>`; feature-detected (Blob/objectURL/download attr); warn+toast on missing/failure; anchor removed + URL revoked in finally.
- :1564-1720 showTopic; use-this handler :1710-1734 (markUsed → logTalk → button disable → footer last-delivered line → toast).
- :1773-1788 escHtml; :1849-1865 showToast (2.8s, timer cancel).
- :1874-1945 test harness exposure (logTalk, getMeetingLog, buildProgramReport, etc.).

### delivery-data.js (183 lines)
- :1-6 header — "plain global script (no ES modules) so both the static site (file:// and GitHub Pages) and the Vitest harness can load it via <script src>" — the pattern pwa-assets.js/pwa.js mirror.
- DELIVERY_ISO_DATE_RE :10; buildDeliveryIndex :30-67; buildCategoryDeliveryIndex :74-124; compareTopicNeglect :125-180; compareCategoryNeglect :165-183.

### server.js (44 lines)
- :6-12 MIME map — has `.svg`; NO `.webmanifest` (falls to text/plain locally; fine on GH Pages).
- SPA fallback for ENOENT (dev only).

### style.css
- :8 --color-bg #f4f5f7; :9 --color-surface #ffffff; :11 --color-text #1a1d23; :13 --color-accent #0096C7 (safety teal).
- Buttons padding 9px 18px (:228) → ~36px tall touch targets; container max-width 860px (:72,160,182).

### tests
- setup.js: loads index.html into jsdom (url http://localhost/), `runScripts:'dangerously'`, injects app.js source after setting `__safetyTopic` harness (:19-35).
- app.test.js: 100+ cases; localStorage seeds/spies (topicFilter :403-424; meetingLog :523-538; quota exceeded :550-551; malformed log :784).
- browse-delivery.test.js: seeds localStorage strings and loads browse inline script style (:477-632).

### Grep results
- localStorage keys in app.js: seenTopics (185,466), usedTopics (191,480), meetingLog (197,513), topicFilter (394,410). Browse reads usedTopics+meetingLog only. **No key is ever imported from a file.**
- `serviceWorker|sw\.js|manifest|workbox|beforeinstallprompt` → **zero matches repo-wide**.

## Fetched quotes (primary; full attributions in sources file)

### 8 CCR §1509 (dir.ca.gov, fetched live 2026-11-24)
- (a) "Every employer shall establish, implement and maintain an effective Injury and Illness Prevention Program in accordance with section 3203 of the General Industry Safety Orders."
- (e) "Supervisory employees shall conduct "toolbox" or "tailgate" safety meetings, or equivalent, with their crews at least every 10 working days to emphasize safety."
- Page shows subsections (a)–(e), NOTE (authority), HISTORY — **no recordkeeping subsection exists in §1509**; record duty flows (a)→§3203(b).

### 8 CCR §3203 (dir.ca.gov, fetched live)
- (b)(2): "Documentation of safety and health training required by subsection (a)(7) for each employee, including employee name or other identifier, training dates, type(s) of training, and training providers. This documentation shall be maintained for at least one (1) year."
- EXCEPTION NO. 1: "Employers with fewer than 10 employees can substantially comply with the documentation provision by maintaining a log of instructions..."
- (b)(1) inspection records ≥1 year. → **The record must be kept ≥1 year; losing it is a real loss.** The identifier duty is per-employee — headcount (candidate C) doesn't satisfy it; the printed sheet carries names.

### WebKit ITP 2.3 (webkit.org blog 10218, fetched live)
- "deleting all of a website's script-writable storage after seven days of Safari use without user interaction on the site" — affected forms list includes "Indexed DB, LocalStorage, Media keys, SessionStorage, **Service Worker registrations and cache**".
- Home-screen exemption: "Web applications added to the home screen are not part of Safari and thus have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer. We do not expect the first-party in such a web application to have its website data deleted."
- → Un-installed iOS tab: meetingLog wiped after 7 quiet days. Installed web app: timer resets on actual use; Apple treats first-party deletion as "a serious bug". **This makes install the durability fix on iOS.**

### MDN (all fetched live 2026-11-24)
- Service Worker API: "Service workers essentially act as proxy servers ... intended, among other things, to enable the creation of effective offline experiences..."
- Using Service Workers: "Service workers are enabled by default in all modern browsers. To run code using service workers, you'll need to serve your code via HTTPS — Service workers are restricted to running across HTTPS for security reasons. ... In order to facilitate local development, `localhost` is considered a secure origin by browsers as well."
- Using Service Workers → "Why is my service worker failing to register?": "You are not running your application in a secure context (over HTTPS)." + "The default scope for a service worker is the directory where the worker is located." (→ relative `./sw.js` + directory-scoped scope works under GH Pages subpaths.)
- Making PWAs installable — required members: "name or short_name; icons must contain a 192px and a 512px icon; start_url; display and/or display_override; prefer_related_applications must be false or not present" + "For a PWA to be installable it must be served using the https protocol, or from a local development environment using localhost or 127.0.0.1 — with or without a port number. This is a more stringent requirement than secure context" (→ file:// cannot install; protocol guard is mandatory, not optional).
- Manifest icons: SVG example — "The `sizes` value of this icon is set to `any`, which allows a browser to use this icon at any size. SVG icons maintain their quality at larger sizes. These icons are ideal for high-resolution displays like in progressive web apps." + "If `src` is relative, the path is resolved relative to the manifest file's URL."
- importScripts: "The importScripts() method synchronously imports one or more scripts into the scope of a classic worker." (basis for shared pwa-assets.js between page JS and sw.js).

### GitHub docs (fetched live)
- securing-your-github-pages-site-with-https: "You can enforce HTTPS for your GitHub Pages site to transparently redirect all HTTP requests to HTTPS."

### Competitor norm (fetched live)
- Raken help center, "Working with Raken Offline": "Construction sites don't always have reliable cell service or Wi-Fi — and Raken is built for that reality. The mobile app lets you document issues, log time, capture photos, and complete daily reports even when you're fully offline. Everything syncs automatically once you're back on a network." / Considerations: "Offline mode itself has no plan restrictions and is available on all Raken plans."

## Inherited (loop-4 verified; not re-fetched this session — labeled honestly)
- Cal/OSHA Compliance Manual Ch.13 §II.9: training records for 10+ employees evaluated at "at least three years" (.context/2026-11-24.safety-program-report/research/sources-program-report.md S2); shipped in app.js:1245-1251 footer.
- WA WAC 296-155-110(6)(d)-(e),(8): document attendance + subjects; keep minutes ≥1 year (same sources file S5).
- OR OAR 437-001-0765(13): construction keeps 3-year meeting records incl. "names of those attending" (S6).
- These support candidate framing; the live-verified §1509(e)/§3203(b)(2)/WebKit/MDN/GitHub/Raken facts above carry the decision.

## Dead ends / failures
- https://help.rakenapp.com/en/articles/1199046-offline-mode — 404 (guessed id).
- https://help.rakenapp.com/en/articles/14465443-raken-offline-mode — 404 (guessed id); correct article found by site search: 14447797-working-with-raken-offline.
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-site-with-https — 404 (slug); correct: securing-your-github-pages-site-with-https.
- https://developer.chrome.com/docs/lighthouse/pwa/installable — 404 (page moved); used MDN Making PWAs installable as the primary install-criteria source instead.
- Apple-specific `apple-touch-icon` (PNG-only per Safari convention) intentionally NOT specced: no PNG can be hand-authored zero-dep; SVG manifest icon + DevTools install gate + pre-approved PNG fallback covers the acceptance path. iOS home-screen install works from manifest + `<link rel="apple-touch-icon">`; without the PNG, iOS uses a screenshot tile — acceptable, documented in spec fallback. (Decision, not failure.)
- No candidate d findings stronger than a–c: defensive guards, mobile CSS, print flows all verified intact; only genuine nit = server.js .webmanifest MIME (absorbed).
