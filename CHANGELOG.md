# Changelog

All notable bug fixes and improvements.

## [Unreleased]

### Added

- **Printable Sign-Off Sheet** — new share-bar button prints a one-page Safety Talk Record: the topic brief plus date, presenter/location/company fill-in lines, an attestation line, 12 attendance signature rows, notes/follow-up space, and a presenter sign-off line — the fields conventional toolbox-talk records use.
- **Dated meeting log** — "I Used This" now also records a dated entry in localStorage (`meetingLog`), and the topic card shows "Last delivered: <date>". Used-count labels and the "Not used yet" filter are unchanged.
- **29 new Vitest tests** (63 total) covering the sign-off sheet content, meeting log persistence, print flow, last-delivered display, and defensive restore paths.

### Fixed

- **`init()` silently swallowed localStorage restore errors** — the `seenTopics`/`usedTopics` restores (and the `topicFilter` restore in `restoreFilterState()`) used `catch (_) {}`, contradicting the defensive-coding rule; all restores now warn instead of swallowing.

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
