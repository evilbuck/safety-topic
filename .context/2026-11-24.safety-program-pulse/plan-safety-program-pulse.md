---
status: completed
date: 2026-11-24
subject: 2026-11-24.safety-program-pulse
topics: [program pulse, dashboard, coverage, suggestion, localStorage]
research: [research-program-pulse.md]
iterations: [iterate-safety-program-pulse.md]
spec:
memory: [safety-program-pulse-2026-11-24.md]
---

# Plan: Safety Program Pulse — program dashboard + coverage-aware suggestion

## User Goal

A supervisor who records talks with "I Used This" can **see their program at a glance**: how many talks they've run, how long since the last one, which categories are covered vs. neglected, and what to deliver next — instead of a meeting log that's written but never read.

## Goal

Close the read side of the record loop delivered in the previous loop (`meetingLog`, commit deb4914). Research (`research-program-pulse.md`) is decisive: dashboard fields (counts by period, last-delivered recency, per-category delivered-vs-never coverage, recent list) are exactly what Safesite/Raken/HCSS/EcoOnline surface and exactly the fields authorities enumerate (Cal §3203(b)(2) person/date/type; Cal/OSHA guide topic/date/attendees/actions; Cal/OSHA's official Tailgate/Toolbox worksheet is literally a topic+date coverage ledger). Cadence cue stays a plain recency indicator against a benchmark (weekly-to-monthly norms: Cal §1509(e) 10 working days, WA weekly, OR monthly) — no streak gamification. A deterministic "suggested next topic" (never-delivered first, oldest-neglected category) fills a gap no surveyed product implements, and rides on the same surface.

## Context used / assumptions

- User request: "one major change that will improve the focus, the purpose of this app", delivered via Buck workflow with a commit per loop; subagents for research/build/review.
- Code facts: `meetingLog` is `{ topicId: string, date: "YYYY-MM-DD" }[]` in localStorage, restored sanitized in `init()`; `todayISO()` exists; render via template-literal `innerHTML` with `escHtml()`; `showTopic(topic, true)` loads a topic with hash sync; test harness `window.__safetyTopic` exposes internals; print rules live in `style.css` `@media print`; 50 topics, 10 categories.
- Assumption: benchmark copy is informational, not compliance advice ("most programs run these weekly or monthly"); static-site, zero-dependency constraint holds.
- Defensive rules per AGENTS.md: no swallowed errors, JSDoc, guarded DOM/storage access.

## Scope

1. **Program pulse section** (`index.html`, `app.js`, `style.css`): new `<section id="program-pulse">` after the share bar, aria-label "Safety talk program record". Rendered from `meetingLog` + `allTopics`:
   - **Recency line**: "Last recorded talk: N days ago (date)" or "No talks recorded yet"; when N > 30 a plain informational cue ("most programs run these weekly or monthly") — no streak language, no compliance claims.
   - **Counts**: total recorded talks; recorded this calendar month ("X of Y topics delivered" overall coverage count).
   - **Category ledger**: every catalog category with `delivered/total` and last-delivered date; sorted never-delivered first, then oldest last-delivered first; never-delivered categories visually marked.
   - **Recent deliveries**: up to 5 entries, newest first, topic title (or "(topic no longer in catalog)" when the id no longer resolves) + date.
   - **Suggested next topic** (deterministic, pure): if any never-delivered topic exists → the never-delivered topic in the category with the oldest/absent last-delivered date, tie-break alphabetically by id; else the topic with the globally oldest last-delivered date (tie-break alphabetical). Rendered as "Suggested next: <title> — <reason>" with a Load button that calls `showTopic(topic, true)`.
   - Empty log → friendly empty state ("No talks recorded yet — hit 'I Used This' after your next meeting to start building your record.") with the suggestion still shown (all topics are never-delivered).
2. **Pure compute functions** (`app.js`): `computeProgramStats(log, topics)` → `{ total, thisMonth, lastDate, lastTopicTitle|null, coverage: [{category, delivered, total, lastDate|null}] sorted, recent: [{topicId, title|null, date}] }`; `suggestNextTopic(log, topics)` → `{ topic, reason } | null`. Unknown topic ids never throw (skipped in category coverage; counted in total/recency; rendered with fallback title).
3. **Live updates** (`app.js`): pulse re-renders on `init()` and immediately after a successful `logTalk()` ("I Used This"). New DOM id `program-pulse` added to `assertDomElements()`; harness exposes `computeProgramStats`/`suggestNextTopic`/`renderProgramPulse`.
4. **Print rules** (`style.css`): `#program-pulse` hidden in `@media print`; sign-off-sheet print flow unaffected. Screen styles match existing card/section aesthetic.
5. **Tests** (`tests/app.test.js`): new describe with isolated localStorage per test — `computeProgramStats` (counts, thisMonth, ledger sort order, unknown-id resilience), `suggestNextTopic` (never-delivered-first, oldest-category, deterministic tie-breaks, all-delivered branch, empty log), `renderProgramPulse` DOM (empty state, populated fields, recency cue threshold, Load button loads suggestion), I-Used-This updates pulse in place, print CSS hides the section.

## Out of scope

- browse.html per-topic last-delivered display (backlog candidate at save time)
- meetingLog export/import, PDF, multi-crew/device sync, scheduling/reminders, attendance digitization
- any streak/score/gamification; any change to Get a Topic randomness or category filter behavior

## Affected files

- `app.js` — compute/render functions, pulse wiring, `assertDomElements`, harness additions
- `index.html` — `#program-pulse` section
- `style.css` — pulse screen styles + print hide
- `tests/app.test.js` — new describes
- `CHANGELOG.md`, `README.md` — docs (b-docs/b-save step)

## Implementation steps

1. RED: failing tests for `computeProgramStats`, `suggestNextTopic`, `renderProgramPulse`, I-Used-This pulse update.
2. GREEN: implement scope items following existing patterns (template literals + `escHtml`, JSDoc, guarded DOM/storage access, `todayISO()` reuse).
3. Refactor within new code only; no drive-by restyling.

## Acceptance criteria

- [x] Pulse renders on load from a restored `meetingLog`: total count, this-month count, days-since last talk, full category ledger (all 10 categories, delivered/total + last-delivered, never-delivered first then oldest first), and up to 5 recent deliveries newest-first; empty log shows the empty state plus a suggestion; zero console errors
- [x] Recency line is a plain indicator: date + days-ago number, and an informational cue only past 30 days (no streak/score/compliance language)
- [x] `suggestNextTopic` is deterministic per the spec (never-delivered first in the oldest-neglected category, alphabetical tie-break; oldest-delivered fallback) and the Load button loads the suggested topic into the card with all existing card behaviors intact
- [x] Unknown/removed topic ids never break rendering (fallback title, excluded from category ledger)
- [x] "I Used This" re-renders the pulse in place immediately (count, recency, ledger, recent list all reflect the new entry)
- [x] Print output never includes the pulse section; sign-off sheet print flow unchanged
- [x] All existing tests still pass; new tests cover the above with per-test localStorage isolation

## Verification

- `npx vitest run` — full suite green (existing 63 + new)
- `npm run dev` at http://localhost:3000 in a real browser: seed a fixture `meetingLog` via localStorage, reload, verify all pulse fields against the fixture; I Used This updates the pulse; suggestion Load works; print-media emulation shows the pulse hidden and sign-off sheet unaffected; zero console errors

## Execution Instructions

Non-phased execution-ready plan. Treat the whole plan as one unit:
1. `/b-build` against this plan (TDD, standard mode).
2. `/b-review` against this plan (spec axis + standards sub-agent).
3. In-plan issues → `/b-iterate` then re-review; out-of-plan → separate `/b-plan`.
4. `/b-docs` if documentation impact, then `/b-save`, then `/b-commit`.
5. Interrupted → leave a note in memory and resume from this plan.

## Risks

- Date-dependent tests — fixtures use `todayISO()` for "today" entries so days-since assertions are stable; threshold tests use constructed ISO strings relative to now.
- Category-ledger DOM growth (10 rows) — keep markup lean, render only from the pure stats object.
- Suggestion could fight the category filter — it is explicitly global (coverage-based, not filter-based); the label says so.
