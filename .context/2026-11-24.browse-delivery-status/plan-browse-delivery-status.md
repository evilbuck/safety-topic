---
status: completed
date: 2026-11-24
subject: 2026-11-24.browse-delivery-status
topics: [browse page, per-topic delivery status, status filter, neglect sort, defensive reads, shared helper]
research: [research-browse-delivery-status.md]
iterations: [iterate-browse-delivery-status.md]
spec:
memory: [browse-delivery-status-2026-11-24.md]
---

# Plan: Delivery-aware Browse library (loop 4)

## User Goal

A supervisor opening the Browse page to pick the next talk should *see the program's history while choosing*: which topics have never been delivered, which were delivered and when, and which are most overdue — the digital equivalent of Cal/OSHA's official Tailgate/Toolbox Topics worksheet (topic grid + date cells, "use this worksheet to select topics … and to track meeting dates"). This closes the app's core loop: record → review → produce → **select with knowledge**.

## Change

1. **Per-row delivery status on `browse.html`** derived from `meetingLog`: `Never delivered` marker when a topic id has zero log entries; otherwise `Last delivered: YYYY-MM-DD` + `Delivered N×`. Factual labels only — no verdicts, no streaks.
2. **One status select** in the browse controls: `All topics` (default, unchanged ordering) / `Never delivered` (exactly the zero-log-entry topics) / `Oldest first` (neglect ordering mirroring `suggestNextTopic`'s deterministic conventions). Composes with keyword search and category grouping.
3. **New shared pure helper** in a new plain-script file (e.g. `delivery-data.js`): builds the per-topic delivery index over the log — counts, last-delivered ISO dates, never-delivered flags. Plain global script, no ES modules (file:// + GitHub Pages safe); JSDoc'd; defensive; never mutates inputs or throws. Malformed-data conventions match Pulse: non-string ids skipped; non-ISO-dated entries still count as delivered but render no date label; `computeProgramStats` is category-level and is NOT reused directly (research correction).
4. **Defensive-read fix riding along**: replace `browse.html`'s silent `catch (_) {}` localStorage reads with `console.warn` fallbacks (AGENTS.md rule); page fully functional with localStorage unavailable.

## Open questions resolved (design decisions)

1. **Two stores, two labels, both shown.** `usedTopics` counts "I Used This" button clicks (main page); `meetingLog` records logged sign-off deliveries. They are complementary records, not duplicates — both remain visible, distinctly labeled; both stores read-only this loop.
2. **New plain-script helper file**, not duplication in browse's inline script, not ES modules: both pages and Vitest load it as a global script; test harness mirrors existing patterns.
3. **One select control** (All / Never delivered / Oldest first), not separate filter + sort: smallest deterministic UX.
4. **Visual treatment**: text meta within the existing `row-meta` pattern; accent-colored `Never delivered` marker meeting WCAG AA contrast (loop-2 review precedent).

## Scope

**In scope:** browse.html (status rendering, select control, defensive reads), new `delivery-data.js`, `style.css` additions, `tests/app.test.js` (+ any new test file pattern the suite uses), README/CHANGELOG at docs stage.

**Out of scope:** no new topics/content (candidate 2 → recommended future loop, recorded); no presenter capture; no scheduling/reminders; no compliance verdicts or streak language; no changes to index.html behavior, Pulse, Report, sign-off sheet, or storage schema; no per-topic full-history listing on Browse (that is the Program Report's job).

## Data policy

- Log-derived status only; both stores joined read-only.
- Unknown topic ids in the log contribute nothing to browse rows (they have no row) — handled by the Report's fallbacks elsewhere; not a browse concern.
- Empty log → every topic `Never delivered`; failed/unavailable localStorage → warn + empty status, page otherwise functional.
- Determinism: identical inputs → identical row order; tie-breaks documented in the helper.

## Acceptance criteria

- [x] Each browse row shows log-derived delivery status: `Never delivered` marker for zero-entry ids; `Last delivered: YYYY-MM-DD` + `Delivered N×` otherwise; correct after reload from restored localStorage.
- [x] Status select works: `Never delivered` shows exactly the zero-log-entry topics; `Oldest first` orders by oldest last-delivered date with deterministic tie-breaks (never-delivered first, then Pulse-consistent id/category rules); composes with keyword search and category grouping without state conflicts.
- [x] Malformed log data never breaks the page: non-string topicIds skipped; non-ISO-dated entries count as delivered with no date label; empty log renders all `Never delivered`; missing/failed localStorage degrades to a warned, fully functional page.
- [x] `browse.html` no longer swallows localStorage errors silently: `console.warn` fallbacks, page renders with localStorage unavailable.
- [x] New shared helper is a plain-script file: JSDoc'd, defensive, non-mutating, loadable by browse.html and Vitest; zero new npm dependencies; static-site/file:// compatibility preserved.
- [x] Existing browse behaviors unchanged: keyword search, deep links (`index.html#<id>`), hero counts, category grouping, legacy `Used N×` label still present.
- [x] Full Vitest suite green with new tests covering helper semantics (counts, last date, never-delivered, malformed/unknown handling, empty log), filter/sort determinism, and two-store coexistence with per-test localStorage isolation.

## Verification

- `npx vitest run` — full suite green (149 existing + new), RED confirmed before implementation.
- Live Chromium @ localhost:3000: seeded adversarial log (delivered topics, never-delivered, non-ISO date, unknown id); status visible per row; select + search + grouping composes; localStorage-failure path warned and functional; zero console errors (real console listener).
