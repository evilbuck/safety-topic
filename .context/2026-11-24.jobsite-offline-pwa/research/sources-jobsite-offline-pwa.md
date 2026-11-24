# Sources — 2026-11-24.jobsite-offline-pwa (all fetched live 2026-11-24)

## Regulation (primary, official)

**S1. Cal/OSHA 8 CCR §1509 — Injury and Illness Prevention Program (construction)**
URL: https://www.dir.ca.gov/title8/1509.html — HTTP 200.
Proves: (e) cadence — "Supervisory employees shall conduct "toolbox" or "tailgate" safety meetings, or equivalent, with their crews at least every 10 working days to emphasize safety."; (a) IIPP link — "Every employer shall establish, implement and maintain an effective Injury and Illness Prevention Program in accordance with section 3203 of the General Industry Safety Orders." Page carries subsections (a)–(e) + NOTE/HISTORY only → **§1509 has no recordkeeping subsection**.

**S2. Cal/OSHA 8 CCR §3203 — IIPP (general)**
URL: https://www.dir.ca.gov/title8/3203.html — HTTP 200 (extracted verbatim via live fetch + text scan).
Proves: (b)(2) record duty — "Documentation of safety and health training required by subsection (a)(7) for each employee, including employee name or other identifier, training dates, type(s) of training, and training providers. This documentation shall be maintained for at least one (1) year."; EXCEPTION NO. 1 for <10 employees (log of instructions); (b)(1) inspection records ≥1 year. Headcount does not satisfy "employee name or other identifier".

## PWA platform (primary)

**S3. MDN — Service Worker API**
URL: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API — HTTP 200.
Proves: "Service workers essentially act as proxy servers that sit between web applications, the browser, and the network (when available). They are intended, among other things, to enable the creation of effective offline experiences, intercept network requests, and take appropriate action based on whether the network is available, and update assets residing on the server."

**S4. MDN — Using Service Workers**
URL: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers — HTTP 200.
Proves: "Service workers are enabled by default in all modern browsers. To run code using service workers, you'll need to serve your code via HTTPS — Service workers are restricted to running across HTTPS for security reasons. A server supporting HTTPS is necessary. To host experiments, you can use a service such as GitHub, Netlify, Vercel, etc. In order to facilitate local development, `localhost` is considered a secure origin by browsers as well."
"Why is my service worker failing to register?" list: "You are not running your application in a secure context (over HTTPS)."; "The default scope for a service worker is the directory where the worker is located. In other words, if the script `sw.js` is located in `/js/sw.js`, it can only control URLs in (or nested within) the `/js/` path by default."
→ Guard design (https:/localhost only) + relative `./sw.js` scoping under GH Pages subpaths.

**S5. MDN — Making PWAs installable**
URL: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable — HTTP 200.
Proves: Chromium required manifest members — "name or short_name; icons must contain a 192px and a 512px icon; start_url; display and/or display_override; prefer_related_applications must be false or not present". Serve rule — "For a PWA to be installable it must be served using the https protocol, or from a local development environment using localhost or 127.0.0.1 — with or without a port number. This is a more stringent requirement than secure context" → file:// (a secure context) still cannot install; the protocol guard is mandatory.

**S6. MDN — Manifest icons reference**
URL: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons — HTTP 200.
Proves: SVG icon with `sizes: "any"` — "The `sizes` value of this icon is set to `any`, which allows a browser to use this icon at any size. SVG icons maintain their quality at larger sizes. These icons are ideal for high-resolution displays like in progressive web apps." and "If `src` is relative, the path is resolved relative to the manifest file's URL." → one hand-authored `icon.svg` suffices; relative paths survive project subpaths.

**S7. MDN — WorkerGlobalScope.importScripts()**
URL: https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts — HTTP 200.
Proves: "The **`importScripts()`** method of the WorkerGlobalScope interface synchronously imports one or more scripts into the scope of a classic worker" → shared `pwa-assets.js` between sw.js and tests/pages is the supported mechanism.

**S8. MDN — Web application manifest (members overview)**
URL: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest — HTTP 200.
Proves: member list + note that "PWAs must provide certain manifest members" (cross-ref S5).

## Hosting (primary)

**S9. GitHub Docs — Securing your GitHub Pages site with HTTPS**
URL: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https — HTTP 200.
Proves: "You can enforce HTTPS for your GitHub Pages site to transparently redirect all HTTP requests to HTTPS." → SW runs on GH Pages.

**S10. GitHub Docs — What is GitHub Pages?**
URL: https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages — HTTP 200.
Proves: "GitHub Pages is a static site hosting service that takes HTML, CSS, and JavaScript files straight from a repository on GitHub" (static files incl. sw.js/manifest need no build).

## Durability threat (primary)

**S11. WebKit Blog — Full Third-Party Cookie Blocking and More (ITP 2.3, Mar 24 2020, John Wilander)**
URL: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ — HTTP 200.
Proves 7-day cap: "ITP has aligned the remaining script-writable storage forms with the existing client-side cookie restriction, deleting all of a website's script-writable storage after seven days of Safari use without user interaction on the site." Affected forms: "Indexed DB, LocalStorage, Media keys, SessionStorage, Service Worker registrations and cache."
Proves home-screen exemption: "Web applications added to the home screen are not part of Safari and thus have their own counter of days of use. Their days of use will match actual use of the web application which resets the timer. We do not expect the first-party in such a web application to have its website data deleted." (+ "If your web application does experience website data deletion, please let us know since we would consider it a serious bug.")
→ The offline-PWA change is simultaneously the strongest iOS record-durability measure available to this zero-dep app.

## Competitor norm (vendor primary doc)

**S12. Raken Help Center — Working with Raken Offline**
URL: https://help.rakenapp.com/en/articles/14447797-working-with-raken-offline — HTTP 200.
Proves offline-first is the field-tool norm: "Construction sites don't always have reliable cell service or Wi-Fi — and Raken is built for that reality. The mobile app lets you document issues, log time, capture photos, and complete daily reports even when you're fully offline. Everything syncs automatically once you're back on a network." / "Offline mode itself has no plan restrictions and is available on all Raken plans."

## Failed / superseded fetches (reported honestly)
- https://help.rakenapp.com/en/articles/1199046-offline-mode — HTTP 404 (guessed article id) → replaced by S12 (found via site search).
- https://help.rakenapp.com/en/articles/14465443-raken-offline-mode — HTTP 404 (guessed id) → replaced by S12.
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-site-with-https — HTTP 404 (wrong slug) → replaced by S9.
- https://developer.chrome.com/docs/lighthouse/pwa/installable — HTTP 404 (page moved) → replaced by S5 (MDN) as primary install-criteria source.

## Inherited sources (verified in prior loops, cited here for framing only)
- Cal/OSHA Compliance Manual Ch.13 (3-year enforcement posture, 10+ employees): https://www.dir.ca.gov/dosh/policies-and-procedures/ch-13-enforcement-of-iipp.pdf — fetched in .context/2026-11-24.safety-program-report/research/sources-program-report.md (S2 there).
- WA WAC 296-155-110 (weekly crew meetings; document attendance/subjects; minutes ≥1 year): https://www.law.cornell.edu/regulations/washington/WAC-296-155-110 (S5 there).
- OR OAR 437-001-0765(13) (3-year meeting records incl. attendee names): https://www.law.cornell.edu/regulations/oregon/Or-Admin-Code-SS-437-001-0765 (S6 there).
- Raken Safety and Compliance Reports (export = primary compliance documentation): https://help.rakenapp.com/en/articles/14465445-safety-and-compliance-reports-in-raken (S7 there).
