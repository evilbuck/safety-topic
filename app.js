/* ============================================================
   SafetyTopic — app.js
   Handles: data loading, hash routing, random pick,
            category filter, prev/next nav, clipboard, print,
            "I Used This" tracking
   ============================================================ */

/**
 * @typedef {Object} Topic
 * @property {string} id - Unique identifier
 * @property {string} title - Topic title
 * @property {string} category - Topic category
 * @property {string} source - Source organization (e.g. OSHA, NIOSH)
 * @property {string} source_ref - Source reference/URL
 * @property {string} duration - Estimated duration string
 * @property {string} summary - Brief summary
 * @property {string[]} key_points - Key discussion points
 * @property {string} [stat] - Optional interesting statistic
 * @property {string} [discussion_prompt] - Optional discussion prompt
 */

"use strict";

// ---------- Clipboard Helper (Secure Context Fallback) ----------
/**
 * Copies text to the clipboard using the modern API with a
 * execCommand fallback for file:// and non-secure contexts.
 * @param {string} text - The text to copy.
 * @returns {Promise<void>} Resolves on success, rejects on failure.
 * @throws {Error} If clipboard write fails in both modern and fallback paths.
 */
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback for file:// and non-secure contexts
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    const success = document.execCommand("copy");
    if (!success) throw new Error("execCommand copy returned false");
  } catch (err) {
    throw err;
  } finally {
    document.body.removeChild(ta);
  }
}

// ---------- State ----------
/** @type {Topic[]} */
let allTopics = [];
/** Guard flag to prevent concurrent showTopic calls (e.g. from rapid clicks). */
let isRendering = false;
/** @type {Topic[]} */
let filteredTopics = [];
/** @type {number} */
let currentIndex = 0;
/** @type {Set<string>} */
let seenIds = new Set();
/** @type {Record<string, number>} */
let usedTopics = {};
/** @type {{ topicId: string, date: string }[]} */
let meetingLog = [];

// ---------- DOM refs ----------
/** @type {HTMLElement | null} */
let topicCard;
/** @type {HTMLSelectElement | null} */
let categorySelect;
/** @type {HTMLButtonElement | null} */
let newTopicBtn;
/** @type {HTMLButtonElement | null} */
let copyTextBtn;
/** @type {HTMLButtonElement | null} */
let copyLinkBtn;
/** @type {HTMLButtonElement | null} */
let printBtn;
/** @type {HTMLElement | null} */
let toast;
/** @type {HTMLElement | null} */
let brandLink;
/** @type {HTMLElement | null} */
let signoffSheet;
/** @type {HTMLButtonElement | null} */
let signoffBtn;

/**
 * Initializes the app: wires DOM refs, restores persisted state,
 * loads topics, builds the category dropdown, and displays the
 * initial topic (from hash or random).
 */
/**
 * Retrieves and null-checks all required DOM elements. Throws early
 * with a helpful message if any element is missing, rather than letting
 * the app fail silently downstream.
 * @returns {boolean} True if all elements are present.
 */
function assertDomElements() {
  // Re-query at call time so tests can override document.getElementById.
  // The closure vars (topicCard etc.) are used as a fallback for production
  // but fresh lookups take precedence to support test isolation.
  const required = [
    'topic-card',
    'category-select',
    'new-topic-btn',
    'copy-text-btn',
    'copy-link-btn',
    'print-btn',
    'toast',
    'brand-link',
    'signoff-sheet',
    'signoff-btn',
    'program-pulse',
    'program-report',
  ];
  for (const id of required) {
    const el =
      document.getElementById(id) ??
      /** @type {any} */ (topicCard && topicCard.id === id ? topicCard : null) ??
      null;
    if (!el) {
      throw new Error(
        `SafetyTopic init failed: #${id} not found in DOM. Check that index.html includes all required elements.`,
      );
    }
  }
  return true;
}

/**
 * Validates an array of raw topic objects against the required schema.
 * @param {unknown[]} topics - Raw topic objects from topics-data.js.
 * @returns {{ valid: Topic[], invalid: unknown[] }} Valid and invalid topics.
 */
function validateTopics(topics) {
  /** @type {Topic[]} */
  const valid = [];
  /** @type {unknown[]} */
  const invalid = [];
  for (const t of topics) {
    if (
      typeof t === 'object' &&
      t !== null &&
      typeof t.id === 'string' &&
      t.id.length > 0 &&
      typeof t.title === 'string' &&
      typeof t.category === 'string' &&
      typeof t.source === 'string' &&
      typeof t.source_ref === 'string' &&
      typeof t.duration === 'string' &&
      typeof t.summary === 'string' &&
      Array.isArray(t.key_points) &&
      t.key_points.every((p) => typeof p === 'string')
    ) {
      valid.push(/** @type {Topic} */ (t));
    } else {
      invalid.push(t);
    }
  }
  return { valid, invalid };
}

function init() {
  topicCard = document.getElementById("topic-card");
  categorySelect = document.getElementById("category-select");
  newTopicBtn = document.getElementById("new-topic-btn");
  copyTextBtn = document.getElementById("copy-text-btn");
  copyLinkBtn = document.getElementById("copy-link-btn");
  printBtn = document.getElementById("print-btn");
  toast = document.getElementById("toast");
  brandLink = document.getElementById("brand-link");
  signoffSheet = document.getElementById("signoff-sheet");
  signoffBtn = document.getElementById("signoff-btn");

  // Fail fast: catch missing DOM elements before any other code runs
  assertDomElements();

  // Restore persisted state
  try {
    const stored = localStorage.getItem("seenTopics");
    if (stored) seenIds = new Set(JSON.parse(stored));
  } catch (err) {
    console.warn("[SafetyTopic] Could not restore seen topics:", err);
  }
  try {
    const stored = localStorage.getItem("usedTopics");
    if (stored) usedTopics = JSON.parse(stored);
  } catch (err) {
    console.warn("[SafetyTopic] Could not restore used topics:", err);
  }
  try {
    const stored = localStorage.getItem("meetingLog");
    if (stored) meetingLog = JSON.parse(stored);
    if (!Array.isArray(meetingLog)) meetingLog = [];
    // Sanitize restored entries: malformed shapes would throw inside
    // showTopic() after its isRendering guard latches (wedge bug).
    const validEntries = meetingLog.filter(
      (e) => e && typeof e.topicId === "string" && typeof e.date === "string",
    );
    if (validEntries.length !== meetingLog.length) {
      console.warn(
        `[SafetyTopic] Dropped ${meetingLog.length - validEntries.length} malformed meeting log entr${meetingLog.length - validEntries.length === 1 ? "y" : "ies"}`,
      );
    }
    meetingLog = validEntries;
  } catch (err) {
    console.warn("[SafetyTopic] Could not restore meeting log:", err);
    meetingLog = [];
  }

  // Load topics from inline data (topics-data.js)
  if (typeof TOPICS === "undefined" || !TOPICS.length) {
    renderError(
      "Could not load safety topics. Make sure topics-data.js is in the same folder as index.html.",
    );
    return;
  }
  const { valid, invalid } = validateTopics(TOPICS);
  if (invalid.length > 0) {
    const ids = invalid.map((t) => t.id || '(no id)').join(', ');
    console.warn(`[SafetyTopic] Skipped ${invalid.length} malformed topic(s): ${ids}`);
    if (valid.length === 0) {
      renderError(
        `No valid topics found. ${invalid.length} topic(s) failed validation: ${ids}`,
      );
      return;
    }
    showToast(`Skipped ${invalid.length} malformed topic(s)`);
  }
  allTopics = valid;

  buildCategoryDropdown();
  restoreFilterState();
  wireEvents();
  loadInitialTopic();
  renderProgramPulse();
}

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", init);

// ---------- Category Dropdown ----------
/**
 * Populates the category `<select>` with dividers, the "Not used yet"
 * special filter, and a sorted list of all unique categories from the
 * loaded topics.
 */
