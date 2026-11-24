---
status: completed
date: 2026-11-24
subject: 2026-11-24.safety-meeting-log
topics: [sign-off sheet, meeting log, print, localStorage]
research: [research-toolbox-talk-records.md]
iterations: [iterate-safety-talk-record.md]
spec:
memory: [safety-meeting-log-2026-11-24.md]
---

# Plan: Safety Talk Record — printable sign-off sheet + dated meeting log

## User Goal

A team lead who delivers a safety brief can **prove it happened**: one click prints a one-page sign-off sheet (attendance rows, attestation, presenter sign-off) and every delivered talk is kept in a dated local log — instead of today's anonymous "used" counter.

## Goal

Convert SafetyTopic from a topic dispenser into a run-and-document meeting opener. Research (`research-toolbox-talk-records.md`) shows the documentation step is the practical proof: OSHA interpretation letters expect a trainer-signed certification record, CA 8 CCR §3203(b)(2) requires documented training, and every surveyed template/app fills the same gap with a one-page record.

## Context used / assumptions

- User request: "one major change that will improve the focus, the purpose of this app", delivered via the Buck workflow with a commit per loop.
- Research findings: minimal conventional fields = Date, Topic, Presenter, Location, Company, Duration header; ~12 Name/Signature rows + attestation line; notes/follow-up; presenter signature + date. Attendance stays on paper (OSHA explicitly does not require employee signatures) — no digital name capture.
- Code facts: `usedTopics` is `{[id]: count}` in localStorage; state restored in `init()`; render via template-literal `innerHTML` in `showTopic()` with `escHtml()`; test harness `window.__safetyTopic` exposes internals; print styles exist at `style.css` `@media print`; share bar buttons live in `index.html` `.share-bar`.
- Assumption: static-site, zero-dependency constraint holds (per AGENTS.md).

## Scope

1. **Sign-off sheet print mode** (`app.js`, `index.html`, `style.css`): new share-bar button "Sign-Off Sheet"; renders `#signoff-sheet` containing the brief (title, summary, key points, stat/discussion when present, source line) plus record fields — Date (today, prefilled), Presented by / Location or Crew / Company blank fill-in lines, Duration (from topic data), attestation line, 12 attendance rows (Name (print) / Signature), Notes / follow-up actions lines, presenter signature + date line. Button flow: render → `body.classList.add("sheet-open")` → `window.print()` → `afterprint` (guarded) removes the class; if `window.print` is unavailable, fall back to showing the sheet on screen with a toast.
2. **Dated meeting log** (`app.js`): new localStorage key `meetingLog` (array of `{ topicId, date: "YYYY-MM-DD" }`). "I Used This" click now also appends a log entry; topic card footer shows "Last delivered: <date>" when an entry exists. Existing `usedTopics` counts and the "Not used yet" filter keep working unchanged (new key = no migration risk).
3. **Defensive bug fix** (in-plan): `init()` still swallows localStorage restore errors with `catch (_) {}` (app.js:176,180) — contradicting the repo's no-swallowed-errors rule and the CHANGELOG's claim for the sibling functions. Replace with `console.warn` guarded restores.
4. **Tests** (`tests/app.test.js`): cover sheet content (all required fields, 12 rows, today's date), escaping of topic strings, `logTalk` persistence + error handling, button guard (no topic → toast, no print), print flow (stubbed `window.print`), last-delivered display, harness exposure. Update `assertDomElements`/`callInit`/`resetDomRefs` for the new elements.

## Out of scope

- Digital capture of attendee names/signatures (deliberately paper-only)
- browse.html changes; server.js; topics-data.js edits; PDF export; a separate log-history page; auth/multi-device sync

## Affected files

- `app.js` — meetingLog state, `logTalk()`, `buildSignoffSheet()`, signoff wiring, last-delivered display, init restore fixes, harness additions
- `index.html` — share-bar button, `#signoff-sheet` section
- `style.css` — `.signoff-sheet` screen styles + print rules (sheet-only print when `body.sheet-open`)
- `tests/app.test.js` — new describes
- `CHANGELOG.md`, `README.md` — docs (b-docs/b-save step)

## Implementation steps

1. RED: add failing tests for `buildSignoffSheet` content, `logTalk`, signoff button guard + print flow, last-delivered display.
2. GREEN: implement the three scope items following existing patterns (template literals + `escHtml`, JSDoc comments, guarded DOM/storage access).
3. Refactor within the new code only; no drive-by restyling.

## Acceptance criteria

- [x] "Sign-Off Sheet" with a topic loaded renders a record containing: topic title/summary/key points (+stat/discussion when present), source line, today's date prefilled, Presented by / Location / Company blank lines, duration, the attestation sentence, 12 attendance rows, notes lines, presenter signature + date line
- [x] Print via the button outputs only the sign-off sheet (app chrome hidden); without the sheet open, existing Print behavior is unchanged
- [x] "I Used This" records a dated `meetingLog` entry and the card shows "Last delivered: <date>"; legacy `usedTopics` behavior (counts, "Not used yet" filter) is unchanged
- [x] No topic loaded → toast error, no print, no sheet render; localStorage failure → `console.warn`, no throw
- [x] All topic-derived strings pass through `escHtml()` in the sheet
- [x] All existing tests still pass; new tests cover the above

## Verification

- `npx vitest run` — full suite green (existing 34 + new)
- `npm run dev` at http://localhost:3000 in a real browser: main page loads with no console errors; Get a Topic, category filter, Copy Text, Copy Link, Print, I Used This all still work; Sign-Off Sheet button prints the record (verify print layout via print-media emulation screenshot)

## Execution Instructions

Non-phased execution-ready plan. Treat the whole plan as one unit:
1. `/b-build` against this plan (TDD, standard mode).
2. `/b-review` against this plan (spec axis + standards sub-agent).
3. In-plan issues → `/b-iterate` then re-review; out-of-plan → separate `/b-plan`.
4. `/b-docs` if documentation impact, then `/b-save`, then `/b-commit`.
5. Interrupted → leave a note in memory and resume from this plan.

## Risks

- Print behavior differs across browsers — mitigated by relying only on `window.print()` + `afterprint` with a screen-preview fallback, no print-detection hacks.
- jsdom lacks `window.print` — tests stub it; production guards the call.
- localStorage schema growth — new key only; no migration of existing data.
