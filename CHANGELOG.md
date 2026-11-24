# Changelog

All notable bug fixes and improvements.

## [Unreleased]

### Added

- **Printable Sign-Off Sheet** — new share-bar button prints a one-page Safety Talk Record: the topic brief plus date, presenter/location/company fill-in lines, an attestation line, 12 attendance signature rows, notes/follow-up space, and a presenter sign-off line — the fields conventional toolbox-talk records use.
- **Dated meeting log** — "I Used This" now also records a dated entry in localStorage (`meetingLog`), and the topic card shows "Last delivered: <date>". Used-count labels and the "Not used yet" filter are unchanged.
- **Safety Program Pulse** — new main-page dashboard that reads your recorded talk log: total and this-month talk counts, days since your last recorded talk (with a gentle informational cue past 30 days), a per-category delivered-vs-never coverage ledger (never-delivered categories first), a recent-deliveries list, and a deterministic "suggested next topic" (never-delivered first, most-neglected category) with a one-click Load button. Hidden from print output, like all app chrome.
- **Safety Program Report** — new "Program Report" button in the Program Pulse opens a printable, date-range-filtered report of your recorded talk log: summary counts, a chronological delivery table (Date · Topic · Category), a per-category coverage summary, and an honest footer pointing to your filed Safety Talk Records for attendance names and signatures. Range presets (This month / This quarter / This year / All time) plus custom from/to dates; printing shows only the report. A "Download CSV" button exports the same history as RFC 4180 CSV (BOM + CRLF, Excel-ready) via a temporary object URL that is always revoked.
- **51 new Vitest tests** (149 total) covering the report builder (preset/custom range math, quarter boundaries, malformed-date exclusion, unknown-topic fallbacks), CSV formatting, overlay wiring, print isolation, and the review-found regression paths.
- **Delivery-aware Browse page** — every topic row now shows its delivery status from the recorded talk log: a "Never delivered" marker for topics with no log entries, or "Last delivered: <date>" plus a delivered count. A new status select (All topics / Never delivered / Oldest first) filters to the never-delivered topics or reorders the library by neglect (never-delivered first, then oldest-delivered dates), composing with keyword search and category grouping — the digital equivalent of Cal/OSHA's tailgate worksheet (topic grid + date cells) at the moment you pick the next talk. Delivered by a new dependency-free `delivery-data.js` shared helper.
- **48 new Vitest tests** (197 total) covering the delivery index (counts, last dates, malformed/unknown handling, non-mutation), neglect comparators and `suggestNextTopic` consistency, status select composition, and defensive localStorage reads.
- **Construction & Field Safety category** — 10 new fully-sourced topics covering OSHA's Construction Focus Four (fall protection, struck-by, caught-in/between, jobsite electrical) plus scaffolds, trenching/excavation, lockout/tagout, machine guarding and power tools, aerial lifts, and jobsite housekeeping (50 → 60 topics, 10 → 11 categories). Every stat and regulation citation (29 CFR 1926 Subparts M/L/P/K, 1910.147, 1926.25/300/453) verified against primary OSHA/BLS sources, so the library now serves the field crews tailgate meetings were invented for — `safety-topics.csv` regenerated to match.
- **1 new Vitest test** (198 total) validating the real `TOPICS` catalog against `validateTopics` on every run, closing the gap where only synthetic fixtures were schema-checked.
- **Offline install (PWA)** — the site now registers a hand-written service worker and web manifest, so on GitHub Pages (or any HTTPS host) it installs to a phone's home screen and opens, runs, records, and prints with zero signal — the jobsite case where the app's whole value happens. Installing also exempts the app from Safari/WebKit's 7-day auto-deletion of non-installed sites' localStorage, protecting the recorded talk log on iOS. On `file://` and plain non-localhost HTTP the offline layer is a strict no-op: nothing registers, nothing changes.
- **15 new Vitest tests** (213 total) covering the registration guard (absent container, plain-HTTP LAN IP, `file:`, localhost/127.0.0.1, warn-not-throw), the precache list's on-disk truthfulness, the `sw.js` source contract (versioned cache name, activation cleanup, fetch/skipWaiting/clients.claim), and the manifest contract.

