---
status: completed
date: 2026-11-24
subject: 2026-11-24.safety-program-report
topics: [program report, csv export, date range filter, print css, compliance records]
research: [research-program-report.md]
iterations: [iterate-safety-program-report.md]
spec:
memory: [safety-program-report-2026-11-24.md]
---

# Plan: Safety Program Report (loop 3)

## User Goal

As a supervisor who records safety talks in SafetyTopic, I need to **produce the program's record on request** — hand a Cal/OSHA inspector (Form 1AY document request), a GC's safety department, HR, or an insurer a dated, filtered, printable summary of every recorded talk — without keeping a second set of records by hand. The app records (loop 1) and reviews (loop 2); it cannot yet *produce* anything.

## Why this change (research-backed)

`.context/2026-11-24.safety-program-report/research-program-report.md` — every surveyed competitor ships this layer (Raken: PDF + attendance/compliance CSVs, "primary documentation for OSHA training records"; Safesite: date-range Meetings reports with bulk PDF/XLS); SafetyTopic is the only one with no exportable program artifact. Regulators ask program-shaped: Cal/OSHA Form 1AY "must include … safety and health training records"; WAC 296-155-110(8) and OAR 437-001-0765(13) are explicit produce-on-request rules; GC practice (Power Construction) demands recurring topic+attendance submissions with payment consequences. The per-talk sign-off sheet stays the per-employee record of authority; the report is its honest index/summary — "show me everything since January" answered from data already kept.

## Scope

**In**
- `buildProgramReport(log, topics, range)` — pure, deterministic, JSDoc'd: range-filtered delivery rows (Date, Topic, Category), per-category coverage summary, summary counts, exclusion notes for malformed data.
- Date-range filtering: presets This month / This quarter (calendar) / This year / All time + custom from/to; default **This year**.
- `#program-report` DOM overlay (mirrors sign-off-sheet pattern: `body.report-open` print mode, close restores), opened from a **Program Report** button in the Program Pulse section.
- Print renderer: 1–2 page report — header (title, company/crew fill-in lines, generated-on date, range label), summary (total talks, first/last in range, cadence note informational only), chronological delivery table, per-category coverage summary, footer (retention note: reg floor CA/WA 1 yr, enforcement posture 3 yr; "Attendance names and signatures: see Safety Talk Records on file"; source/disclaimer language per repo convention).
- CSV export (secondary): Blob + `<a download>` + `revokeObjectURL`; UTF-8 BOM, CRLF, RFC 4180 quoting; columns Date, Topic, Category, Topic ID; filename `safety-talk-program-report-<generatedDate>.csv`; synchronous in-gesture; feature-detected with a **non-swallowed** error path (toast names the missing capability).
- "I Used This" while report open: report re-renders (same live-update contract as Pulse) — or simpler, report closes on new log entry; decide in build per simplest coherent behavior and test it.

**Out (this loop)**
- Presenter/attendee capture in the digital log — names stay on the printed sheets (PII); optional `presenter` capture deferred to backlog.
- browse.html per-topic delivery status (existing backlog item).
- Any compliance *judgment*: no streaks, no "compliant/non-compliant" verdicts; facts and state floors only, jurisdiction-agnostic informational note.

## Data policy (consistent with Pulse)

- Log entries with non-ISO dates: **excluded from report rows**, counted in an explicit "N entries with unrecognizable dates were excluded" note when > 0; never silently dropped.
- Unknown/removed topic ids: included in rows as "(topic no longer in catalog)", category "—", counted in totals, excluded from coverage ledger (matches Pulse).
- `buildProgramReport` never mutates args, never throws on malformed input; range with `from > to` yields empty rows deterministically (not an error).

## Implementation steps

1. **RED**: failing Vitest tests for `buildProgramReport` (presets incl. quarter boundaries, custom range, unknown ids, malformed dates, empty log), CSV helper (escaping: quotes/commas/newlines; BOM+CRLF), report render (overlay open/close, `report-open` class, footer language), report range control wiring, log-talk re-render/close behavior.
2. **GREEN**: implement in existing patterns — template literals + `escHtml()`, guarded DOM/storage, `todayISO()` reuse, `body.report-open` print CSS (`@media print` shows only report when open; main Print button never shows report), overlay close restores normal print. No drive-by restyling.
3. **Refactor**: only within new code.

## Acceptance criteria

- [x] Report overlay opens from the Pulse section and renders the full report from a restored `meetingLog`: header with fill-in lines + generated date + range label, summary counts, chronological delivery table, per-category coverage summary, honest footer (retention note + "see Safety Talk Records on file" + source/disclaimer); empty log shows an honest empty state, not a blank page
- [x] Range filtering works: This month / This quarter / This year / All time presets and custom from/to all filter the table, coverage summary, and counts; default is This year
- [x] Print output shows only the report (main app hidden) while `report-open`; the normal app Print button never shows the report; sign-off sheet print flow unchanged (review defect fixed: sign-off now closes the report before printing)
- [x] CSV download produces RFC 4180-valid CSV (BOM, CRLF, quoted fields) named per convention; when Blob/download is unsupported the user sees a descriptive error toast (never a silent no-op); object URL is revoked
- [x] Malformed log data never breaks the report: non-ISO-date entries are excluded with a visible count note; unknown topic ids render "(topic no longer in catalog)" with category "—", counted in totals, excluded from coverage
- [x] The report contains no compliance verdicts or streak/gamification language; cadence/retention lines are informational, jurisdiction-agnostic facts
- [x] All existing tests still pass; new tests cover the above with per-test localStorage isolation

## Verification

- `npx vitest run` — full suite green (existing 98 + new).
- Live Chromium @ localhost:3000: seeded multi-entry log incl. malformed entries; overlay open/render; each preset + custom range; print emulation shows only the report; CSV download captured (correct name/content); error path exercised by stubbing unsupported API in-page; zero console errors (real console listener).
