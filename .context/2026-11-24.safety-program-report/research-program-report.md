---
status: active
date: 2026-11-24
subject: 2026-11-24.safety-program-report
topics: [program report, export, CSV, compliance records, GC submissions]
informs: [plan-safety-program-report.md]
---

# Research: Compliance Program Report/export (loop 3)

Recommendation and evidence for the loop-3 major change. Working notes: `research/notes-program-report.md`. Raw excerpts: `research/sources-program-report.md`.

## Recommendation

**Build the "Safety Program Report": a printable (and CSV-exportable) program-level report of the recorded `meetingLog` — delivery history table (date, topic, category), date-range filtering, per-category coverage summary, cadence note, and honest pointers to the filed Safety Talk Records — reachable from the Program Pulse dashboard.**

It completes the three-layer record system the app has been building: loop 1 = the per-talk record (printed sign-off sheet + dated log), loop 2 = program review (Pulse), loop 3 = **program output** — the artifact a supervisor can actually hand to a Cal/OSHA inspector (Form 1AY document request), a GC's safety department (weekly/monthly submittals), HR, or an insurer. It is the only candidate change demanded directly by an external party, every documented competitor ships exactly this layer, and the infrastructure (log, stats math, print pattern) already exists, making it a high-evidence, low-risk build.

## Why it beats the alternatives

**(A) Browse-page per-topic delivery status** (deferred loop-2 backlog item) — real and cheap (reuses `computeProgramStats` per topic) but it is an on-screen convenience, not a record-production feature; it produces nothing anyone outside the supervisor can receive. Rightly deferred once before; too small for a "major" change. Can ride along in a later loop.

**(B) Scheduling/nudge on cadence lapse** — loop 2 already considered this and deliberately shipped a plain recency cue without streaks/gamification; the research then found only weak, adjacent-domain evidence for nudge efficacy and no safety-meeting-specific evidence. Re-opening it would re-litigate a settled decision with no new evidence.

**(C) Talk-quality improvements** — no gap found: content already carries key points + discussion prompts + stat + source attribution; loop 2's competitor review showed content is not where products differentiate on this app's axis.

**(D) Anything else surfaced** — nothing more valuable emerged. The research converged on the produce/export layer as the actual gap: SafetyTopic is the only surveyed product family member (Safesite, Raken, HCSS, SafetyCulture, EcoOnline) with **no exportable program-level artifact at all**.

## Regulatory evidence (primary sources, fetched 2026-11-24)

### Cal/OSHA 8 CCR §3203(b)(2) — the record spec (official DIR text)
"Documentation of safety and health training required by subsection (a)(7) **for each employee, including employee name or other identifier, training dates, type(s) of training, and training providers.** This documentation shall be maintained for at least one (1) year." Exceptions: <10 employees may keep a simple log of instructions; <1-yr employees' records end at termination (if provided); <20-employee low-risk employers get a lighter documentation set. [S1]

### Who produces what, to whom
- Employees get access to the **Program document** within 5 business days (printed copy by default), but §3203(a)(8)(C) states the copy "need not include any of the records of the steps taken to implement and maintain the written Program" — i.e., training records are not an employee document right. [S1]
- Records are produced to **the Division on the inspector's request**: Cal/OSHA's Compliance Manual Ch. 13 requires CSHOs to "assess all eight IIPP elements … as well as **requesting relevant documents via the Cal/OSHA Form 1AY: Document Request**," and that request "must include records required to be maintained as part of the IIPP, including but not limited to … **safety and health training records** …" The manual's own effectiveness probes for training and recordkeeping are, verbatim: "**Is there a sign-in sheet?**" and "Does employer have records of … **Safety meetings?**" [S2]
- **Discrepancy to flag honestly**: the regulation text says **1 year**, but the current Compliance Manual evaluates "**for employers with ten or more employees, the records have been maintained for at least three years**," and PRISM (loop 2, s12) reported 3-year retention "through consultation with Cal/OSHA." Report the floor (1 yr) and the enforcement posture (3 yr); the app should state facts, not give legal advice. [S1][S2][S12(loop2)]
- Authority chain for inspection-time production: 8 CCR §§ 336, 3203 + Labor Code §§ 6319, 6401.7, 6428.5 (Ch. 13 "Authority"). [S2]

