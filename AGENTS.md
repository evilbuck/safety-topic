# SafetyTopic AGENTS.md

## Project type

This is a small **static web app** built with:

- HTML
- CSS
- vanilla JavaScript

There is **no build step** and **no frontend framework**.

**Imperative**
The site should continue to work as a static site on GitHub Pages or any simple static host. Unless explicitly instructed otherwise, this remains true. If explicitly instructed to move away from this restriction, remember to update this section in `AGENTS.md`.

## Development rules

- Use `npm run dev` for local development.
- Default local URL: `http://localhost:3000`
- Use localhost when testing features that depend on browser security rules, especially clipboard behavior.
- Do not add frameworks, bundlers, transpilers, or npm dependencies unless the user explicitly asks.
- be a defensive programmer. DO NOT swallow errors. Follow defensive programming rules.

### Code Documentation

- use jsdoc style comments for documentation

## File map

Use this to decide where to make changes:

- `index.html` — main app page structure
- `browse.html` — browse/search page structure and browse-page-specific inline styles/scripts
- `style.css` — shared site styles
- `app.js` — main app behavior (topic selection, filters, copy, print, used-tracking)
- `topics-data.js` — topic content/data
- `server.js` — lightweight local development server only
- `CHANGELOG.md` — unreleased and release notes
- `README.md` — user-facing setup and project documentation

## Editing guidance

- Prefer small, direct edits that match the current style.
- Keep the app dependency-free unless asked otherwise.
- Preserve static-site compatibility.
- Do not move app behavior into the server; `server.js` is for local development only.
- Preserve source attribution/disclaimer language unless the user asks to change it.

## Topic data rules

When editing `topics-data.js`:

- Keep each topic object in the existing structure.
- Required fields:
  - `id`
  - `title`
  - `category`
  - `source`
  - `source_ref`
  - `duration`
  - `summary`
  - `key_points`
- Optional fields:
  - `stat`
  - `discussion_prompt`
- `id` values must remain unique and stable.
- Do not remove source attribution.

## Validation checklist

After making changes, run the app locally:

```bash
npm run dev
```

Then verify the relevant behaviors in the browser at `http://localhost:3000`:

### For app changes (`index.html`, `app.js`, `style.css`, `topics-data.js`)
- Main page loads without errors
- "Get a Topic" works
- Category filtering works
- Copy Text works
- Copy Link works
- Print button still works
- "I Used This" still works
- No obvious console errors

### For browse page changes (`browse.html`, `style.css`, `topics-data.js`)
- Browse page loads
- Search filters results correctly
- Topic links back into the main app correctly
- No obvious console errors

### For data changes (`topics-data.js`)
- Topics render correctly
- No malformed entries break the UI
- IDs remain unique

## Git commits

- Do **not** commit unless the user explicitly asks.
- If the user asks for a commit:
  - keep commits atomic
  - use Conventional Commit style when practical

## Changelog

Follow the **existing** `CHANGELOG.md` format.

- Add unreleased work under `## [Unreleased]`
- Use a fitting section such as:
  - `### Added`
  - `### Changed`
  - `### Fixed`

Do not invent a new changelog format unless the user explicitly asks for one.
