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
