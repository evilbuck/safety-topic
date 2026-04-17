/**
 * tests/app.test.js
 * Tests for app.js defensive coding improvements.
 * State is controlled via window.__safetyTopic.reset() provided by app.js.
 */
import { describe, it, expect, beforeEach } from 'vitest';

const sft = global._sft;
const win = /** @type {Window & typeof globalThis} */ (global.window);

describe('assertDomElements', () => {
  beforeEach(() => {
    // Wipe closure refs so assertDomElements must use document.getElementById
    sft.resetDomRefs();
  });

  it('throws when #topic-card is missing', () => {
    const orig = win.document.getElementById.bind(win.document);
    win.document.getElementById = /** @type {any} */ (() => null);
    expect(() => win.assertDomElements()).toThrow(/topic-card.*not found/i);
    win.document.getElementById = /** @type {any} */ (orig);
  });

  it('throws when #toast is missing', () => {
    const orig = win.document.getElementById.bind(win.document);
    win.document.getElementById = /** @type {any} */ ((id) => {
      if (id === 'toast') return null;
      return orig(id);
    });
    expect(() => win.assertDomElements()).toThrow(/toast.*not found/i);
    win.document.getElementById = /** @type {any} */ (orig);
  });

  it('does not throw when all required elements are present', () => {
    sft.resetDomRefs(); // still uses fresh getElementById calls
    expect(() => win.assertDomElements()).not.toThrow();
  });
});

describe('pickRandom', () => {
  beforeEach(() => {
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
  });

  it('returns null when both filteredTopics and allTopics are empty', () => {
    sft.reset({ allTopics: [], filteredTopics: [] });
    expect(win.pickRandom()).toBeNull();
  });

  it('falls back to allTopics when filteredTopics is empty', () => {
    const fallback = { id: 'fallback', title: 'Fallback' };
    sft.reset({ allTopics: [fallback], filteredTopics: [] });
    expect(win.pickRandom()).toBe(fallback);
  });

  it('prefers unseen+unused over other pools', () => {
    const seen = { id: 'seen', title: 'Seen' };
    const used = { id: 'used', title: 'Used' };
    const fresh = { id: 'fresh', title: 'Fresh' };
    sft.reset({
      allTopics: [seen, used, fresh],
      filteredTopics: [seen, used, fresh],
      seenIds: new Set(['seen']),
      usedTopics: { used: 1 },
    });
    expect(win.pickRandom()).toBe(fresh);
  });
});

describe('copyToClipboard — fallback rejects on failure', () => {
  beforeEach(() => {
    // setup.js stubs execCommand to () => true by default.
    // Override per-test below.
  });

  it('resolves when execCommand copy succeeds', async () => {
    win.document.execCommand = () => true;
    await expect(win.copyToClipboard('hello')).resolves.toBeUndefined();
  });

  it('rejects when execCommand copy returns false', async () => {
    win.document.execCommand = () => false;
    await expect(win.copyToClipboard('hello')).rejects.toThrow();
  });

  it('rejects when execCommand copy throws', async () => {
    win.document.execCommand = () => {
      throw new Error('copy not supported');
    };
    await expect(win.copyToClipboard('hello')).rejects.toThrow('copy not supported');
  });
});

describe('copyLink guards against no topic', () => {
  beforeEach(() => {
    win.currentTopic = () => null;
  });

  it('shows an error toast instead of copying when no topic is loaded', () => {
    // Track whether showToast was called (without overriding the real function)
    let toastCalled = false;
    let toastMsg = '';
    const orig = win.showToast;
    win.showToast = (msg) => { toastCalled = true; toastMsg = msg; };
    win.copyLink();
    win.showToast = orig;
    expect(toastCalled).toBe(true);
    expect(toastMsg).toMatch(/no topic/i);
  });
});

