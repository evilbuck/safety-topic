---
status: completed
updated: 2026-11-24
completed: 2026-11-24
subject: 2026-11-24.safety-program-pulse
topics: [review, iteration, program pulse]
informs: [plan-safety-program-pulse.md]
addresses: plan-safety-program-pulse.md
from_review: b-review
---

# Iteration: safety-program-pulse — b-review standards findings

## Findings (from PulseStandardsReview, verdict: fail)

1. **[defect] Load button state desync** (`app.js:847-849`): `#pulse-load-btn` calls `showTopic(suggestion.topic, true)` without `syncCategoryToTopic()` or `currentIndex` update. Consequences: with no filter, `←`/`→` navigate from a stale index (can silently no-op); with an active category filter, `findIndex` returns −1 → empty `.topic-counter`, wrong nav-button enablement, and `→` steps the old filtered list. Fix: `syncCategoryToTopic(suggestion.topic)` before `showTopic(...)`.
2. **[defect] Same-day `recent` ordering** (`app.js:612-626`): stable sort keeps equal-date entries in oldest-first insertion order, so same-day talks list oldest-first (contradicting `lastTopicTitle`), and a 6th same-day talk is dropped by `.slice(0, 5)` instead of appearing first. Fix: `.reverse()` before sort so newest-appended wins ties.
3. **[warning] Empty pulse card on init error** (`style.css:670-679`): `.program-pulse` keeps padding/border when `init()` returns early (missing/invalid `TOPICS`) → blank card below share bar. Fix: `.program-pulse:empty { display: none; }`.
4. **[warning] Contrast** (`style.css:769-791`): `.pulse-cat-never .pulse-cat-last` ≈3.05:1 on `--color-orange-light`, below WCAG AA. Fix: darker foreground (e.g. `#8a3f00`).
5. **[warning] Test gaps** (`tests/app.test.js:1184-1200, 951-967, 1262-1279`): no post-Load navigation/filter assertions; no same-day recent ordering/truncation tests; one test double-invokes `init()` stacking listeners. Add tests for (a) same-day recent order + 6th-entry visibility, (b) Load under active filter updates `currentIndex`/`.topic-counter`/nav buttons.

## Disposition

All in-plan (they concern code delivered by this plan). TDD fix via subagent, then re-verify (vitest + live browser) and re-review verdict.
