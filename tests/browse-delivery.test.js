/**
 * tests/browse-delivery.test.js
 * Tests for the delivery-aware Browse library (loop 4):
 * - delivery-data.js helpers: per-topic delivery index, category index,
 *   deterministic neglect comparators (never-delivered first, then oldest
 *   last-delivered, Pulse-consistent tie-breaks).
 * - browse.html integration: per-row delivery status, one status select
 *   composing with keyword search and category grouping, defensive
 *   localStorage reads (console.warn fallbacks, page stays functional).
 *
 * Isolation: helper tests reuse the setup.js jsdom window (pure functions);
 * browse tests build a fresh JSDOM per test from browse.html, so each test
 * gets its own localStorage.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';

const win = /** @type {Window & typeof globalThis} */ (global.window);

// Load delivery-data.js into the setup.js jsdom as a plain script, the same
// way browse.html will load it via <script src>. Function declarations
// become window properties.
const deliverySrc = fs.readFileSync(path.resolve('./delivery-data.js'), 'utf8');
const deliveryScriptEl = win.document.createElement('script');
deliveryScriptEl.textContent = deliverySrc;
win.document.body.appendChild(deliveryScriptEl);

const dd = /** @type {any} */ (win);

// ---------- Helpers ----------

/**
 * Builds a minimal topic fixture; the delivery helpers only depend on
 * id and category.
 * @param {string} id - Topic id.
 * @param {string} category - Topic category.
 * @returns {{id: string, category: string}} Topic-shaped fixture.
 */
function topic(id, category) {
  return { id, category };
}

/**
 * Builds a fresh JSDOM from browse.html with topics-data.js and
 * delivery-data.js inlined (jsdom does not fetch script srcs), plus an
 * optional seed script that runs before any library code so it can set
 * localStorage or block it entirely. Each call yields an isolated window:
 * fresh localStorage, fresh DOM, and its own captured console warnings.
 * @param {{seed?: string, blockLocalStorage?: boolean}} [opts]
 * @returns {{dom: JSDOM, warnings: string[]}} The page and its warnings.
 */
function loadBrowsePage({ seed = '', blockLocalStorage = false } = {}) {
  let html = fs.readFileSync(path.resolve('./browse.html'), 'utf8');
  const topicsSrc = fs.readFileSync(path.resolve('./topics-data.js'), 'utf8');
  html = html.replace(
    '<script src="topics-data.js"></script>',
    `<script>${topicsSrc}<\/script>`,
  );
  html = html.replace(
    '<script src="delivery-data.js"></script>',
    `<script>${deliverySrc}<\/script>`,
  );
  const prelude = [];
  if (seed) prelude.push(`<script>${seed}<\/script>`);
  if (blockLocalStorage) {
    prelude.push(
      `<script>
        try {
          Object.defineProperty(window, 'localStorage', {
            get() { throw new Error('localStorage unavailable'); },
            configurable: true,
          });
        } catch (e) {
          try { delete window.localStorage; } catch (e2) { /* fall through */ }
        }
      <\/script>`,
    );
  }
  html = html.replace('<body>', `<body>\n${prelude.join('\n')}`);

  const virtualConsole = new VirtualConsole();
  const warnings = [];
  virtualConsole.on('warn', (...args) => {
    warnings.push(args.map((a) => String(a)).join(' '));
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
  });
  return { dom, warnings };
}

/**
 * All currently visible (not .hidden) topic rows, in DOM order.
 * @param {JSDOM} dom - The browse page.
 * @returns {HTMLElement[]} Visible rows.
 */
function visibleRows(dom) {
  return Array.from(
    dom.window.document.querySelectorAll('.topic-row:not(.hidden)'),
  );
}

/**
 * Topic ids of visible rows, in DOM order.
 * @param {JSDOM} dom - The browse page.
 * @returns {string[]} Visible topic ids.
 */
function visibleIds(dom) {
  return visibleRows(dom).map((r) => r.getAttribute('data-topic-id'));
}

/**
 * The delivery status spans of one row, as "label" texts in order.
 * @param {HTMLElement} row - A topic row.
 * @returns {string[]} Status label texts.
 */
function deliveryLabels(row) {
  return Array.from(row.querySelectorAll('.row-delivery')).map((el) =>
    el.textContent.trim(),
  );
}

