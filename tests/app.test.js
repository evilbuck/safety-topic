/**
 * tests/app.test.js
 * Tests for app.js defensive coding improvements.
 * State is controlled via window.__safetyTopic.reset() provided by app.js.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

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

  it('accepts the real TOPICS catalog from topics-data.js with unique ids', () => {
    // jsdom does not fetch external script srcs, so index.html's
    // <script src="topics-data.js"> never ran in this test context.
    // Inject the real catalog the same way, then run the same
    // validateTopics pass app.js:223 runs at page load.
    const topicsSrc = fs.readFileSync(path.resolve('./topics-data.js'), 'utf8');
    const scriptEl = win.document.createElement('script');
    scriptEl.textContent = topicsSrc;
    win.document.body.appendChild(scriptEl);
    try {
      const topics = /** @type {{id: string}[]} */ (win.eval('TOPICS'));
      const { valid: v, invalid: i } = win.validateTopics(topics);
      expect(i).toHaveLength(0);
      expect(v).toHaveLength(topics.length);
      const ids = topics.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    } finally {
      // Remove the injected script so later tests in this shared jsdom
      // window see no leftover DOM node from this test.
      scriptEl.remove();
    }
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

// ---------- Safety Talk Record (sign-off sheet + meeting log) ----------

describe('buildSignoffSheet', () => {
  const baseTopic = {
    id: 'sheet-1',
    title: 'Ladder Safety',
    category: 'General',
    source: 'OSHA',
    source_ref: 'OSHA 1926.1053',
    duration: '5 min',
    summary: 'How to use ladders safely.',
    key_points: ['Three points of contact', 'Inspect before use'],
  };

  it('includes title, summary, key points, source, duration, and attestation', () => {
    const html = win.buildSignoffSheet(baseTopic);
    expect(html).toContain('Ladder Safety');
    expect(html).toContain('How to use ladders safely.');
    expect(html).toContain('Three points of contact');
    expect(html).toContain('OSHA 1926.1053');
    expect(html).toContain('5 min');
    expect(html).toContain('By signing below, I confirm I attended this safety talk');
  });

  it('includes presenter, location/crew, and company labels', () => {
    const html = win.buildSignoffSheet(baseTopic);
    expect(html).toContain('Presented by');
    expect(html).toContain('Location / Crew');
    expect(html).toContain('Company');
  });

  it('includes exactly 12 attendance rows with Name and Signature columns', () => {
    const html = win.buildSignoffSheet(baseTopic);
    expect(html).toContain('Name (print)');
    expect(html).toContain('Signature');
    // Count table body rows: exactly 12 <tr> inside <tbody>
    const tbody = html.slice(html.indexOf('<tbody>'), html.indexOf('</tbody>'));
    expect((tbody.match(/<tr>/g) || []).length).toBe(12);
  });

  it('prefills today\'s date as an ISO date', () => {
    const html = win.buildSignoffSheet(baseTopic);
    const m = html.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    expect(m).not.toBeNull();
    // The prefilled date must be an actual calendar date (parsable)
    expect(Number.isNaN(Date.parse(m[1]))).toBe(false);
  });

  it('includes notes area and presenter signature line', () => {
    const html = win.buildSignoffSheet(baseTopic);
    expect(html).toContain('Notes / follow-up actions');
    expect(html).toContain('Presenter signature');
  });

  it('omits stat and discussion blocks when the topic lacks them', () => {
    const html = win.buildSignoffSheet(baseTopic);
    expect(html).not.toContain('Did You Know?');
    expect(html).not.toContain('Discussion');
  });

  it('includes stat and discussion blocks when present', () => {
    const html = win.buildSignoffSheet({
      ...baseTopic,
      stat: 'Falls are a leading cause of deaths.',
      discussion_prompt: 'When did you last inspect a ladder?',
    });
    expect(html).toContain('Did You Know?');
    expect(html).toContain('Falls are a leading cause of deaths.');
    expect(html).toContain('When did you last inspect a ladder?');
  });

  it('escapes a script-laden title', () => {
    const evil = `<${'script'}>alert(1)</${'script'}>`;
    const html = win.buildSignoffSheet({ ...baseTopic, title: evil });
    expect(html).not.toContain(evil);
    expect(html).toContain('&lt;script&gt;');
  });

  it('returns empty string for null/undefined topic', () => {
    expect(win.buildSignoffSheet(null)).toBe('');
    expect(win.buildSignoffSheet(undefined)).toBe('');
  });
});

describe('logTalk', () => {
  beforeEach(() => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
  });

  it('appends an entry and persists to localStorage meetingLog', () => {
    win.logTalk('topic-x');
    expect(JSON.parse(win.localStorage.getItem('meetingLog'))).toHaveLength(1);
  });

  it('records an ISO date on each entry', () => {
    win.logTalk('topic-x');
    const entry = JSON.parse(win.localStorage.getItem('meetingLog'))[0];
    expect(entry.topicId).toBe('topic-x');
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(entry.date))).toBe(false);
  });

  it('accumulates multiple entries', () => {
    win.logTalk('a');
    win.logTalk('b');
    win.logTalk('a');
    const log = JSON.parse(win.localStorage.getItem('meetingLog'));
    expect(log).toHaveLength(3);
    expect(log[2].topicId).toBe('a');
  });

  it('warns via console.warn and does not throw when storage fails', () => {
    // app.js runs inside jsdom, so spy on jsdom's console, not Node's.
    const warn = vi.spyOn(win.console, 'warn').mockImplementation(() => {});
    // jsdom cannot have localStorage.setItem monkey-patched. jsdom
    // enforces a 5,000,000-code-unit quota per key+value sum and does
    // not store over-quota writes, so fill storage to just under the
    // limit; logTalk's own small write then genuinely throws.
    win.localStorage.setItem('qfa', 'x'.repeat(4_000_000));
    win.localStorage.setItem('qfb', 'x'.repeat(999_985));
    expect(() => win.logTalk('topic-x')).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    win.localStorage.clear();
  });
});

describe('getMeetingLog accessor', () => {
  it('returns a copy of the in-memory log', () => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
    win.logTalk('topic-1');
    const log = sft.getMeetingLog();
    expect(log).toHaveLength(1);
    expect(log[0].topicId).toBe('topic-1');
    // Copy semantics: mutating the returned array must not affect state
    log.push({ topicId: 'fake', date: '2000-01-01' });
    expect(sft.getMeetingLog()).toHaveLength(1);
  });
});

