# Working notes: browse-delivery-status (loop 4)

Date: 2026-11-24. Companion to `../research-browse-delivery-status.md` (canonical decision). Raw source excerpts: `sources-browse-delivery-status.md`.

## Repo state inspected (ground truth)

- `browse.html` (343 lines): inline script reads only `usedTopics` from localStorage inside `try { ... } catch (_) {}` — **silent swallow**, contradicts AGENTS.md defensive rule (app.js had this fixed in loop 1: "init() silently swallowed localStorage restore errors"). Renders `✓ Used N×` when `useCount > 0`; no dates, no never-delivered marker; never touches `meetingLog`. Rows are `<a href="index.html#<id>">` grouped by category; keyword search filters on `dataset.title`/`dataset.summary`; `updateCount` shows "N of M topics".
- `app.js:565-671` `computeProgramStats(log, topics)`: category-level only — `catDelivered` sets keyed by category, `catLastDate` per category, `recent` top-5, total/thisMonth/lastDate. **No per-topic output.** Backlog premise ("reusing computeProgramStats") is only partially right: conventions are reusable, a per-topic helper is needed.
- `app.js:673-760` `suggestNextTopic`: defines the app's delivery conventions — any log entry marks an id delivered even with malformed date; never-delivered first, ordered by category neglect (absent date < oldest date), tie-break category name, then alphabetical id; all-delivered branch = globally oldest last-delivered. The browse sort should mirror these tie-breaks for consistency.
- `app.js:477-514` `markUsed`/`logTalk`: `usedTopics[id]` counter (legacy, predates log) and `meetingLog.push({ topicId, date: todayISO() })`. Two stores exist; counts can diverge (pre-log "I Used This" clicks incremented `usedTopics` before `meetingLog` existed in loop 1).
- `app.js:185-213` init: log restore validates array-ness and drops malformed entries with a warn — browse should degrade at least as defensively.
- Catalog: 50 topics, 10 categories. Construction-relevant gaps confirmed by title scan: no Fall Protection (harness/roof work), Scaffolds, Excavation/Trenching, Struck-By/Caught-In, Silica; only "Electrical Safety Basics" + "Ladder Safety" + "Slips, Trips, and Falls" touch the Focus Four. Categories are general-industry flavored (Home Office Ergonomics, Break Room Food Safety, Eye Strain) with OSHA 1910 `source_ref`s.
- Tests: 149 Vitest tests; `window.__safetyTopic` harness pattern in app.js; per-test localStorage isolation is the established norm.

## Evaluation trail

### Why the loop-3 "too small for a major change" verdict does not transfer as-is
Loop 3 evaluated the item *as scoped in the backlog then* (date + marker only) against a then-missing produce layer that had stronger external demand. That produce layer now exists. The remaining arc gap is selection. Broadened scope (filter/sort + data join + defensive-read fix) makes it a layer: the page changes from a static index into the working selection tool. Honesty note for plan: this is still the smallest major change of the four loops; its weight rests on position-in-arc + official-artifact analog, not on size.

### Worksheet analogy — checked, not assumed
Fetched the actual PDF (2026-11-24). Confirmed: instruction sentence pairs *selection* and *tracking* in one artifact ("select topics for tailgate meetings and to track meeting dates"); ~60 construction topics each with a blank Date cell; footer restates §1509 10-working-day floor. The worksheet is a per-topic ledger on a topic list — browse.html is SafetyTopic's topic list. Also noted: "Be sure to choose topics that are relevant to your worksite" — relevance guidance, not novelty; no authority requires topic novelty or bans repetition (loop 2 found the same). So the feature's honest framing is *gap visibility at selection*, not "avoid repetition compliance".

### Competitor check — library surfaces (fresh fetches)
- Raken (Aug 21, 2026 article): "talks you've previously presented appear at the top for easy repeat use" — delivery-history-in-library is shipped vendor behavior. Their talk tracking is Upcoming/Missed/Completed (schedule-centric, Performance Plan required). Our equivalent needs no schedule engine: pure read of the log.
- Safesite (Aug 25, 2025 article): rotation is admin-configured (Rotating Templates, campaigns); quote "ensure your team rotates through the appropriate safety topics". No product surveyed derives rotation from delivered history (loop 2 finding, unchanged).
- HCSS/SafetyCulture/EcoOnline: no documented library-surface delivery status (loop 2 notes stand).

### Candidate 2 steelman — kept alive deliberately
Verified OSHA stop-falls: "FALLS ARE THE LEADING CAUSE OF DEATH IN CONSTRUCTION. In 2024, there were 389 fatal falls to a lower level out of 1,034 construction fatalities (BLS data)." Cross-checked catalog titles — Focus Four genuinely underrepresented. This is a real future loop, recorded as a backlog candidate with a seed list (worksheet topics ∩ missing catalog topics: Fall Protection, Scaffolds, Excavation/Trenches/Earthwork, Silica Dust, Roofing Safety, Electrical work, Struck-By/Caught-In). Not this loop: content authoring + source verification is its own gated project; and delivery-status surfacing is the prerequisite that makes added topics manageable (rotation visibility before library growth).

### Candidates 3 and 4 — no re-litigation
No new evidence found this loop that bears on presenter capture or reminders; both were settled with explicit reasoning in loops 2-3. Killing them is fidelity to the decision record, not laziness.

## Scope sketches for plan stage

- Helper shape idea: `buildDeliveryIndex(log)` → `Map<topicId, { count, lastDate: string|null }>` + `deliveryStatusOf(id, index)` → `{ delivered: boolean, count, lastDate }`; compare against `PULSE_ISO_DATE_RE` conventions. Sort comparator: never-delivered first, then oldest lastDate, then title/id tie-break (mirror suggestNextTopic).
- Placement options (plan decides): (a) new plain script `delivery-data.js` (global, loadable by browse + vitest), (b) functions in `topics-data.js`-adjacent shared file, (c) duplicate minimal logic inline with browse harness. (a) preferred for zero-dep testability; must not use ES modules (file://).
- UX sketch: status select in `.browse-controls` (All / Never delivered / Oldest last-delivered first); row-meta gains a status span before duration; never-delivered marker styled with AA contrast (loop-2 lesson: verify with a contrast check in review).
- Two-store honesty: rows can show "✓ Used N×" (legacy) and log-derived status simultaneously during transition; plan should pick one canonical count source and document the other as legacy, but neither store is written this loop.

## Things deliberately NOT recommended this loop
- Schedule/reminder engine, streaks, compliance verdicts — settled against, twice.
- Editing topics-data.js content — deferred to the construction-expansion loop with a worksheet-seeded list.
- Persisting browse status preferences to localStorage — could ride along but adds surface area; YAGNI unless plan finds the sort state needs persistence (search state isn't persisted today either).