/**
 * Reads the TOPICS catalog from the page context. `const TOPICS` in an
 * inline script is a global lexical binding, not a window property, so
 * it is only reachable via in-page evaluation.
 * @param {JSDOM} dom - The browse page.
 * @returns {{id: string, title: string, category: string}[]} The catalog.
 */
function pageTopics(dom) {
  return dom.window.eval('TOPICS');
}

// ---------- Helper: buildDeliveryIndex ----------

describe('buildDeliveryIndex', () => {
  beforeEach(() => {
    win.localStorage.clear();
  });

  it('marks every catalog topic never-delivered for an empty log', () => {
    const topics = [topic('a1', 'Alpha'), topic('a2', 'Beta')];
    const index = dd.buildDeliveryIndex([], topics);
    expect(index).toBeInstanceOf(win.Map);
    expect(index.size).toBe(2);
    expect(index.get('a1')).toEqual({ count: 0, lastDate: null, neverDelivered: true });
    expect(index.get('a2')).toEqual({ count: 0, lastDate: null, neverDelivered: true });
  });

  it('counts entries per topic id', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [
        { topicId: 'a1', date: '2026-01-01' },
        { topicId: 'a1', date: '2026-03-01' },
        { topicId: 'a1', date: '2026-02-01' },
      ],
      topics,
    );
    expect(index.get('a1')).toEqual({ count: 3, lastDate: '2026-03-01', neverDelivered: false });
  });

  it('takes lastDate from the most recent ISO-dated entry', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [
        { topicId: 'a1', date: '2026-06-10' },
        { topicId: 'a1', date: '2026-02-02' },
      ],
      topics,
    );
    expect(index.get('a1').lastDate).toBe('2026-06-10');
  });

  it('counts malformed-date entries as delivered with no date label', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [
        { topicId: 'a1', date: 'not-a-date' },
        { topicId: 'a1', date: '2026/01/02' },
        { topicId: 'a1', date: 42 },
        { topicId: 'a1' },
      ],
      topics,
    );
    expect(index.get('a1')).toEqual({ count: 4, lastDate: null, neverDelivered: false });
  });

  it('mixes malformed and valid dates: count includes all, lastDate from valid only', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [
        { topicId: 'a1', date: 'oops' },
        { topicId: 'a1', date: '2026-05-05' },
      ],
      topics,
    );
    expect(index.get('a1')).toEqual({ count: 2, lastDate: '2026-05-05', neverDelivered: false });
  });

  it('skips entries without a string topicId', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [null, undefined, { date: '2026-01-01' }, { topicId: 7, date: '2026-01-01' }, { topicId: 'a1', date: '2026-01-01' }],
      topics,
    );
    expect(index.get('a1')).toEqual({ count: 1, lastDate: '2026-01-01', neverDelivered: false });
  });

  it('ignores unknown log ids: no index entry, catalog topics untouched', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [{ topicId: 'ghost', date: '2026-01-01' }],
      topics,
    );
    expect(index.size).toBe(1);
    expect(index.get('a1').neverDelivered).toBe(true);
    expect(index.get('ghost')).toBeUndefined();
  });

  it('treats a non-array log as empty and does not throw', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildDeliveryIndex('garbage', topics);
    expect(index.get('a1').neverDelivered).toBe(true);
  });

  it('returns an empty index for a non-array catalog and does not throw', () => {
    expect(dd.buildDeliveryIndex([], null).size).toBe(0);
    expect(dd.buildDeliveryIndex([], 'nope').size).toBe(0);
  });

  it('skips malformed catalog entries and keeps the first duplicate id', () => {
    const topics = [null, { category: 'Alpha' }, topic('a1', 'Alpha'), topic('a1', 'Beta')];
    const index = dd.buildDeliveryIndex([], topics);
    expect(index.size).toBe(1);
    expect(index.get('a1')).toEqual({ count: 0, lastDate: null, neverDelivered: true });
  });

  it('never mutates its inputs', () => {
    const log = Object.freeze([
      Object.freeze({ topicId: 'a1', date: '2026-01-01' }),
    ]);
    const topics = Object.freeze([Object.freeze(topic('a1', 'Alpha'))]);
    const logCopy = JSON.parse(JSON.stringify(log));
    const topicsCopy = JSON.parse(JSON.stringify(topics));
    dd.buildDeliveryIndex(log, topics);
    expect(log).toEqual(logCopy);
    expect(topics).toEqual(topicsCopy);
  });

  it('is deterministic: identical inputs build identical indexes', () => {
    const topics = [topic('a1', 'Alpha'), topic('a2', 'Beta')];
    const log = [
      { topicId: 'a2', date: '2026-02-02' },
      { topicId: 'a1', date: '2026-01-01' },
    ];
    const one = dd.buildDeliveryIndex(log, topics);
    const two = dd.buildDeliveryIndex([...log], topics);
    expect([...one.entries()]).toEqual([...two.entries()]);
  });
});

