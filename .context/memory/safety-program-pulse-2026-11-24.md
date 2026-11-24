---
date: 2026-11-24
domains: [javascript, frontend, dashboard, defensive-programming]
topics: [program pulse, coverage ledger, suggestion engine, meeting log, print css]
subject: 2026-11-24.safety-program-pulse
artifacts: [plan-safety-program-pulse.md, iterate-safety-program-pulse.md, research-program-pulse.md]
related: [safety-meeting-log-2026-11-24.md]
priority: high
status: active
---

# Session: 2026-11-24.safety-program-pulse — Safety Program Pulse

## What happened

Loop two of the "one major change per loop" directive, full Buck cycle (b-research → b-plan → b-build → b-review → b-iterate → docs → save → commit), subagent-orchestrated throughout. Delivered: the **Safety Program Pulse** — the read side of the record loop from loop one (`meetingLog`, commit deb4914).

- **Main-page dashboard** (`#program-pulse`, hidden in print): total + this-month talk counts, topics-delivered coverage count, "Last recorded talk: N days ago (date)" with an informational cue only past 30 days ("most programs run these weekly or monthly" — deliberately no streak/score/compliance language), per-category delivered-vs-never ledger (never-delivered first, then oldest last-delivered), recent-deliveries list (5, newest-first), and a deterministic "suggested next topic".
- **Pure functions**: `computeProgramStats(log, topics)` (never throws on malformed input, never mutates args; unknown topic ids → fallback title, excluded from ledger, still counted; non-ISO dates → excluded from date-derived fields) and `suggestNextTopic(log, topics)` (never-delivered first in the most-neglected category — absent/oldest last-delivered, alphabetical tie-breaks; else globally oldest last-delivered). Global by design; labeled "ignores your category filter".
- **Live updates**: `init()` renders the pulse; `logTalk()` re-renders it so "I Used This" updates counts/recency/ledger/recent in place.

## Why this change (research-backed)

Research (`.context/2026-11-24.safety-program-pulse/research-program-pulse.md`) compared dashboard-first vs smart-pick-first and found: Safesite/Raken/HCSS/EcoOnline all surface counts/recency/overdue/history; Cal/OSHA's official Tailgate/Toolbox worksheet is literally a topic+date coverage ledger; cadence floors are state mandates (Cal §1509(e) 10 working days, WA weekly, OR monthly — none federal); §3203(b)(2) record fields (person/date/type) are exactly the pulse data model; no surveyed product does never-delivered-first recommendation over its own log. Verdict: dashboard-first with a cheap deterministic suggestion attached — the log existed but nothing read it; now the supervisor can see consistency and coverage, which is the program, not just the meeting.

## Review findings fixed (b-iterate, TDD)

1. [defect] Load button desynced nav state — now calls `syncCategoryToTopic()` before `showTopic()`, so the counter and ←/→ always match the displayed card (review: with a filter active, findIndex returned −1 → empty counter, stale index nav)
2. [defect] same-day recent entries listed oldest-first and a 6th same-day talk was dropped by `.slice(0,5)` — `.reverse()` before the stable sort
3. [warning] empty `#program-pulse` rendered as a blank padded card when `init()` errored early — `.program-pulse:empty { display:none }`
4. [warning] never-delivered badge contrast 3.05:1 — now `#8a3f00` ≈6.7:1 (WCAG AA)
5. [warning] test gaps — added same-day ordering/truncation + post-Load nav-state tests; removed a double-`init()` listener stack

Also fixed inline: mangled `assertDomElements` error message (template literal contained literal `" + "` fragments — flagged by the build subagent).

## Verification evidence

- `npx vitest run` → **98 passed (98)** (63 pre-loop + 35 new), run independently by the orchestrator after build and after iterate
- Live Chromium @ localhost:3000 with real and adversarial fixtures (three nonexistent topic ids were part of one fixture — handled per spec), real console listener: zero errors. Verified: restored-log render (totals 6/5, ledger 10 rows, recency), 40-day cue fires / today doesn't, I-Used-This updates pulse in place (3→4), Load under active filter clears it with coherent `42 / 50` counter + hash sync, same-day 6-entry fixture lists newest-first with the 6th at top, print emulation hides the pulse
- Review verdict fail → all five findings fixed → live re-verification of both defects

## Files changed

- `app.js` (+351 from build, plus iterate fixes) — computeProgramStats, suggestNextTopic, renderProgramPulse, daysSince, pulse wiring, harness additions
- `index.html` (+4) — `#program-pulse` section
- `style.css` (+157+) — pulse styles + print hide + contrast fix
- `tests/app.test.js` (+495+) — 35 new tests
- `README.md`, `CHANGELOG.md` — docs

## Backlog additions

- browse.html per-topic last-delivered display (deferred from this loop's out-of-scope)
