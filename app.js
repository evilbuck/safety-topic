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
  ];
  for (const id of required) {
    const el =
      document.getElementById(id) ??
      /** @type {any} */ (topicCard && topicCard.id === id ? topicCard : null) ??
      null;
    if (!el) {
      throw new Error(
        `SafetyTopic init failed: #${id} not found in DOM. " +
          "Check that index.html includes all required elements.`,
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

  // Fail fast: catch missing DOM elements before any other code runs
  assertDomElements();

  // Restore persisted state
  try {
    const stored = localStorage.getItem("seenTopics");
    if (stored) seenIds = new Set(JSON.parse(stored));
  } catch (_) {}
  try {
    const stored = localStorage.getItem("usedTopics");
    if (stored) usedTopics = JSON.parse(stored);
  } catch (_) {}

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
 * brand link, and hashchange (deep-link) events.
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
  printBtn.addEventListener("click", () => window.print());

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
  } catch (_) {}
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
      this.textContent = "✓ Used in 1 Meeting";
      this.classList.add("is-used");
      this.setAttribute("aria-pressed", "true");
      this.disabled = true;
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
    isRendering = false;
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

  // Seed initial state so pickRandom etc. have a sane starting point
  window.__safetyTopic.reset();
}