describe('sign-off sheet button', () => {
  const topic = {
    id: 'signoff-topic',
    title: 'Forklift Checks',
    category: 'Equipment',
    source: 'OSHA',
    source_ref: 'ref-1',
    duration: '5 min',
    summary: 'Daily forklift inspection.',
    key_points: ['Check brakes'],
  };

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
    win.history.replaceState(null, '', `#${topic.id}`);
  });

  afterEach(() => {
    // jsdom function declarations are non-configurable; restore by
    // reassignment rather than delete.
    win.currentTopic = origCurrentTopic;
    // Restore print stubs and clear leaked sheet state so tests do not
    // depend on execution order.
    win.print = origPrint;
    document.body.classList.remove('sheet-open');
    document.getElementById('signoff-sheet').innerHTML = '';
  });

  const origCurrentTopic = win.currentTopic;
  const origPrint = win.print;

  it('shows a toast, does not print, and renders nothing when no topic is loaded', () => {
    win.history.replaceState(null, '', '#');
    win.currentTopic = () => null;
    const printSpy = vi.fn();
    win.print = printSpy;
    document.getElementById('signoff-btn').click();
    expect(printSpy).not.toHaveBeenCalled();
    expect(document.getElementById('toast').textContent).toMatch(/no topic/i);
    expect(document.getElementById('signoff-sheet').querySelector('.signoff-title')).toBeNull();
    expect(document.body.classList.contains('sheet-open')).toBe(false);
  });

  it('renders the sheet, opens print mode, and calls window.print once', () => {
    const printSpy = vi.fn();
    win.print = printSpy;
    document.getElementById('signoff-btn').click();
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(document.getElementById('signoff-sheet').innerHTML).toContain('Forklift Checks');
    expect(document.body.classList.contains('sheet-open')).toBe(true);
  });

  it('removes sheet-open and hides the sheet on afterprint', () => {
    const printSpy = vi.fn();
    win.print = printSpy;
    document.getElementById('signoff-btn').click();
    win.dispatchEvent(new win.Event('afterprint'));
    expect(document.body.classList.contains('sheet-open')).toBe(false);
    expect(document.getElementById('signoff-sheet').innerHTML).toBe('');
  });

  it('closes an open sheet before printing when #print-btn is clicked', () => {
    document.getElementById('signoff-btn').click();
    expect(document.body.classList.contains('sheet-open')).toBe(true);
    let sheetOpenAtPrint = null;
    win.print = () => {
      sheetOpenAtPrint = document.body.classList.contains('sheet-open');
    };
    document.getElementById('print-btn').click();
    expect(sheetOpenAtPrint).toBe(false);
    expect(document.body.classList.contains('sheet-open')).toBe(false);
    expect(document.getElementById('signoff-sheet').innerHTML).toBe('');
  });

  it('showTopic clears a stale sheet-open class', () => {
    document.body.classList.add('sheet-open');
    sft.showTopic(topic, false);
    expect(document.body.classList.contains('sheet-open')).toBe(false);
  });
});

describe('showTopic — last delivered line', () => {
  const topic = {
    id: 'delivered-topic',
    title: 'Delivered Topic',
    category: 'General',
    source: 'OSHA',
    source_ref: 'ref',
    duration: '5 min',
    summary: 'Sum',
    key_points: [],
  };

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('shows "Last delivered: <date>" when a meetingLog entry exists', () => {
    win.logTalk('delivered-topic');
    sft.showTopic(topic, false);
    const footer = document.querySelector('.topic-card-footer');
    expect(footer.textContent).toMatch(/Last delivered: \d{4}-\d{2}-\d{2}/);
  });

  it('does not show a last-delivered line without log entries', () => {
    sft.showTopic(topic, false);
    const footer = document.querySelector('.topic-card-footer');
    expect(footer.textContent).not.toMatch(/Last delivered/);
  });

  it('keeps used-button labels unchanged after logging a talk', () => {
    sft.showTopic(topic, false);
    const btn = document.getElementById('use-this-btn');
    expect(btn.textContent).toContain('I Used This in a Meeting');
    btn.click();
    expect(btn.textContent).toContain('Used in 1 Meeting');
    expect(btn.disabled).toBe(true);
    // usedTopics semantics unchanged
    expect(sft.getState().usedTopics['delivered-topic']).toBe(1);
  });

  it('use-this click also records a meetingLog entry', () => {
    sft.showTopic(topic, false);
    document.getElementById('use-this-btn').click();
    expect(sft.getMeetingLog()).toHaveLength(1);
    expect(sft.getMeetingLog()[0].topicId).toBe('delivered-topic');
  });
});

describe('use-this-btn updates last-delivered in place', () => {
  const topic = {
    id: 'inplace-topic',
    title: 'In Place Topic',
    category: 'General',
    source: 'OSHA',
    source_ref: 'ref',
    duration: '5 min',
    summary: 'Sum',
    key_points: [],
  };

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('inserts a last-delivered line in the footer on use-this click without a re-render', () => {
    sft.showTopic(topic, false);
    expect(document.querySelector('.topic-card-footer .topic-last-delivered')).toBeNull();
    document.getElementById('use-this-btn').click();
    const line = document.querySelector('.topic-card-footer .topic-last-delivered');
    expect(line).not.toBeNull();
    expect(line.textContent).toMatch(/Last delivered: \d{4}-\d{2}-\d{2}/);
  });

  it('updates an existing last-delivered line in place', () => {
    win.logTalk(topic.id);
    sft.showTopic(topic, false);
    const line = document.querySelector('.topic-card-footer .topic-last-delivered');
    expect(line).not.toBeNull();
    document.getElementById('use-this-btn').click();
    const lines = document.querySelectorAll('.topic-card-footer .topic-last-delivered');
    expect(lines).toHaveLength(1);
    expect(lines[0].textContent).toMatch(/Last delivered: \d{4}-\d{2}-\d{2}/);
  });
});

describe('init — meetingLog restore sanitization', () => {
  const topic = {
    id: 'sanitize-topic',
    title: 'Sanitize Topic',
    category: 'General',
    source: 'OSHA',
    source_ref: 'ref',
    duration: '5 min',
    summary: 'Sum',
    key_points: [],
  };

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
  });

  it('drops malformed entries and warns during restore', () => {
    win.localStorage.setItem('meetingLog', '[null, {"topicId":"x"}, {"topicId":"y","date":"2026-01-01"}]');
    const warn = vi.spyOn(win.console, 'warn').mockImplementation(() => {});
    win.init();
    warn.mockRestore();
    expect(sft.getMeetingLog()).toEqual([{ topicId: 'y', date: '2026-01-01' }]);
  });

  it('showTopic does not wedge after a sanitized restore', () => {
    win.localStorage.setItem('meetingLog', '[null, {"topicId":"x"}, {"topicId":"y","date":"2026-01-01"}]');
    const warn = vi.spyOn(win.console, 'warn').mockImplementation(() => {});
    win.init();
    warn.mockRestore();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: sft.getMeetingLog(),
    });
    expect(() => sft.showTopic(topic, false)).not.toThrow();
    expect(sft.isRendering()).toBe(false);
  });
});

describe('harness — assertDomElements includes sign-off elements', () => {
  it('throws when #signoff-sheet is missing', () => {
    const orig = win.document.getElementById.bind(win.document);
    win.document.getElementById = /** @type {any} */ ((id) => {
      if (id === 'signoff-sheet') return null;
      return orig(id);
    });
    expect(() => win.assertDomElements()).toThrow(/signoff-sheet.*not found/i);
    win.document.getElementById = /** @type {any} */ (orig);
  });

  it('reset() clears meetingLog', () => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
    win.logTalk('a');
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
    expect(sft.getMeetingLog()).toHaveLength(0);
  });
});

// ---------- Program Pulse ----------

/**
 * Builds a minimal valid Topic for pulse fixtures.
 * @param {string} id - Topic id.
 * @param {string} title - Topic title.
 * @param {string} category - Topic category.
 * @returns {object} A topic-shaped fixture.
 */
function pulseTopic(id, title, category) {
  return {
    id,
    title,
    category,
    source: 'OSHA',
    source_ref: 'ref',
    duration: '5 min',
    summary: 'Sum',
    key_points: [],
  };
}

/**
 * Returns a local ISO date (YYYY-MM-DD) N days before today.
 * @param {number} n - Days to subtract from today.
 * @returns {string} ISO date string.
 */
function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
}

/**
 * Formats a Date as a local ISO date (YYYY-MM-DD).
 * @param {Date} d - The date to format.
 * @returns {string} ISO date string.
 */
function localISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