### §1509 — correction to the hypothesis premise
§1509(e) is the frequency mandate: "Supervisory employees shall conduct 'toolbox' or 'tailgate' safety meetings, or equivalent, with their crews **at least every 10 working days**." §1509 itself contains **no recordkeeping subsection**; the record duty flows from §1509(a) ("…an effective Injury and Illness Prevention Program in accordance with section 3203") into §3203(b). Ch. 13 §IV.B confirms enforcement cites the industry standard *referencing the §3203 subsection*. The correct citation pair is §1509(e) + §3203(b)(2). [S3][S2]

### Federal OSHA 1926.21(b)(2) — status
"The employer shall instruct each employee in the recognition and avoidance of unsafe conditions…" — an instruction duty with **no recordkeeping/retention requirement**. Toolbox-talk recordkeeping is entirely a state-plan (CA/WA/OR) and private-contractual matter. [S4]

### Washington WAC 296-155-110 — the strongest produce-on-request text
Weekly crew-leader meetings required (5)(a); "**(6)(d) You must document attendance. (6)(e) You must document subjects discussed.**"; minutes kept at the site (7); "**(8) You must retain minutes … for at least one year and you must make them available for review by personnel of the department, upon request.**" A note in the rule lets subcontractors satisfy the meeting duty via the GC's meetings (with GC permission). [S5]

### Oregon OAR 437-001-0765(13) — 3-year retention, employee-facing
Construction/utility/manufacturing employers "must **document, make available to all employees, and keep for three years a written record of each meeting** that includes … Hazards … discussed … The date of the meeting. **The names of those attending the meeting.**" Subs may attend the prime's meetings and keep minutes as their own records (14). [S6]

### Cross-jurisdiction synthesis
Fields regulators actually name: **date, topic/subjects, attendee names (or employee identifier), presenter/supervisor, actions** (Cal guide, loop 2 s25; WAC; OAR; §3203(b)(2)). Retention floors: CA 1 yr (reg) / 3 yr (enforcement posture), WA 1 yr, OR 3 yr. Production triggers: inspector request (CA Form 1AY, WA department review), employees (OR), and — in practice most commonly — **GC/contractual submission**. The official Cal/OSHA tailgate worksheet (topic + date ledger) is the closest official analog to a program-level coverage report. [S1][S2][S5][S6][S14]

## Competitor report/export feature table

| Vendor | Program-level export | Format | Date-range filter | Fields documented | Source |
|---|---|---|---|---|---|
| Raken | Toolbox Talks report (schedulable) | PDF | Yes (Time frame) | talk topic, date, administrator signature, attendee signatures; "your primary documentation for OSHA training records" | [S7] |
| Raken | Toolbox Talks Attendance | CSV | Yes | which employees attended which talks; attendance gaps | [S7] |
| Raken | Toolbox Talks Compliance | CSV | Yes | % of scheduled talks delivered | [S7] |
| Safesite | Meetings Safety Action Reports + Bulk Export (zip: summary list + individual reports, cap 100) | PDF (+XLS per report) | Yes (Created Date Range) | filterable table, toggled columns | [S8] |
| HCSS Safety | "A full history of meetings is always available when you need to review stats or compliance" | n/a (help export doc unreachable) | n/a | meeting history + stats | [S13] |
| SafetyCulture/Mitti | records "in one accessible, secure place" + real-time analytics (loop 2) | not documented | — | attendance tracking | loop 2 s5–s6 |
| SafetyTopic (current) | **none** | — | — | Pulse on-screen only | repo |

Raken requires its paid Performance Plan for these exports [S7]; SafetyTopic would ship the equivalent free and offline. Note the vendor pattern: **per-talk record (SafetyTopic has it: sign-off sheet) + filterable program export (missing)** — the report is the missing half of the documented industry shape.

## What GCs actually demand (submission practice)

- Power Construction (Feb 2021 subcontractor requirements): weekly toolbox talks mandatory; "**The toolbox talk or a description of the topic discussed along with all attendees' names shall be submitted to Power utilizing the electronic forms process**"; for the documentation section generally, "**Failure to provide documentation outlined in this section in its required timeframe will be a violation of this document resulting in disciplinary action, withholding of payment, and/or work stoppage.**" Daily Reports are also required daily. [S9]
- STO Building Group: monthly Jobsite Safety Status Report to the safety department (snippet-sourced). [S15]
- WA/Oregon rules explicitly contemplate subs keeping GC-meeting minutes as their own records [S5][S6] — the sub-side paperwork exists regardless of who runs the meeting.
- Practical submission shape (Power): **topic + attendees per talk, on a recurring schedule**. A SafetyTopic supervisor hands over printed sign-off sheets; the program report is the natural cover/index when submitting (or showing) months of them.

