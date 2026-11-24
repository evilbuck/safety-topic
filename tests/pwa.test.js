/**
 * tests/pwa.test.js
 * Contract tests for the PWA layer: the guarded registerPwa() helper,
 * the shared PWA asset/version constants, the sw.js source contract,
 * and the web app manifest. jsdom cannot execute a real service worker,
 * so sw.js is asserted via source-contract regexes and the precache list
 * via on-disk existence checks.
 */
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';

const repoRoot = path.resolve('./');

function makeFakeNavigator(registerImpl, hasContainer) {
  const nav = {};
  if (hasContainer === undefined || hasContainer) {
    nav.serviceWorker = {
      register: registerImpl || (() => Promise.resolve()),
    };
  }
  return nav;
}

function makeFakeLocation(protocol, hostname) {
  return { protocol, hostname };
}

/** Load a classic script source into a detached jsdom document. */
function loadClassicScript(src) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost/',
    runScripts: 'dangerously',
  });
  const el = dom.window.document.createElement('script');
  el.textContent = src;
  dom.window.document.body.appendChild(el);
  return dom;
}

const injectedScripts = [];
afterEach(() => {
  // Remove any script elements injected into the shared jsdom document.
  for (const el of injectedScripts.splice(0)) {
    el.remove();
  }
});

describe('registerPwa guard', () => {
  // Load pwa.js into the shared jsdom context once per test (fresh so the
  // auto-invocation at the end sees jsdom's plain navigator).
  function freshRegisterPwa() {
    const src = fs.readFileSync(path.join(repoRoot, 'pwa.js'), 'utf8');
    const el = global.document.createElement('script');
    el.textContent = src;
    global.document.body.appendChild(el);
    injectedScripts.push(el);
    return global.window.registerPwa;
  }

  it('returns false and never registers when serviceWorker container is absent', () => {
    const registerPwa = freshRegisterPwa();
    const nav = {}; // no serviceWorker property
    const loc = makeFakeLocation('https:', 'app.example.com');
    expect(registerPwa(nav, loc)).toBe(false);
  });

  it('returns false for a file: location even with a container present', () => {
    const registerPwa = freshRegisterPwa();
    let called = false;
    const nav = makeFakeNavigator(() => { called = true; });
    expect(registerPwa(nav, makeFakeLocation('file:', ''))).toBe(false);
    expect(registerPwa(nav, makeFakeLocation('file:', 'localhost'))).toBe(false);
    expect(called).toBe(false);
  });

  it('returns false for plain-http LAN IP and makes no register call', () => {
    const registerPwa = freshRegisterPwa();
    let called = false;
    const nav = makeFakeNavigator(() => { called = true; });
    const loc = makeFakeLocation('http:', '192.168.1.5');
    expect(registerPwa(nav, loc)).toBe(false);
    expect(called).toBe(false);
  });

  it('returns true and registers ./sw.js with updateViaCache none on https', () => {
    const registerPwa = freshRegisterPwa();
    const seen = [];
    const nav = makeFakeNavigator((...args) => { seen.push(args); return Promise.resolve(); });
    const loc = makeFakeLocation('https:', 'app.example.com');
    expect(registerPwa(nav, loc)).toBe(true);
    expect(seen).toEqual([['./sw.js', { updateViaCache: 'none' }]]);
  });

  it('registers for localhost and 127.0.0.1 over http', () => {
    const registerPwa = freshRegisterPwa();
    const seen = [];
    const nav = makeFakeNavigator((...args) => { seen.push(args); return Promise.resolve(); });
    expect(registerPwa(nav, makeFakeLocation('http:', 'localhost'))).toBe(true);
    expect(registerPwa(nav, makeFakeLocation('http:', '127.0.0.1'))).toBe(true);
    expect(seen).toEqual([
      ['./sw.js', { updateViaCache: 'none' }],
      ['./sw.js', { updateViaCache: 'none' }],
    ]);
  });

  it('warns without throwing when the register promise rejects', async () => {
    const registerPwa = freshRegisterPwa();
    const warns = [];
    const origWarn = console.warn;
    console.warn = (...args) => warns.push(args);
    try {
      const nav = makeFakeNavigator(() => Promise.reject(new Error('boom')));
      const loc = makeFakeLocation('https:', 'app.example.com');
      expect(() => registerPwa(nav, loc)).not.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(warns.length).toBeGreaterThan(0);
      expect(String(warns[0][0])).toContain('[SafetyTopic]');
    } finally {
      console.warn = origWarn;
    }
  });

  it('catches a synchronously throwing register and returns true', () => {
    const registerPwa = freshRegisterPwa();
    const warns = [];
    const origWarn = console.warn;
    console.warn = (...args) => warns.push(args);
    try {
      const nav = makeFakeNavigator(() => { throw new Error('sync boom'); });
      const loc = makeFakeLocation('https:', 'app.example.com');
      expect(registerPwa(nav, loc)).toBe(true);
      expect(warns.length).toBeGreaterThan(0);
      expect(String(warns[0][0])).toContain('[SafetyTopic]');
    } finally {
      console.warn = origWarn;
    }
  });
});

describe('pwa-assets.js classic-script contract', () => {
  const assetsSrc = fs.readFileSync(path.join(repoRoot, 'pwa-assets.js'), 'utf8');

  it('defines PWA_PRECACHE_ASSETS as a non-empty string array', () => {
    const dom = loadClassicScript(assetsSrc);
    const list = dom.window.eval('PWA_PRECACHE_ASSETS');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((entry) => typeof entry === 'string')).toBe(true);
  });

  it('has an on-disk file for every precache entry except ./', () => {
    const dom = loadClassicScript(assetsSrc);
    const list = dom.window.eval('PWA_PRECACHE_ASSETS');
    for (const entry of list) {
      if (entry === './') continue;
      const onDisk = fs.existsSync(path.join(repoRoot, entry));
      expect(onDisk, `precache entry missing on disk: ${entry}`).toBe(true);
    }
    expect(list).toContain('./');
  });
});

describe('sw.js source contract', () => {
  const swSrc = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');

  it('loads shared constants via importScripts', () => {
    expect(swSrc).toMatch(/importScripts\('\.\/pwa-assets\.js'\)/);
  });

  it('defines a positive integer PWA_CACHE_VERSION and builds the cache name from it', () => {
    const m = swSrc.match(/const PWA_CACHE_VERSION = (\d+)/);
    expect(m, 'sw.js must define PWA_CACHE_VERSION as an integer literal').not.toBeNull();
    expect(Number(m[1])).toBeGreaterThan(0);
    expect(swSrc).toMatch(/CACHE_NAME\s*=\s*'safetytopic-v'\s*\+\s*PWA_CACHE_VERSION/);
  });

  it('has an activate handler that deletes foreign caches', () => {
    expect(swSrc).toMatch(/addEventListener\('activate'/);
    expect(swSrc).toMatch(/caches\.keys\(\)/);
    expect(swSrc).toMatch(/caches\.delete\(/);
  });

  it('has a fetch handler with skipWaiting and clients.claim', () => {
    expect(swSrc).toMatch(/addEventListener\('fetch'/);
    expect(swSrc).toMatch(/skipWaiting\(\)/);
    expect(swSrc).toMatch(/clients\.claim\(\)/);
  });
});

describe('manifest.webmanifest contract', () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'manifest.webmanifest'), 'utf8'),
  );

  it('parses with required members', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });

  it('declares non-empty icons whose src exists on disk', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(fs.existsSync(path.join(repoRoot, icon.src)), `icon src missing: ${icon.src}`).toBe(true);
    }
  });
});