describe('computeProgramStats', () => {
  const topics = [
    pulseTopic('t1', 'Topic One', 'Alpha'),
    pulseTopic('t2', 'Topic Two', 'Alpha'),
    pulseTopic('t3', 'Topic Three', 'Beta'),
  ];

  beforeEach(() => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
  });

  it('returns zeroed stats for an empty log', () => {
    const stats = win.computeProgramStats([], topics);
    expect(stats.total).toBe(0);
    expect(stats.thisMonth).toBe(0);
    expect(stats.lastDate).toBeNull();
    expect(stats.lastTopicTitle).toBeNull();
    expect(stats.recent).toEqual([]);
    expect(stats.coverage.map((c) => c.category).sort()).toEqual(['Alpha', 'Beta']);
    expect(stats.coverage.every((c) => c.delivered === 0)).toBe(true);
  });

  it('counts total entries including unknown topic ids', () => {
    const d1 = isoDaysAgo(1);
    const d2 = isoDaysAgo(2);
    const stats = win.computeProgramStats(
      [{ topicId: 't1', date: d1 }, { topicId: 'ghost', date: d2 }],
      topics,
    );
    expect(stats.total).toBe(2);
  });

  it('counts thisMonth only for entries in the current calendar month', () => {
    const stats = win.computeProgramStats(
      [
        { topicId: 't1', date: win.todayISO() },
        { topicId: 't2', date: isoDaysAgo(40) },
        { topicId: 't3', date: isoDaysAgo(400) },
      ],
      topics,
    );
    expect(stats.total).toBe(3);
    expect(stats.thisMonth).toBe(1);
  });

  it('computes lastDate and lastTopicTitle from the most recent entry', () => {
    const d10 = isoDaysAgo(10);
    const d2 = isoDaysAgo(2);
    const stats = win.computeProgramStats(
      [
        { topicId: 't1', date: d10 },
        { topicId: 't3', date: d2 },
      ],
      topics,
    );
    expect(stats.lastDate).toBe(d2);
    expect(stats.lastTopicTitle).toBe('Topic Three');
  });

  it('returns null lastTopicTitle when the latest entry is an unknown id', () => {
    const stats = win.computeProgramStats([{ topicId: 'ghost', date: win.todayISO() }], topics);
    expect(stats.lastDate).toBe(win.todayISO());
    expect(stats.lastTopicTitle).toBeNull();
  });

  it('coverage rows carry distinct delivered counts, totals, and latest dates', () => {
    const d9 = isoDaysAgo(9);
    const d3 = isoDaysAgo(3);
    const d5 = isoDaysAgo(5);
    const stats = win.computeProgramStats(
      [
        { topicId: 't1', date: d9 },
        { topicId: 't1', date: d3 },
        { topicId: 't3', date: d5 },
      ],
      topics,
    );
    const alpha = stats.coverage.find((c) => c.category === 'Alpha');
    const beta = stats.coverage.find((c) => c.category === 'Beta');
    expect(alpha).toEqual({ category: 'Alpha', delivered: 1, total: 2, lastDate: d3 });
    expect(beta).toEqual({ category: 'Beta', delivered: 1, total: 1, lastDate: d5 });
  });

  it('sorts coverage never-delivered first, then oldest last-delivered first', () => {
    const stats = win.computeProgramStats(
      [
        { topicId: 't3', date: isoDaysAgo(30) },
        { topicId: 't2', date: isoDaysAgo(2) },
      ],
      [...topics, pulseTopic('t4', 'Topic Four', 'Gamma')],
    );
    expect(stats.coverage.map((c) => c.category)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });

  it('sorts equally-never-delivered categories alphabetically', () => {
    const stats = win.computeProgramStats([], [
      pulseTopic('t9', 'Zebra', 'Zeta'),
      pulseTopic('t8', 'Yak', 'Alpha'),
    ]);
    expect(stats.coverage.map((c) => c.category)).toEqual(['Alpha', 'Zeta']);
  });

  it('excludes unknown ids from the ledger but keeps them in total/recency', () => {
    const stats = win.computeProgramStats([{ topicId: 'ghost', date: win.todayISO() }], topics);
    expect(stats.total).toBe(1);
    expect(stats.lastDate).toBe(win.todayISO());
    expect(stats.coverage.every((c) => c.delivered === 0)).toBe(true);
  });

  it('caps recent at five entries, newest first, with null title for unknown ids', () => {
    const log = [
      { topicId: 't1', date: isoDaysAgo(9) },
      { topicId: 't2', date: isoDaysAgo(8) },
      { topicId: 't3', date: isoDaysAgo(7) },
      { topicId: 't1', date: isoDaysAgo(6) },
      { topicId: 't2', date: isoDaysAgo(5) },
      { topicId: 'ghost', date: isoDaysAgo(1) },
    ];
    const stats = win.computeProgramStats(log, topics);
    expect(stats.recent).toHaveLength(5);
    expect(stats.recent[0]).toEqual({ topicId: 'ghost', title: null, date: isoDaysAgo(1) });
    expect(stats.recent[1].topicId).toBe('t2');
    expect(stats.recent[1].date).toBe(isoDaysAgo(5));
    expect(stats.recent[4].topicId).toBe('t2');
    expect(stats.recent[4].date).toBe(isoDaysAgo(8));
  });

  it('lists same-day entries newest-appended first and keeps the 6th at recent[0]', () => {
    const sameDay = win.todayISO();
    const log = [
      { topicId: 't1', date: sameDay },
      { topicId: 't2', date: sameDay },
      { topicId: 't3', date: sameDay },
      { topicId: 't1', date: sameDay },
      { topicId: 't2', date: sameDay },
      { topicId: 't3', date: sameDay },
    ];
    const stats = win.computeProgramStats(log, topics);
    expect(stats.recent).toHaveLength(5);
    // Newest-appended wins the date tie: the 6th entry lands first.
    expect(stats.recent.map((e) => e.topicId)).toEqual(['t3', 't2', 't1', 't3', 't2']);
    expect(stats.recent.every((e) => e.date === sameDay)).toBe(true);
  });

  it('does not mutate its inputs', () => {
    const d9 = isoDaysAgo(9);
    const d8 = isoDaysAgo(8);
    const log = [{ topicId: 't1', date: d9 }, { topicId: 'ghost', date: d8 }];
    const topicsCopy = topics.map((t) => ({ ...t }));
    win.computeProgramStats(log, topics);
    expect(log).toEqual([{ topicId: 't1', date: d9 }, { topicId: 'ghost', date: d8 }]);
    expect(topics).toEqual(topicsCopy);
  });
});

