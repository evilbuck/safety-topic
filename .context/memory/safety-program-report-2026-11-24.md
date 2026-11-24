---
date: 2026-11-24
domains: [javascript, frontend, print, csv, defensive-programming]
topics: [program report, export, compliance records, print css cascade, focus preservation]
subject: 2026-11-24.safety-program-report
artifacts: [plan-safety-program-report.md, iterate-safety-program-report.md, research-program-report.md]
related: [safety-program-pulse-2026-11-24.md, safety-meeting-log-2026-11-24.md]
priority: high
status: active
---

# Session: 2026-11-24.safety-program-report — Safety Program Report

## What happened

Loop three of the "one major change per loop" directive, full Buck cycle (research → plan → build → review → iterate → docs → save → commit), subagent-orchestrated. Delivered: the **Safety Program Report** — the *produce* leg of the record system. Loop 1 records (sign-off sheet + `meetingLog`), loop 2 reviews (Pulse), loop 3 produces: a printable, date-range-filtered, CSV-exportable program history a supervisor can hand to a Cal/OSHA inspector (Form 1AY document request), a GC's safety department, HR, or an insurer.

- **Report overlay** (`#program-report`, `body.report-open` print mode, opened from a Program Report button in the Pulse): header (title, Company/Crew fill-in lines, Generated date, range label), summary counts + informational cadence facts, chronological Date·Topic·Category table, per-category coverage summary, honest footer (retention floors CA/WA 1 yr + enforcement posture 3 yr; "Attendance names and signatures: see Safety Talk Records on file"; source/disclaimer). No verdicts, no streaks.
- **Range filtering**: presets This month / This quarter / This year (default) / All time + custom from/to, all client-side.
- **Pure `buildProgramReport(log, topics, range)`** — deterministic, arg-safe, never throws; non-ISO-date entries excluded with a visible count note; unknown ids "(topic no longer in catalog)", counted, out of coverage (Pulse's policy).
- **CSV export**: RFC 4180 quoting, UTF-8 BOM, CRLF, `safety-talk-program-report-<date>.csv` via Blob + object URL (revoked in `finally`), feature-detected with a descriptive error toast — never a silent no-op.
- **Live update**: logging a talk re-renders the report body in place while the overlay is open (range preserved); controls stay mounted so focus is never lost.

## Why this change (research-backed)

`.context/2026-11-24.safety-program-report/research-program-report.md`: every surveyed competitor ships this layer — Raken markets its Toolbox Talks PDF as "primary documentation for OSHA training records" plus Attendance/Compliance CSVs (paid plan); Safesite ships date-range-filtered Meetings reports with bulk PDF/XLS; SafetyTopic was the only one with no exportable program artifact. Regulators ask program-shaped: Cal/OSHA Compliance Manual Ch. 13 requires CSHOs to request "safety and health training records" via Form 1AY and probes "Is there a sign-in sheet?"; WAC 296-155-110(8) and OAR 437-001-0765(13) are explicit produce-on-request rules; GC practice (Power Construction) demands recurring topic+attendance submissions with payment consequences. Steelman resolved: the sign-off sheet stays the per-employee record of authority; the report is its honest index — "show me everything since January" answered from data already kept.

## Review findings fixed (b-iterate, TDD)

1. **[defect] Sign-Off Sheet button printed the Program Report when the report overlay was open** — `body.report-open #program-report` (specificity 1,1,1 + !important) out-cascaded the generic hide, and `body.report-open .signoff-sheet` hid the sheet: the printed artifact was the wrong document, and an existing test encoded the bug. Fix: `openSignoffSheet()` closes the report before printing (matching the main-Print/showTopic convention); test rewritten.
2. **[warning]** reopen-resets-custom-range-to-This-year pinned with a guard test (behavior existed, was untested).
3. **[warning]** range change destroyed keyboard focus (full innerHTML rebuild) — controls now stay mounted; `renderProgramReportBody()` re-renders only the body.
4. **[nit]** `logTalk` rebuilt the hidden overlay every click — now guarded on `report-open`.
5. **[nit]** CSV anchor leaked on a throwing click — removal in `finally`.

Not done, recorded: CSV formula-injection hardening (`=+-@` prefix) — optional per review, self-inflicted only; `renderError()`/`showToast()` null-guard nits — pre-existing, call-order-guarded.

## Verification evidence

- `npx vitest run` → **149 passed** (98 + 51 new), RED confirmed at build (47 failing) and iterate (4 failing) stages.
- Live Chromium @ localhost:3000, adversarial fixture (7 entries incl. unknown id + non-ISO date), real console listener, zero errors: overlay + default This year; rows 6 with 1 excluded + visible note; unknown-id fallback + "—"; footer/no-verdict language; month/quarter/all/custom ranges; live re-render preserving range; CSV BOM verified at byte level (`ef bb bf`), CRLF, filename convention, object-URL revoke, descriptive error toast on stubbed API; print media isolates the report both ways; post-fix sign-off-under-open-report prints the sheet (report closed at print time); focus preserved on preset change; reopen resets to This year.

## Files changed

- `app.js` — buildProgramReport/resolveReportRange/pad2, report overlay + controls, renderProgramReport/Body, exportProgramReportCsv/escapeCsvCell/buildProgramReportCsv, wiring + iterate fixes
- `index.html` — `#program-report` section
- `style.css` — overlay + `report-open` print rules
- `tests/app.test.js` — 51 new tests
- `README.md`, `CHANGELOG.md` — docs