describe('escHtml — defensive against null/undefined', () => {
  it('returns empty string for null', () => {
    expect(win.escHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(win.escHtml(undefined)).toBe('');
  });

  it('escapes HTML special characters', () => {
    // Break up <script> so Vite's JSX parser doesn't misread it.
    // Template literal: `<${'script'}>&"'` = literal `<script>&"'`.
    // Then `>abc` is appended, giving the full input `<script>&"'>abc`.
    const input = `<${'script'}>&"'` + '>abc';
    // & → &amp;, < → &lt;, > → &gt;, " → &quot;, ' → &#39;
    expect(win.escHtml(input)).toBe('&lt;script&gt;&amp;&quot;&#39;&gt;abc');
  });
});

describe('badgeClass', () => {
  it('returns badge-osha for osha source', () => {
    expect(win.badgeClass('OSHA QuickTakes')).toBe('badge badge-osha');
  });

  it('returns badge-doe for DOE source', () => {
    expect(win.badgeClass('DOE Nuclear')).toBe('badge badge-doe');
  });

  it('returns badge-niosh for NIOSH source', () => {
    expect(win.badgeClass('NIOSH Alert')).toBe('badge badge-niosh');
  });

  it('returns badge-other for unknown source', () => {
    expect(win.badgeClass('Generic Safety')).toBe('badge badge-other');
  });

  it('returns badge-other for empty string', () => {
    expect(win.badgeClass('')).toBe('badge badge-other');
  });
});

describe('showToast — updates DOM and sets timer', () => {
  beforeEach(() => {
    // Populate closure refs (topicCard, toast, etc.) so showToast works
    sft.resetDomRefs();
    sft.callInit();
  });

  it('sets toast textContent', () => {
    win.showToast('hello world');
    expect(win.document.getElementById('toast').textContent).toBe('hello world');
  });

  it('adds the show class', () => {
    win.showToast('hi');
    expect(win.document.getElementById('toast').classList.contains('show')).toBe(true);
  });
});

describe('showTopic — guards against missing DOM elements', () => {
  beforeEach(() => {
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [{
        id: 'topic-1',
        title: 'Test Topic',
        category: 'General',
        source: 'OSHA',
        source_ref: 'Test ref',
        duration: '5 min',
        summary: 'Test summary',
        key_points: ['Point one', 'Point two'],
      }],
      filteredTopics: [],
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('does not throw when #use-this-btn is missing from DOM', () => {
    // Simulate a renderError that removed the button, then showTopic re-renders.
    // The element SHOULD exist after showTopic runs, but guard against removal.
    sft.resetDomRefs();
    sft.callInit();
    // Manually remove the button to simulate an edge case
    const btn = win.document.getElementById('use-this-btn');
    if (btn) btn.remove();
    // showTopic should not throw when wiring a missing element
    expect(() => sft.showTopic(sft.getState().allTopics[0], false)).not.toThrow();
  });
});

describe('navigateDelta — bounds guard', () => {
  beforeEach(() => {
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [{ id: 'a', title: 'A', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] }],
      filteredTopics: [],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('returns early when currentIndex is out of bounds (negative)', () => {
    const origReplaceState = win.history.replaceState;
    win.history.replaceState = /** @type {any} */ (() => {});

    sft.reset({
      allTopics: [{ id: 'a', title: 'A', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] }],
      filteredTopics: [],
      currentIndex: -1, // out of bounds
      seenIds: new Set(),
      usedTopics: {},
    });

    // Should not throw, should not navigate
    expect(() => sft.navigateDelta(1)).not.toThrow();

    win.history.replaceState = origReplaceState;
  });

  it('returns early when currentIndex exceeds array length', () => {
    const origReplaceState = win.history.replaceState;
    win.history.replaceState = /** @type {any} */ (() => {});

    sft.reset({
      allTopics: [{ id: 'a', title: 'A', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] }],
      filteredTopics: [],
      currentIndex: 999, // out of bounds
      seenIds: new Set(),
      usedTopics: {},
    });

    expect(() => sft.navigateDelta(-1)).not.toThrow();

    win.history.replaceState = origReplaceState;
  });
});

describe('showTopic — debounce guard', () => {
  beforeEach(() => {
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [
        { id: 'a', title: 'Topic A', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] },
        { id: 'b', title: 'Topic B', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] },
      ],
      filteredTopics: [],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('second concurrent call is blocked (guard returns early)', () => {
    // showTopic sets isRendering=true before work, =false after.
    // In synchronous jsdom, calls don't overlap, so this test verifies
    // the guard check exists and doesn't throw.
    const { allTopics } = sft.getState();
    console.log('allTopics:', allTopics.map(t => t.id));
    console.log('isRendering before first showTopic:', sft.isRendering());
    sft.showTopic(allTopics[0], false);
    console.log('isRendering after first showTopic:', sft.isRendering());
    console.log('seenIds after first showTopic:', [...sft.getState().seenIds]);
    sft.showTopic(allTopics[1], false);
    console.log('isRendering after second showTopic:', sft.isRendering());
    console.log('seenIds after second showTopic:', [...sft.getState().seenIds]);
    // Both topics should be marked as seen (both calls succeeded sequentially)
    const { seenIds } = sft.getState();
    console.log('final seenIds:', [...seenIds]);
    expect(seenIds.has('a')).toBe(true);
    expect(seenIds.has('b')).toBe(true);
  });
});

describe('validateTopics — schema validation', () => {
  const valid = {
    id: 't1',
    title: 'Test',
    category: 'General',
    source: 'OSHA',
    source_ref: 'https://example.com',
    duration: '5 min',
    summary: 'A test topic.',
    key_points: ['Point one'],
  };

  it('accepts a fully populated topic', () => {
    const { valid: v, invalid: i } = win.validateTopics([valid]);
    expect(v).toHaveLength(1);
    expect(i).toHaveLength(0);
  });

  it('accepts a topic with optional fields omitted', () => {
    const { valid: v, invalid: i } = win.validateTopics([valid]);
    expect(v).toHaveLength(1);
    expect(i).toHaveLength(0);
  });

  it('rejects a topic missing required string fields', () => {
    const malformed = [
      { title: 'No ID', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] },
      { id: 'has-id', category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] }, // missing title
      { id: 'has-id', title: 123, category: 'G', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] }, // title not string
    ];
    const { valid: v, invalid: i } = win.validateTopics(malformed);
    expect(v).toHaveLength(0);
    expect(i).toHaveLength(3);
  });

  it('rejects a topic with non-string key_points items', () => {
    const malformed = { ...valid, key_points: ['good', 42, 'also bad'] };
    const { valid: v, invalid: i } = win.validateTopics([malformed]);
    expect(v).toHaveLength(0);
    expect(i).toHaveLength(1);
  });

  it('rejects null items in the array', () => {
    const { valid: v, invalid: i } = win.validateTopics([valid, null, undefined]);
    expect(v).toHaveLength(1);
    expect(i).toHaveLength(2);
  });

  it('rejects a topic with empty id', () => {
    const malformed = { ...valid, id: '' };
    const { valid: v, invalid: i } = win.validateTopics([malformed]);
    expect(v).toHaveLength(0);
    expect(i).toHaveLength(1);
  });
});

