---
status: completed
date: 2026-11-24
subject: 2026-11-24.safety-program-report
topics: [review iterate, print css cascade, focus preservation, csv cleanup]
informs: [plan-safety-program-report.md]
---

# Iterate: Safety Program Report (loop 3, post-review fixes)

Review verdict (agent `ProgramReportReview`, hostile standards pass): **FAIL** — 1 defect, 3 warnings, 2 actionable nits. All actionable findings fixed TDD by agent `IterateFixReport`; suite 149/149 (4 RED first). Live re-verification by orchestrator: all green, zero console errors.

## Defect

1. **Sign-Off Sheet button printed the Program Report when the report overlay was open** (`openSignoffSheet`, app.js). Print cascade analysis: `body.report-open #program-report { display:block !important }` (specificity 1,1,1) beat the generic `#program-report { display:none !important }` (1,0,0), and `body.report-open .signoff-sheet { display:none !important }` beat the sheet's non-important rules — the printed artifact was the report, not the sheet the user clicked. Worse, the pre-existing test asserted exactly this both-classes-open state, encoding the bug.
   **Fix**: `openSignoffSheet()` calls `closeProgramReport()` before adding `sheet-open` (mirroring the established convention: main Print button and `showTopic` clear both overlays); on the success path only, so a failed attempt (no topic loaded) doesn't close the user's report as a side effect. The bug-encoding test rewritten to assert `report-open` false / `sheet-open` true at print time.

## Warnings

2. **Reopen-resets-range-to-This-year was untested** (behavior existed at app.js openProgramReport). Added the guard test (custom → Close → reopen → preset `year`, inputs disabled); it pins the reset so deleting the `reportRange = { ...REPORT_DEFAULT_RANGE }` line would fail it.
3. **Range change destroyed the focused control** — `renderProgramReport()` replaced the whole `section.innerHTML`, dropping keyboard/SR focus to `body` on every preset/date change. **Fix** (reviewer's preferred option): controls stay mounted — new `renderProgramReportBody()` re-renders only `.report-body`; `syncReportDateInputs()` toggles from/to `disabled` in place. Preset/date handlers and `logTalk` use the body-only path; full render only on open. Focus test pins it.

## Nits (fixed)

4. **`logTalk` rebuilt the hidden report on every click** — now guarded on `body.report-open`; overlay-closed logging leaves `#program-report` cleared (test added).
5. **CSV anchor leak on `click()` throw** — anchor removal moved to `finally` with `parentNode` guard; revocation in the same `finally` (test stubs a throwing click, asserts no `a[download]` remains).

## Not done (recorded)

- **CSV formula-injection hardening** (cells starting `=+-@`) — review marked optional/self-inflicted (requires hand-edited localStorage; catalog is curated). Out of scope.
- **CHANGELOG** — orchestrator's docs stage, done separately.
- `renderError()`/`showToast()` null-guard nits flagged by the build agent — pre-existing, guarded by call ordering; left for a future defensive pass.

## Verification

- RED confirmed: 4 failed / 145 passed for the four behavioral tests; reset-guard test passed immediately (behavior pre-existed — pinned, not introduced).
- Final suite: **149 passed / 0 failed**.
- Live Chromium re-verification (orchestrator, real console listener): sign-off with report open → sheet prints (report closed at print time, `sheet-open` true); preset change keeps focus on the select; reopen resets to This year with inputs disabled; logTalk with overlay closed leaves the section empty; print media still isolates the report; zero console errors.
