---
date: 2026-11-24
subject: 2026-11-24.safety-program-report
type: working notes
---

# Working notes — Safety Program Report research

Raw excerpts: `sources-program-report.md`. Deliverable: `../research-program-report.md`.
Front matter tracked in subject `index.md`; not repeated here.

## Starting state (repo facts, verified by reading app.js)

- `meetingLog` entries are `{ topicId, date }` ONLY (app.js ~506: `meetingLog.push({ topicId, date: todayISO() })`). No presenter, no attendees, no location, no duration.
- Per-talk proof lives on the PRINTED sign-off sheet (`buildSignoffSheet`, app.js ~862): date (prefilled), topic title/summary/key points/source/duration, blank Presented-by / Location / Company lines, attestation, 12-row name+signature table, notes, presenter signature. Paper is the artifact; the digital log is a thin index of what was delivered when.
- Pulse (`computeProgramStats`, app.js ~553): total, thisMonth, lastDate, lastTopicTitle, per-category coverage `{category, delivered, total, lastDate}`, recent 5. NO date-range filter, NO full-history table, NO export of any kind.
- Existing print machinery: sign-off sheet uses `body.sheet-open` + `window.print()` + afterprint close; main-page print button explicitly avoids printing the stale sheet (app.js ~302 comment).
- Backlog item (A): browse.html per-topic delivery status, deferred from loop 2 — small.

## Q1 — Regulatory record requirements (what, who produces, to whom)

- §3203(b)(2): per-employee training documentation = {name/other identifier, training dates, type(s), training providers}; keep ≥1 year (official DIR text). Exceptions: <10 employees → simple log of instructions OK; <1yr employees → provide at termination; <20/low-hazard → lighter written documentation set. H1's field list confirmed almost exactly.
- Who produces to whom: employees get access to the PROGRAM document (5 business days, printed copy) but (a)(8)(C) expressly excludes implementation RECORDS from that access right. Records go to the Division: Compliance Manual Ch.13 — CSHOs request via Form 1AY Document Request; the request "must include … safety and health training records"; effectiveness probes: "Is there a sign-in sheet?", "…Safety meetings?" So "produced on request" = on the inspector's request during an inspection (authority: 8 CCR 336 + Labor Code 6319/6401.7/6428.5), not a standing employee document right.
- DISCREPANCY FOUND: reg says 1 year; Compliance Manual (current rev) evaluates 3-year retention for employers with ≥10 employees, and PRISM (loop 2) said 3 years via Cal/OSHA consultation. Report should surface both: reg floor 1 year, enforcement posture 3 years. SafetyTopic can note this in the report footer without hard-coding legal advice.
- §1509 correction: (e) is the 10-working-day meeting mandate; §1509 has NO records subsection. Records flow via (a) → §3203(b). H1's "§1509 tailgate training records" is imprecise; the citation pair is §1509(e) + §3203(b)(2) (Ch.13 IV.B confirms CSHOs cite the industry standard referencing §3203 subsections).
- Federal 1926.21(b)(2): instruct employees, no records mandate. Toolbox-talk recordkeeping is entirely a state-plan (CA/WA/OR) + private/GC matter.
- WA: weekly meetings; document attendance + subjects; minutes at site; ≥1 year; "available for review by personnel of the department, upon request" — the strongest explicit produce-on-request text.
- OR: construction/utility/manufacturing — document (hazards, date, attendee names), make available to ALL employees, keep 3 years.
- Cal/OSHA worksheet (loop 2 s19): topic+date ledger = official blessing of a program-level delivery index. This is the closest official analog to a program report's coverage table.

## Q2 — Competitor report/export features

- Raken (help article, direct): three exports — Toolbox Talks PDF (topic, date, admin signature, attendee signatures; time-frame filter; schedulable; "primary documentation for OSHA training records"), Attendance CSV (who attended which talks + gaps), Compliance CSV (% of scheduled talks delivered). Paid tier (Performance Plan). Pattern: per-talk PDF + program-level CSVs.
- Safesite (help article, direct): Meetings report page with Date Range filter + column toggles + filters; bulk PDF export (zip of summary list + individual reports, cap 100); per-report PDF/XLS. Pattern: filterable table + PDF bundle.
- HCSS: "full history of meetings … review stats or compliance" (product page); help-center export doc unreachable → snippet-sourced.
- SafetyCulture/Mitti (loop 2): records + real-time analytics; no documented program-report export found.
- Synthesis: EVERY serious vendor's documented output = (a) per-talk record artifact + (b) filterable program-level export (PDF and/or CSV). SafetyTopic has (a) printed; (b) is missing entirely.