function buildCategoryDropdown() {
  // Special filter at top
  const divider = document.createElement("option");
  divider.disabled = true;
  divider.textContent = "──────────────";
  categorySelect.appendChild(divider);

  const unusedOpt = document.createElement("option");
  unusedOpt.value = "__unused__";
  unusedOpt.textContent = "★ Not used yet";
  categorySelect.appendChild(unusedOpt);

  const divider2 = document.createElement("option");
  divider2.disabled = true;
  divider2.textContent = "──────────────";
  categorySelect.appendChild(divider2);

  // Category options
  const cats = [...new Set(allTopics.map((t) => t.category))].sort();
  cats.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// ---------- Event Wiring ----------
/**
 * Attaches event listeners to all interactive controls:
 * new-topic button, category select, copy-text, copy-link, print,
 * sign-off button, window afterprint (sign-off sheet close), brand
 * link, and hashchange (deep-link) events.
 */
function wireEvents() {
  newTopicBtn.addEventListener("click", () => {
    const next = pickRandom();
    showTopic(next, true);
  });

  categorySelect.addEventListener("change", () => {
    persistFilterState();
    rebuildFiltered();
    const next = pickRandom();
    showTopic(next, true);
  });

  copyTextBtn.addEventListener("click", copyText);
  copyLinkBtn.addEventListener("click", copyLink);
  printBtn.addEventListener("click", () => {
    // Never print the stale sign-off sheet or program report via the
    // main print button.
    closeSignoffSheet();
    closeProgramReport();
    window.print();
  });
  signoffBtn.addEventListener("click", openSignoffSheet);

  // addEventListener dedupes identical function references, so repeated
  // wireEvents calls (tests) cannot stack this listener.
  window.addEventListener("afterprint", closeSignoffSheet);

  brandLink.addEventListener("click", (e) => {
    e.preventDefault();
    categorySelect.value = "";
    rebuildFiltered();
    showTopic(pickRandom(), true);
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const t = allTopics.find((t) => t.id === hash);
      if (t) {
        syncCategoryToTopic(t);
        showTopic(t, false);
      }
    }
  });
}

// ---------- Initial Load ----------
/**
 * Loads the initial topic on page load. Respects an existing URL hash
 * to deep-link into a specific topic; otherwise picks a random topic.
 */
function loadInitialTopic() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const t = allTopics.find((t) => t.id === hash);
    if (t) {
      syncCategoryToTopic(t);
      showTopic(t, false);
      return;
    }
  }
  rebuildFiltered();
  showTopic(pickRandom(), true);
}

// ---------- Filtered Set ----------
/**
 * Rebuilds the `filteredTopics` array based on the current category
 * select value. Handles the special "Not used yet" (`__unused__`)
 * filter and resets `currentIndex` to 0.
 */
function rebuildFiltered() {
  const val = categorySelect.value;
  if (val === "__unused__") {
    filteredTopics = allTopics.filter((t) => !usedTopics[t.id]);
    if (filteredTopics.length === 0) {
      // All topics have been used — show them all with a note
      filteredTopics = [...allTopics];
      showToast("You've used every topic! Showing all.");
    }
  } else if (val) {
    filteredTopics = allTopics.filter((t) => t.category === val);
  } else {
    filteredTopics = [...allTopics];
  }
  currentIndex = 0;
}

/**
 * Syncs the category dropdown to show "all topics" and repositions
 * `currentIndex` to match the given topic.
 * @param {Topic} topic - The topic to sync to.
 */
function syncCategoryToTopic(topic) {
  categorySelect.value = "";
  rebuildFiltered();
  const idx = filteredTopics.findIndex((t) => t.id === topic.id);
  if (idx !== -1) currentIndex = idx;
}

/**
 * Saves the current category filter to localStorage.
 * Called whenever the user changes the category select.
 */
function persistFilterState() {
  try {
    localStorage.setItem("topicFilter", categorySelect.value);
  } catch (err) {
    console.warn("[SafetyTopic] Could not persist filter state:", err);
  }
}

/**
 * Restores the saved category filter from localStorage.
 * Runs after `buildCategoryDropdown()` so options are available.
 * Does nothing if a URL hash is present (hash takes priority).
 */
function restoreFilterState() {
  // Use window._location in tests (can be mocked); fall back to window.location
  const loc = /** @type {any} */ (window)._location ?? window.location;
  if (loc.hash.slice(1)) return; // hash deep-link takes priority
  try {
    const saved = localStorage.getItem("topicFilter");
    if (saved && saved !== "__unused__") {
      // Only restore named categories; "Not used yet" is session-specific
      const option = [...categorySelect.options].find(
        (o) => o.value === saved,
      );
      if (option) {
        categorySelect.value = saved;
        rebuildFiltered();
      }
    }
  } catch (err) {
    console.warn("[SafetyTopic] Could not restore saved category filter:", err);
  }
}

// ---------- Topic Selection ----------
/**
 * Picks a random topic from `filteredTopics` using a priority cascade:
 * unseen+unused → unseen-only → unused-only → all.
 * Updates `currentIndex` and marks the returned topic as seen.
 * @returns {Topic | null} The randomly selected topic, or null if no topics exist.
 */
function pickRandom() {
  if (filteredTopics.length === 0 && allTopics.length === 0) return null;
  if (filteredTopics.length === 0) return allTopics[0];

  const unseenUnused = filteredTopics.filter(
    (t) => !seenIds.has(t.id) && !usedTopics[t.id],
  );
  const unseenOnly = filteredTopics.filter((t) => !seenIds.has(t.id));
  const unusedOnly = filteredTopics.filter((t) => !usedTopics[t.id]);

  const pool =
    unseenUnused.length > 0
      ? unseenUnused
      : unseenOnly.length > 0
        ? unseenOnly
        : unusedOnly.length > 0
          ? unusedOnly
          : filteredTopics;

  const t = pool[Math.floor(Math.random() * pool.length)];
  currentIndex = filteredTopics.findIndex((x) => x.id === t.id);
  markSeen(t.id);
  return t;
}

/**
 * Marks a topic as seen and persists the set to localStorage.
 * Silently ignores storage errors (e.g. quota exceeded).
 * @param {string} id - Topic ID.
 */
function markSeen(id) {
  seenIds.add(id);
  try {
    localStorage.setItem("seenTopics", JSON.stringify([...seenIds]));
  } catch (err) {
    console.warn("[SafetyTopic] Could not persist seen topics:", err);
  }
}

/**
 * Increments the usage count for a topic and persists the map to
 * localStorage. Silently ignores storage errors.
 * @param {string} id - Topic ID.
 */
function markUsed(id) {
  usedTopics[id] = (usedTopics[id] || 0) + 1;
  try {
    localStorage.setItem("usedTopics", JSON.stringify(usedTopics));
  } catch (err) {
    console.warn("[SafetyTopic] Could not persist used topics:", err);
  }
}

// ---------- Safety Talk Record ----------
/**
 * Returns today's date as a local ISO-formatted string (YYYY-MM-DD),
 * suitable for prefilling the sign-off sheet Date field.
 * @returns {string} Today's date, e.g. "2026-11-24".
 */
function todayISO() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Appends a dated entry ({ topicId, date }) to the meeting log and
 * persists it to localStorage under the `meetingLog` key, then
 * re-renders the program pulse so the dashboard reflects the new
 * entry immediately. When the program report overlay is open, also
 * refreshes the report body in place (range selection preserved);
 * a closed overlay is left untouched. Never throws: storage failures
 * are reported via console.warn and the in-memory log is still updated.
 * @param {string} topicId - The ID of the delivered topic.
 */
function logTalk(topicId) {
  meetingLog.push({ topicId, date: todayISO() });
  try {
    localStorage.setItem("meetingLog", JSON.stringify(meetingLog));
  } catch (err) {
    console.warn("[SafetyTopic] Could not persist meeting log:", err);
  }
  renderProgramPulse();
  // Live-update contract: refresh the open report in place (range kept).
  // When the overlay is closed there is nothing to refresh — re-rendering
  // the hidden section would waste work per click and refill the section
  // closeProgramReport() cleared.
  if (document.body.classList.contains("report-open")) {
    renderProgramReportBody();
  }
}

// ---------- Program Pulse ----------
/** Matches strict YYYY-MM-DD calendar date strings. */
const PULSE_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns the number of whole calendar days between an ISO date
 * (YYYY-MM-DD) and today. Dates in the future (e.g. from clock skew
 * or hand-edited logs) clamp to 0. Input is expected to already match
 * the YYYY-MM-DD shape; callers validate before calling.
 * @param {string} dateStr - ISO date, e.g. "2026-11-24".
 * @returns {number} Whole days elapsed, minimum 0.
 */
function daysSince(dateStr) {
  const toUTC = (s) =>
    Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const diff = Math.floor((toUTC(todayISO()) - toUTC(dateStr)) / 86400000);
  return diff < 0 ? 0 : diff;
}

