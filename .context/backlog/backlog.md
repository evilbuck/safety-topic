# Backlog

Back-accumulated deferred and future work for the SafetyTopic project.

## Completed (2026-11-24 — one-major-change loops)

- **browse.html per-topic delivery status** — shipped in the 2026-11-24 browse-delivery-status loop, broadened into the delivery-aware Browse library (per-row Never delivered/Last delivered status + status select)
- **Construction/field content expansion** — shipped in the 2026-11-24 field-hazard-topics loop: 10 new Focus Four/field topics, 60 topics across 11 categories

## Completed (2026-04-16 — Defensive coding pass)

- `copyToClipboard` fallback always resolved — now properly rejects on `execCommand` failure
- `init()` had no DOM element validation — added `assertDomElements()`
- `pickRandom()` returned `undefined` on empty dataset — now returns `null`
- `copyLink()` copied blank URL when no topic loaded — added guard with toast
- `markSeen`/`markUsed` silently swallowed localStorage errors — now logs `console.warn`
- `showTopic` "I Used This" button had no null check — added guard
- `navigateDelta` had no bounds check on `currentIndex` — added guard
- `TOPICS` loaded without schema validation — added `validateTopics()`
- Filter state lost on refresh — added `persistFilterState()` / `restoreFilterState()`
- Rapid "New Topic" clicks could cause concurrent renders — added `isRendering` debounce flag
- Vitest + jsdom test suite — 34 tests covering all defensive functions
- Clipboard execCommand fallback in CI — deferred to next session
- `data-complete` attribute for UI state tracking — deferred

## Deferred

- **`data-complete` attribute** — mark topics as fully loaded/processed to allow UI state to reflect loaded vs. error vs. empty states more explicitly
- **`execCommand` fallback headless test** — add a headless test that exercises the non-secure-context clipboard path
