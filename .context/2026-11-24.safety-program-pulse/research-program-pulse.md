---
status: active
date: 2026-11-24
subject: 2026-11-24.safety-program-pulse
topics: [program dashboard, coverage, cadence, records review]
informs: [plan-safety-program-pulse.md]
---

# Research: Safety Program Pulse (program dashboard vs. smart-pick)

External research on what digital toolbox-talk products surface about a talk program's consistency and coverage, what authorities expect, and which change shape the evidence supports. Working notes: `research/notes-program-pulse.md`. Source list: `research/sources-program-pulse.md`.

## Findings

### Q1. What leading products actually surface to supervisors (concrete fields)

**Safesite** (safety management app, Foresight Insurance group) — the richest documented dashboard:
- A dedicated **Meetings Analysis page** with, verbatim from the help center: "Weekly Meeting Action % Complete" (a per-person heatmap of completed-vs-required weekly actions, hover shows "3/2" = 3 completed of 2 required, "No quota" if none assigned); "Conducted By" (pie by person); "Template Breakdown" ("a pie chart of meeting topics"); "Attendee Breakdown"; "Location Breakdown"; "Meeting Count by Day"; "Attendee Count by Day". Every chart supports date-range switching (7 / 14 / 30 days, last year, all time, custom). [s1]
- **Safesite Score**: a letter grade A–D "calculated daily to quantify your project member's safety engagement". Score factors: "Consistent Weekly Action Completion (High Impact)", "Maximizing Personnel Engagement (High Impact)", "Decay & Inactivity (Medium Impact) — Days with little to no activity will negatively impact your score", "Incomplete Safety Actions (Medium Impact)". Meetings guidance under the score: "Engage in regular safety meetings and maximize attendance". Plus dashboards and leaderboards "to see in real-time who is fulfilling their weekly actions requirement". [s2]
- **Safety Campaigns**: admin assigns meeting templates on daily/weekly/monthly/one-off schedules; supports **Rotating Templates** ("schedule templates and safety actions that change either day to day or week to week"); reminder emails at 7:00 AM project time "to users who have incomplete actions assigned", configurable per weekday, including "1 day before due date" for one-off actions. [s3]

**Raken** (daily-report app with safety module):
- Toolbox Talks tracked via three tabs: **Upcoming, Missed, Completed**. Verbatim: "Missed talks indicate a scheduled talk that was not completed on its due date. They remain on record as missed for compliance reporting purposes." Recurring schedules (daily, weekly, custom). Reports include "Toolbox talks (full record), Toolbox talks attendance, and Toolbox talks compliance." Attendance + digital signatures per talk. This is the clearest vendor implementation of "overdue/cadence alert" tracking. [s4]

**SafetyCulture / Mitti** (inspection-and-ops platform):
- "Automate scheduling and send timely notifications to keep teams informed"; "Track attendance and acknowledgement effortlessly"; "Keep a record of all toolbox talks in one accessible, secure place"; "Monitor the effectiveness of safety communications and make informed decisions with real-time analytics across multiple locations." Schedules "automate recurring work… inspections are automatically created at the frequency you set." No documented per-topic coverage view found. [s5][s6]

**HCSS HeavyJob Safety** (heavy-civil construction):
- "Scheduling tools allow managers to… set meeting agendas in advance"; "A full history of meetings is always available when you need to review stats or compliance"; automated attendance tracking with digital signatures and photos; per-crew content assignment (e.g., paving crew gets asphalt/traffic talks). No documented coverage-balance or recommendation feature. [s7]

**EcoOnline (eCompliance)**:
- "Schedule recurring or ad-hoc meetings. Drive your participation score and benchmark vs. top quartile organizations." Features: custom dashboards; "See all of your company's meeting history and data in five clicks or less"; "Report on meeting themes over time and across the workforce"; per-employee training/certification breakdown. Participation scoring benchmarked across customers, not per-topic coverage. [s8]

