# Sources: browse-delivery-status (loop 4)

All primary sources fetched fresh on 2026-11-24 (read tool / reader markdown unless noted). Prior-loop citations re-verified this loop are marked "re-verified 2026-11-24". Loop-2/3 carry-over findings used without re-fetch are marked as such.

## S1 — Cal/OSHA, *Tailgate/Toolbox Topics* worksheet (July 2020)
https://www.dir.ca.gov/dosh/dosh_publications/Tailgate-Toolbox-Topics.pdf (PDF fetched and text-extracted 2026-11-24)

The central primary source: the official California selection+tracking artifact.

Verbatim:
> "Use this worksheet to select topics for tailgate meetings and to track meeting dates. Be sure to choose topics that are relevant to your worksite. Complete a separate record for each meeting that includes workers' names, date, subject(s), and the name of the supervisor who conducted the meeting."

Structure (verified from the extracted text): two-column grid of ~60 construction topics — "Access", "Excavation, Trenches, and Earthwork", "Fall Protection", "Scaffolds", "Silica Dust", "Roofing Safety – Slips & Falls", "Electrical", "Heat Illness Prevention", "Ladders", … — each with a blank **Date** cell, plus "Other ____" rows.

> "Section 1509 (construction) requires tailgate/toolbox meetings at least every 10 working days and section 8406 (tunneling) requires them at least weekly. However, depending on the work conditions and safety culture of the job-site, they may be held more frequently if necessary."

Relevance: the official shape is a per-topic ledger on a topic list, used at selection time — the browse-page feature's direct analog. Its topic list also seeds the candidate-2 (construction content) future loop.

## S2 — Cal/OSHA 8 CCR §3203 (official DIR text)
https://www.dir.ca.gov/title8/3203.html (fetched 2026-11-24; re-verification of loop-3 citation)

Verbatim, §3203(b)(2):
> "(2) Documentation of safety and health training required by subsection (a)(7) for each employee, including employee name or other identifier, training dates, type(s) of training, and training providers. This documentation shall be maintained for at least one (1) year."

Also relevant, §3203(a)(3) names "meetings, training programs, posting…" as compliant communication mechanisms — tailgate talks are the recognized construction vehicle (via §1509(a) → §3203).

Relevance: the log fields (`topicId`, `date`) are the digital kernel of the mandated fields; per-topic status is a review of those fields. Names stay on the paper sheets (candidate-3 kill rationale unchanged).

## S3 — Cal/OSHA 8 CCR §1509 (Cornell LII)
https://www.law.cornell.edu/regulations/california/8-CCR-1509 (fetched 2026-11-24)

Verbatim, §1509(e):
> "Supervisory employees shall conduct 'toolbox' or 'tailgate' safety meetings, or equivalent, with their crews at least every 10 working days to emphasize safety."

And §1509(a) ties construction to the IIPP:
> "Every employer shall establish, implement and maintain an effective Injury and Illness Prevention Program in accordance with section 3203 of the General Industry Safety Orders."

Relevance: sets the delivery cadence context (weekly-to-biweekly in CA construction) that makes selection-with-knowledge a recurring weekly task rather than a one-off.

## S4 — Raken Help Center, "How to Use Toolbox Talks in Raken" (updated August 21, 2026)
https://help.rakenapp.com/en/articles/14491655-how-to-use-toolbox-talks-in-raken (fetched 2026-11-24; re-verification of loop-2 citation)

Verbatim (the library-surface behavior):
> "To access the full library when starting a talk, search by keyword or scroll through all available topics. The library tab shows Raken's built-in content; talks you've previously presented appear at the top for easy repeat use."

Verbatim (status tracking):
> "Use the **Upcoming**, **Missed**, and **Completed** tabs to monitor the status of all talks on your project. Missed talks indicate a scheduled talk that was not completed on its due date."

Also: "Toolbox Talks require the **Performance Plan**." (paid feature); library includes "Raken's full built-in library covering hundreds of safety topics in English and Spanish."

Relevance: competitor parity evidence — a delivery-aware library is shipped vendor behavior at the topic-selection moment. Note the convention difference: Raken orders by *recency convenience*; this loop's sort orders by *coverage neglect* (never-delivered first), extending the app's own loop-2 suggestion convention.

