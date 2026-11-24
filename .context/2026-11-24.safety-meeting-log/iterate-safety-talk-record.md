---
status: completed
updated: 2026-11-24
completed: 2026-11-24
subject: 2026-11-24.safety-meeting-log
topics: [review, iteration, sign-off sheet]
informs: [plan-safety-talk-record.md]
addresses: plan-safety-talk-record.md
from_review: b-review
---

# Iteration: safety-talk-record

## Source
- Reviewed after: `/b-build`
- Plan: `plan-safety-talk-record.md`
- Review axes: spec axis (mainline) + standards axis (parallel sub-agent, seeded with `code-review-universal` JS guides + diff-scoped `code-smells` subset)

## Critical Issues

### 1. "I Used This" does not update "Last delivered" in place
- **File**: `app.js` (`#use-this-btn` click handler, ~709-720)
- **Problem**: Handler calls `logTalk(topic.id)` but only mutates the button; `.topic-last-delivered` in `.topic-card-footer` is not inserted/updated, so the card is out of sync with `meetingLog` until the next `showTopic()` render. Violates the plan acceptance criterion "the card shows 'Last delivered: <date>'".
- **Proposed fix**: In the click handler, insert or update a `.topic-last-delivered` element in `.topic-card-footer` (guarded; create the `<p>` if absent, update its textContent if present).

### 2. Malformed restored `meetingLog` entries wedge rendering
- **File**: `app.js` (`init()` restore, ~197-204; consumer in `showTopic()` ~640-648)
- **Problem**: Restore validates only `Array.isArray`, not element shapes. An entry like `[null]` or `[{"topicId":"x"}]` makes `showTopic()`'s `e.topicId` access throw after `isRendering = true` is set, permanently wedging all rendering — violates the plan's defensive-programming scope.
- **Proposed fix**: In `init()`, filter restored entries to those with `typeof e.topicId === "string" && typeof e.date === "string"` (drop the rest with `console.warn`), mirroring `validateTopics()`'s sanitize-don't-crash pattern.

## Warnings

### 3. `body.sheet-open` can go stale and print the wrong thing
- **File**: `app.js` (~290, ~585-591), `style.css` print rules (~721-728)
- **Problem**: If `afterprint` does not fire (on-screen fallback when `window.print` is absent) or the user clicks `#print-btn` while the sheet is open, `body.sheet-open` persists; `#print-btn` then prints the stale sign-off sheet instead of the topic card.
- **Suggested approach**: Call `closeSignoffSheet()` at the start of `showTopic()`, in the `printBtn` handler before `window.print()`, and in the test-harness `reset()`.

### 4. Sign-off button tests leak state
- **File**: `tests/app.test.js` (describe "sign-off sheet button", ~548-611)
- **Problem**: The with-topic test stubs `win.print` and leaves `sheet-open` on `document.body`, `#signoff-sheet` populated, and the stub unreplaced; the no-topic test only passes because a later test dispatches `afterprint`. Fragile ordering.
- **Suggested approach**: `afterEach` cleanup: restore `win.print`, remove `sheet-open`, clear `#signoff-sheet` innerHTML.

### 5. `.topic-last-delivered` has no CSS
- **File**: `style.css`
- **Problem**: Renders at full `1rem` body size instead of the muted metadata style of `.topic-source-ref` (screen `0.78rem` muted; print `9pt`).
- **Suggested approach**: Add matching rules alongside `.topic-source-ref` (screen + `@media print`).

### 6. Redundant `afterPrintWired` guard + stale `wireEvents` JSDoc
- **File**: `app.js` (~69-70, ~270-298)
- **Problem**: `window.addEventListener("afterprint", closeSignoffSheet)` natively dedupes identical function references, so the flag is dead weight; the `wireEvents()` JSDoc no longer lists all wired controls.
- **Suggested approach**: Remove the flag, register the listener directly, update the JSDoc.

## Recommended Workflow

`/b-iterate` picks up this file automatically; then re-run `/b-review` against `plan-safety-talk-record.md`.