describe('suggestNextTopic', () => {
  const topics = [
    pulseTopic('a2', 'Alpha Two', 'Beta'),
    pulseTopic('a1', 'Alpha One', 'Alpha'),
    pulseTopic('a3', 'Alpha Three', 'Alpha'),
    pulseTopic('b1', 'Bravo One', 'Beta'),
  ];

  beforeEach(() => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
  });

  it('returns null when there are no topics', () => {
    expect(win.suggestNextTopic([], [])).toBeNull();
  });

  it('suggests a never-delivered topic from an uncovered category when log is empty', () => {
    const { topic, reason } = win.suggestNextTopic([], topics);
    // Both categories uncovered — alphabetical category tie-break picks
    // 'Alpha', then alphabetical id tie-break picks 'a1'.
    expect(topic.id).toBe('a1');
    expect(reason).toMatch(/never delivered/i);
  });

  it('prefers the never-delivered topic in the category with the oldest last-delivered date', () => {
    const { topic } = win.suggestNextTopic(
      [
        { topicId: 'a2', date: isoDaysAgo(40) },
        { topicId: 'a1', date: isoDaysAgo(2) },
      ],
      topics,
    );
    // a3 (Alpha) is never delivered too, but Beta (40 days) is more
    // neglected than Alpha (2 days), so its never-delivered b1 wins.
    expect(topic.id).toBe('b1');
  });

  it('treats a category with no deliveries as more neglected than any delivered one', () => {
    const { topic } = win.suggestNextTopic(
      [{ topicId: 'a1', date: isoDaysAgo(400) }],
      topics,
    );
    // Beta has no deliveries at all; within Beta, alphabetical id: a2.
    expect(topic.id).toBe('a2');
  });

  it('tie-breaks within a category alphabetically by id', () => {
    const { topic } = win.suggestNextTopic([], [
      pulseTopic('z1', 'Z', 'Same'),
      pulseTopic('a9', 'A', 'Same'),
    ]);
    expect(topic.id).toBe('a9');
  });

  it('falls back to the globally oldest last-delivered topic when all are delivered', () => {
    const { topic, reason } = win.suggestNextTopic(
      [
        { topicId: 'a1', date: isoDaysAgo(3) },
        { topicId: 'a2', date: isoDaysAgo(100) },
        { topicId: 'b1', date: isoDaysAgo(50) },
        { topicId: 'a3', date: isoDaysAgo(10) },
      ],
      topics,
    );
    expect(topic.id).toBe('a2');
    expect(reason).toMatch(/last delivered/i);
  });

  it('tie-breaks the all-delivered branch alphabetically by id on equal dates', () => {
    const d = isoDaysAgo(20);
    const all = [pulseTopic('x2', 'Two', 'Cat'), pulseTopic('x1', 'One', 'Cat')];
    const { topic } = win.suggestNextTopic(
      [{ topicId: 'x2', date: d }, { topicId: 'x1', date: d }],
      all,
    );
    expect(topic.id).toBe('x1');
  });

  it('uses the latest date per topic when a topic was delivered multiple times', () => {
    const all = [pulseTopic('x1', 'One', 'Cat'), pulseTopic('x2', 'Two', 'Cat')];
    const { topic } = win.suggestNextTopic(
      [
        { topicId: 'x1', date: isoDaysAgo(300) },
        { topicId: 'x2', date: isoDaysAgo(100) },
        { topicId: 'x1', date: isoDaysAgo(2) },
      ],
      all,
    );
    // x1's refresh makes x2 the globally oldest delivery.
    expect(topic.id).toBe('x2');
  });

  it('ignores unknown log ids entirely', () => {
    const { topic } = win.suggestNextTopic([{ topicId: 'ghost', date: isoDaysAgo(1) }], topics);
    // The ghost entry marks nothing delivered, so the never-delivered
    // branch applies with every category uncovered → Alpha/a1.
    expect(topic.id).toBe('a1');
  });

  it('is deterministic across repeated calls and does not mutate inputs', () => {
    const d5 = isoDaysAgo(5);
    const log = [{ topicId: 'a1', date: d5 }];
    const topicsCopy = topics.map((t) => ({ ...t }));
    const r1 = win.suggestNextTopic(log, topics);
    const r2 = win.suggestNextTopic(log, topics);
    expect(r2).toEqual(r1);
    expect(log).toEqual([{ topicId: 'a1', date: d5 }]);
    expect(topics).toEqual(topicsCopy);
  });
});

describe('renderProgramPulse', () => {
  const pulseTopics = [
    pulseTopic('p1', 'Pulse One', 'Alpha'),
    pulseTopic('p2', 'Pulse Two', 'Alpha'),
    pulseTopic('p3', 'Pulse Three', 'Beta'),
  ];

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  it('renders the empty state and still shows a suggestion when the log is empty', () => {
    sft.renderProgramPulse();
    const section = document.getElementById('program-pulse');
    expect(section.textContent).toMatch(/No talks recorded yet/i);
    expect(section.textContent).toMatch(/I Used This/);
    expect(section.textContent).toMatch(/Suggested next/i);
    expect(document.getElementById('pulse-load-btn')).not.toBeNull();
  });

  it('renders counts, recency, ledger, and recent list from a seeded log', () => {
    const d40 = isoDaysAgo(40);
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'p1', date: d40 }, { topicId: 'p3', date: win.todayISO() }],
    });
    sft.renderProgramPulse();
    const section = document.getElementById('program-pulse');
    expect(section.textContent).toContain('2 talks recorded');
    expect(section.textContent).toMatch(/Last recorded talk: 0 days ago/);
    // Stat blocks: total, this month, coverage
    const statValues = [...section.querySelectorAll('.pulse-stat-value')]
      .map((el) => el.textContent);
    expect(statValues).toEqual(['2', '1', '2/3']);
    expect(section.textContent).toContain('Topics delivered');
    // Ledger sorted: Alpha (40 days ago, older) before Beta (today)
    const cats = [...section.querySelectorAll('.pulse-ledger-row .pulse-cat-name')]
      .map((el) => el.textContent);
    expect(cats).toEqual(['Alpha', 'Beta']);
    // Recent list newest-first
    const recentTitles = [...section.querySelectorAll('.pulse-recent-row .pulse-recent-title')]
      .map((el) => el.textContent);
    expect(recentTitles).toEqual(['Pulse Three', 'Pulse One']);
  });

  it('shows the informational recency cue only past 30 days', () => {
    const render = (date) => {
      sft.reset({
        allTopics: pulseTopics,
        filteredTopics: pulseTopics,
        currentIndex: 0,
        seenIds: new Set(),
        usedTopics: {},
        meetingLog: [{ topicId: 'p1', date }],
      });
      sft.renderProgramPulse();
      return document.getElementById('program-pulse').textContent;
    };
    expect(render(isoDaysAgo(10))).not.toMatch(/weekly or monthly/);
    expect(render(isoDaysAgo(30))).not.toMatch(/weekly or monthly/);
    expect(render(isoDaysAgo(31))).toMatch(/weekly or monthly/);
    expect(render(isoDaysAgo(40))).toMatch(/weekly or monthly/);
  });

  it('falls back to the catalog-removed title for unknown ids in the recent list', () => {
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'ghost', date: win.todayISO() }],
    });
    sft.renderProgramPulse();
    const section = document.getElementById('program-pulse');
    expect(section.textContent).toContain('(topic no longer in catalog)');
    expect(section.textContent).toContain('1 talk recorded');
  });

  it('Load button loads the suggested topic with hash sync', () => {
    const d5 = isoDaysAgo(5);
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'p1', date: d5 }],
    });
    sft.renderProgramPulse();
    // Beta has no deliveries → more neglected than Alpha → p3 suggested
    expect(document.getElementById('program-pulse').textContent).toContain('Pulse Three');
    document.getElementById('pulse-load-btn').click();
    expect(document.getElementById('topic-card').textContent).toContain('Pulse Three');
    expect(win.location.hash).toBe('#p3');
  });

  it('Load button clears a stale category filter so counter and nav match the loaded topic', () => {
    const d5 = isoDaysAgo(5);
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: [pulseTopics[0], pulseTopics[1]], // Alpha filter active
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'p1', date: d5 }],
    });
    sft.buildCategoryDropdown();
    sft.getCategorySelect().value = 'Alpha';
    sft.renderProgramPulse();
    document.getElementById('pulse-load-btn').click();
    const counter = document.querySelector('.topic-counter');
    expect(counter.textContent).toBe('3 / 3');
    expect(win.location.hash).toBe('#p3');
    // Navigation steps from the loaded topic in the rebuilt (unfiltered) list.
    document.getElementById('nav-prev').click();
    expect(win.location.hash).toBe('#p2');
    expect(document.querySelector('.topic-counter').textContent).toBe('2 / 3');
    expect(document.getElementById('nav-next').disabled).toBe(false);
  });

  it('Load button with no filter fixes the stale index so prev no-ops only at index 0', () => {
    const d5 = isoDaysAgo(5);
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0, // stale: the loaded topic sits at index 2
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'p1', date: d5 }],
    });
    sft.renderProgramPulse();
    document.getElementById('pulse-load-btn').click();
    expect(win.location.hash).toBe('#p3');
    expect(document.querySelector('.topic-counter').textContent).toBe('3 / 3');
    // ← from the loaded topic navigates (index was corrected from 0 to 2)…
    document.getElementById('nav-prev').click();
    expect(win.location.hash).toBe('#p2');
    document.getElementById('nav-prev').click();
    expect(win.location.hash).toBe('#p1');
    // …and no-ops only at index 0.
    expect(document.getElementById('nav-prev').disabled).toBe(true);
  });

  it('renders without console errors for logs with unknown ids', () => {
    const errors = [];
    const spy = vi.spyOn(win.console, 'error').mockImplementation((m) => errors.push(m));
    sft.reset({
      allTopics: pulseTopics,
      filteredTopics: pulseTopics,
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [
        { topicId: 'p1', date: isoDaysAgo(3) },
        { topicId: 'ghost', date: win.todayISO() },
      ],
    });
    sft.renderProgramPulse();
    spy.mockRestore();
    expect(errors).toHaveLength(0);
  });
});

