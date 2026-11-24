---
status: completed
date: 2026-11-24
subject: 2026-11-24.field-hazard-topics
topics: [construction topics, focus four, fall protection, trenching, lockout-tagout, catalog expansion, content sourcing]
research: [research-field-hazard-topics.md]
iterations: [iterate-field-hazard-topics.md]
spec:
memory: [field-hazard-topics-2026-11-24.md]
---

# Plan: Field/Construction hazard topics (loop 5)

## User Goal

Deliver loop 5's one major change that improves the app's focus and purpose. The app's own compliance framing (Cal/OSHA §1509(e) tailgate meetings every 10 working days) is a construction rule, and OSHA's Construction Focus Four is mandatory curriculum for every OSHA construction course — yet the 50-topic catalog covers **zero** of the four (no fall protection, scaffolds, trenching, struck-by, caught-in, LOTO, machine guarding, aerial lifts). The app cannot serve the crew population toolbox talks were invented for. This loop makes the catalog serve field/construction crews: 10 new, fully sourced topics under a new category.

Research (`.context/2026-11-24.field-hazard-topics/research-field-hazard-topics.md`, DECISION): 10 topics, one new category `Construction & Field Safety`, 50 → 60 topics, 10 → 11 categories. Every stat verified against fetched BLS CFOI 2024 / OSHA pages; every regulation citation fetched (29 CFR 1926 Subparts M/L/P/K, 1910.147, 1926.25, 1926.300, 1926.453). Scheduling/nudge rejected as redundant with Pulse recency cue + Browse oldest-first; remaining backlog items too small; attendee capture previously rejected (PII); multilingual too costly.

## Scope

### In scope

- **topics-data.js**: append exactly the 10 research-specified topic objects — `fall-protection-construction`, `scaffold-safety`, `trench-excavation-safety`, `struck-by-hazards`, `caught-in-between`, `electrical-safety-jobsite`, `lockout-tagout`, `machine-guarding-power-tools`, `aerial-lift-safety`, `jobsite-housekeeping` — in the existing object style (double-quoted keys, same field order), category `Construction & Field Safety`. Specs (summary angle, 5 key points, stat + citation, discussion prompt, source_ref) are build-ready in the research file; wording may be lightly edited for tone consistency with existing entries but every citation number and stat stays exactly as researched.
- **safety-topics.csv**: regenerate in the existing export style so it never lags the data (recommendation from research: same stage as the data edit).
- **README.md** topic-count line ("50 topics across 10 categories" → 60/11) and **CHANGELOG.md** `[Unreleased]` entry — docs stage, after review.
- Full test suite run + live browser verification.

### Out of scope

- No new app capability, page, or behavior — content only; all counters/groupings auto-derive from `TOPICS`.
- No edits to existing 50 topics or their categories.
- No new npm dependencies, build steps, or ES modules (static-site/file:// compatibility preserved).

## Acceptance criteria

- [x] `topics-data.js` contains exactly 60 topics; the 10 new ids match the research spec, are unique, disjoint from the existing 50, and use category `Construction & Field Safety`; each new object has all required fields (`id`, `title`, `category`, `source`, `source_ref`, `duration`, `summary`, `key_points`) with `stat`/`discussion_prompt` per the research spec; source refs and stats are verbatim from the research file (no invented numbers).
- [x] App validates the expanded catalog: no schema-validation warnings on load; every new topic renders on the main page (Get a Topic cycle + category filter) and on browse.html (searchable, grouped under `Construction & Field Safety`, Never delivered status, deep link `index.html#<id>` works).
- [x] Derived surfaces update automatically and correctly: category filter dropdown gains `Construction & Field Safety` (11 options), hero/topic counts read 60, Browse shows 60 rows, Pulse per-category coverage includes the new category, program report counts include it.
- [x] `safety-topics.csv` contains 60 rows in the existing export style (plus header/BOM as currently present).
- [x] Full Vitest suite green; no test relied on the 50-topic count (research verified fixtures are synthetic), and any test that legitimately exercises real `TOPICS` data still passes.
- [x] Live Chromium @ localhost:3000: zero console errors; new topics reachable end to end (filter → select → copy → print sheet header; browse → status row).

## Verification

- `npx vitest run` — full suite green (197 existing; add tests only if a real edge exists — content additions are data, and the suite already validates schema; do not add tautological count tests).
- Live Chromium @ localhost:3000: load app with real `TOPICS` (60); cycle Get a Topic with the `Construction & Field Safety` filter; browse.html search finds a new topic; deep link loads it; Pulse and report include the new category; no console errors.
- Spot-verify 3 sampled source_refs against the research sources file (citation numbers unchanged).

## Risks

- Content quality is the dominant cost (research's own warning): mitigated by build-ready specs with per-topic verified citations; build agent must not improvise stats.
- 60 items in one inline `TOPICS` array is a large but still-static file; no action this loop (splitting would violate "content only, no behavior change").