**Safetymint**: no documented toolbox-talk dashboard was found in the pages reviewed; its content pages recommend monthly meetings and note "Many companies have a 'Safety Topic of the Month' program". [s9]

**TailgateDocs**: not a program tracker. It is a document generator (AI site-specific safety plans, JHAs) plus one-time kits — "Toolbox Talk Year Pack: 52 toolbox talks in English and Spanish, a crew sign-in sheet after each one." No dashboard, tracking, or history feature. [s10]

**Summary of the industry-standard field set**: count of talks (by day/week/month, by person), attendance/participation, topic/template breakdown, meeting-history list, scheduled vs missed/overdue state, weekly cadence quota completion, engagement scoring with inactivity decay, and reminder notifications for due actions. Every serious product implements some of these; Safesite and Raken document nearly all of them. Category-level "delivered vs never delivered" coverage tracking is **not** a standard vendor field — the only official artifact implementing it is Cal/OSHA's paper worksheet (see Q3).

### Q2. Authoritative frequency benchmarks (mandates vs. recommendations)

Mandates (law):
- **Cal/OSHA 8 CCR §1509(e)** (construction): "Supervisory employees shall conduct 'toolbox' or 'tailgate' safety meetings, or equivalent, with their crews **at least every 10 working days** to emphasize safety." [s11]
- **Cal/OSHA 8 CCR §8406** (tunneling): meetings at least weekly (as summarized by Cal/OSHA's guide and PRISM: "at least weekly on the job… Records of all meetings shall be kept, stating the meeting date, time, personnel present, subjects discussed, and corrective actions taken"). [s25][s12]
- **Washington WAC 296-155-110(5)** (construction): "You must hold crew leader-crew safety meetings **at the beginning of each job, and at least weekly thereafter**," must document attendance and subjects discussed, and "(8) You must retain minutes… for at least one year and you must make them available for review by personnel of the department, upon request." [s13]
- **Washington WAC 296-307-033** (agriculture): foreman-crew safety meetings "**at least monthly**", minutes documenting subjects and attendance, retained one year and shown to L&I on request. WA L&I's publication F417-043-000 notes businesses with ≤10 employees are required to hold safety meetings. [s14][s15]
- **Oregon OAR 437-001-0765** + plain-language guide: every Oregon employer (barring narrow exceptions) must have a safety committee or hold safety meetings; for meetings: "If you have construction workers: Meet **at least monthly** and meet before the start of each job that lasts more than one week. …All other employers: Meet at least monthly." Construction/utility/manufacturing must keep minutes **three years** (date, attendees, hazards discussed). [s16][s17]

Recommendations (state programs and insurers, not law):
- **Cal/OSHA consultation guide** (Jan 2020, "Setting up a Tailgate/Toolbox Safety Meeting"): after stating the 10-working-day/weekly mandates — "depending on the work conditions and safety culture of the job site, they should be held more frequently – **even daily if necessary**." Also: keep it 10–15 minutes, and "Document/record the meeting topic, date, attendees, and any actions taken." [s25]
- **PRISM** (Public Risk Innovation, Solutions, and Management — California public-entity risk pool): "PRISM also recommends that agencies… conduct a **daily 5 to 10 minute safety briefing** with employees at the start of each shift", weekly meetings "very in-depth", and — "through consultation with Cal/OSHA" — retention of all documentation "for at least 3 years or longer." [s12]
- **SAIF** (Oregon's workers' comp insurer): publishes a **monthly talking-points calendar** ("Need an idea for your safety meeting? We regularly post a new topic") with seasonally rotated topics (e.g., "I like to feature certain topics on related months, like Ladder Safety Month in March"). This is an insurer-normalized monthly topic cadence, explicitly a content suggestion, not a mandate. [s18]
- Federal OSHA: none of the state-program sources above cite any federal frequency mandate for general toolbox talks; every frequency rule found is state-level (Cal, WA, OR). Weekly is the construction-sector norm in CA/WA practice; monthly is the general-industry/agriculture norm.

### Q3. Coverage / rotation guidance

- **Cal/OSHA "Tailgate/Toolbox Topics" worksheet** (July 2020): "Use this worksheet to **select topics for tailgate meetings and to track meeting dates**." It is literally a two-column grid of ~60 construction topics (Access, Asbestos, Confined Spaces, Excavation, Fall Protection, Heat Illness Prevention, …, "Other ___") each with a blank **Date** cell, plus the instruction: "Complete a separate record for each meeting that includes workers' names, date, subject(s), and the name of the supervisor who conducted the meeting." This is the only official artifact found that implements topic-coverage tracking — and its shape (topic + last-delivered date, filled over time so gaps become visible) is exactly a delivered-vs-never-delivered ledger. [s19]
- **Safesite Rotating Templates**: "Build out several weeks of top priority themes for your industry to **ensure your team rotates through the appropriate safety topics**" — vendor rotation by pre-configuration, not by analyzing delivered history. [s3]
- **SAIF talking points**: monthly seasonal rotation ("feature certain topics on related months") — editorial guidance, not tracking. [s18]
- **PRISM**: topic selection should follow current job-site hazards; "A separate sign-in sheet should be used for each time a safety meeting is conducted **and for each topic that is discussed**." [s12]
- No authority found that mandates topic-coverage accounting or bans repetition; rotation is presented as best practice (relevant-to-work first), and tracking is provided as a worksheet/tool, not a requirement. [s19][s25]

### Q4. Records review: what Cal §3203(b)(2)-style compliance expects

- **8 CCR §3203(b)(2)** (the record spec): "Documentation of safety and health training required by subsection (a)(7) **for each employee, including employee name or other identifier, training dates, type(s) of training, and training providers.** This documentation shall be maintained for at least one (1) year." Toolbox/tailgate meetings are the recognized vehicle for such training in construction (§1509) and reinforce IIPP training generally (Cal/OSHA guide). [s20][s25]
  - Consequence: the record data model regulators name is exactly {person, date, type/topic} — the fields needed to sort/filter a log by attendee, date, and topic for gap analysis (who has not received which topic). The regulation does not use the phrase "gap analysis"; the fields it mandates are what make it possible, and per-employee phrasing ("for each employee") presupposes person-level reviewability.
- **Meeting-specific record fields** named by authorities: Cal/OSHA guide — "the meeting **topic, date, attendees, and any actions taken**"; §8406 (via PRISM) — "meeting date, time, personnel present, subjects discussed, and corrective actions taken… maintained for inspection by the Division"; WA construction — minutes with documented attendance and subjects, retained ≥1 year, "made available for review by personnel of the department, upon request"; Oregon — minutes kept 3 years (construction/utility/manufacturing) including date, attendees, hazards discussed, and made available to employees. [s25][s12][s13][s17]
- **Audit/consultant posture**: PRISM (a risk pool working with Cal/OSHA consultation) frames retention as "ensure… the required documentation to present to Cal/OSHA **if a request for documentation is made**" and recommends 3 years. Oregon's rule requires minutes "make available to all employees" — records are expected to be reviewable by third parties, not merely stored. [s12][s17]
- No source reviewed requires sortability by any particular key; all of them enumerate exactly the fields (person/date/topic/attendees) that a printable sign-off sheet already captures. A digital log whose entries carry those fields satisfies the letter; surfacing per-category and per-employee coverage is the value-add auditors' field lists imply but never state.

### Q5. Evidence on "days since last" nudges / streaks improving consistency

Label: **weak/adjacent-domain evidence only; no direct safety-meeting study found.**
- **Streak mechanics (controlled experiments, non-safety tasks)**: Mehr, Silverman, Sharif, Barasch & Milkman (2025), *Organizational Behavior and Human Decision Processes* 187:104391 — six pre-registered experiments (N=4,504): "people actually complete more work when compensated with streak incentives than with larger, stable incentives", the effect driven by **consecutive** completion boosting goal commitment. Related earlier work (Silverman & Barasch 2023, "Hot streak!…", OBHDP 179) finds people infer goal adherence from streaks, and people continue a logged behavior more when shown an intact (vs. broken) streak of logging it (cited within the 2025 paper). [s21][s22]
- **Workplace nudge field experiment (compliance behavior)**: a workplace field experiment on COVID-19 guidance compliance (*Behavioural Public Policy*) found "All effects of our interventions are short-term… Our findings thus provide **at most weak support**" for typical behavioral interventions sustaining compliance. [s23]
- **Vendor-adopted mechanics (no published outcome study)**: Safesite operationalizes the same psychology — weekly completion quotas, leaderboards, inactivity decay lowering the score, 7 AM reminder emails — and Raken's Missed tab makes lapses visible; neither (nor any source reviewed) publishes measured effect of these on talk consistency. [s2][s3][s4]
- Bottom line: there is experimental support that streak/consistency feedback raises persistence on work tasks generally, and field evidence that simple nudges decay; **no evidence found specific to safety-meeting cadence**. Any "days since last talk" cue should be presented as a proven-format surface (recency + gap visibility) without claiming measured safety outcomes.

### Q6. "Recommended next topic" / smart-pick features

- **SALUS** is the one documented AI picker: its AI assistant Rosie is marketed with the prompt "**Generate six toolbox talks from last week's near misses**", and "Rosie turns a near miss into a toolbox talk" — i.e., recommend/generate topics from site incidents and context (LLM-based, human-approved). [s24][s8]
- **Safesite**: rotation is **human-configured** — admins pre-build campaigns of themed templates that cycle day/week; the system enforces completion, it does not choose the next topic from delivered history. [s3]
- **Raken**: scheduling + a large topic library; convenience ordering ("talks you've previously presented appear at the top for easy repeat use") — recency, not coverage-driven recommendation. [s4]
- **HCSS**: content is pushed to crews by job/hazard — human-targeted assignment. [s7]
- **SafetyCulture/Mitti**: schedule + template automation; no evidence of a recommendation engine. [s5][s6]
- **Cal/OSHA worksheet**: manual pick, then record the date — the authoritative workflow is *track first, pick manually*. [s19]
- Conclusion: smart-pick exists only as (a) incident-driven AI generation (SALUS) or (b) admin-curated rotation (Safesite). **No product reviewed implements a deterministic never-delivered-first / category-rotation recommender over its own delivery log** — that is an open gap, but it sits on top of the tracking layer rather than replacing it.

## Recommendation

**Build the Safety Program Pulse dashboard first; fold in a lightweight, deterministic coverage-aware "suggested next topic" as part of the same surface — do not build a standalone smart-pick engine.**

Rationale, in order of weight:
1. **The dashboard fields are industry-standard and authority-shaped.** Counts by period, last-delivered recency, missed/overdue state, per-topic/per-category delivered-vs-never coverage, and a recent-deliveries list are exactly what Safesite, Raken, HCSS, EcoOnline, and SafetyCulture surface, and exactly the fields regulators enumerate (§3203(b)(2): person/date/type; Cal/OSHA guide: topic/date/attendees/actions; worksheet: topic+date ledger). Shipping them aligns SafetyTopic with both product convention and record compliance. [s1][s4][s20][s19]
2. **Coverage tracking has an official template to mirror.** Cal/OSHA's worksheet (topic | date) legitimizes "per-category coverage with oldest-neglected surfaced" as the core pulse metric; no compliance or vendor evidence supports a more complex algorithmic picker. [s19]
3. **Cadence cues should be recency-based, not streak-gamified.** The mandate floor is "at least every 10 working days" (CA construction) or weekly/monthly elsewhere; a "days since last recorded talk" line with the applicable benchmark states the fact regulators and insurers care about. Streak incentives raise persistence in adjacent lab domains but have no safety-meeting evidence, and workplace nudges show short-lived effects — so present a plain cadence indicator, not a streak reward. [s11][s13][s21][s23]
4. **A suggested-next-topic is cheap once the log exists, and fills a real gap** (no product does never-delivered-first over delivered history; SALUS's version needs an LLM and incident feed, Safesite's needs campaign setup). Deriving it deterministically from the same `meetingLog` (never-delivered first, then least-recently-delivered category, then relevance) is a small, honest feature — offered as a suggestion the supervisor can ignore, consistent with the worksheet's manual-pick workflow. It should ship **with or after** the dashboard, never instead of it, because a picker without visible history is unaccountable and every authority artifact starts from the record, not the recommendation.

**Verdict: dashboard-first, with the coverage ledger as its centerpiece and a deterministic "suggested next topic" as an attached nudge — "both," weighted decisively toward the dashboard.**

## Open questions

- Does Safesite's "Safesite Score" formula weight meetings specifically vs. other action types (exact weights unpublished)? Only factor names are documented. [s2]
- No source quantifies the effectiveness of "days since last" cues on safety-meeting cadence specifically; if the orchestrator wants proof before shipping the cadence line, none exists publicly — it must be accepted as a convention (Cal/OSHA 10-working-day floor) rather than an evidence-backed intervention. [s11][s21]
- Cal/OSHA §8406 exact current text was reviewed only via Cal/OSHA's own guide and PRISM summaries, not the full CCR section; the weekly-frequency and record-fields quotes are consistent across both secondary official/adjacent sources. [s25][s12]
- Whether any product computes "category coverage" internally without documenting it (help centers may lag); reviewed documentation shows none.

[s1]: https://help.safesitehq.com/en/articles/2807748-analysis-pages
[s2]: https://help.safesitehq.com/en/articles/2944524-understanding-the-safesite-score
[s3]: http://help.safesitehq.com/en/articles/5509753-safety-campaigns-management
[s4]: https://help.rakenapp.com/en/articles/14491655-how-to-use-toolbox-talks-in-raken
[s5]: https://mitti.com/safety-and-compliance/toolbox-talks-software
[s6]: https://help.safetyculture.com/003102
[s7]: https://www.hcss.com/products/safety-toolbox-talks/
[s8]: https://www.ecoonline.com/en-us/ehs-software/safety-management-software/toolbox-talks/
[s9]: https://www.safetymint.com/safety-meeting.htm
[s10]: https://tailgatedocs.com/
[s11]: https://www.law.cornell.edu/regulations/california/8-CCR-1509
[s12]: https://www.prismrisk.gov/member-services/guidance-and-resource-library/risk-simplified/prism-risk-simplified/best-practices-for-tailgate-and-toolbox-safety-meetings?v=1.3
[s13]: https://www.law.cornell.edu/regulations/washington/WAC-296-155-110
[s14]: https://www.law.cornell.edu/regulations/washington/WAC-296-307-033
[s15]: https://lni.wa.gov/forms-publications/F417-043-000.pdf
[s16]: https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-001-0765
[s17]: https://osha.oregon.gov/OSHAPubs/0989.pdf
[s18]: https://www.saif.com/safety-and-health/talking-points.html
[s19]: https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf
[s20]: https://www.law.cornell.edu/regulations/california/8-CCR-3203
[s21]: https://www.jackiesilverman.com/_files/ugd/0399b5_69f88d44bf754ab08833b42e9c7b9c95.pdf
[s22]: https://ideas.repec.org/a/eee/jobhdp/v179y2023ics0749597823000572.html
[s23]: https://www.cambridge.org/core/journals/behavioural-public-policy/article/improving-compliance-with-covid19-guidance-a-workplace-field-experiment/CEB31F452281FBC82035C70658C774BD
[s24]: https://www.salussafety.io/
[s25]: https://www.dir.ca.gov/dosh/dosh_publications/setup.pdf