## Evidence AGAINST the report hypothesis — taken seriously

1. The per-talk sign-off sheet already captures every field §3203(b)(2) names (attendee names = employee identifiers, date, topic = type, presenter; provider implied by the program), and Cal/OSHA's own first effectiveness probe is "Is there a sign-in sheet?" For a CA employer with signed sheets on file, the report adds no *mandatory* field. [S2][repo]
2. The digital log stores only `{topicId, date}` — a report built from it **cannot by itself** satisfy per-employee documentation. Honest framing required: the report is an index/summary that references filed sheets, not a replacement for them.
3. Pulse already shows counts/coverage on screen; the report overlaps its computations.

**Why it still wins:** real requests are program-shaped, not sheet-shaped — "requesting relevant documents via Form 1AY" for training records, WAC/OR production-on-request, Power's recurring submissions, insurer audits — and nobody can answer "show me everything since January" from a shoebox of sheets without an index. The log already exists digitally; the marginal build is a view over data that is already being kept. Raken markets exactly this export as "primary documentation," and SafetyTopic is the only surveyed product with no export path. The sheet is necessary; without the report it is not *producible as a program*. [S2][S5][S6][S7][S9]

## Proposed feature shape (for plan stage)

**Report = pure function + two renderers**, mirroring existing patterns:
- `buildProgramReport(log, topics, range)` — pure, deterministic, JSDoc'd, unit-testable like `computeProgramStats`; returns `{ range, rows, coverage, summary }` (exact shape the plan stage fixes).
- **Print renderer** (primary): new printable view using the existing `body.sheet-open` + `window.print()` + afterprint mechanism (the code already isolates the stale sign-off sheet from the main print button). Works on file:// and GitHub Pages with zero API caveats. "Produced on request" = paper, which is what inspectors ask for.
- **CSV renderer** (secondary): `Blob` → `URL.createObjectURL` → `<a download>` → `click()` → `revokeObjectURL`. MDN: `download` works for **same-origin `blob:` URLs** — a document's own blob qualifies even from a `file://` page (whose opaque origin segment is implementation-defined). [S10][S11]

**CSV engineering caveats** (all cited): trigger synchronously inside the user gesture — iOS Safari historically may open the file in a new tab instead of saving (fallback hint on screen); prepend UTF-8 BOM (`\uFEFF`) and use CRLF + RFC 4180 quoting so Excel renders correctly; avoid `application/octet-stream` (Safari issues); defensive guards for absent `Blob`/`URL`/`download` support with a non-swallowed error toast, per repo AGENTS.md. [S12]

**Report contents** (one to two printed pages):
1. Header: "Safety Talk Program Report", company/crew fill-in lines, generated-on date, range label.
2. Summary: total talks in range, months covered, plain cadence line ("no federal cadence mandate; state floors: CA every 10 working days (§1509(e)), WA weekly (WAC 296-155-110(5)), OR monthly (OAR 437-001-0765)").
3. Delivery table: Date · Topic · Category (chronological; presenter column if optional field added).
4. Coverage summary per category: delivered/total, last-delivered date — the Cal/OSHA worksheet's official topic+date ledger shape. [S14]
5. Footer: retention note (reg floor 1 yr; Cal enforcement posture 3 yr for ≥10 employees), "**Attendance names and signatures: see Safety Talk Records on file**" (keeps the report honest about its scope), source/disclaimer language per repo convention.

**Date-range filtering**: presets (This month / This quarter / This year / All time) + custom from/to; default = This year (matches the "everything since January" request shape). All filtering client-side over the in-memory log.

**Placement**: affordance in the Program Pulse dashboard section (Pulse = review; Report = produce). Possibly later folded into browse.html per-topic status (backlog A) as a shared stats dependency — separate decision.

## Open questions for plan stage

1. **Presenter capture**: add an optional `presenter` string to `markUsed`/log entries (schema-validated, backward-compatible) so the report can carry a presenter column — or keep the log schema stable and print "—"? GC submissions and Raken's PDF carry presenter/admin; attendee **names** should stay on paper (PII in localStorage). Lean: optional field, blank allowed.
2. CSV filename convention and whether the report view itself is a DOM overlay (like the sign-off sheet) or a new print-target section.
3. Whether "This quarter" uses calendar quarters (simple, deterministic) — no fiscal-quarter option.
4. Exact WAC/OR citation wording in the footer — state floors are jurisdiction-dependent; the app is jurisdiction-agnostic, so keep it informational.