### Fixed

- **Suggested-topic Load button desynced navigation state** — loading a suggestion now syncs the category filter and topic index, so the position counter and prev/next buttons always match the displayed card.
- **Same-day talks listed oldest-first in Recent Talks** — equal-date entries now order newest-first, and a sixth same-day talk appears instead of being dropped.
- **Program Pulse rendered as a blank padded card when topic data failed to load** — the section now hides when empty, and the never-delivered badge color meets WCAG AA contrast.
- **Mangled `assertDomElements` error message** — the thrown text embedded literal `\" + \" fragments; now a single clean sentence.
- **`init()` silently swallowed localStorage restore errors** — the `seenTopics`/`usedTopics` restores (and the `topicFilter` restore in `restoreFilterState()`) used `catch (_) {}`, contradicting the defensive-coding rule; all restores now warn instead of swallowing.
- **Sign-Off Sheet button printed the Program Report when the report overlay was open** — the report's print rules out-cascaded the sheet's, so the printed artifact was the wrong document. Opening the sign-off sheet now closes the report first, matching how the Print button and topic navigation already clear both overlays.
- **Changing the report range dropped keyboard focus to the page body** — range controls now stay mounted; only the report body re-renders, so the select/date input you changed keeps focus.
- **"I Used This" rebuilt the hidden report overlay on every click** — the report now re-renders only while it is actually open, and stays cleared after Close.
- **CSV export could leave a stray anchor in the DOM if the download click failed** — cleanup now runs on every path.
- **Browse page silently swallowed localStorage restore errors** — the `usedTopics` read ended in a silent `catch (_) {}` (the exact anti-pattern the defensive-coding pass removed from `app.js`), and shape-mismatched stored values fell back without any warning. All browse-page localStorage reads now warn descriptively on corrupt JSON, wrong-shape values, and unavailable storage, and the page stays fully functional without localStorage.

## [1.1.0] - 2026-04-16

### Added

- **Vitest test suite** — 34 tests covering all defensive functions; `window.__safetyTopic` harness added to app.js for test isolation.

### Fixed

- **Debounce rapid "New Topic" clicks** — `isRendering` guard flag prevents concurrent `showTopic` calls from rapid clicks overwriting each other.

- **`showTopic` crashed if "I Used This" button was missing** — `document.getElementById("use-this-btn").addEventListener(...)` had no null check, unlike the prev/next buttons. Now guarded identically.

- **`navigateDelta` could navigate from invalid index after error state** — Added bounds check on `currentIndex` before attempting to look up the next/previous topic.

- **Filter state not persisted across page refresh** — Changing the category dropdown and refreshing lost the filter. Category filter is now saved to localStorage on every change and restored on page load. Hash deep-links take priority over the saved filter.

- **Clipboard fallback swallowed errors** — `copyToClipboard`'s `execCommand` fallback always resolved, masking copy failures. Now properly rejects on failure, surfacing errors to the user via toast.

- **App crashed on missing DOM elements** — No validation existed for required elements (`#topic-card`, `#toast`, etc.). Added `assertDomElements()` with a clear error message if any required element is missing.

- **pickRandom crashed on empty dataset** — When both `filteredTopics` and `allTopics` were empty, the function returned `undefined`. Now returns `null` and callers handle it gracefully.

- **Copy link copied blank URL with no topic** — `copyLink()` ran without checking whether a topic was loaded, resulting in a useless `#` URL. Now guards and shows an error toast.

- **markSeen / markUsed silently failed on localStorage errors** — Replaced `catch (_) {}` with `console.warn` so developers know when persistence fails.

- **Copy/paste broken when opening files directly** — Clipboard functionality (copy text, copy link) was silently failing when the app was opened via `file://` protocol due to browser security restrictions. Added automatic fallback that restores clipboard access in all scenarios.

- **No feedback when running from file://** — Users opening `index.html` directly got no indication that some features might be limited. Now shows a helpful toast suggesting `npm run dev` for full functionality.

- **No local development workflow** — The README suggested opening files directly, but didn't provide a smooth way to run a local server with auto-reload. Added a lightweight `server.js` and `npm run dev` script with `--watch` for automatic restarts on file changes.