## Q3 — GC / client submission practice

- Power Construction (major GC, PDF direct): weekly toolbox talks mandatory; sub must SUBMIT "the toolbox talk or a description of the topic discussed along with all attendees' names" via e-forms; failure = "disciplinary action, withholding of payment, and/or work stoppage." Daily reports too.
- STO Building: monthly jobsite safety status report to safety department (snippet only).
- WAC note + OAR (14): subs may satisfy meeting duties via GC's meetings and keep minutes as their own records — i.e., the sub's own log/report is expected paperwork regardless.
- Shape of a submission per Power: topic description + attendee names per talk, delivered on a schedule. A sub using SafetyTopic would hand GC the printed sign-off sheets; a program-level report (index/summary) is the natural cover sheet when submitting months of these.

## Q4 — Evidence AGAINST the report (steelman)

- Inspector's first question (Ch.13 sample measure) is "Is there a sign-in sheet?" — the per-talk sheet already carries attendee names + date + topic + presenter, i.e. everything §3203(b)(2) names. For a CA employer with a shoebox of signed sheets, a digital program report adds NO mandatory field.
- The digital log lacks presenter/attendees, so a report built only from the log cannot itself satisfy §3203(b)(2)'s per-employee documentation. It must be honest: index + summary, attendance proof = filed sheets.
- Pulse already summarizes counts/coverage on screen; a report is partly a print view of existing computations.
- Counter-counter: requests are rarely "show me one sheet"; they are "show me everything since January" (Form 1AY document requests; WAC/OR produce-on-request; Power's weekly submissions; Raken sells exactly this export; GC audits). Flipping 50 paper sheets with no index is the real failure mode; the log already exists digitally, so the marginal cost is small and the product gap is real (competitors ship it; SafetyTopic ships nothing exportable).
- Verdict: not redundant — but must be framed as the program-level layer OVER the sheets, never as their replacement. Report includes "attendance records: see Safety Talk Records on file" to stay honest.

## Q5 — Shape if built

- Print-first (reuse sheet-open print pattern; works file:// + Pages; zero API caveats) + CSV download second (Blob → createObjectURL → a[download]; MDN: download works for same-origin blob: URLs — a document's own blob qualifies even on file://, where the blob origin segment is implementation-defined (opaque)). Caveats to engineer: iOS Safari may open in tab instead of saving (sync-in-gesture + on-screen hint fallback); prepend BOM + CRLF + RFC4180 quoting for Excel; revokeObjectURL after; guard absent Blob/URL APIs defensively.
- Columns possible from log: date, topic title, category. Presenter/attendee-count NOT in log → either omit or optional capture. Leaning: add OPTIONAL `presenter` to the "I Used This" flow (string, blank allowed) — Power's GC submission expects presenter/attendees, Raken's PDF carries admin signature; attendee NAMES stay on paper (PII in localStorage avoided); report column shows presenter or "—", footer points to filed sheets. Flag as the plan-stage decision.
- Report contents: header (title, company/crew fill-ins, range, generated-on), summary block (total in range, months covered, cadence line citing state floors generically), delivery table (chronological), per-category coverage summary (delivered/total/last-delivered — reuse computeProgramStats math), footer (retention note 1yr reg/3yr Cal posture, "attendance on file" note, generation timestamp). Date-range: presets (this month/quarter/year, all) + custom from/to; default = current year (matches GC/inspector ask "everything since January").
- Placement: new "Program Report" affordance in the Pulse dashboard section (report = produce; pulse = review), built on a pure function `buildProgramReport(log, topics, range)` so it is testable headlessly like computeProgramStats.

## Alternatives scoring

- (A) browse per-topic status: real, small, already deferred — foldable into report work later, not a major change. WINS nothing on production-of-records.
- (B) cadence nudge: loop 2 shipped recency cue deliberately; evidence weak (loop 2 Q5); redoing = re-litigating a decision.
- (C) talk quality: no gap evidence found.
- (D) none surfaced — the export/produce layer is the actual gap; it is the only candidate demanded by an external party (GC, WA/OR on-request, Cal/OSHA document requests, insurer audits).

## Loop-shape note for plan stage

One major change = "Safety Program Report": date-range-filtered, printable program report + CSV export over meetingLog; optional presenter field capture; reuses computeProgramStats + print pattern. Browse per-topic status (A) stays backlog.