## Sources

- [S1] Cal/OSHA 8 CCR §3203 official text — https://www.dir.ca.gov/title8/3203.html
- [S2] Cal/OSHA Compliance Manual Ch. 13, Enforcement of IIPP — https://www.dir.ca.gov/dosh/policies-and-procedures/ch-13-enforcement-of-iipp.pdf
- [S3] 8 CCR §1509 (Cornell LII) — https://www.law.cornell.edu/regulations/california/8-CCR-1509
- [S4] 29 CFR 1926.21 (Cornell LII mirror; ecfr.gov bot-blocked) — https://www.law.cornell.edu/cfr/text/29/1926.21
- [S5] WAC 296-155-110 (Cornell LII) — https://www.law.cornell.edu/regulations/washington/WAC-296-155-110
- [S6] OAR 437-001-0765 (Cornell LII) — https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-001-0765
- [S7] Raken Help Center, Safety and Compliance Reports — https://help.rakenapp.com/en/articles/14465445-safety-and-compliance-reports-in-raken
- [S8] Safesite Help Center, Safety Action Reports — https://help.safesitehq.com/en/articles/5791595-safety-action-reports
- [S9] Power Construction, Subcontractor Site Safety Requirements (Feb 2021) — https://www.powerconstruction.net/sites/default/files/docs/Subcontractor%20Site%20Safety%20Requirements%20and%20Procedures.pdf
- [S10] MDN, blob: URLs — https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
- [S11] MDN, `<a>` download attribute — https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
- [S12] OpenReplay, downloadable files in the browser (secondary) — https://blog.openreplay.com/create-downloadable-file-browser
- [S13] HCSS Safety product page — https://www.hcss.com/products/safety-toolbox-talks/ (help export doc unreachable; snippet-sourced)
- [S14] Cal/OSHA tailgate worksheet + setup guide (loop 2 direct fetches) — https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf · https://www.dir.ca.gov/dosh/dosh_publications/setup.pdf
- [S15] STO Building Group safety manual (snippet-sourced) — https://stobuildinggroup.com/wp-content/uploads/2014/01/2024-LF-Driscoll-Healthcare-Safety-Manual-1.pdf
- Loop 2 carry-overs (verified in that loop, cited here): Safesite Analysis/Score/Campaigns, Raken toolbox talks, HCSS, EcoOnline, SafetyCulture/Mitti, PRISM, SAIF, Cal/OSHA guide — see `.context/2026-11-24.safety-program-pulse/research/sources-program-pulse.md`.

**Unreachable this loop (marked, not dropped):** ecfr.gov (bot CAPTCHA → LII mirror used), help.hcss.com export article (Salesforce error), govt.westlaw.com §3203 (paywall → dir.ca.gov used), STO manual (snippet only).

<!-- Citation link definitions: bracketed [S#] markers above resolve to these URLs -->
[S1]: https://www.dir.ca.gov/title8/3203.html
[S2]: https://www.dir.ca.gov/dosh/policies-and-procedures/ch-13-enforcement-of-iipp.pdf
[S3]: https://www.law.cornell.edu/regulations/california/8-CCR-1509
[S4]: https://www.law.cornell.edu/cfr/text/29/1926.21
[S5]: https://www.law.cornell.edu/regulations/washington/WAC-296-155-110
[S6]: https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-001-0765
[S7]: https://help.rakenapp.com/en/articles/14465445-safety-and-compliance-reports-in-raken
[S8]: https://help.safesitehq.com/en/articles/5791595-safety-action-reports
[S9]: https://www.powerconstruction.net/sites/default/files/docs/Subcontractor%20Site%20Safety%20Requirements%20and%20Procedures.pdf
[S10]: https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Schemes/blob
[S11]: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
[S12]: https://blog.openreplay.com/create-downloadable-file-browser
[S12(loop2)]: https://www.prismrisk.gov/member-services/guidance-and-resource-library/risk-simplified/prism-risk-simplified/best-practices-for-tailgate-and-toolbox-safety-meetings?v=1.3
[S13]: https://www.hcss.com/products/safety-toolbox-talks/
[S14]: https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf
[S15]: https://stobuildinggroup.com/wp-content/uploads/2014/01/2024-LF-Driscoll-Healthcare-Safety-Manual-1.pdf
[repo]: ../../../app.js