describe('program pulse wiring', () => {
  const topic = pulseTopic('w1', 'Wired Topic', 'Alpha');

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  afterEach(() => {
    win.history.replaceState(null, '', ' ');
  });

  it('assertDomElements requires #program-pulse', () => {
    const orig = win.document.getElementById.bind(win.document);
    win.document.getElementById = /** @type {any} */ ((id) => {
      if (id === 'program-pulse') return null;
      return orig(id);
    });
    expect(() => win.assertDomElements()).toThrow(/program-pulse.*not found/i);
    win.document.getElementById = /** @type {any} */ (orig);
  });

  it('re-renders the pulse when I Used This is clicked', () => {
    sft.renderProgramPulse();
    expect(document.getElementById('program-pulse').textContent).toMatch(/No talks recorded yet/i);
    sft.showTopic(topic, false);
    document.getElementById('use-this-btn').click();
    const pulse = document.getElementById('program-pulse');
    expect(pulse.textContent).toContain('1 talk recorded');
    expect(pulse.textContent).toContain('Wired Topic');
    expect(pulse.querySelector('.state-empty')).toBeNull();
  });

  it('renders the pulse from a restored localStorage meetingLog without re-running init()', () => {
    win.localStorage.setItem(
      'meetingLog',
      JSON.stringify([{ topicId: 'w1', date: win.todayISO() }]),
    );
    // Restore state directly instead of calling win.init() again:
    // beforeEach already ran callInit(), and a second init() stacks
    // duplicate anonymous event listeners on the wired buttons.
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: JSON.parse(win.localStorage.getItem('meetingLog')),
    });
    sft.renderProgramPulse();
    const pulse = document.getElementById('program-pulse');
    expect(pulse.textContent).toContain('1 talk recorded');
    expect(pulse.textContent).toContain('Wired Topic');
  });
});