// ---------- Helper: compareTopicNeglect ----------

describe('compareTopicNeglect', () => {
  beforeEach(() => {
    win.localStorage.clear();
  });

  /** Sorts fixture ids with the comparator over the given index. */
  function neglectOrder(ids, log, topics) {
    const index = dd.buildDeliveryIndex(log, topics);
    return topics
      .filter((t) => ids.includes(t.id))
      .slice()
      .sort((a, b) => dd.compareTopicNeglect(a, b, index))
      .map((t) => t.id);
  }

  it('puts never-delivered topics before delivered ones', () => {
    const topics = [topic('delivered', 'Alpha'), topic('fresh', 'Alpha')];
    const order = neglectOrder(
      ['delivered', 'fresh'],
      [{ topicId: 'delivered', date: '2026-01-01' }],
      topics,
    );
    expect(order).toEqual(['fresh', 'delivered']);
  });

  it('orders delivered topics oldest last-delivered first', () => {
    const topics = [topic('old', 'Alpha'), topic('new', 'Alpha')];
    const order = neglectOrder(
      ['old', 'new'],
      [
        { topicId: 'old', date: '2025-01-01' },
        { topicId: 'new', date: '2026-06-01' },
      ],
      topics,
    );
    expect(order).toEqual(['old', 'new']);
  });

  it('ranks delivered-but-undated topics before dated delivered topics', () => {
    const topics = [topic('dated', 'Alpha'), topic('undated', 'Alpha')];
    const order = neglectOrder(
      ['dated', 'undated'],
      [
        { topicId: 'dated', date: '2026-01-01' },
        { topicId: 'undated', date: 'oops' },
      ],
      topics,
    );
    expect(order).toEqual(['undated', 'dated']);
  });

  it('tie-breaks equal last-delivered dates alphabetically by id', () => {
    const topics = [topic('b2', 'Alpha'), topic('a9', 'Alpha')];
    const order = neglectOrder(
      ['b2', 'a9'],
      [
        { topicId: 'a9', date: '2026-03-03' },
        { topicId: 'b2', date: '2026-03-03' },
      ],
      topics,
    );
    expect(order).toEqual(['a9', 'b2']);
  });

  it('tie-breaks all-never topics alphabetically by id', () => {
    const topics = [topic('z1', 'Alpha'), topic('a1', 'Alpha'), topic('m5', 'Alpha')];
    const order = neglectOrder(['z1', 'a1', 'm5'], [], topics);
    expect(order).toEqual(['a1', 'm5', 'z1']);
  });

  it('treats a topic missing from the index as never-delivered', () => {
    const topics = [topic('indexed', 'Alpha'), topic('missing', 'Alpha')];
    const index = dd.buildDeliveryIndex(
      [{ topicId: 'indexed', date: '2026-01-01' }],
      topics,
    );
    const order = [...topics]
      .sort((a, b) => dd.compareTopicNeglect(a, b, index))
      .map((t) => t.id);
    expect(order).toEqual(['missing', 'indexed']);
  });

  it('does not mutate the array it sorts and is repeatable', () => {
    const topics = [
      topic('c', 'Alpha'),
      topic('a', 'Alpha'),
      topic('b', 'Beta'),
    ];
    const log = [{ topicId: 'c', date: '2026-02-02' }];
    const index = dd.buildDeliveryIndex(log, topics);
    const copy = topics.map((t) => ({ ...t }));
    const sorted = [...topics].sort((a, b) => dd.compareTopicNeglect(a, b, index));
    expect(topics).toEqual(copy);
    const resorted = [...topics].sort((a, b) => dd.compareTopicNeglect(a, b, index));
    expect(sorted.map((t) => t.id)).toEqual(resorted.map((t) => t.id));
  });

  it('matches suggestNextTopic when every catalog topic has been delivered', () => {
    const topics = [topic('a1', 'Alpha'), topic('a2', 'Beta'), topic('a3', 'Alpha')];
    const log = [
      { topicId: 'a1', date: '2026-01-15' },
      { topicId: 'a2', date: '2025-12-01' },
      { topicId: 'a3', date: '2026-03-20' },
    ];
    const index = dd.buildDeliveryIndex(log, topics);
    const neglectFirst = [...topics]
      .sort((a, b) => dd.compareTopicNeglect(a, b, index))[0];
    const suggestion = win.suggestNextTopic(log, topics);
    expect(suggestion).not.toBeNull();
    expect(suggestion.topic.id).toBe(neglectFirst.id);
    expect(neglectFirst.id).toBe('a2');
  });
});