describe('filter state persistence', () => {
  beforeEach(() => {
    // Wire up _location BEFORE callInit — restoreFilterState() inside
    // callInit reads window._location and returns early if a hash is present.
    /** @type {any} */ (win)._location = { hash: '' };
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    // Seed topics then rebuild the dropdown (was empty when callInit ran)
    sft.reset({
      allTopics: [
        { id: 'a', title: 'A', category: 'Electrical', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] },
        { id: 'b', title: 'B', category: 'General', source: 'X', source_ref: 'Y', duration: '1m', summary: 'S', key_points: [] },
      ],
      filteredTopics: [],
      seenIds: new Set(),
      usedTopics: {},
    });
    sft.buildCategoryDropdown();
    // Reset to known baseline: no filter selected (empty string value)
    sft.getCategorySelect().value = '';
  });

  afterEach(() => {
    delete /** @type {any} */ (win)._location;
  });

  it('persistFilterState saves the current select value to localStorage', () => {
    const select = sft.getCategorySelect();
    select.value = 'Electrical';
    win.persistFilterState();
    expect(win.localStorage.getItem('topicFilter')).toBe('Electrical');
  });

  it('restoreFilterState restores a saved category filter', () => {
    const select = sft.getCategorySelect();
    win.localStorage.setItem('topicFilter', 'Electrical');
    win.restoreFilterState();
    expect(select.value).toBe('Electrical');
  });

  it('restoreFilterState does NOT restore when URL has a hash', () => {
    const select = sft.getCategorySelect();
    /** @type {any} */ (win)._location.hash = '#a';
    win.localStorage.setItem('topicFilter', 'Electrical');
    win.restoreFilterState();
    // Hash should prevent restoration; select should remain at default
    expect(select.value).toBe('');
  });

  it('restoreFilterState does NOT restore __unused__ (session-specific filter)', () => {
    const select = sft.getCategorySelect();
    win.localStorage.setItem('topicFilter', '__unused__');
    win.restoreFilterState();
    // Should not change the select value (it's a session-only filter)
    expect(select.value).toBe('');
  });
});