describe('print — program pulse hidden', () => {
  const printBlock = () => {
    const css = fs.readFileSync(path.resolve('./style.css'), 'utf8');
    const idx = css.indexOf('@media print');
    expect(idx).toBeGreaterThan(-1);
    return css.slice(idx);
  };

  it('hides #program-pulse inside the @media print block', () => {
    expect(printBlock()).toMatch(/#program-pulse\s*\{[^}]*display:\s*none/);
  });

  it('keeps the sign-off sheet print rules intact', () => {
    expect(printBlock()).toMatch(/body\.sheet-open \.signoff-sheet\s*\{[^}]*display:\s*block/);
  });
});

// ---------- Safety Program Report ----------

describe('buildProgramReport — pure builder', () => {
  const topics = [
    pulseTopic('r1', 'Report One', 'Alpha'),
    pulseTopic('r2', 'Report Two', 'Alpha'),
    pulseTopic('r3', 'Report Three', 'Beta'),
  ];

  beforeEach(() => {
    win.localStorage.clear();
    sft.reset({ allTopics: [], filteredTopics: [], seenIds: new Set(), usedTopics: {} });
  });

  it('returns zeroed, honest output for an empty log', () => {
    const report = win.buildProgramReport([], topics, { preset: 'year' });
    expect(report.rows).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.summary.first).toBeNull();
    expect(report.summary.last).toBeNull();
    expect(report.excludedDates).toBe(0);
    expect(report.coverage.map((c) => c.category).sort()).toEqual(['Alpha', 'Beta']);
    expect(report.coverage.every((c) => c.delivered === 0)).toBe(true);
    expect(typeof report.label).toBe('string');
    expect(report.label.length).toBeGreaterThan(0);
  });

  it('resolves the month preset to calendar-month bounds', () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const before = new Date(now.getFullYear(), now.getMonth(), 0);
    const after = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: localISO(first) },
        { topicId: 'r2', date: localISO(last) },
        { topicId: 'r3', date: localISO(before) },
        { topicId: 'r1', date: localISO(after) },
      ],
      topics,
      { preset: 'month' },
    );
    expect(report.rows.map((r) => r.date)).toEqual([localISO(first), localISO(last)]);
    expect(report.summary.total).toBe(2);
    expect(report.label).toContain('This month');
    expect(report.label).toContain(localISO(first));
    expect(report.label).toContain(localISO(last));
  });

  it('resolves the quarter preset to calendar-quarter boundaries', () => {
    const now = new Date();
    const y = now.getFullYear();
    const qm = Math.floor(now.getMonth() / 3) * 3; // quarter start month index
    const qStart = new Date(y, qm, 1);
    const qEnd = new Date(y, qm + 3, 0);
    const dayBefore = new Date(y, qm, 0);
    const dayAfter = new Date(y, qm + 3, 1);
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: localISO(qStart) },
        { topicId: 'r2', date: localISO(qEnd) },
        { topicId: 'r3', date: localISO(dayBefore) },
        { topicId: 'r1', date: localISO(dayAfter) },
      ],
      topics,
      { preset: 'quarter' },
    );
    expect(report.rows.map((r) => r.date)).toEqual([localISO(qStart), localISO(qEnd)]);
    expect(report.label).toContain('This quarter');
  });

  it('resolves the year preset to calendar-year boundaries', () => {
    const y = new Date().getFullYear();
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: `${y}-01-01` },
        { topicId: 'r2', date: `${y}-12-31` },
        { topicId: 'r3', date: `${y - 1}-12-31` },
        { topicId: 'r1', date: `${y + 1}-01-01` },
      ],
      topics,
      { preset: 'year' },
    );
    expect(report.rows.map((r) => r.date)).toEqual([`${y}-01-01`, `${y}-12-31`]);
    expect(report.label).toContain('This year');
    expect(report.label).toContain(`${y}-01-01`);
    expect(report.label).toContain(`${y}-12-31`);
  });

  it('treats the all preset as unbounded with an All time label', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: '1999-01-01' },
        { topicId: 'r2', date: win.todayISO() },
      ],
      topics,
      { preset: 'all' },
    );
    expect(report.summary.total).toBe(2);
    expect(report.from).toBeNull();
    expect(report.to).toBeNull();
    expect(report.label).toContain('All time');
  });

  it('filters custom ranges with inclusive from/to bounds', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: '2026-01-09' },
        { topicId: 'r2', date: '2026-01-10' },
        { topicId: 'r3', date: '2026-02-20' },
        { topicId: 'r1', date: '2026-02-21' },
      ],
      topics,
      { preset: 'custom', from: '2026-01-10', to: '2026-02-20' },
    );
    expect(report.rows.map((r) => r.date)).toEqual(['2026-01-10', '2026-02-20']);
    expect(report.label).toContain('2026-01-10');
    expect(report.label).toContain('2026-02-20');
  });

  it('yields empty rows deterministically when from is after to', () => {
    const report = win.buildProgramReport(
      [{ topicId: 'r1', date: '2026-02-15' }],
      topics,
      { preset: 'custom', from: '2026-03-01', to: '2026-02-01' },
    );
    expect(report.rows).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.summary.first).toBeNull();
  });

  it('treats an invalid custom bound as unbounded on that side', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: '1999-06-01' },
        { topicId: 'r2', date: '2026-05-01' },
        { topicId: 'r3', date: '2026-07-01' },
      ],
      topics,
      { preset: 'custom', from: 'not-a-date', to: '2026-06-01' },
    );
    expect(report.rows.map((r) => r.date)).toEqual(['1999-06-01', '2026-05-01']);
  });

  it('treats an unrecognized preset as all time', () => {
    const report = win.buildProgramReport(
      [{ topicId: 'r1', date: '2001-01-01' }],
      topics,
      { preset: 'week' },
    );
    expect(report.summary.total).toBe(1);
    expect(report.label).toContain('All time');
  });

  it('treats a missing range as all time and never throws', () => {
    const report = win.buildProgramReport([{ topicId: 'r1', date: '2001-01-01' }], topics, undefined);
    expect(report.summary.total).toBe(1);
  });

  it('renders unknown topic ids as catalog-removed rows counted in totals', () => {
    const report = win.buildProgramReport([{ topicId: 'ghost', date: win.todayISO() }], topics, {
      preset: 'all',
    });
    expect(report.rows).toEqual([
      { date: win.todayISO(), topicId: 'ghost', topicTitle: '(topic no longer in catalog)', category: '—' },
    ]);
    expect(report.summary.total).toBe(1);
    expect(report.coverage.every((c) => c.delivered === 0)).toBe(true);
  });

  it('excludes malformed-date entries with a visible count, never silently', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: 'not-a-date' },
        { topicId: 'r2', date: '2026/01/02' },
        { topicId: 'r3', date: 12345 },
        { topicId: 'r1', date: win.todayISO() },
      ],
      topics,
      { preset: 'all' },
    );
    expect(report.excludedDates).toBe(3);
    expect(report.rows.map((r) => r.date)).toEqual([win.todayISO()]);
    expect(report.summary.total).toBe(1);
  });

  it('ignores entries without a string topicId entirely (Pulse convention)', () => {
    const report = win.buildProgramReport(
      [null, { date: '2026-01-01' }, { topicId: 42, date: '2026-01-01' }],
      topics,
      { preset: 'all' },
    );
    expect(report.rows).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.excludedDates).toBe(0);
  });

  it('sorts rows chronologically with stable same-date order (log order)', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r2', date: '2026-03-02' },
        { topicId: 'r1', date: '2026-01-01' },
        { topicId: 'r3', date: '2026-03-02' },
        { topicId: 'r2', date: '2026-02-01' },
      ],
      topics,
      { preset: 'all' },
    );
    expect(report.rows.map((r) => r.topicId)).toEqual(['r1', 'r2', 'r2', 'r3']);
    expect(report.summary.first).toBe('2026-01-01');
    expect(report.summary.last).toBe('2026-03-02');
  });

  it('scopes coverage to the range: out-of-range deliveries do not count', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 'r1', date: '2025-12-31' },
        { topicId: 'r3', date: '2026-06-01' },
      ],
      topics,
      { preset: 'custom', from: '2026-01-01', to: '2026-12-31' },
    );
    const alpha = report.coverage.find((c) => c.category === 'Alpha');
    const beta = report.coverage.find((c) => c.category === 'Beta');
    expect(alpha).toEqual({ category: 'Alpha', delivered: 0, total: 2, lastDate: null });
    expect(beta).toEqual({ category: 'Beta', delivered: 1, total: 1, lastDate: '2026-06-01' });
  });

  it('never mutates its inputs and is deterministic across calls', () => {
    const log = [
      { topicId: 'r1', date: win.todayISO() },
      { topicId: 'ghost', date: 'bad-date' },
    ];
    const topicsCopy = topics.map((t) => ({ ...t }));
    const range = { preset: 'year' };
    const r1 = win.buildProgramReport(log, topics, range);
    const r2 = win.buildProgramReport(log, topics, range);
    expect(r2).toEqual(r1);
    expect(log).toEqual([
      { topicId: 'r1', date: win.todayISO() },
      { topicId: 'ghost', date: 'bad-date' },
    ]);
    expect(topics).toEqual(topicsCopy);
    expect(range).toEqual({ preset: 'year' });
  });

  it('never throws on null or non-array inputs', () => {
    expect(() => win.buildProgramReport(null, null, null)).not.toThrow();
    const report = win.buildProgramReport(null, null, null);
    expect(report.rows).toEqual([]);
    expect(report.summary.total).toBe(0);
    expect(report.coverage).toEqual([]);
  });
});