/**
 * Pure computation of Safety Program Pulse statistics from a meeting
 * log and the topic catalog. Never throws on malformed input: entries
 * without a string topicId are ignored entirely; entries whose date is
 * not an ISO YYYY-MM-DD string still count toward `total` but are
 * excluded from every date-derived field; log ids absent from the
 * catalog count toward `total`/`thisMonth`/recency but are excluded
 * from the category ledger. Neither input is mutated.
 * @param {{ topicId: string, date: string }[]} log - The meeting log.
 * @param {Topic[]} topics - The topic catalog.
 * @returns {{ total: number, thisMonth: number, lastDate: string | null,
 *   lastTopicTitle: string | null,
 *   coverage: { category: string, delivered: number, total: number,
 *     lastDate: string | null }[],
 *   recent: { topicId: string, title: string | null, date: string }[] }}
 *   Coverage holds one row per catalog category, sorted never-delivered
 *   first, then oldest last-delivered first (category-name tie-break).
 *   `recent` is sorted newest-first and capped at 5 entries.
 */
function computeProgramStats(log, topics) {
  const safeLog = Array.isArray(log) ? log : [];
  const safeTopics = Array.isArray(topics) ? topics : [];

  const topicById = new Map();
  for (const t of safeTopics) {
    if (t && typeof t.id === "string" && !topicById.has(t.id)) {
      topicById.set(t.id, t);
    }
  }

  const catTotals = new Map();
  const catDelivered = new Map();
  const catLastDate = new Map();
  for (const t of safeTopics) {
    if (!t || typeof t.category !== "string") continue;
    catTotals.set(t.category, (catTotals.get(t.category) || 0) + 1);
    if (!catDelivered.has(t.category)) catDelivered.set(t.category, new Set());
    if (!catLastDate.has(t.category)) catLastDate.set(t.category, null);
  }

  let total = 0;
  let thisMonth = 0;
  let lastEntry = null;
  const monthPrefix = todayISO().slice(0, 7);

  for (const entry of safeLog) {
    if (!entry || typeof entry.topicId !== "string") continue;
    total += 1;
    const dateOk =
      typeof entry.date === "string" && PULSE_ISO_DATE_RE.test(entry.date);
    if (dateOk) {
      if (entry.date.slice(0, 7) === monthPrefix) thisMonth += 1;
      if (!lastEntry || entry.date >= lastEntry.date) lastEntry = entry;
    }
    const topic = topicById.get(entry.topicId);
    if (!topic || typeof topic.category !== "string") continue;
    /** @type {Set<string>} */ (catDelivered.get(topic.category)).add(topic.id);
    if (dateOk) {
      const prev = catLastDate.get(topic.category);
      if (prev === null || entry.date > prev) {
        catLastDate.set(topic.category, entry.date);
      }
    }
  }

  const coverage = [...catTotals.entries()].map(([category, catTotal]) => ({
    category,
    delivered: /** @type {Set<string>} */ (catDelivered.get(category)).size,
    total: catTotal,
    lastDate: catLastDate.get(category) ?? null,
  }));
  coverage.sort((a, b) => {
    const aKey = a.lastDate ?? "";
    const bKey = b.lastDate ?? "";
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;
    return a.category < b.category ? -1 : a.category > b.category ? 1 : 0;
  });

  const recent = safeLog
    .filter(
      (e) =>
        e &&
        typeof e.topicId === "string" &&
        typeof e.date === "string" &&
        PULSE_ISO_DATE_RE.test(e.date),
    )
    // reverse() first so equal-date ties keep newest-appended order
    // (the filter result is a fresh array, so the input is not mutated).
    .reverse()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5)
    .map((e) => ({
      topicId: e.topicId,
      title: topicById.get(e.topicId)?.title ?? null,
      date: e.date,
    }));

  return {
    total,
    thisMonth,
    lastDate: lastEntry ? lastEntry.date : null,
    lastTopicTitle: lastEntry
      ? topicById.get(lastEntry.topicId)?.title ?? null
      : null,
    coverage,
    recent,
  };
}

/**
 * Pure, deterministic suggestion of the next topic to deliver.
 * Never-delivered topics win first: the candidate comes from the
 * category whose last-delivered date is the oldest (a category with no
 * deliveries at all counts as the most neglected), tie-broken by
 * category name, then alphabetically by topic id. When every catalog
 * topic has been delivered, the topic with the globally oldest
 * last-delivered date wins (alphabetical id tie-break). The suggestion
 * is global: it ignores the current category filter. Unknown log ids
 * are ignored — they neither mark catalog topics as delivered nor
 * contribute category dates. Neither input is mutated.
 * @param {{ topicId: string, date: string }[]} log - The meeting log.
 * @param {Topic[]} topics - The topic catalog.
 * @returns {{ topic: Topic, reason: string } | null} The suggestion
 *   with an informational reason, or null when there is nothing to
 *   suggest (empty catalog, or no usable dates in the all-delivered
 *   case).
 */
