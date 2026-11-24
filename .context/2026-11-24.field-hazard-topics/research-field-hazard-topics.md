---
status: active
date: 2026-11-24
subject: 2026-11-24.field-hazard-topics
topics: [fall protection, scaffolds, trenching, focus four, struck-by, caught-in, electrical, lockout tagout, machine guarding, aerial lifts]
informs: [plan-field-hazard-topics.md]
---

# Research: Field/Construction Hazard Topics (loop 5)

Verifies the construction-content gap against primary OSHA/BLS sources (all fetched 2026-11-24; see `research/sources-field-hazard-topics.md` for [S#] citations), compares change candidates, and specifies the chosen change at build-ready detail. Working notes: `research/notes-field-hazard-topics.md`.

## Findings

### Q1. The gap is real and significant (primary-source verified)

- **Catalog gap (repo, grepped):** 50 topics, 10 categories. Zero topics for fall protection, scaffolds, trenching/excavation, struck-by, caught-in/between, machine guarding, lockout/tagout, power tools, aerial lifts, or cranes. Closest neighbors are `ladder-safety` and `electricity-general` — generic, not jobsite-focused.
- **Scale of the hazard (OSHA):** "FALLS ARE THE LEADING CAUSE OF DEATH IN CONSTRUCTION. In 2024, there were 389 fatal falls to a lower level out of 1,034 construction fatalities (BLS data)" [S1]. BLS 2024 separately records 1,032 construction-and-extraction-occupation deaths, 370 of them falls/slips/trips [S15]; struck-by objects 357, caught/compressed by running powered equipment 213, electricity 130, collapse/engulfment 80 [S16].
- **The industry's own required curriculum:** OSHA's Construction Focus Four — falls, caught-in or -between, struck-by, electrocution — is mandatory lesson material for every OSHA 10-/30-hour construction course [S13], with falls weighted heaviest "because most construction fatalities are caused by fall hazards" [S14]. **SafetyTopic covers zero of the four.**
- **The app's compliance framing is already construction law:** Cal/OSHA 8 CCR §1509(e) requires construction tailgate meetings "at least every 10 working days" (inherited-verified from loop-4 sources, s11/s25) [S22]. The app serves office-general content against a construction tailgate-meeting use case.
- **Concrete threshold rules verified for content authoring:** 6-ft fall-protection trigger in construction [S2][S3]; guardrail 42 in ±3 in and PFAS anchorage 5,000 lb/employee [S4]; scaffold competent-person inspection every shift and 10-ft scaffold fall-protection threshold [S5]; trench protective systems required at 5 ft unless a competent person clears a shallower dig, with daily competent-person inspections and 25-ft egress spacing [S8][S9]; GFCIs on all 120 V 15/20 A temporary receptacles [S12]; LOTO under 1910.147 with construction circuit lockout in 1926.417 [S11][S17]; tool/guard and constant-pressure-switch rules [S18]; aerial-lift daily control test and basket rules [S23]; per-hazard Focus Four objectives [S24]. (Full mapping per topic in the DECISION.)

### Q2. Candidate comparison

| Candidate | What it is | Evidence for | Evidence against / redundancy | Verdict |
|---|---|---|---|---|
| **A. Field/construction content expansion** | Add 10 jobsite topics under a new "Construction & Field Safety" category (Focus Four complete + adjacent equipment/energy talks) | Leading cause of construction death uncovered [S1]; Focus Four mandatory curriculum wholly absent [S13][S14]; competitor catalogs treat this as core (Q3); the app's own compliance framing is construction [S22]; zero-dependency static data addition, no schema change | Authoring + source-verification cost (~20% catalog growth) | **CHOSEN** |
| **B. Scheduling/nudge layer** (STRONGEST ALTERNATIVE) | Auto-suggest or calendar-push topics on a cadence (loop-4 vendor research showed schedulers are standard: Safesite campaigns, Raken recurring schedules) | Vendors treat cadence automation as a core feature | Largely redundant here: Pulse already surfaces per-category delivered counts + recency cue (app.js:800), Browse shows Never delivered / Last delivered per topic (loop 4), and the picker avoids repeats; vendor schedulers target multi-project fleets — this app's single-supervisor model is already served by the recency cue + oldest-first Browse. Adds UI/state complexity, zero new safety content | Rejected |
| C. `data-complete` attribute + `execCommand` headless test | Backlog/TODO deferred hygiene items | Small, real | Too small for a major-change loop; iterate-stage work | Rejected (stays in backlog) |
| D. Presenter/attendee capture | Record who ran / attended talks | Competitors ship digital signatures (Raken, HCSS per loop-4 research) | Previously rejected: printed sign-off sheets carrying names are PII; no new evidence this loop; zero-dependency printable model makes this worse, not better | Rejected |
| E. Multilingual (Spanish) topics | Second language for all topics | Raken ships EN/ES starter packs [S19] | Doubles authoring + verification cost ×60 topics; no demand signal in repo; heavy for one loop | Rejected this loop (parked) |

### Q3. Competitor content-breadth check (fresh fetches)

| Product | Construction/field share of talk content | Evidence seen |
|---|---|---|
| Raken | Effectively 100% (construction-first product) | "150+ construction toolbox talks" [S19]; visible library (≈137 titles) is dominated by field topics: Fall Protection, Fatal Four Hazards, Excavation Safety, Struck-by Incidents, Lifting and Rigging, Concrete Work, Underground Utility Strikes; FAQ: "cover all trades and types of construction" |
| Safesite | Construction is the largest template category, with dedicated sub-industries | 437 templates under Construction [S20]; separate dedicated **Trenching & Excavation** template category; construction listing includes ladder inspection, aerial-lift meetings |
| SafetyCulture/Mitti | Construction-safety is a first-class category among 779 safety articles | construction-safety category (concrete construction safety, site access controls) plus standalone LOTO and NFPA 70E guides [S21] |
| HCSS | Construction-specific product (HeavyJob Safety) | Direct pages 404'd this session; loop-4 research documented scheduling + per-crew talk assignment (inherited) |

Every current vendor treats construction/field hazard content as core library content. SafetyTopic's zero-for-Focus-Four catalog is the outlier.

## DECISION

**Loop 5's one major change: expand the catalog with 10 field/construction hazard topics under a new "Construction & Field Safety" category (50 → 60 topics, 10 → 11 categories).** No schema, UI, or new-feature work; it is a pure `topics-data.js` content addition plus regeneration of the static CSV export, using the existing required/optional fields.

**Rationale:** The gap is objectively verifiable — the four hazards OSHA requires in every construction course are absent, while the app's marketing and compliance framing (tailgate meetings) is construction-specific; falls alone killed 389 construction workers in 2024 [S1]. Competitors uniformly make this their core content [S19][S20][S21], so the change strengthens the app's core purpose rather than adding a tangent. It beats the strongest alternative (scheduling/nudge layer) because that layer's value is already delivered by Pulse recency cues + Browse delivery status, and content expansion uniquely fixes what no existing cue can: nothing to show. Ten topics (vs. 8 or 12): covers all Focus Four hazards plus scaffolds with dedicated talks, adds the four highest-frequency adjacent field exposures (lockout/tagout, machine guarding, aerial lifts, jobsite housekeeping), and keeps authoring cost bounded — every stat and regulation citation below is already primary-source-verified, so the build agent writes prose only.

### Category structure

One new category: **`Construction & Field Safety`** — all 10 topics live there. Category sizes after the change: Health & Wellness 9, **Construction & Field Safety 10**, Fire & Emergency Safety 8, Ergonomics 7, Walking & General Safety 6, Safety Culture 5, Driving 4, PPE 3, Hygiene 3, Chemicals 3, Security 2 (total 60). A single category keeps Pulse per-category coverage (`delivered/total`) readable and Browse grouping unchanged; splitting into 2-3 micro-categories (3-4 topics each) would dilute coverage denominators. A later loop may split if the category grows past ~15.

### Topic specs (build-ready; ids checked disjoint from all 50 existing)

Style contract for all 10: `category: "Construction & Field Safety"`, `duration: "~2 min"`, `source: "OSHA"`, plain-language key points (imperative, no legalese), summary 2-3 sentences in existing voice.

**1. id: `fall-protection-construction` — title: "Fall Protection at Six Feet"**
- source_ref: `OSHA 29 CFR 1926.501-502`
- summary angle: Falls are the leading cause of construction deaths. At 6 feet or more above a lower level, protection is the law, not a judgment call. Name your protection before you climb.
- key points: (1) 6-ft rule: any unprotected side/edge, hole, or leading edge 6 ft up needs guardrails, safety nets, or a personal fall arrest system; (2) guardrails: top rail ~42 in, midrail, hold 200 lb — report damaged sections; (3) harnesses: full-body harness (body belts don't count), lanyard to an anchorage rated 5,000 lb per worker, inspect gear before every use; (4) guard or cover every floor hole and skylight — covers must hold and be labeled; (5) wear your hard hat when work happens overhead — falling object protection is part of the same rule.
- stat: "In 2024, 389 of 1,034 construction deaths were falls to a lower level — the industry's leading cause of death. (OSHA/BLS)" [S1]
- discussion prompt angle: point at the nearest edge 6 ft up — what's protecting the person working there today?

**2. id: `scaffold-safety` — title: "Scaffold Safety Basics"**
- source_ref: `OSHA 29 CFR 1926.451`
- summary angle: Scaffolds put crews at height on a platform someone built this week. A competent person must inspect it every shift; your job is to use it the way it was built.
- key points: (1) a competent person inspects the scaffold before each shift and after anything that could shake it — no tag, no climb; (2) platforms are fully planked, gaps under an inch — no missing planks, no boxes or ladders stacked on top to gain height; (3) frame scaffolds taller than 4:1 (height to base width) must be tied, guyed, or braced, on base plates and mud sills; (4) fall protection kicks in above 10 feet on scaffolds — guardrails or harness, every time; (5) never climb the cross braces; keep 10 feet from overhead power lines.
- stat: "OSHA's Stop Falls campaign exists because falls from ladders, scaffolds, and roofs are the leading cause of death in construction. (OSHA)" [S1]
- discussion prompt angle: who inspected our scaffold this morning, and what would you do if the tag were missing?

**3. id: `trench-excavation-safety` — title: "Trenching and Excavation Safety"**
- source_ref: `OSHA 29 CFR 1926.651-652`
- summary angle: A trench wall is a wall of dirt that can weigh more than a car per cubic yard. Slope it, shore it, or shield it — the ground doesn't give second chances.
- key points: (1) cave-in protection (slope/bench, shoring, or trench box) is required at 5 feet and deeper — shallower only if a competent person examined the soil and cleared it; (2) the competent person inspects every day before work starts, after every rainstorm, and as conditions change — nobody enters on their own say-so; (3) a ladder, ramp, or stairway within 25 feet of everyone inside a trench 4 feet or deeper; (4) keep spoil piles and equipment at least 2 feet back from the edge; (5) never stand under a load handled by digging or lifting equipment — and stay out of trench boxes while they're being moved.
- stat: "Cave-ins killed 80 U.S. workers in 2024, and OSHA warns trench collapses are more likely than other excavation incidents to be fatal. (BLS CFOI 2024; OSHA Alert 3971)" [S16][S10]
- discussion prompt angle: name our competent person for today's dig and when they last walked the trench.

**4. id: `struck-by-hazards` — title: "Struck-By Hazards on the Jobsite"**
- source_ref: `OSHA Construction Focus Four (Struck-By); 29 CFR 1926.651(d)-(f)`
- summary angle: Struck-by is one of OSHA's Construction Focus Four: hit by vehicles, equipment, swinging loads, or objects falling from above. Every struck-by event has a line of fire — your job is to never stand in it.
- key points: (1) never walk or work under a suspended load or anything handled by lifting or digging equipment; (2) make eye contact with equipment operators before crossing in front of machines — assume they can't see you; (3) wear high-visibility gear near public traffic and stay inside barriers or warning systems near excavation edges; (4) hard hats stay on anywhere work is happening overhead; (5) stack and secure materials so nothing rolls, slides, or falls onto the crew below.
- stat: "Struck by a propelled, falling, or suspended object killed 357 U.S. workers in 2024. (BLS CFOI)" [S16]
- discussion prompt angle: if that excavator swings right now, where would you be? pick your escape route.

**5. id: `caught-in-between` — title: "Caught-In/Between Hazards"**
- source_ref: `OSHA Construction Focus Four (Caught-In or -Between)`
- summary angle: Caught-in/between is one of OSHA's Construction Focus Four: being pinned between equipment and a wall, pulled into an unguarded moving part, or buried in a collapse. Machines don't pinch — they crush.
- key points: (1) keep hands, feet, and clothing out of rotating parts, pulleys, and pinch points — guards exist because body parts don't survive contact; (2) never reach into running equipment to clear a jam — shut it down and lock it out first; (3) stay clear of equipment swing radii and never position yourself between moving equipment and a fixed object; (4) never enter an unprotected trench — cave-ins are caught-in/between too; (5) stand away from vehicles being loaded or unloaded.
- stat: "Struck, caught, or compressed by running powered equipment killed 213 U.S. workers in 2024. (BLS CFOI)" [S16]
- discussion prompt angle: name one spot on this site where a person and a machine could meet — and how we make sure they never do.

**6. id: `electrical-safety-jobsite` — title: "Electrical Safety on the Jobsite"**
- source_ref: `OSHA 29 CFR 1926.404(b); 1926.417`
- summary angle: Temporary power is the site's most convenient hazard. GFCIs, cord discipline, and respecting lockouts are what stand between 120 volts and a fatality.
- key points: (1) every 120-volt temporary receptacle outlet is GFCI-protected — or on a documented assured-grounding program; (2) inspect cords and plugs before each day's use: damaged, cut, or missing-ground cords get removed, not taped; (3) only authorized people lock out and tag circuits — a locked-out circuit restarts for nobody; (4) treat every wire as live until proven dead; (5) keep ladders, scaffolds, and tools at least 10 feet from overhead power lines.
- stat: "Exposure to electricity killed 130 U.S. workers in 2024. (BLS CFOI)" [S16]
- discussion prompt angle: is every cord on this job GFCI-protected — and when did you last actually look at one?

**7. id: `lockout-tagout` — title: "Lockout/Tagout Basics"**
- source_ref: `OSHA 29 CFR 1910.147; 1926.417`
- summary angle: Machines don't know you're working on them. Lockout/tagout is how we make sure stored energy — electrical, hydraulic, pneumatic, gravity — can't move a machine while your hands are inside.
- key points: (1) before service or maintenance: shut down, isolate every energy source, and apply your personal lock — one worker, one lock; (2) lock-tag-try: after locking, try the start control to prove zero energy; (3) only authorized workers lock out, and only the person who applied a lock removes it; (4) never operate, bypass, or "just test" equipment that's locked or tagged out; (5) circuits on this site follow the same rule — lock and tag before you touch.
- stat: no numeric stat (optional field omitted this loop): use the OSHA-sourced line "Unexpected startup or release of stored energy can crush, amputate, burn, or kill — craft workers are among those at greatest risk. (OSHA)" [S17]
- discussion prompt angle: what machines here could start up or move while someone's hands are in them — and where are their locks?

**8. id: `machine-guarding-power-tools` — title: "Machine Guards and Power Tools"**
- source_ref: `OSHA 29 CFR 1926.300`
- summary angle: Guards and interlocks are the difference between a close call and an amputation. A tool that's been tampered with isn't a shortcut — it's a hazard with a trigger.
- key points: (1) guards stay on any power tool designed to have them — removing a guard puts skin against the blade; (2) exposed moving parts — belts, pulleys, blades, sprockets — must be guarded, on bench tools and site equipment alike; (3) circular saws, reciprocating saws, and percussion tools must have a constant-pressure switch — the blade stops when your finger does; (4) inspect tools before use; damaged tools get tagged out and taken out of service; (5) wear eye and face protection whenever chips, sparks, or dust can fly.
- stat: "756 U.S. workers died in contact incidents in 2024 — struck by, or caught in or compressed by, objects and powered equipment. (BLS CFOI)" [S16]
- discussion prompt angle: find one guard on this site that's been defeated or removed — what would it take to fix it today?

**9. id: `aerial-lift-safety` — title: "Aerial Lift Safety"**
- source_ref: `OSHA 29 CFR 1926.453`
- summary angle: Boom lifts and scissor lifts get work done fast at height — and tip, crush, and drop people just as fast when the daily rules get skipped.
- key points: (1) test the lift controls each day before use; only authorized, trained operators run the lift; (2) stand on the basket floor — never climb the rails, and never stand on planks or ladders inside the basket; (3) wear a harness with the lanyard attached to the boom or basket — never tie off to a pole, structure, or anything outside the lift; (4) respect the manufacturer's load limit — people, tools, and material all count; (5) set the brakes, use outrigger pads on solid ground, chock on inclines, and never drive with the boom raised unless the lift is designed for it.
- stat: "Falls to a lower level killed 666 U.S. workers in 2024 — lift work is height work, and the rules apply. (BLS CFOI)" [S16]
- discussion prompt angle: who ran the morning control check on our lift, and where's their lanyard anchored?

**10. id: `jobsite-housekeeping` — title: "Jobsite Housekeeping"**
- source_ref: `OSHA 29 CFR 1926.25`
- summary angle: Construction sites change hourly — and yesterday's tidy site is today's obstacle course. Housekeeping is the cheapest safety fix there is: it's free, and it's everyone's job.
- key points: (1) clear form and scrap lumber — especially with protruding nails — from work areas, passageways, and stairs as work moves; (2) pull or bend down every exposed nail before lumber gets stacked or walked past; (3) remove combustible scrap regularly and keep waste and oily-rag containers emptied — fire loads grow fast on site; (4) keep walkways, stairs, and access routes lit and clear — night shifts and winter afternoons make clutter deadly; (5) a tidy site is an inspected site — most hazards you'll find while cleaning up are ones an inspector would write up too.
- stat: "Falls, slips, and trips killed 844 U.S. workers in 2024 — most start with something in the way. (BLS CFOI)" [S15]
- discussion prompt angle: what's one thing we can clear from our walkways before the next shift starts?

### Blast radius (what shifts when topic count/category set changes)

- **topics-data.js** — the only source edit: append 10 objects; schema unchanged (AGENTS.md rules met: unique stable ids, mandatory fields, verifiable source/stats; 7 of 10 have numeric stats, all verified [S15][S16], 3 use cited OSHA qualitative lines instead of invented numbers).
- **Auto-derives, no code change expected:** category dropdown (`[...new Set(...)].sort()`, app.js:271), Browse grouping/filter, per-topic Never-delivered/Last-delivered status, Pulse per-category coverage `delivered/total` (app.js:800) and denominator totals, program report per-category counts (app.js:1300), CSV report export, topic counter (app.js:1600). index.html hero carries no topic count; index.html meta description stays true.
- **Static files needing manual sync (build/docs stages):** `safety-topics.csv` (root export; no generator script exists — regenerate in the same style) and `README.md` line 22 ("50 topics across 10 categories" → "60 topics across 11 categories"); CHANGELOG entry at docs stage.
- **Tests:** `tests/app.test.js` and `tests/browse-delivery.test.js` use synthetic fixtures ('General', 'Electrical', 'Equipment'); no test references the real 50-topic count or category set — no test changes required by content; full suite run belongs to the build stage.
- **Constraints honored:** zero npm dependencies, static-site/file:// compatibility, defensive validation (new topics pass the same app.js:150 field validation as existing ones).

## Open questions for planning

- None blocking. Optional: whether `safety-topics.csv` regeneration belongs in b-build or b-docs (recommend b-build, same stage as the data edit, so the export never lags the data).
