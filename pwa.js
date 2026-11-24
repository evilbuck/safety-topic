'use strict';
/**
 * Registers the service worker when the environment supports it:
 * - no ServiceWorkerContainer → false (file://, old browsers): silent no-op.
 * - insecure context (not https:, not localhost/127.0.0.1) → false: silent
 *   no-op (LAN-IP plain HTTP, plain HTTP hosting).
 * - secure context → registers './sw.js' resolved relative to the page, so
 *   GitHub Pages project subpaths work; updateViaCache 'none' keeps sw.js
 *   and its importScripts() from being served stale from the HTTP cache
 *   during update checks. A rejected registration is warned, never
 *   swallowed or thrown.
 * @param {Navigator} [nav] - Dependency injection point (tests).
 * @param {Location} [loc] - Dependency injection point (tests).
 * @returns {boolean} True iff a registration was attempted.
 */
function registerPwa(nav, loc) {
  const n = nav || (typeof navigator !== 'undefined' ? navigator : null);
  const l = loc || (typeof location !== 'undefined' ? location : null);
  if (!n || !l || !('serviceWorker' in n)) return false;
  const secure =
    l.protocol === 'https:' ||
    (l.protocol === 'http:' &&
      (l.hostname === 'localhost' || l.hostname === '127.0.0.1'));
  if (!secure) return false;
  try {
    n.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch((err) => {
      console.warn('[SafetyTopic] Service worker registration failed:', err);
    });
    return true;
  } catch (err) {
    console.warn('[SafetyTopic] Service worker registration failed:', err);
    return true;
  }
}
registerPwa();