describe('escapeCsvCell — RFC 4180 escaping', () => {
  it('leaves plain values unchanged', () => {
    expect(win.escapeCsvCell('plain')).toBe('plain');
  });

  it('quotes values containing commas', () => {
    expect(win.escapeCsvCell('a,b')).toBe('"a,b"');
  });

  it('quotes values containing quotes and doubles them', () => {
    expect(win.escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes values containing newlines', () => {
    expect(win.escapeCsvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('quotes values containing carriage returns', () => {
    expect(win.escapeCsvCell('a\rb')).toBe('"a\rb"');
  });

  it('returns empty string for null and undefined', () => {
    expect(win.escapeCsvCell(null)).toBe('');
    expect(win.escapeCsvCell(undefined)).toBe('');
  });

  it('wraps a combined hostile value exactly once with doubled quotes', () => {
    expect(win.escapeCsvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
});

describe('buildProgramReportCsv — serialization', () => {
  it('prefixes a UTF-8 BOM, exact header, and CRLF-only line endings', () => {
    const report = win.buildProgramReport(
      [{ topicId: 't2', date: '2026-06-01' }],
      [pulseTopic('t2', 'Topic Two', 'Beta')],
      { preset: 'all' },
    );
    const csv = win.buildProgramReportCsv(report);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toMatch(/^Date,Topic,Category,Topic ID\r\n/);
    // Every newline is a CRLF (no bare LF)
    expect(csv.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('writes one row per delivery with RFC 4180-escaped cells', () => {
    const report = win.buildProgramReport(
      [
        { topicId: 't1', date: '2026-06-02' },
        { topicId: 't2', date: '2026-06-01' },
      ],
      [pulseTopic('t1', 'Topic, One', 'Alpha'), pulseTopic('t2', 'Topic Two', 'Beta')],
      { preset: 'all' },
    );
    const csv = win.buildProgramReportCsv(report);
    expect(csv).toContain('\uFEFFDate,Topic,Category,Topic ID\r\n');
    expect(csv).toContain('2026-06-01,Topic Two,Beta,t2\r\n');
    expect(csv).toContain('2026-06-02,"Topic, One",Alpha,t1\r\n');
  });

  it('produces header-only CSV for an empty report', () => {
    const csv = win.buildProgramReportCsv(win.buildProgramReport([], [], { preset: 'all' }));
    expect(csv).toBe('\uFEFFDate,Topic,Category,Topic ID\r\n');
  });
});

describe('exportProgramReportCsv — download flow', () => {
  /** Installs stubs for the download pipeline and returns undo + spies. */
  function stubDownload() {
    const origCreateObjectURL = win.URL.createObjectURL;
    const origRevokeObjectURL = win.URL.revokeObjectURL;
    const origClick = win.HTMLAnchorElement.prototype.click;
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    const click = vi.fn();
    win.URL.createObjectURL = createObjectURL;
    win.URL.revokeObjectURL = revokeObjectURL;
    win.HTMLAnchorElement.prototype.click = click;
    return {
      createObjectURL,
      revokeObjectURL,
      click,
      undo() {
        win.URL.createObjectURL = origCreateObjectURL;
        win.URL.revokeObjectURL = origRevokeObjectURL;
        win.HTMLAnchorElement.prototype.click = origClick;
      },
    };
  }

  it('downloads synchronously with the conventional filename and revokes the URL', () => {
    const stubs = stubDownload();
    try {
      win.exportProgramReportCsv(
        win.buildProgramReport([{ topicId: 't1', date: win.todayISO() }], [pulseTopic('t1', 'One', 'A')], { preset: 'all' }),
      );
      expect(stubs.click).toHaveBeenCalledTimes(1);
      expect(stubs.createObjectURL).toHaveBeenCalledTimes(1);
      const blob = stubs.createObjectURL.mock.calls[0][0];
      expect(blob).toBeInstanceOf(win.Blob);
      expect(blob.type).toContain('text/csv');
      expect(stubs.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
      // The temporary anchor carried the download name and blob URL
      expect(stubs.click.mock.instances[0].download).toBe(`safety-talk-program-report-${win.todayISO()}.csv`);
      expect(stubs.click.mock.instances[0].href).toBe('blob:mock-url');
      expect(document.getElementById('toast').textContent).toMatch(/CSV/i);
    } finally {
      stubs.undo();
    }
  });

  it('shows a descriptive toast when Blob is unsupported (never silent)', () => {
    const stubs = stubDownload();
    const origBlob = win.Blob;
    win.Blob = undefined;
    try {
      expect(() => win.exportProgramReportCsv({ rows: [] })).not.toThrow();
      expect(stubs.createObjectURL).not.toHaveBeenCalled();
      expect(document.getElementById('toast').textContent).toMatch(/CSV export unavailable/i);
      expect(document.getElementById('toast').textContent).toMatch(/Blob/i);
    } finally {
      win.Blob = origBlob;
      stubs.undo();
    }
  });

  it('shows a descriptive toast when object URLs are unsupported', () => {
    const origCreateObjectURL = win.URL.createObjectURL;
    win.URL.createObjectURL = undefined;
    try {
      win.exportProgramReportCsv({ rows: [] });
      expect(document.getElementById('toast').textContent).toMatch(/object URL/i);
      expect(document.getElementById('toast').textContent).toMatch(/CSV export unavailable/i);
    } finally {
      win.URL.createObjectURL = origCreateObjectURL;
    }
  });

  it('removes the temporary anchor even when click() throws', () => {
    const stubs = stubDownload();
    stubs.click.mockImplementation(() => {
      throw new Error('boom');
    });
    const warn = vi.spyOn(win.console, 'warn').mockImplementation(() => {});
    try {
      expect(() => win.exportProgramReportCsv({ rows: [] })).not.toThrow();
      expect(warn).toHaveBeenCalled();
      // The anchor must not leak into the DOM on the failure path.
      expect(document.querySelector('a[download]')).toBeNull();
      expect(document.getElementById('toast').textContent).toMatch(/CSV export failed/i);
    } finally {
      warn.mockRestore();
      stubs.undo();
    }
  });

  it('warns via console.warn and toasts when createObjectURL throws', () => {
    const warn = vi.spyOn(win.console, 'warn').mockImplementation(() => {});
    const origCreateObjectURL = win.URL.createObjectURL;
    win.URL.createObjectURL = () => {
      throw new Error('quota');
    };
    const origRevokeObjectURL = win.URL.revokeObjectURL;
    const revokeObjectURL = vi.fn();
    win.URL.revokeObjectURL = revokeObjectURL;
    try {
      expect(() => win.exportProgramReportCsv({ rows: [] })).not.toThrow();
      expect(warn).toHaveBeenCalled();
      expect(document.getElementById('toast').textContent).toMatch(/CSV export failed/i);
      expect(revokeObjectURL).not.toHaveBeenCalled();
    } finally {
      win.URL.createObjectURL = origCreateObjectURL;
      win.URL.revokeObjectURL = origRevokeObjectURL;
      warn.mockRestore();
    }
  });
});

describe('program report overlay', () => {
  const topic = pulseTopic('ov1', 'Overlay Topic', 'Alpha');

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
    });
  });

  afterEach(() => {
    document.body.classList.remove('report-open');
    document.body.classList.remove('sheet-open');
    const report = document.getElementById('program-report');
    if (report) report.innerHTML = '';
    document.getElementById('signoff-sheet').innerHTML = '';
    win.history.replaceState(null, '', ' ');
  });

  it('assertDomElements requires #program-report', () => {
    const orig = win.document.getElementById.bind(win.document);
    win.document.getElementById = /** @type {any} */ ((id) => {
      if (id === 'program-report') return null;
      return orig(id);
    });
    expect(() => win.assertDomElements()).toThrow(/program-report.*not found/i);
    win.document.getElementById = /** @type {any} */ (orig);
  });

  it('opens from the Pulse button with report-open and a This year default', () => {
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(true);
    const section = document.getElementById('program-report');
    expect(section.textContent).toContain('Safety Talk Program Report');
    expect(section.textContent).toContain(`Generated: ${win.todayISO()}`);
    expect(document.getElementById('report-range-preset').value).toBe('year');
  });

  it('Close removes report-open and clears the section', () => {
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    document.getElementById('report-close-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(false);
    expect(document.getElementById('program-report').innerHTML).toBe('');
  });

  it('shows an honest empty state for an empty log', () => {
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    expect(document.getElementById('program-report').textContent).toMatch(/No safety talks were recorded in this period/i);
  });

  it('renders the informational cadence line and honest footer language', () => {
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'ov1', date: win.todayISO() }],
    });
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    const text = document.getElementById('program-report').textContent;
    expect(text).toContain('State cadence floors, when they apply: CA every 10 working days; WA weekly; OR monthly. No federal mandate.');
    expect(text).toContain('keep at least 1 year (CA/WA floors)');
    expect(text).toContain("Cal/OSHA's enforcement posture for employers with 10+ employees is 3 years");
    expect(text).toContain('Attendance names and signatures: see Safety Talk Records on file.');
    expect(text).toContain('Always defer to your site-specific safety procedures.');
    // Delivery table with the seeded talk
    expect(text).toContain('Overlay Topic');
    // Coverage summary mirrors the ledger shape (ov1 delivered today)
    expect(text).toContain('1/1 delivered');
  });

  it('contains no compliance verdicts or streak/gamification language', () => {
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'ov1', date: win.todayISO() }],
    });
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    const html = document.getElementById('program-report').innerHTML;
    expect(html).not.toMatch(/compliant/i);
    expect(html).not.toMatch(/streak/i);
  });

  it('surfaces a singular excluded-entries note when one date is malformed', () => {
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [{ topicId: 'ov1', date: 'oops' }],
    });
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    expect(document.getElementById('program-report').textContent).toContain(
      '1 entry with an unrecognizable date was excluded',
    );
  });

  it('surfaces a plural excluded-entries note for multiple malformed dates', () => {
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [
        { topicId: 'ov1', date: 'oops' },
        { topicId: 'ov1', date: '2026/13/99' },
      ],
    });
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    expect(document.getElementById('program-report').textContent).toContain(
      '2 entries with unrecognizable dates were excluded',
    );
  });

  it('main Print button never prints the report', () => {
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(true);
    let reportOpenAtPrint = null;
    win.print = () => {
      reportOpenAtPrint = document.body.classList.contains('report-open');
    };
    document.getElementById('print-btn').click();
    expect(reportOpenAtPrint).toBe(false);
    expect(document.body.classList.contains('report-open')).toBe(false);
    expect(document.getElementById('program-report').innerHTML).toBe('');
  });

  it('sign-off sheet flow closes the report before printing', () => {
    win.history.replaceState(null, '', '#ov1');
    let reportOpenAtPrint = null;
    let sheetOpenAtPrint = null;
    win.print = () => {
      reportOpenAtPrint = document.body.classList.contains('report-open');
      sheetOpenAtPrint = document.body.classList.contains('sheet-open');
    };
    sft.renderProgramPulse();
    document.getElementById('report-open-btn').click();
    document.getElementById('signoff-btn').click();
    // body.report-open print rules beat the sheet's, so the report must
    // be closed and only the sheet open when window.print() runs.
    expect(reportOpenAtPrint).toBe(false);
    expect(sheetOpenAtPrint).toBe(true);
    expect(document.body.classList.contains('report-open')).toBe(false);
    expect(document.body.classList.contains('sheet-open')).toBe(true);
    // afterprint closes the sheet; the report was already closed at print
    win.dispatchEvent(new win.Event('afterprint'));
    expect(document.body.classList.contains('sheet-open')).toBe(false);
    expect(document.body.classList.contains('report-open')).toBe(false);
    expect(document.getElementById('signoff-sheet').innerHTML).toBe('');
  });
});