## S5 — Safesite Help Center, "Safety Campaigns Management" (updated August 25, 2025)
http://help.safesitehq.com/en/articles/5509753-safety-campaigns-management (fetched 2026-11-24; re-verification of loop-2 citation)

Verbatim (Rotating Templates):
> "If you are scheduling Campaigns that repeat daily or weekly, you can schedule templates and safety actions that change either day to day or week to week. This feature is great for safety plans in which personnel need to complete different toolbox talks (meeting templates) or inspections on specific days or weeks."

Verbatim (rotation goal):
> "Build out several weeks of top priority themes for your industry to ensure your team rotates through the appropriate safety topics."

Relevance: rotation/variety is explicit vendor best practice, but Safesite implements it by *pre-configuration*, not by deriving from delivered history. Zero-dependency equivalent = surface the log-derived status where selection happens.

## S6 — OSHA Fall Prevention Campaign (osha.gov/stop-falls)
https://www.osha.gov/stop-falls (fetched 2026-11-24)

Verbatim:
> "FALLS ARE THE LEADING CAUSE OF DEATH IN CONSTRUCTION. In 2024, there were 389 fatal falls to a lower level out of 1,034 construction fatalities (BLS data). These deaths are preventable."

Relevance: steelman evidence for candidate 2 (content expansion) — the catalog lacks any dedicated fall-protection topic while targeting construction supervisors. Recorded as a recommended future loop, not this loop. Companion stat from OSHA's construction falls eTool (loop 2-adjacent search result, 2026-11-24): "Falls from elevation account for one third of all deaths in construction" (http://www.osha.gov/etools/construction/falls).

## S7 — 29 CFR 1926.21, Safety training and education (Cornell LII)
https://www.law.cornell.edu/cfr/text/29/1926.21 (fetched 2026-11-24)

Verbatim, §1926.21(b)(2):
> "The employer shall instruct each employee in the recognition and avoidance of unsafe conditions and the regulations applicable to his work environment to control or eliminate any hazards or other exposure to illness or injury."

Relevance: federal floor is an instruction duty with no recordkeeping/retention requirement — toolbox-talk recordkeeping is a state-plan (CA/WA/OR) and contractual matter, as established in loop 3. Bounds what the feature may honestly claim.

## S8 — SAIF, "Workplace safety meeting topics" (talking points calendar)
https://www.saif.com/safety-and-health/talking-points.html (fetched 2026-11-24; re-verification of loop-2 citation)

Verbatim:
> "Need an idea for your safety meeting? We regularly post a new topic."

(Oregon workers'-comp insurer's monthly editorial topic rotation — currently posting monthly topics, e.g., November 2026 "Take a pause", October 2026 "Rain is on its way".)

Relevance: rotation as insurer-normalized editorial practice; content variety is a *practice*, not a mandate — supports both candidate-2's future relevance and this loop's gap-visibility framing.

## Carry-over citations (not re-fetched this loop; verified in their loops)

- Cal/OSHA Compliance Manual Ch. 13 (Form 1AY; "Is there a sign-in sheet?") — https://www.dir.ca.gov/dosh/policies-and-procedures/ch-13-enforcement-of-iipp.pdf [loop 3]
- Cal/OSHA tailgate setup guide ("Document/record the meeting topic, date, attendees…") — https://www.dir.ca.gov/dosh/dosh_publications/setup.pdf [loop 2]
- WAC 296-155-110 (WA construction weekly meetings; produce-on-request minutes) — https://www.law.cornell.edu/regulations/washington/WAC-296-155-110 [loops 2-3]
- OAR 437-001-0765 (OR monthly meetings; 3-year retention) — https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-001-0765 [loops 2-3]
- HCSS Safety, SafetyCulture/Mitti, EcoOnline, PRISM (program-surface and rotation context) — see `.context/2026-11-24.safety-program-pulse/research/sources-program-pulse.md` [loop 2]

## Unreachable this loop

None. All load-bearing sources fetched successfully; ecfr.gov avoided in favor of the Cornell LII mirror (loop-3 precedent).