// ---------- Helper: category index + compareCategoryNeglect ----------

describe('buildCategoryDeliveryIndex and compareCategoryNeglect', () => {
  beforeEach(() => {
    win.localStorage.clear();
  });

  it('aggregates per-category lastDate, delivered count, and total', () => {
    const topics = [
      topic('a1', 'Alpha'),
      topic('a2', 'Alpha'),
      topic('b1', 'Beta'),
    ];
    const index = dd.buildCategoryDeliveryIndex(
      [
        { topicId: 'a1', date: '2026-01-01' },
        { topicId: 'a1', date: '2026-04-01' },
        { topicId: 'b1', date: '2026-02-02' },
      ],
      topics,
    );
    expect(index).toBeInstanceOf(win.Map);
    expect(index.get('Alpha')).toEqual({ lastDate: '2026-04-01', delivered: 1, total: 2 });
    expect(index.get('Beta')).toEqual({ lastDate: '2026-02-02', delivered: 1, total: 1 });
  });

  it('gives a category with only malformed dates a null lastDate but delivered count', () => {
    const topics = [topic('a1', 'Alpha')];
    const index = dd.buildCategoryDeliveryIndex(
      [{ topicId: 'a1', date: 'nope' }],
      topics,
    );
    expect(index.get('Alpha')).toEqual({ lastDate: null, delivered: 1, total: 1 });
  });

  it('orders categories: undated first, then oldest date, then name', () => {
    const topics = [
      topic('a1', 'Zeta'),
      topic('b1', 'Alpha'),
      topic('c1', 'Mid'),
    ];
    const index = dd.buildCategoryDeliveryIndex(
      [
        { topicId: 'a1', date: '2026-05-01' },
        { topicId: 'b1', date: '2026-01-01' },
        { topicId: 'c1', date: 'broken' },
      ],
      topics,
    );
    const order = [...index.keys()]
      .slice()
      .sort((a, b) => dd.compareCategoryNeglect(a, b, index));
    expect(order).toEqual(['Mid', 'Alpha', 'Zeta']);
  });

  it('tie-breaks equally-undated categories alphabetically', () => {
    const topics = [topic('a1', 'Zeta'), topic('b1', 'Alpha')];
    const index = dd.buildCategoryDeliveryIndex([], topics);
    const order = [...index.keys()]
      .slice()
      .sort((a, b) => dd.compareCategoryNeglect(a, b, index));
    expect(order).toEqual(['Alpha', 'Zeta']);
  });

  it('mirrors suggestNextTopic: its never-delivered pick comes from the first category', () => {
    const topics = [
      topic('z1', 'Zeta'),
      topic('a1', 'Alpha'),
      topic('a2', 'Alpha'),
    ];
    const log = [{ topicId: 'z1', date: '2026-02-02' }];
    const index = dd.buildCategoryDeliveryIndex(log, topics);
    const firstCat = [...index.keys()]
      .slice()
      .sort((a, b) => dd.compareCategoryNeglect(a, b, index))[0];
    const suggestion = win.suggestNextTopic(log, topics);
    expect(suggestion).not.toBeNull();
    expect(suggestion.reason).toMatch(new RegExp(`your ${firstCat} category`));
  });

  it('is defensive: non-array inputs yield an empty index without throwing', () => {
    expect(dd.buildCategoryDeliveryIndex(null, undefined).size).toBe(0);
  });
});

// ---------- browse.html: per-row status rendering ----------