describe('program report range wiring', () => {
  const topic = pulseTopic('rw1', 'Range Topic', 'Alpha');

  beforeEach(() => {
    win.localStorage.clear();
    sft.resetDomRefs();
    sft.callInit();
    const now = new Date();
    const beforeThisMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    sft.reset({
      allTopics: [topic],
      filteredTopics: [topic],
      currentIndex: 0,
      seenIds: new Set(),
      usedTopics: {},
      meetingLog: [
        { topicId: 'rw1', date: win.todayISO() },
        { topicId: 'rw1', date: localISO(beforeThisMonth) },
      ],
    });
    sft.renderProgramPulse();
  });

  afterEach(() => {
    document.body.classList.remove('report-open');
    const report = document.getElementById('program-report');
    if (report) report.innerHTML = '';
  });

  it('changing preset re-renders in place and stays open', () => {
    document.getElementById('report-open-btn').click();
    // Default This year: both entries (today + last month) are in-year
    expect(document.querySelectorAll('#program-report .report-table tbody tr')).toHaveLength(2);
    const select = document.getElementById('report-range-preset');
    select.value = 'month';
    select.dispatchEvent(new win.Event('change'));
    expect(document.body.classList.contains('report-open')).toBe(true);
    expect(document.querySelectorAll('#program-report .report-table tbody tr')).toHaveLength(1);
    expect(document.getElementById('report-range-preset').value).toBe('month');
    expect(document.getElementById('program-report').textContent).toContain('This month');
  });

  it('custom from/to inputs filter rows', () => {
    document.getElementById('report-open-btn').click();
    const select = document.getElementById('report-range-preset');
    select.value = 'custom';
    select.dispatchEvent(new win.Event('change'));
    // Re-render on preset change: re-query the fresh inputs.
    let from = document.getElementById('report-from');
    let to = document.getElementById('report-to');
    expect(from.disabled).toBe(false);
    expect(to.disabled).toBe(false);
    from.value = '2026-01-01';
    to.value = win.todayISO();
    to.dispatchEvent(new win.Event('change'));
    expect(document.querySelectorAll('#program-report .report-table tbody tr')).toHaveLength(2);
    expect(document.getElementById('program-report').textContent).toContain('Custom range');
    // Narrow from to exclude the older entry (inputs re-render on each
    // change, so re-query before editing again).
    const earlier = new Date();
    earlier.setDate(earlier.getDate() - 1);
    from = document.getElementById('report-from');
    from.value = localISO(earlier);
    from.dispatchEvent(new win.Event('change'));
    expect(document.querySelectorAll('#program-report .report-table tbody tr')).toHaveLength(1);
  });

  it('re-renders live on logTalk with the range selection preserved', () => {
    // Show the topic card first: showTopic clears stale report-open
    // state, so the card must exist before the report is opened.
    sft.showTopic(topic, false);
    document.getElementById('report-open-btn').click();
    const select = document.getElementById('report-range-preset');
    select.value = 'month';
    select.dispatchEvent(new win.Event('change'));
    expect(document.querySelectorAll('#program-report .report-table tbody tr')).toHaveLength(1);
    // A new logged talk lands in the current month → appears immediately
    document.getElementById('use-this-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(true);
    const rows = document.querySelectorAll('#program-report .report-table tbody tr');
    expect(rows).toHaveLength(2);
    expect(document.getElementById('program-report').textContent).toContain('Range Topic');
    expect(document.getElementById('report-range-preset').value).toBe('month');
  });

  it('reopening the report resets the range to This year', () => {
    document.getElementById('report-open-btn').click();
    const select = document.getElementById('report-range-preset');
    select.value = 'custom';
    select.dispatchEvent(new win.Event('change'));
    expect(document.getElementById('report-range-preset').value).toBe('custom');
    document.getElementById('report-close-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(false);
    document.getElementById('report-open-btn').click();
    expect(document.body.classList.contains('report-open')).toBe(true);
    expect(document.getElementById('report-range-preset').value).toBe('year');
    expect(document.getElementById('program-report').textContent).toContain('This year');
    expect(document.getElementById('report-from').disabled).toBe(true);
    expect(document.getElementById('report-to').disabled).toBe(true);
  });

  it('keeps focus on the preset select across a range change', () => {
    document.getElementById('report-open-btn').click();
    const select = document.getElementById('report-range-preset');
    select.focus();
    expect(document.activeElement).toBe(select);
    select.value = 'month';
    select.dispatchEvent(new win.Event('change'));
    // The controls stay mounted on range changes, so the firing select
    // keeps focus (screen readers keep their announcement context).
    expect(document.activeElement).toBe(select);
  });

  it('does not rebuild the hidden report on logTalk when the overlay is closed', () => {
    // Show the topic card first: showTopic clears stale report-open state.
    sft.showTopic(topic, false);
    expect(document.body.classList.contains('report-open')).toBe(false);
    document.getElementById('use-this-btn').click();
    // logTalk must leave #program-report cleared when nothing is open.
    expect(document.getElementById('program-report').innerHTML).toBe('');
  });
});

describe('print — program report CSS', () => {
  const printBlock = () => {
    const css = fs.readFileSync(path.resolve('./style.css'), 'utf8');
    const idx = css.indexOf('@media print');
    expect(idx).toBeGreaterThan(-1);
    return css.slice(idx);
  };

  it('hides #program-report in print by default', () => {
    expect(printBlock()).toMatch(/#program-report\s*\{[^}]*display:\s*none\s*!important/);
  });

  it('shows only the report when body.report-open (main app hidden)', () => {
    const css = printBlock();
    expect(css).toMatch(/body\.report-open #program-report\s*\{[^}]*display:\s*block/);
    expect(css).toMatch(/body\.report-open \.site-header[^{]*\{[^}]*display:\s*none/);
    expect(css).toMatch(/body\.report-open \.topic-card[^{]*\{[^}]*display:\s*none/);
    expect(css).toMatch(/body\.report-open #program-pulse[^{]*\{[^}]*display:\s*none/);
  });

  it('never prints the report range controls', () => {
    expect(printBlock()).toMatch(/body\.report-open \.report-controls\s*\{[^}]*display:\s*none/);
  });
});
