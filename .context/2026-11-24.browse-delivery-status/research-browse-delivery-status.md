---
status: active
date: 2026-11-24
subject: 2026-11-24.browse-delivery-status
topics: [browse page, per-topic delivery status, topic selection, rotation, worksheet analog]
informs: [plan-browse-delivery-status.md]
priority: high
---

# Research: Browse-page per-topic delivery status (loop 4)

Decision research for loop 4 of the one-major-change-per-loop program. Working notes: `research/notes-browse-delivery-status.md`. Source list with verbatim excerpts: `research/sources-browse-delivery-status.md`.

## Decision

**Build the delivery-aware Browse library: surface per-topic delivery status (times delivered, last-delivered date, never-delivered marker) on `browse.html`, with status-based filtering and neglect ordering — making the Browse page the working digital equivalent of Cal/OSHA's official tailgate worksheet (topic grid + date cells, used at the moment of selecting the next talk).**

This is the deferred backlog item, deliberately *broadened* beyond its original "date + marker" framing into a selection-moment feature. It completes the app's core loop: record (loop 1) → review (loop 2) → produce (loop 3) → **select with knowledge** (loop 4). Today every app surface knows the program record except the one where a supervisor actually picks a talk.

## Why this change (evidence, weight-ordered)

1. **The official artifact is exactly this shape.** Cal/OSHA's *Tailgate/Toolbox Topics* worksheet (July 2020) instructs: "Use this worksheet to **select topics** for tailgate meetings and to **track meeting dates**. Be sure to choose topics that are relevant to your worksite." It is a two-column grid of ~60 construction topics, each with a blank **Date** cell to fill in over time. The worksheet fuses topic selection and delivery-date tracking into one surface — which is precisely what a delivery-aware Browse page is. No other candidate has a direct official-artifact analog. [S1]
2. **The record fields regulators name make the status computable and reviewable.** §3203(b)(2): training documentation per employee includes "training dates, type(s) of training" (this app's `meetingLog` = `{topicId, date}`). The worksheet's per-topic date grid presupposes a supervisor reviews which topics are still blank — never-delivered topics are the visible gaps. Surfacing per-topic status from the log the app already keeps is the digital form of that review. [S2]
3. **Competitor library surfaces carry delivery history into selection.** Raken (verified fresh): "The library tab shows Raken's built-in content; **talks you've previously presented appear at the top** for easy repeat use," plus Upcoming/Missed/Completed tabs for talk status. Safesite (verified fresh) makes rotation an explicit goal: "Build out several weeks of top priority themes for your industry to **ensure your team rotates through the appropriate safety topics**" — but rotation there is *admin-preconfigured*, not history-derived. A deterministic, log-driven status surface is the zero-dependency equivalent; note our neglect ordering extends the *coverage-driven* convention loop 2 established (never-delivered first) rather than Raken's convenience-recency. [S4][S3]
4. **It is the last blind spot, and it carries real code debt.** `browse.html` today renders only `✓ Used N×` from the legacy `usedTopics` count store — read with a silent `catch (_) {}` that contradicts AGENTS.md's defensive-coding rule (the exact anti-pattern loop 1 eliminated in `app.js`). It never reads `meetingLog`: no dates, no never-delivered marker, and its counts can diverge from the program record (pre-log usage). Fixing the read and joining the log is necessary maintenance riding on a real feature, not a cosmetic add-on.
5. **Not a duplicate of Pulse/Report.** Pulse is category-level review plus a single deterministic suggestion on the main page; the Report is program-level output. The Browse surface is topic-level, on the library page, under the supervisor's control, at the choosing moment. Loop 3's research explicitly judged this item real but "too small" *as then scoped* and said it "can ride along in a later loop" — this is that loop, and the filtering/sorting scope is what makes it a layer rather than a label.

## Candidate pool evaluation

### Candidate 1 — Browse per-topic delivery status ✅ SELECTED
See decision above. Honest limitation recorded: this is the smallest surviving candidate. Its claim to "major" is not engineering size but position: it is the final unbuilt layer of the app's core loop (selection), backed by the only official artifact (the worksheet) that matches a candidate's shape one-to-one. The broadened scope (status filter + neglect sort + data-join + defensive-read fix) is a behavior change with design surface, not a badge swap.

### Candidate 2 — Topic content expansion ⚠️ STRONGEST ALTERNATIVE — deferred, not killed
The steelman is real and verified: OSHA states "**FALLS ARE THE LEADING CAUSE OF DEATH IN CONSTRUCTION**. In 2024, there were 389 fatal falls to a lower level out of 1,034 construction fatalities (BLS data). **These deaths are preventable**" — yet SafetyTopic's 50-topic catalog contains **no** dedicated Fall Protection, Scaffolds, Excavation/Trenching, Struck-By, or Caught-In/Between topics and a single Electrical basics topic, while its compliance framing (§1509 construction tailgate meetings; WA WAC 296-155 construction weekly meetings) targets construction supervisors. The Cal/OSHA worksheet's own topic list is dominated by construction hazards the catalog lacks (Fall Protection, Scaffolds, Excavation/Trenches/Earthwork, Silica Dust, Roofing Safety). At the CA/WA weekly-to-10-working-day cadence, 50 topics exhaust never-delivered novelty in roughly one year, after which the suggestion engine repeats the oldest. Practitioner norm confirms rotation through a bounded topic set ("20 topics to rotate through" — dailybuild; SAIF's monthly editorial topic calendar).
**Why not now:** (a) it is content, not capability — it builds no new layer, interaction, or behavior, and blast radius is large (README/CHANGELOG market "50 topics across 10 categories"; coverage ledgers, test fixtures, and marketed counts all shift); (b) every topic requires verified public-domain sourcing and attribution per AGENTS.md topic rules — a heavy authoring/verification task where quality risk is the dominant cost; (c) loop 2's competitor review found content is not where products differentiate on this app's axis — Raken ships "hundreds of safety topics," and bundled library scale is table stakes, whereas the record→review→produce→select pipeline is SafetyTopic's differentiator; (d) the repetition problem candidate 2 would relieve is a *selection-moment* problem first — candidate 1 makes rotation visible and is a prerequisite for getting value from any added topics. **Recommended follow-up loop** (recorded for backlog): construction-critical expansion seeded from the worksheet/OSHA Focus Four (Fall Protection, Scaffolds, Excavation & Trenching, Struck-By/Caught-In, Electrical work, Silica), with per-topic source verification as its own gated step. [S6][S1][S5]

### Candidate 3 — Presenter/attendee capture ❌ KILLED (settled decision)
Loop 3 explicitly deferred this: attendee names stay on the printed Safety Talk Records (PII in localStorage). §3203(b)(2)'s "employee name or other identifier" is satisfied by the filed sheets — Cal/OSHA's own inspection probe is "Is there a sign-in sheet?" — and the Program Report already carries the honest footer pointing to them. No new evidence; re-opening would re-litigate a settled decision. [S2][loop-3 research]

### Candidate 4 — Scheduling/cadence reminders ❌ KILLED (killed twice already)
Loop 2 shipped a plain recency cue and rejected gamified/streak nudges on weak adjacent-domain evidence; loop 3 declined to reopen it. Raken/Safesite scheduling presumes an assignment/notifications engine — an architecture inversion for a zero-dependency static site. No new evidence. [loop-2/3 research][S4]

## Key correction to the backlog item's premise

The backlog says "reusing `computeProgramStats`." Verified against `app.js:565-671`: `computeProgramStats` computes **category-level** coverage (delivered sets keyed by category, category last-dates) and does not expose per-topic delivery counts or dates. The implementation needs a sibling pure helper (e.g., a per-topic delivery index over the log) reusing its conventions — `PULSE_ISO_DATE_RE` guarding, defensive input handling, non-mutation — rather than a direct call. The convention to preserve (from `suggestNextTopic`): any log entry counts an id as "delivered" even if its date is malformed; a malformed date renders no date label.

## Proposed scope outline (for plan stage)

**In scope**
- Read `meetingLog` (in addition to `usedTopics`) on `browse.html`; derive per-topic status: delivery count (log entries per topicId), last-delivered ISO date, never-delivered flag (zero log entries).
- Per-row status display: "Never delivered" marker; "Last delivered: YYYY-MM-DD"; delivered-times label — factual, no compliance verdicts or streak language. Coexistence with the existing `✓ Used N×` count defined in plan (two-store reality documented; count source decided once, with backward-compat tests).
- Status filter (never-delivered only) and/or neglect sort (oldest last-delivered first, mirroring `suggestNextTopic`'s deterministic ordering and tie-breaks), composable with existing keyword search and category groups.
- New shared pure helper in a plain-script file loadable by `browse.html`, `index.html`, and Vitest (no modules/bundlers — file:// and GitHub Pages compatible), JSDoc'd, defensive, non-mutating, with Pulse-consistent malformed-data rules.
- Replace `browse.html`'s silent `catch (_) {}` localStorage reads with `console.warn` fallbacks (AGENTS.md defensive rule), page still functional without localStorage.
- Vitest tests: helper semantics (counts, last date, never-delivered, malformed/unknown handling, empty log), filter/sort determinism, two-store coexistence.

**Out of scope**
- No new topics or content edits (candidate 2 → recommended future loop with worksheet/Focus Four seed list).
- No presenter/attendee capture; no scheduling/reminders; no compliance verdicts or streak/gamification language.
- No changes to index.html behavior, Pulse, Report, sign-off sheet, or storage schema (read-only join over existing stores).
- No per-topic delivery history listing on Browse (full history remains the Program Report's job).

## Candidate acceptance criteria (for plan stage to refine)

1. Each `browse.html` topic row shows delivery status derived from `meetingLog`: a never-delivered marker when the id has zero log entries; "Last delivered: <ISO date>" and a delivered-count label otherwise; state correct after reload from restored localStorage.
2. Status filter shows exactly the topics with zero log entries when selected; neglect sort orders by oldest last-delivered first with documented deterministic tie-breaks (never-delivered before delivered; category/id tie-break consistent with `suggestNextTopic`); works together with keyword search and category grouping without state conflicts.
3. Malformed log data never breaks the page: non-string topicIds skipped; entries with non-ISO dates count as delivered but render no date (warned per app conventions); empty log renders every topic as never-delivered; missing/failed localStorage degrades to an empty-status page with a console warning, never a crash.
4. `browse.html` no longer swallows localStorage errors silently (console.warn, matching app.js), and renders fully when localStorage is unavailable (file:// privacy modes).
5. Existing browse behaviors unchanged: keyword search, deep links back into the app (`index.html#<id>`), hero counts, category grouping; zero new dependencies; static-site/file:// compatibility preserved.
6. All existing tests pass; new tests cover the helper and status/filter/sort semantics with per-test localStorage isolation.

## Open questions for plan stage

1. Count display: keep legacy `usedTopics` count beside log-derived delivery status, or switch the count to log-derived (and what that means for pre-log usage)? Decide once, with tests; both stores stay read-only this loop.
2. Shared-helper placement: new plain script (e.g., `delivery-data.js`) loaded by both pages, vs. duplication in browse's inline script with a `window.__safetyTopicBrowse` test harness — weigh file:// compatibility (plain global, no ES modules) against app.js harness patterns.
3. One control or two: a single status select (All / Never delivered / Oldest first) vs. separate filter + sort — pick the smallest deterministic UX that satisfies criteria 2.
4. Visual treatment of the never-delivered marker and last-delivered line within the existing `row-meta` pattern, WCAG AA contrast (per the loop-2 review precedent).

## Sources (load-bearing)

- [S1] Cal/OSHA, *Tailgate/Toolbox Topics* worksheet (July 2020) — https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf
- [S2] Cal/OSHA 8 CCR §3203(b)(2) — https://www.dir.ca.gov/title8/3203.html
- [S3] Cal/OSHA 8 CCR §1509(e) — https://www.law.cornell.edu/regulations/california/8-CCR-1509
- [S4] Raken Help Center, How to Use Toolbox Talks in Raken (updated Aug 21, 2026) — https://help.rakenapp.com/en/articles/14491655-how-to-use-toolbox-talks-in-raken
- [S5] Safesite Help Center, Safety Campaigns Management (updated Aug 25, 2025) — http://help.safesitehq.com/en/articles/5509753-safety-campaigns-management
- [S6] OSHA Fall Prevention Campaign — https://www.osha.gov/stop-falls
- [S7] 29 CFR 1926.21(b)(2) — https://www.law.cornell.edu/cfr/text/29/1926.21
- [S8] SAIF Workplace safety meeting topics — https://www.saif.com/safety-and-health/talking-points.html

Full excerpts and provenance: `research/sources-browse-delivery-status.md`.

<!-- Citation link definitions: bracketed [S#] markers above resolve to these URLs -->
[S1]: https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf
[S2]: https://www.dir.ca.gov/title8/3203.html
[S3]: https://www.law.cornell.edu/regulations/california/8-CCR-1509
[S4]: https://help.rakenapp.com/en/articles/14491655-how-to-use-toolbox-talks-in-raken
[S5]: http://help.safesitehq.com/en/articles/5509753-safety-campaigns-management
[S6]: https://www.osha.gov/stop-falls
[S7]: https://www.law.cornell.edu/cfr/text/29/1926.21
[S8]: https://www.saif.com/safety-and-health/talking-points.html
[loop-3 research]: ../2026-11-24.safety-program-report/research-program-report.md
[loop-2/3 research]: ../2026-11-24.safety-program-pulse/research-program-pulse.md