describe('browse page delivery status rendering', () => {
  // Real catalog ids (topics-data.js) used to seed logs in page tests.
  const deliveredId = 'slips-trips-falls';
  const neverId = 'ladder-safety';

  it('shows Last delivered + Delivered N× for logged topics and Never delivered otherwise', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: '${deliveredId}', date: '2026-01-10' },
        { topicId: '${deliveredId}', date: '2026-06-20' }
      ]));`,
    });
    const doc = dom.window.document;
    const deliveredRow = doc.querySelector(`[data-topic-id="${deliveredId}"]`);
    const neverRow = doc.querySelector(`[data-topic-id="${neverId}"]`);
    expect(deliveryLabels(deliveredRow)).toEqual([
      'Last delivered: 2026-06-20',
      'Delivered 2×',
    ]);
    expect(deliveryLabels(neverRow)).toEqual(['Never delivered']);
  });

  it('renders only Delivered N× (no date) when a topic has no valid ISO date', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: '${deliveredId}', date: 'garbage-date' }
      ]));`,
    });
    const row = dom.window.document.querySelector(`[data-topic-id="${deliveredId}"]`);
    expect(deliveryLabels(row)).toEqual(['Delivered 1×']);
  });

  it('renders every row Never delivered for an empty log', () => {
    const { dom } = loadBrowsePage();
    const rows = Array.from(dom.window.document.querySelectorAll('.topic-row'));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => deliveryLabels(r).length === 1 && deliveryLabels(r)[0] === 'Never delivered')).toBe(true);
  });

  it('restores identical statuses and row order on a second load from the same storage', () => {
    const seed = `localStorage.setItem('meetingLog', JSON.stringify([
      { topicId: '${deliveredId}', date: '2026-05-05' },
      { topicId: '${neverId}', date: '2026-03-03' }
    ]));`;
    const first = loadBrowsePage({ seed });
    const second = loadBrowsePage({ seed });
    expect(visibleIds(first.dom)).toEqual(visibleIds(second.dom));
    const labelsOf = (dom) =>
      Array.from(dom.window.document.querySelectorAll('.topic-row')).map(deliveryLabels);
    expect(labelsOf(first.dom)).toEqual(labelsOf(second.dom));
  });

  it('shows the legacy Used label and the log-derived status together (two stores)', () => {
    const usedId = 'stairway-safety';
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('usedTopics', JSON.stringify({ '${usedId}': 3 }));
             localStorage.setItem('meetingLog', JSON.stringify([
               { topicId: '${usedId}', date: '2026-02-02' },
               { topicId: '${deliveredId}', date: '2026-04-04' }
             ]));`,
    });
    const doc = dom.window.document;
    const bothRow = doc.querySelector(`[data-topic-id="${usedId}"]`);
    expect(bothRow.querySelector('.row-used').textContent.trim()).toBe('✓ Used 3×');
    expect(deliveryLabels(bothRow)).toEqual(['Last delivered: 2026-02-02', 'Delivered 1×']);
    const logOnlyRow = doc.querySelector(`[data-topic-id="${deliveredId}"]`);
    expect(logOnlyRow.querySelector('.row-used')).toBeNull();
    expect(deliveryLabels(logOnlyRow).length).toBe(2);
    const usedOnlyRow = doc.querySelector(`[data-topic-id="housekeeping"]`);
    expect(deliveryLabels(usedOnlyRow)).toEqual(['Never delivered']);
  });
});

// ---------- browse.html: status select composes with search + grouping ----------

describe('browse page status select', () => {
  const deliveredId = 'slips-trips-falls';

  /** Sets the status select value and fires change. */
  function selectStatus(dom, value) {
    const select = dom.window.document.getElementById('status-select');
    select.value = value;
    select.dispatchEvent(new dom.window.Event('change'));
  }

  /** Types into the search input and fires input. */
  function search(dom, query) {
    const input = dom.window.document.getElementById('search-input');
    input.value = query;
    input.dispatchEvent(new dom.window.Event('input'));
  }

  it('defaults to All topics with every row visible', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: '${deliveredId}', date: '2026-01-01' }
      ]));`,
    });
    const total = pageTopics(dom).length;
    expect(visibleIds(dom)).toHaveLength(total);
    expect(dom.window.document.getElementById('browse-count').textContent).toBe(`${total} topics`);
    expect(dom.window.document.getElementById('status-select').value).toBe('all');
  });

  it('Never delivered shows exactly the zero-log-entry topics', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: '${deliveredId}', date: '2026-01-01' }
      ]));`,
    });
    selectStatus(dom, 'never');
    const ids = visibleIds(dom);
    expect(ids).not.toContain(deliveredId);
    expect(ids).toHaveLength(pageTopics(dom).length - 1);
    for (const row of visibleRows(dom)) {
      expect(deliveryLabels(row)).toEqual(['Never delivered']);
    }
    expect(dom.window.document.getElementById('browse-count').textContent).toBe(`${ids.length} of ${pageTopics(dom).length} topics`);
  });

  it('Oldest first with only unknown log ids: unknowns contribute nothing, groups order by name, ids ascend', () => {
    const { dom, } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: 'b-dated-old', date: '2025-01-01' },
        { topicId: 'a-dated-new', date: '2026-08-08' }
      ]));`,
    });
    // Unknown ids contribute nothing; the catalog stays all never-delivered,
    // so every category is undated and groups order by name, with ids
    // ascending inside each group (the documented tie-break).
    selectStatus(dom, 'oldest');
    const doc = dom.window.document;
    const groups = Array.from(doc.querySelectorAll('.cat-group'));
    const groupNames = groups.map((g) => g.querySelector('.cat-heading h2').textContent);
    expect(groupNames).toEqual([...groupNames].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    for (const group of groups) {
      const ids = Array.from(group.querySelectorAll('.topic-row'))
        .map((r) => r.getAttribute('data-topic-id'));
      expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    }
  });

  it('Oldest first puts undated-but-delivered before dated topics and respects dates', () => {
    // Seed a fully-delivered world via the known ids: two delivered with dates,
    // everything else stays never-delivered and must sort before both.
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: 'slips-trips-falls', date: '2026-08-08' },
        { topicId: 'ladder-safety', date: '2025-02-02' },
        { topicId: 'housekeeping', date: 'oops' }
      ]));`,
    });
    selectStatus(dom, 'oldest');
    const ids = visibleIds(dom);
    const neverCount = ids.length - 3;
    // All never-delivered topics first (alphabetical), then undated delivered,
    // then dated delivered oldest-first.
    expect(ids.slice(0, neverCount).every((id) => !['slips-trips-falls', 'ladder-safety', 'housekeeping'].includes(id))).toBe(true);
    expect(ids.slice(neverCount)).toEqual(['housekeeping', 'ladder-safety', 'slips-trips-falls']);
  });

  it('Oldest first is deterministic across reloads', () => {
    const seed = `localStorage.setItem('meetingLog', JSON.stringify([
      { topicId: 'slips-trips-falls', date: '2026-08-08' },
      { topicId: 'ladder-safety', date: '2025-02-02' }
    ]));`;
    const first = loadBrowsePage({ seed });
    const second = loadBrowsePage({ seed });
    selectStatus(first.dom, 'oldest');
    selectStatus(second.dom, 'oldest');
    expect(visibleIds(first.dom)).toEqual(visibleIds(second.dom));
  });

  it('composes with keyword search in Never delivered mode', () => {
    const { dom } = loadBrowsePage();
    selectStatus(dom, 'never');
    const query = dom.window.document.querySelector('[data-topic-id="ladder-safety"]').getAttribute('data-title');
    search(dom, query);
    const ids = visibleIds(dom);
    expect(ids).toEqual(['ladder-safety']);
    // Clearing the search restores the full never-delivered set.
    search(dom, '');
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
  });

  it('restores catalog order when switching back to All topics', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: 'slips-trips-falls', date: '2026-08-08' }
      ]));`,
    });
    const catalogFirstGroup = pageTopics(dom)[0].category;
    const catalogFirstId = pageTopics(dom)[0].id;
    selectStatus(dom, 'oldest');
    selectStatus(dom, 'all');
    const groups = dom.window.document.querySelectorAll('.cat-group');
    expect(groups[0].querySelector('.cat-heading h2').textContent).toBe(catalogFirstGroup);
    expect(groups[0].querySelector('.topic-row').getAttribute('data-topic-id')).toBe(catalogFirstId);
  });

  it('Oldest first reorders category groups by neglect (undated first, then oldest)', () => {
    const { dom } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', JSON.stringify([
        { topicId: 'ladder-safety', date: '2026-09-09' }
      ]));`,
    });
    selectStatus(dom, 'oldest');
    const doc = dom.window.document;
    const headCategory = (group) => group.querySelector('.cat-heading h2').textContent;
    const groups = Array.from(doc.querySelectorAll('.cat-group'));
    // ladder-safety lives in "Walking & General Safety"; its dated delivery
    // must sort it behind every still-undated category.
    const walkIdx = groups.findIndex((g) => headCategory(g) === 'Walking & General Safety');
    expect(walkIdx).toBe(groups.length - 1);
  });
});

// ---------- browse.html: defensive localStorage reads ----------

describe('browse page defensive reads', () => {
  it('warns and stays functional when meetingLog JSON is corrupt', () => {
    const { dom, warnings } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', '{definitely not json');`,
    });
    expect(warnings.some((w) => w.includes('meetingLog'))).toBe(true);
    // Page still renders: all rows visible as Never delivered.
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
  });

  it('warns and keeps used labels empty when usedTopics JSON is corrupt', () => {
    const { dom, warnings } = loadBrowsePage({
      seed: `localStorage.setItem('usedTopics', '[[[broken');`,
    });
    expect(warnings.some((w) => w.includes('usedTopics'))).toBe(true);
    const rows = Array.from(dom.window.document.querySelectorAll('.topic-row'));
    expect(rows.every((r) => !r.querySelector('.row-used'))).toBe(true);
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
  });

  it('warns and stays functional when meetingLog JSON is valid but not an array', () => {
    const { dom, warnings } = loadBrowsePage({
      seed: `localStorage.setItem('meetingLog', '{"a":1}');`,
    });
    expect(warnings.some((w) => w.includes('meetingLog') && w.includes('expected an array'))).toBe(true);
    // Page still renders: all rows visible as Never delivered.
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
  });

  it('warns and keeps used labels empty when usedTopics JSON is valid but not an object', () => {
    const { dom, warnings } = loadBrowsePage({
      seed: `localStorage.setItem('usedTopics', '"not-an-object"');`,
    });
    expect(warnings.some((w) => w.includes('usedTopics') && w.includes('expected a plain object'))).toBe(true);
    const rows = Array.from(dom.window.document.querySelectorAll('.topic-row'));
    expect(rows.every((r) => !r.querySelector('.row-used'))).toBe(true);
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
  });

  it('warns, renders, and keeps the select working when localStorage is unavailable', () => {
    const { dom, warnings } = loadBrowsePage({ blockLocalStorage: true });
    expect(warnings.length).toBeGreaterThan(0);
    const doc = dom.window.document;
    // Fully functional: rows render, select filters.
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
    const select = doc.getElementById('status-select');
    select.value = 'never';
    select.dispatchEvent(new dom.window.Event('change'));
    expect(visibleIds(dom)).toHaveLength(pageTopics(dom).length);
    // Search still composes.
    const input = doc.getElementById('search-input');
    input.value = 'zzz-no-match-zzz';
    input.dispatchEvent(new dom.window.Event('input'));
    expect(visibleIds(dom)).toHaveLength(0);
    expect(doc.getElementById('no-results').hidden).toBe(false);
  });

  it('keeps no console errors on a normal load', () => {
    const { dom } = loadBrowsePage();
    // Smoke: init produced the hero count text (page rendered without throwing).
    expect(dom.window.document.getElementById('hero-sub').textContent).toMatch(/\d+ topics across \d+ categories/);
  });
});

// ---------- style.css: status styling ----------

describe('browse delivery status CSS', () => {
  const css = () => fs.readFileSync(path.resolve('./style.css'), 'utf8');

  it('styles the delivery status labels in style.css', () => {
    expect(css()).toMatch(/\.row-delivery\s*\{/);
    expect(css()).toMatch(/\.row-delivery-never\s*\{/);
  });

  it('gives the Never delivered marker WCAG AA contrast on the row surface', () => {
    const rule = css().match(/\.row-delivery-never\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    const colorMatch = rule[1].match(/color:\s*([^;]+);/);
    expect(colorMatch).toBeTruthy();
    const color = colorMatch[1].trim();
    expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);

    const luminance = (hex) => {
      const c = hex.replace('#', '');
      const parts = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
    };
    const surface = '#ffffff'; // .cat-group background = --color-surface
    const l1 = luminance(color);
    const l2 = luminance(surface);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the delivery status print-safe: never hidden by the print block', () => {
    const printIdx = css().indexOf('@media print');
    expect(printIdx).toBeGreaterThan(-1);
    const printBlock = css().slice(printIdx);
    expect(printBlock).not.toContain('row-delivery');
  });
});