function suggestNextTopic(log, topics) {
  const safeLog = Array.isArray(log) ? log : [];
  const catalogTopics = (Array.isArray(topics) ? topics : []).filter(
    (t) => t && typeof t.id === "string" && typeof t.category === "string",
  );
  if (catalogTopics.length === 0) return null;

  const topicById = new Map(catalogTopics.map((t) => [t.id, t]));
  const validEntries = safeLog.filter(
    (e) =>
      e &&
      typeof e.topicId === "string" &&
      typeof e.date === "string" &&
      PULSE_ISO_DATE_RE.test(e.date) &&
      topicById.has(e.topicId),
  );

  // "Never delivered" means zero log entries for the topic id — any
  // entry counts, even one with a malformed date.
  const deliveredIds = new Set();
  for (const e of safeLog) {
    if (e && typeof e.topicId === "string") deliveredIds.add(e.topicId);
  }
  const neverDelivered = catalogTopics.filter((t) => !deliveredIds.has(t.id));

  if (neverDelivered.length > 0) {
    // Latest delivery date per category, across all its catalog topics.
    const catLastDate = new Map();
    for (const entry of validEntries) {
      const category = /** @type {Topic} */ (topicById.get(entry.topicId)).category;
      const prev = catLastDate.get(category);
      if (prev === undefined || entry.date > prev) {
        catLastDate.set(category, entry.date);
      }
    }

    // Categories that still have a never-delivered topic, ranked by
    // neglect: absent date first (""> no date sorts before any date),
    // then oldest date, then category name.
    const candidateCats = [...new Set(neverDelivered.map((t) => t.category))];
    candidateCats.sort((a, b) => {
      const aDate = catLastDate.get(a) ?? "";
      const bDate = catLastDate.get(b) ?? "";
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    const chosenCat = candidateCats[0];
    const chosenCatDate = catLastDate.get(chosenCat) ?? null;
    const picks = neverDelivered
      .filter((t) => t.category === chosenCat)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return {
      topic: picks[0],
      reason: chosenCatDate
        ? `Never delivered — your ${chosenCat} category was last covered ${chosenCatDate}`
        : `Never delivered — your ${chosenCat} category has no talks recorded yet`,
    };
  }

  // All catalog topics delivered: globally oldest last-delivered date wins.
  const lastByTopic = new Map();
  for (const entry of validEntries) {
    const prev = lastByTopic.get(entry.topicId);
    if (prev === undefined || entry.date > prev) {
      lastByTopic.set(entry.topicId, entry.date);
    }
  }
  const candidates = catalogTopics
    .filter((t) => lastByTopic.has(t.id))
    .sort((a, b) => {
      const aDate = /** @type {string} */ (lastByTopic.get(a.id));
      const bDate = /** @type {string} */ (lastByTopic.get(b.id));
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
  if (candidates.length === 0) return null;
  const topic = candidates[0];
  const date = /** @type {string} */ (lastByTopic.get(topic.id));
  return {
    topic,
    reason: `Last delivered ${date} — the oldest entry in your record`,
  };
}

/**
 * Renders the Safety Program Pulse into the #program-pulse section:
 * total/this-month counts, recency line (with an informational cue
 * past 30 days — no streak or compliance language), the full category
 * coverage ledger, up to 5 recent deliveries, and the deterministic
 * suggested-next-topic with a Load button that loads it into the
 * topic card. Re-computed from the current meetingLog and catalog on
 * every call. Warns and leaves the section untouched when
 * #program-pulse is missing from the DOM.
 * @returns {void}
 */
function renderProgramPulse() {
  const section = document.getElementById("program-pulse");
  if (!section) {
    console.warn(
      "[SafetyTopic] Could not render program pulse: #program-pulse not found in DOM",
    );
    return;
  }

  const stats = computeProgramStats(meetingLog, allTopics);
  const suggestion = suggestNextTopic(meetingLog, allTopics);

  const days = stats.lastDate ? daysSince(stats.lastDate) : null;
  const recencyHtml =
    days === null
      ? `<p class="pulse-recency">No talks recorded yet</p>`
      : `<p class="pulse-recency">Last recorded talk: ${days} ${
          days === 1 ? "day" : "days"
        } ago (${escHtml(stats.lastDate)})${
          days > 30
            ? ` <span class="pulse-recency-cue">(most programs run these weekly or monthly)</span>`
            : ""
        }</p>`;

  const deliveredCount = stats.coverage.reduce((sum, c) => sum + c.delivered, 0);
  const catalogCount = stats.coverage.reduce((sum, c) => sum + c.total, 0);

  const ledgerHtml = stats.coverage
    .map(
      (c) => `
      <li class="pulse-ledger-row${c.delivered === 0 ? " pulse-cat-never" : ""}">
        <span class="pulse-cat-name">${escHtml(c.category)}</span>
        <span class="pulse-cat-counts">${c.delivered}/${c.total} delivered</span>
        <span class="pulse-cat-last">${c.lastDate ? `last: ${escHtml(c.lastDate)}` : "never delivered"}</span>
      </li>`,
    )
    .join("");

  const recentHtml = stats.recent
    .map(
      (r) => `
      <li class="pulse-recent-row">
        <span class="pulse-recent-title">${escHtml(r.title ?? "(topic no longer in catalog)")}</span>
        <span class="pulse-recent-date">${escHtml(r.date)}</span>
      </li>`,
    )
    .join("");

  const suggestionHtml = suggestion
    ? `
      <div class="pulse-suggestion">
        <p class="topic-section-label">What's next <span class="pulse-suggestion-scope">(global — ignores your category filter)</span></p>
        <p class="pulse-suggestion-line">Suggested next: <strong>${escHtml(suggestion.topic.title)}</strong> — ${escHtml(suggestion.reason)}</p>
        <button id="pulse-load-btn" class="btn btn-primary" type="button">Load this topic</button>
      </div>`
    : `<p class="pulse-suggestion-line">No suggestion available.</p>`;

  section.innerHTML = `
    <div class="pulse-header">
      <h2 class="pulse-title">Program Pulse</h2>
      <span class="pulse-total-badge">${stats.total} talk${stats.total === 1 ? "" : "s"} recorded</span>
    </div>
    ${
      stats.total === 0
        ? `
        <div class="state-empty">
          <p>No talks recorded yet — hit 'I Used This' after your next meeting to start building your record.</p>
        </div>`
        : `
        <div class="pulse-stats">
          <div class="pulse-stat">
            <span class="pulse-stat-value">${stats.total}</span>
            <span class="pulse-stat-label">Total talks</span>
          </div>
          <div class="pulse-stat">
            <span class="pulse-stat-value">${stats.thisMonth}</span>
            <span class="pulse-stat-label">This month</span>
          </div>
          <div class="pulse-stat">
            <span class="pulse-stat-value">${deliveredCount}/${catalogCount}</span>
            <span class="pulse-stat-label">Topics delivered</span>
          </div>
        </div>
        ${recencyHtml}
        <p class="topic-section-label">Category coverage</p>
        <ul class="pulse-ledger">${ledgerHtml}</ul>
        <p class="topic-section-label">Recent talks</p>
        <ul class="pulse-recent">${recentHtml}</ul>`
    }
    ${suggestionHtml}
    <div class="pulse-report-actions">
      <button id="report-open-btn" class="btn btn-primary" type="button">Program Report</button>
    </div>
  `;

  const loadBtn = document.getElementById("pulse-load-btn");
  if (loadBtn && suggestion) {
    loadBtn.addEventListener("click", () => {
      if (suggestion.topic) {
        // Sync the category filter and currentIndex first so the
        // counter and prev/next buttons match the displayed topic.
        syncCategoryToTopic(suggestion.topic);
        showTopic(suggestion.topic, true);
      }
    });
  }

  const reportBtn = document.getElementById("report-open-btn");
  if (reportBtn) {
    reportBtn.addEventListener("click", openProgramReport);
  }
}

/**
 * Builds the printable Safety Talk Record (sign-off sheet) HTML for a
 * topic: brief header (title, summary, key points, optional
 * stat/discussion, source, duration), prefilled Date, blank
 * Presented by / Location / Company fill-in lines, attestation, a
 * 12-row attendance table, notes area, and presenter signature line.
 * All topic-derived strings pass through escHtml().
 * @param {Topic | null | undefined} topic - The topic to build a record for.
 * @returns {string} The sheet HTML, or "" when no topic is given.
 */
function buildSignoffSheet(topic) {
  if (!topic) return "";
  const date = todayISO();

  const statBlock = topic.stat
    ? `<div class="signoff-stat"><strong>Did You Know?</strong> ${escHtml(topic.stat)}</div>`
    : "";
  const discussionBlock = topic.discussion_prompt
    ? `<div class="signoff-discussion"><strong>Discussion:</strong> ${escHtml(topic.discussion_prompt)}</div>`
    : "";

  const attendanceRows = Array.from({ length: 12 }, () =>
    `<tr><td class="signoff-cell"></td><td class="signoff-cell"></td></tr>`,
  ).join("");

  return `
    <div class="signoff-header">
      <h2 class="signoff-title">Safety Talk Record</h2>
      <p class="signoff-topic-title">${escHtml(topic.title)}</p>
      <p class="signoff-summary">${escHtml(topic.summary)}</p>
      <ul class="signoff-points">
        ${topic.key_points.map((pt) => `<li>${escHtml(pt)}</li>`).join("")}
      </ul>
      ${statBlock}
      ${discussionBlock}
      <p class="signoff-source">Source: ${escHtml(topic.source)} — ${escHtml(topic.source_ref)} · Duration: ${escHtml(topic.duration)}</p>
    </div>

    <div class="signoff-fields">
      <p class="signoff-field"><strong>Date:</strong> ${escHtml(date)}</p>
      <p class="signoff-field"><strong>Presented by</strong> <span class="signoff-blank"></span></p>
      <p class="signoff-field"><strong>Location / Crew</strong> <span class="signoff-blank"></span></p>
      <p class="signoff-field"><strong>Company</strong> <span class="signoff-blank"></span></p>
    </div>

    <p class="signoff-attestation">By signing below, I confirm I attended this safety talk and understood its content.</p>

    <table class="signoff-table">
      <thead>
        <tr><th>Name (print)</th><th>Signature</th></tr>
      </thead>
      <tbody>
        ${attendanceRows}
      </tbody>
    </table>

    <div class="signoff-notes">
      <p class="signoff-section-label">Notes / follow-up actions</p>
      <p class="signoff-blank"></p>
      <p class="signoff-blank"></p>
      <p class="signoff-blank"></p>
    </div>

    <p class="signoff-presenter-sign"><strong>Presenter signature</strong> <span class="signoff-blank"></span> <strong>Date</strong> <span class="signoff-blank"></span></p>
  `;
}

/**
 * Opens the sign-off sheet for the currently loaded topic: renders it
 * into #signoff-sheet, closes any open program report (body.report-open
 * print rules would otherwise win over the sheet's and print the wrong
 * document), adds body.sheet-open (print mode), and calls
 * window.print() when available. With no topic loaded, shows an error
 * toast and does nothing else. When window.print is unavailable, the
 * sheet stays visible on screen with an info toast instead.
 */
function openSignoffSheet() {
  const topic = currentTopic();
  if (!topic) {
    showToast("No topic loaded — load a topic first");
    return;
  }
  if (!signoffSheet) {
    signoffSheet = document.getElementById("signoff-sheet");
    if (!signoffSheet) return;
  }
  signoffSheet.innerHTML = buildSignoffSheet(topic);
  // Mirror the main Print button and showTopic(): never print with a
  // stale overlay open, so only the sheet is visible in print mode.
  closeProgramReport();
  document.body.classList.add("sheet-open");
  if (typeof window.print === "function") {
    window.print();
  } else {
    showToast("Sign-off sheet shown on screen — print from your browser menu");
  }
}

/**
 * Closes the sign-off sheet: removes body.sheet-open and clears the
 * rendered sheet. Bound to the window afterprint event.
 */
function closeSignoffSheet() {
  document.body.classList.remove("sheet-open");
  if (signoffSheet) signoffSheet.innerHTML = "";
}

// ---------- Program Report ----------
/** Default report range selection: the current calendar year. */
const REPORT_DEFAULT_RANGE = { preset: "year", from: null, to: null };
/** Range selection currently shown in the report overlay (null inputs = unbounded). */
let reportRange = { preset: "year", from: null, to: null };

/**
 * Left-pads a number to two digits for ISO date assembly.
 * @param {number} n - A month or day number.
 * @returns {string} Two-digit string, e.g. 7 → "07".
 */
function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Resolves a report range selection into concrete inclusive ISO bounds
 * and a human-readable label. Presets are calendar-based and resolved
 * against today's local date: month = current calendar month, quarter =
 * current calendar quarter, year = current calendar year, all = no
 * bounds. Custom ranges use the given ISO from/to, treating a missing
 * or non-ISO bound as unbounded on that side (both unbounded = all
 * time). Unrecognized presets are treated as all time. Never throws.
 * @param {{ preset?: string, from?: string | null, to?: string | null } | null | undefined} range
 *   The range selection (callers own the default; `undefined` = all time).
 * @returns {{ from: string | null, to: string | null, label: string }}
 *   Inclusive bounds (null = unbounded) and a report label.
 */
function resolveReportRange(range) {
  const today = todayISO();
  const year = +today.slice(0, 4);
  const month = +today.slice(5, 7);
  const r = range && typeof range === "object" ? range : {};
  const preset = typeof r.preset === "string" ? r.preset : "";

  /** @type {{ from: string | null, to: string | null, label: string }} */
  const bounds = { from: null, to: null, label: "All time" };

  if (preset === "month") {
    const lastDay = new Date(year, month, 0).getDate();
    bounds.from = `${today.slice(0, 7)}-01`;
    bounds.to = `${today.slice(0, 7)}-${pad2(lastDay)}`;
    bounds.label = `This month (${bounds.from} to ${bounds.to})`;
  } else if (preset === "quarter") {
    const qStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
    const qEndMonth = qStartMonth + 2;
    bounds.from = `${year}-${pad2(qStartMonth)}-01`;
    bounds.to = `${year}-${pad2(qEndMonth)}-${pad2(new Date(year, qEndMonth, 0).getDate())}`;
    bounds.label = `This quarter (${bounds.from} to ${bounds.to})`;
  } else if (preset === "year") {
    bounds.from = `${year}-01-01`;
    bounds.to = `${year}-12-31`;
    bounds.label = `This year (${bounds.from} to ${bounds.to})`;
  } else if (preset === "custom") {
    const fromOk =
      typeof r.from === "string" && PULSE_ISO_DATE_RE.test(r.from);
    const toOk = typeof r.to === "string" && PULSE_ISO_DATE_RE.test(r.to);
    if (!fromOk && !toOk) return bounds;
    bounds.from = fromOk ? /** @type {string} */ (r.from) : null;
    bounds.to = toOk ? /** @type {string} */ (r.to) : null;
    if (fromOk && toOk) {
      bounds.label = `Custom range (${bounds.from} to ${bounds.to})`;
    } else if (fromOk) {
      bounds.label = `Custom range (${bounds.from} onward)`;
    } else {
      bounds.label = `Custom range (through ${bounds.to})`;
    }
  }
  // "all" and unrecognized presets keep the unbounded default above.
  return bounds;
}

/**
 * Pure, deterministic builder of the Safety Program Report from a
 * meeting log, the topic catalog, and a range selection. Never throws
 * on malformed input and never mutates its arguments. Entries without
 * a string topicId are ignored entirely (Pulse convention); entries
 * whose date is not an ISO YYYY-MM-DD string are excluded from rows
 * and totals and counted in `excludedDates` (surfaced by the renderer,
 * never silent). Unknown topic ids keep their row as "(topic no longer
 * in catalog)" with category "—", count toward totals, and are
 * excluded from the coverage ledger. Coverage is scoped to the range:
 * one row per catalog category (delivered = distinct topics delivered
 * in range), sorted never-delivered first, then oldest last-delivered
 * first (category-name tie-break), mirroring the Pulse ledger.
 * @param {{ topicId: string, date: string }[]} log - The meeting log.
 * @param {Topic[]} topics - The topic catalog.
 * @param {{ preset?: string, from?: string | null, to?: string | null } | null | undefined} range
 *   Range selection; `undefined` is treated as all time.
 * @returns {{ label: string, from: string | null, to: string | null,
 *   rows: { date: string, topicId: string, topicTitle: string, category: string }[],
 *   coverage: { category: string, delivered: number, total: number,
 *     lastDate: string | null }[],
 *   summary: { total: number, first: string | null, last: string | null },
 *   excludedDates: number }}
 *   Chronological rows (ascending; same-date entries keep log order),
 *   per-category coverage, in-range summary counts, and the count of
 *   malformed-date entries excluded from the whole report. A from > to
 *   custom range deterministically yields empty rows.
 */
function buildProgramReport(log, topics, range) {
  const safeLog = Array.isArray(log) ? log : [];
  const safeTopics = Array.isArray(topics) ? topics : [];
  const bounds = resolveReportRange(range);

  const topicById = new Map();
  for (const t of safeTopics) {
    if (t && typeof t.id === "string" && !topicById.has(t.id)) {
      topicById.set(t.id, t);
    }
  }

  // Catalog category totals + per-range delivery tracking (Pulse ledger scope)
  const catTotals = new Map();
  const catDeliveredIds = new Map();
  const catLastDate = new Map();
  for (const t of safeTopics) {
    if (!t || typeof t.category !== "string") continue;
    catTotals.set(t.category, (catTotals.get(t.category) || 0) + 1);
    if (!catDeliveredIds.has(t.category)) catDeliveredIds.set(t.category, new Set());
    if (!catLastDate.has(t.category)) catLastDate.set(t.category, null);
  }

  /** @type {{ date: string, topicId: string, topicTitle: string, category: string }[]} */
  const rows = [];
  let excludedDates = 0;
  let first = null;
  let last = null;

  for (const entry of safeLog) {
    if (!entry || typeof entry.topicId !== "string") continue;
    const dateOk =
      typeof entry.date === "string" && PULSE_ISO_DATE_RE.test(entry.date);
    if (!dateOk) {
      excludedDates += 1;
      continue;
    }
    if (bounds.from !== null && entry.date < bounds.from) continue;
    if (bounds.to !== null && entry.date > bounds.to) continue;

    const topic = topicById.get(entry.topicId);
    rows.push({
      date: entry.date,
      topicId: entry.topicId,
      topicTitle:
        topic && typeof topic.title === "string"
          ? topic.title
          : "(topic no longer in catalog)",
      category:
        topic && typeof topic.category === "string" ? topic.category : "—",
    });
    if (first === null || entry.date < first) first = entry.date;
    if (last === null || entry.date > last) last = entry.date;

    if (topic && typeof topic.category === "string" && catTotals.has(topic.category)) {
      /** @type {Set<string>} */ (catDeliveredIds.get(topic.category)).add(topic.id);
      const prev = catLastDate.get(topic.category);
      if (prev === null || entry.date > prev) {
        catLastDate.set(topic.category, entry.date);
      }
    }
  }

  // Stable sort (ES2019+): same-date entries keep their log order.
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const coverage = [...catTotals.entries()].map(([category, total]) => ({
    category,
    delivered: /** @type {Set<string>} */ (catDeliveredIds.get(category)).size,
    total,
    lastDate: catLastDate.get(category) ?? null,
  }));
  coverage.sort((a, b) => {
    const aKey = a.lastDate ?? "";
    const bKey = b.lastDate ?? "";
    if (aKey !== bKey) return aKey < bKey ? -1 : 1;
    return a.category < b.category ? -1 : a.category > b.category ? 1 : 0;
  });

  return {
    label: bounds.label,
    from: bounds.from,
    to: bounds.to,
    rows,
    coverage,
    summary: { total: rows.length, first, last },
    excludedDates,
  };
}

/**
 * Escapes a single CSV cell per RFC 4180: values containing quotes,
 * commas, carriage returns, or newlines are wrapped in double quotes
 * with internal quotes doubled. Null/undefined become "".
 * (CSV escaping is its own scheme — HTML rendering must still use
 * escHtml(), never this function.)
 * @param {unknown} value - The cell value to escape.
 * @returns {string} An RFC 4180-safe CSV cell.
 */
function escapeCsvCell(value) {
  if (value == null) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Serializes a program report to RFC 4180 CSV text: UTF-8 BOM prefix,
 * CRLF line endings (including a trailing one), and the columns
 * Date,Topic,Category,Topic ID with every cell RFC 4180-escaped.
 * Never throws on malformed reports.
 * @param {{ rows?: { date?: unknown, topicTitle?: unknown, category?: unknown, topicId?: unknown }[] } | null | undefined} report
 *   A report object as returned by buildProgramReport.
 * @returns {string} The complete CSV file content.
 */
function buildProgramReportCsv(report) {
  const r = report && typeof report === "object" ? report : {};
  const rows = Array.isArray(r.rows) ? r.rows : [];
  const lines = ["Date,Topic,Category,Topic ID"];
  for (const row of rows) {
    const e = row && typeof row === "object" ? row : {};
    lines.push(
      [
        escapeCsvCell(e.date),
        escapeCsvCell(e.topicTitle),
        escapeCsvCell(e.category),
        escapeCsvCell(e.topicId),
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/**
 * Builds the report footer HTML: informational retention note, the
 * pointer to filed Safety Talk Records, and the site's source/
 * disclaimer language. Facts only — no compliance verdicts.
 * @returns {string} Footer HTML.
 */
function buildReportFooterHtml() {
  return `
    <div class="report-footer">
      <p>Records of these talks: keep at least 1 year (CA/WA floors); Cal/OSHA's enforcement posture for employers with 10+ employees is 3 years.</p>
      <p>Attendance names and signatures: see Safety Talk Records on file.</p>
      <p>Content curated from public-domain sources (OSHA, DOE EHSS, NIOSH). Always defer to your site-specific safety procedures.</p>
    </div>
  `;
}

/**
 * Builds the report header HTML: title, company/crew fill-in lines,
 * and the generated date + range label line.
 * @param {string} label - The range label to display.
 * @returns {string} Header HTML.
 */
function buildReportHeaderHtml(label) {
  return `
    <div class="report-header">
      <h2 class="report-title">Safety Talk Program Report</h2>
      <p class="report-field"><strong>Company</strong> <span class="report-blank"></span></p>
      <p class="report-field"><strong>Crew</strong> <span class="report-blank"></span></p>
      <p class="report-generated"><strong>Generated:</strong> ${escHtml(todayISO())} · <strong>Period:</strong> ${escHtml(label)}</p>
    </div>
  `;
}

/**
 * Builds the printable report body HTML from a program report: header
 * (title, company/crew fill-in lines, generated date + range label),
 * summary (total, first/last, informational cadence line), the
 * chronological delivery table, the per-category coverage summary,
 * the excluded-entries note (only when entries were excluded), an
 * honest empty state when nothing is in range, and the footer. All
 * data-derived strings pass through escHtml().
 * @param {{ label: string, rows: { date: string, topicId: string, topicTitle: string, category: string }[], coverage: { category: string, delivered: number, total: number, lastDate: string | null }[], summary: { total: number, first: string | null, last: string | null }, excludedDates: number }} report
 *   A report object as returned by buildProgramReport.
 * @returns {string} The report body HTML.
 */
function buildProgramReportHtml(report) {
  const excludedNote =
    report.excludedDates > 0
      ? `<p class="report-excluded-note">${report.excludedDates} ${
          report.excludedDates === 1
            ? "entry with an unrecognizable date was"
            : "entries with unrecognizable dates were"
        } excluded</p>`
      : "";

  if (!report.summary || report.summary.total === 0) {
    return `
      ${buildReportHeaderHtml(report.label)}
      ${excludedNote}
      <p class="report-empty-state">No safety talks were recorded in this period.</p>
      ${buildReportFooterHtml()}
    `;
  }

  const rowsHtml = report.rows
    .map(
      (row) => `
        <tr>
          <td>${escHtml(row.date)}</td>
          <td>${escHtml(row.topicTitle)}</td>
          <td>${escHtml(row.category)}</td>
        </tr>`,
    )
    .join("");

  const coverageHtml = report.coverage
    .map(
      (c) => `
        <li class="report-coverage-row">
          <span class="report-cat-name">${escHtml(c.category)}</span>
          <span class="report-cat-counts">${c.delivered}/${c.total} delivered</span>
          <span class="report-cat-last">${c.lastDate ? `last: ${escHtml(c.lastDate)}` : "last: —"}</span>
        </li>`,
    )
    .join("");

  return `
    ${buildReportHeaderHtml(report.label)}
    ${excludedNote}
    <div class="report-summary">
      <p><strong>Total talks in range:</strong> ${report.summary.total}</p>
      <p><strong>First recorded:</strong> ${escHtml(report.summary.first)} · <strong>Last recorded:</strong> ${escHtml(report.summary.last)}</p>
      <p class="report-cadence">State cadence floors, when they apply: CA every 10 working days; WA weekly; OR monthly. No federal mandate.</p>
    </div>
    <p class="report-section-label">Safety talks delivered</p>
    <table class="report-table">
      <thead>
        <tr><th>Date</th><th>Topic</th><th>Category</th></tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p class="report-section-label">Category coverage</p>
    <ul class="report-coverage">${coverageHtml}</ul>
    ${buildReportFooterHtml()}
  `;
}

/**
 * Rebuilds only the report body (.report-body) inside #program-report,
 * leaving the range controls mounted so focus (e.g. on the preset
 * select or a date input) survives the update. Used by the preset and
 * date handlers and logTalk's live update; the full renderProgramReport()
 * is used when the overlay opens. Warns and leaves the body untouched
 * when the overlay or its body is missing from the DOM.
 * @returns {void}
 */
function renderProgramReportBody() {
  const section = document.getElementById("program-report");
  const body = section && section.querySelector(".report-body");
  if (!body) {
    console.warn(
      "[SafetyTopic] Could not update program report body: #program-report .report-body not found in DOM",
    );
    return;
  }
  body.innerHTML = buildProgramReportHtml(
    buildProgramReport(meetingLog, allTopics, reportRange),
  );
}

/**
 * Syncs the custom from/to date inputs' enabled state from the current
 * reportRange selection (enabled only in custom mode) without
 * rebuilding the controls, so focus is preserved across preset
 * changes.
 * @returns {void}
 */
function syncReportDateInputs() {
  const isCustom = reportRange.preset === "custom";
  for (const id of ["report-from", "report-to"]) {
    const input = document.getElementById(id);
    if (input) input.disabled = !isCustom;
  }
}

/**
 * Renders the program report overlay into #program-report from the
 * current meetingLog, catalog, and reportRange selection: range
 * controls (presets + custom from/to), Print/Download CSV/Close
 * buttons, and the report body. Used when the overlay opens; range
 * and logTalk updates go through renderProgramReportBody() so the
 * controls stay mounted and keep focus. Warns and leaves the section
 * untouched when #program-report is missing from the DOM.
 * @returns {void}
 */
function renderProgramReport() {
  const section = document.getElementById("program-report");
  if (!section) {
    console.warn(
      "[SafetyTopic] Could not render program report: #program-report not found in DOM",
    );
    return;
  }

  const presetOptions = [
    ["month", "This month"],
    ["quarter", "This quarter"],
    ["year", "This year"],
    ["all", "All time"],
    ["custom", "Custom range"],
  ]
    .map(([value, labelText]) => `<option value="${value}">${labelText}</option>`)
    .join("");
  const isCustom = reportRange.preset === "custom";

  section.innerHTML = `
    <div class="report-controls">
      <label class="report-control">Range
        <select id="report-range-preset">${presetOptions}</select>
      </label>
      <label class="report-control">From
        <input type="date" id="report-from" class="report-date" value="${escHtml(reportRange.from ?? "")}" ${isCustom ? "" : "disabled"}>
      </label>
      <label class="report-control">To
        <input type="date" id="report-to" class="report-date" value="${escHtml(reportRange.to ?? "")}" ${isCustom ? "" : "disabled"}>
      </label>
      <button id="report-print-btn" class="btn btn-primary" type="button">Print</button>
      <button id="report-csv-btn" class="btn btn-primary" type="button">Download CSV</button>
      <button id="report-close-btn" class="btn btn-ghost" type="button">Close</button>
    </div>
    <div class="report-body">
      ${buildProgramReportHtml(buildProgramReport(meetingLog, allTopics, reportRange))}
    </div>
  `;

  const presetSelect = document.getElementById("report-range-preset");
  if (presetSelect) {
    presetSelect.value = reportRange.preset;
    presetSelect.addEventListener("change", () => {
      reportRange = {
        preset: presetSelect.value,
        from: reportRange.from,
        to: reportRange.to,
      };
      // Update the mounted controls in place (custom mode enables the
      // date inputs) and rebuild only the body so the firing select
      // keeps focus.
      syncReportDateInputs();
      renderProgramReportBody();
    });
  }

  // Date inputs apply only in custom mode; a change re-reads both
  // inputs so editing either keeps the other's current value.
  const wireDateInput = (id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("change", () => {
      const fromInput = document.getElementById("report-from");
      const toInput = document.getElementById("report-to");
      reportRange = {
        preset: "custom",
        from: fromInput && fromInput.value ? fromInput.value : null,
        to: toInput && toInput.value ? toInput.value : null,
      };
      renderProgramReportBody();
    });
  };
  wireDateInput("report-from");
  wireDateInput("report-to");

  const printBtnEl = document.getElementById("report-print-btn");
  if (printBtnEl) {
    printBtnEl.addEventListener("click", () => {
      if (typeof window.print === "function") {
        window.print();
      } else {
        showToast("Print from your browser menu");
      }
    });
  }

  const csvBtnEl = document.getElementById("report-csv-btn");
  if (csvBtnEl) {
    csvBtnEl.addEventListener("click", () => {
      exportProgramReportCsv(
        buildProgramReport(meetingLog, allTopics, reportRange),
      );
    });
  }

  const closeBtnEl = document.getElementById("report-close-btn");
  if (closeBtnEl) {
    closeBtnEl.addEventListener("click", closeProgramReport);
  }
}

/**
 * Opens the program report overlay: resets the range to the default
 * (This year), renders the report into #program-report, and adds
 * body.report-open (print mode). Warns without side effects when
 * #program-report is missing from the DOM.
 * @returns {void}
 */
function openProgramReport() {
  const section = document.getElementById("program-report");
  if (!section) {
    console.warn(
      "[SafetyTopic] Could not open program report: #program-report not found in DOM",
    );
    return;
  }
  reportRange = { ...REPORT_DEFAULT_RANGE };
  renderProgramReport();
  document.body.classList.add("report-open");
}

/**
 * Closes the program report: removes body.report-open and clears the
 * rendered report. Safe to call when the overlay is not open.
 * @returns {void}
 */
function closeProgramReport() {
  document.body.classList.remove("report-open");
  const section = document.getElementById("program-report");
  if (section) section.innerHTML = "";
}

/**
 * Downloads the program report as a CSV file named
 * safety-talk-program-report-<todayISO()>.csv via Blob +
 * URL.createObjectURL + a temporary <a download> click, synchronously
 * inside the caller's user gesture; the temporary anchor is removed on
 * every path (including a click() throw) and the object URL is revoked
 * immediately after. Feature-detects Blob, object URLs, and the
 * download attribute: when support is missing, shows a descriptive
 * error toast naming the missing capability and warns via
 * console.warn — never a silent no-op. Download failures are reported
 * via console.warn + toast, never swallowed.
 * @param {{ rows?: unknown[] } | null | undefined} report
 *   A report object as returned by buildProgramReport.
 * @returns {void}
 */
function exportProgramReportCsv(report) {
  const missing = [];
  if (typeof Blob !== "function") missing.push("Blob support");
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    missing.push("object URL support");
  }
  const anchor = document.createElement("a");
  if (!anchor || !("download" in anchor)) missing.push("file download support");
  if (missing.length > 0) {
    const msg = `CSV export unavailable — this browser lacks ${missing.join(" and ")}`;
    console.warn(`[SafetyTopic] ${msg}`);
    showToast(msg);
    return;
  }

  let url = null;
  try {
    const blob = new Blob([buildProgramReportCsv(report)], {
      type: "text/csv;charset=utf-8;",
    });
    url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `safety-talk-program-report-${todayISO()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    showToast("✓ Report downloaded as CSV");
  } catch (err) {
    console.warn("[SafetyTopic] CSV export failed:", err);
    showToast("CSV export failed — try a different browser");
  } finally {
    // Remove the anchor on every path, including a click() throw.
    if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
    if (url) URL.revokeObjectURL(url);
  }
}

// ---------- Render ----------
/**
 * Renders a topic card into the DOM, including title, summary, key
 * points, optional stat/discussion prompt, source attribution, the
 * "I Used This" button, and prev/next navigation.
 * @param {Topic} topic - The topic to display.
 * @param {boolean} [updateHash=true] - Whether to update the URL hash.
 */
function showTopic(topic, updateHash) {
  if (!topic) return;
  // Debounce: ignore concurrent calls (e.g. from rapid button clicks)
  if (isRendering) return;
  isRendering = true;

  // Clear any stale sheet/report print state so a later print prints
  // the card, never the sign-off sheet or the program report.
  closeSignoffSheet();
  closeProgramReport();

  // Track that we've seen this topic
  (window.markSeen ?? markSeen)(topic.id);

  if (updateHash) history.replaceState(null, "", `#${topic.id}`);

  const catTopics = filteredTopics.length > 0 ? filteredTopics : allTopics;
  const position = catTopics.findIndex((t) => t.id === topic.id);
  const filterLabel =
    categorySelect.value === "__unused__"
      ? "unused topics"
      : categorySelect.value || "all topics";

  const useCount = usedTopics[topic.id] || 0;
  const usedLabel =
    useCount === 0
      ? "✓ I Used This in a Meeting"
      : useCount === 1
        ? "✓ Used in 1 Meeting"
        : `✓ Used in ${useCount} Meetings`;
  const usedClass = useCount > 0 ? "btn btn-used is-used" : "btn btn-used";
  const usedDisabled = useCount > 0 ? "disabled" : "";

  const counterText =
    position !== -1 ? `${position + 1} / ${catTopics.length}` : "";

  const lastDelivered = meetingLog
    .filter((e) => e.topicId === topic.id)
    .map((e) => e.date)
    .sort()
    .pop();
  const lastDeliveredHtml = lastDelivered
    ? `<p class="topic-last-delivered">Last delivered: ${escHtml(lastDelivered)}</p>`
    : "";

  topicCard.innerHTML = `
    <div class="topic-header">
      <div class="topic-meta">
        <span class="badge ${badgeClass(topic.source)}">${escHtml(topic.source)}</span>
        <span class="badge-category">${escHtml(topic.category)}</span>
        <span class="topic-duration">⏱ ${escHtml(topic.duration)}</span>
      </div>
      <span class="topic-counter" aria-label="Topic position">${escHtml(counterText)}</span>
    </div>

    <h1 class="topic-title">${escHtml(topic.title)}</h1>

    <p class="topic-summary">${escHtml(topic.summary)}</p>

    <div>
      <p class="topic-section-label">Key Points</p>
      <ul class="topic-points">
        ${topic.key_points.map((pt) => `<li>${escHtml(pt)}</li>`).join("")}
      </ul>
    </div>

    ${
      topic.stat
        ? `
    <div class="topic-stat" role="note">
      <strong>Did You Know?</strong>
      ${escHtml(topic.stat)}
    </div>`
        : ""
    }

    ${
      topic.discussion_prompt
        ? `
    <div class="topic-discussion">
      <p>${escHtml(topic.discussion_prompt)}</p>
    </div>`
        : ""
    }

    <div class="topic-card-footer">
      <p class="topic-source-ref">Source: ${escHtml(topic.source)} — ${escHtml(topic.source_ref)}</p>
      ${lastDeliveredHtml}
      <button id="use-this-btn" class="${usedClass}" type="button"
              aria-label="Mark this topic as used in a meeting"
              aria-pressed="${useCount > 0}" ${usedDisabled}>
        ${escHtml(usedLabel)}
      </button>
    </div>

    <div class="topic-nav" role="navigation" aria-label="Browse topics">
      <button class="nav-arrow" id="nav-prev" aria-label="Previous topic" ${position <= 0 ? "disabled" : ""}>←</button>
      <span class="nav-label">Browse ${escHtml(filterLabel)}</span>
      <button class="nav-arrow" id="nav-next" aria-label="Next topic" ${position >= catTopics.length - 1 ? "disabled" : ""}>→</button>
    </div>
  `;

  // Wire "I Used This" — guard against missing element (e.g. renderError path)
  const useThisBtn = document.getElementById("use-this-btn");
  if (useThisBtn) {
    useThisBtn.addEventListener("click", function () {
      markUsed(topic.id);
      logTalk(topic.id);
      this.textContent = "✓ Used in 1 Meeting";
      this.classList.add("is-used");
      this.setAttribute("aria-pressed", "true");
      this.disabled = true;
      // Keep the card in sync with meetingLog without a re-render.
      const footer = topicCard && topicCard.querySelector(".topic-card-footer");
      if (footer) {
        let line = footer.querySelector(".topic-last-delivered");
        if (!line) {
          line = document.createElement("p");
          line.className = "topic-last-delivered";
          footer.insertBefore(line, this);
        }
        line.textContent = `Last delivered: ${todayISO()}`;
      }
      showToast("✓ Marked as used!");
    });
  }

  // Wire prev/next — both guarded against missing elements
  const prevBtn = document.getElementById("nav-prev");
  const nextBtn = document.getElementById("nav-next");
  if (prevBtn) prevBtn.addEventListener("click", () => navigateDelta(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateDelta(1));

  isRendering = false;
}

/**
 * Navigates from the current topic by `delta` positions within
 * `filteredTopics` and re-renders. Does nothing if at a boundary.
 * @param {number} delta - Number of steps; -1 for prev, +1 for next.
 */
function navigateDelta(delta) {
  // Guard: refuse to navigate if currentIndex is out of bounds
  // (can happen after renderError leaves the UI in an error state)
  const catTopics = filteredTopics.length > 0 ? filteredTopics : allTopics;
  if (currentIndex < 0 || currentIndex >= catTopics.length) return;

  const topic = catTopics[currentIndex + delta];
  if (!topic) return;
  currentIndex += delta;
  markSeen(topic.id);
  history.replaceState(null, "", `#${topic.id}`);
  showTopic(topic, false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Renders an error state into the topic card.
 * @param {string} msg - The error message to display.
 */
function renderError(msg) {
  topicCard.innerHTML = `
    <div class="state-empty">
      <h2>⚠ Something went wrong</h2>
      <p>${escHtml(msg)}</p>
    </div>`;
}

// ---------- Sharing ----------
/**
 * Copies a formatted plain-text representation of the current topic
 * (title, summary, key points, optional stat/discussion prompt,
 * source) to the clipboard and shows a toast on success or failure.
 */
function copyText() {
  const topic = currentTopic();
  if (!topic) return;

  const lines = [
    `SAFETY TOPIC: ${topic.title}`,
    "",
    topic.summary,
    "",
    "Key Points:",
    ...topic.key_points.map((p) => `  • ${p}`),
  ];
  if (topic.stat) lines.push("", `Stat: ${topic.stat}`);
  if (topic.discussion_prompt)
    lines.push("", `Discussion: ${topic.discussion_prompt}`);
  lines.push("", `Source: ${topic.source} — ${topic.source_ref}`);

  copyToClipboard(lines.join("\n"))
    .then(() => showToast("✓ Text copied to clipboard"))
    .catch(() => showToast("Copy failed — try selecting the text manually"));
}

/**
 * Copies the current page URL (including the topic hash fragment) to
 * the clipboard and shows a toast on success or failure.
 */
function copyLink() {
  const topic = currentTopic();
  if (!topic) {
    showToast("No topic loaded — load a topic first");
    return;
  }
  const url = window.location.href.split("#")[0] + window.location.hash;
  copyToClipboard(url)
    .then(() => showToast("✓ Link copied to clipboard"))
    .catch(() => showToast("Copy failed"));
}

// ---------- Helpers ----------
/**
 * Returns the topic matching the current URL hash, or null if no hash
 * is present or no matching topic is found.
 * @returns {Topic | null}
 */
function currentTopic() {
  const hash = window.location.hash.slice(1);
  return hash ? allTopics.find((t) => t.id === hash) : null;
}

/**
 * Returns the CSS class name for a source badge based on the source
 * string. Supports OSHA, DOE, and NIOSH; falls back to "other".
 * @param {string} [source] - The source string to classify.
 * @returns {string} CSS class name (e.g. "badge badge-osha").
 */
function badgeClass(source) {
  const s = (source || "").toUpperCase();
  if (s.includes("OSHA")) return "badge badge-osha";
  if (s.includes("DOE")) return "badge badge-doe";
  if (s.includes("NIOSH")) return "badge badge-niosh";
  return "badge badge-other";
}

/**
 * Escapes special HTML characters in a string to prevent XSS when
 * rendering user-controlled content.
 * @param {string | null | undefined} str - The string to escape.
 * @returns {string} HTML-safe string.
 */
function escHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Displays a toast notification for 2.8 seconds. Replaces any
 * in-flight message and cancels the previous timer.
 * @param {string} msg - The message to display.
 */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
}

// ---------- Test Harness (no-op in production) ----------
/**
 * Exposes internal state and reset helpers for Vitest/jsdom testing.
 * Only activated when jsdom sets window.__safetyTopic before app.js loads.
 * @internal
 */
if (typeof window !== 'undefined' && window.__safetyTopic) {
  window.__safetyTopic.reset = (overrides = {}) => {
    allTopics = overrides.allTopics ?? [];
    filteredTopics = overrides.filteredTopics ?? [];
    currentIndex = overrides.currentIndex ?? 0;
    seenIds = overrides.seenIds ?? new Set();
    usedTopics = overrides.usedTopics ?? {};
    meetingLog = overrides.meetingLog ?? [];
    isRendering = false;
    reportRange = { ...REPORT_DEFAULT_RANGE };
    closeSignoffSheet();
    closeProgramReport();
  };

  /**
   * Resets closure DOM refs to null so assertDomElements() is forced to
   * re-query via document.getElementById — enabling test isolation.
   * Also clears the category <select> options so each test starts fresh.
   */
  window.__safetyTopic.resetDomRefs = () => {
    if (categorySelect) {
      categorySelect.innerHTML = '';
    }
    topicCard = null;
    categorySelect = null;
    newTopicBtn = null;
    copyTextBtn = null;
    copyLinkBtn = null;
    printBtn = null;
    toast = null;
    brandLink = null;
    signoffSheet = null;
    signoffBtn = null;
  };

  /**
   * Clears all options from the category <select> element.
   * Call before buildCategoryDropdown() to start with a clean slate.
   */
  window.__safetyTopic.clearCategorySelect = () => {
    if (categorySelect) {
      categorySelect.innerHTML = '';
    }
  };

  /**
   * Populates closure DOM refs and wires events.
   * (init() cannot be called directly because it is registered as a
   * DOMContentLoaded listener that jsdom has already fired.)
   */
  window.__safetyTopic.callInit = () => {
    topicCard = document.getElementById("topic-card");
    categorySelect = document.getElementById("category-select");
    newTopicBtn = document.getElementById("new-topic-btn");
    copyTextBtn = document.getElementById("copy-text-btn");
    copyLinkBtn = document.getElementById("copy-link-btn");
    printBtn = document.getElementById("print-btn");
    toast = document.getElementById("toast");
    brandLink = document.getElementById("brand-link");
    signoffSheet = document.getElementById("signoff-sheet");
    signoffBtn = document.getElementById("signoff-btn");
    wireEvents();
    // Build dropdown here for production (allTopics is already populated).
    // Tests that seed topics via sft.reset() should call callInit() first,
    // then call buildCategoryDropdown() themselves after resetting state.
    buildCategoryDropdown();
  };

  /**
   * Calls buildCategoryDropdown() to populate the <select> with topic categories.
   * Use this after sft.reset({ allTopics }) to rebuild the dropdown with new topics.
   */
  window.__safetyTopic.buildCategoryDropdown = buildCategoryDropdown;

  window.__safetyTopic.getState = () => ({
    allTopics,
    filteredTopics,
    currentIndex,
    seenIds: new Set(seenIds),
    usedTopics: { ...usedTopics },
    meetingLog: meetingLog.map((e) => ({ ...e })),
  });

  // Expose render/navigation functions for test coverage
  window.__safetyTopic.showTopic = showTopic;
  window.__safetyTopic.navigateDelta = navigateDelta;
  window.__safetyTopic.renderError = renderError;
  window.__safetyTopic.validateTopics = validateTopics;
  window.__safetyTopic.persistFilterState = persistFilterState;
  window.__safetyTopic.restoreFilterState = restoreFilterState;
  window.__safetyTopic.getCategorySelect = () => categorySelect;
  window.__safetyTopic.isRendering = () => isRendering;
  window.__safetyTopic.buildSignoffSheet = buildSignoffSheet;
  window.__safetyTopic.logTalk = logTalk;
  window.__safetyTopic.getMeetingLog = () => meetingLog.map((e) => ({ ...e }));
  window.__safetyTopic.computeProgramStats = computeProgramStats;
  window.__safetyTopic.suggestNextTopic = suggestNextTopic;
  window.__safetyTopic.renderProgramPulse = renderProgramPulse;
  window.__safetyTopic.buildProgramReport = buildProgramReport;
  window.__safetyTopic.resolveReportRange = resolveReportRange;
  window.__safetyTopic.renderProgramReport = renderProgramReport;
  window.__safetyTopic.openProgramReport = openProgramReport;
  window.__safetyTopic.closeProgramReport = closeProgramReport;
  window.__safetyTopic.exportProgramReportCsv = exportProgramReportCsv;

  // Seed initial state so pickRandom etc. have a sane starting point
  window.__safetyTopic.reset();
}
