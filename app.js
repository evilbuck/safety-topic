/* ============================================================
   SafetyTopic — app.js
   Handles: data loading, hash routing, random pick,
            category filter, prev/next nav, clipboard, print,
            "I Used This" tracking
   ============================================================ */

'use strict';

// ---------- Clipboard Helper (Secure Context Fallback) ----------
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for file:// and non-secure contexts
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try { document.execCommand('copy'); } catch (_) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ---------- State ----------
let allTopics      = [];    // full dataset from topics-data.js
let filteredTopics = [];    // current filtered set (by category / filter)
let currentIndex   = 0;    // index within filteredTopics
let seenIds        = new Set();
let usedTopics     = {};    // { topicId: count }

// ---------- DOM refs ----------
let topicCard, categorySelect, newTopicBtn,
    copyTextBtn, copyLinkBtn, printBtn, toast, brandLink;

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
  topicCard      = document.getElementById('topic-card');
  categorySelect = document.getElementById('category-select');
  newTopicBtn    = document.getElementById('new-topic-btn');
  copyTextBtn    = document.getElementById('copy-text-btn');
  copyLinkBtn    = document.getElementById('copy-link-btn');
  printBtn       = document.getElementById('print-btn');
  toast          = document.getElementById('toast');
  brandLink      = document.getElementById('brand-link');

  // Warn about file:// limitations
  if (!window.isSecureContext) {
    setTimeout(() => showToast('For full features, serve via HTTP: npx serve .'), 500);
  }

  // Restore persisted state
  try {
    const stored = localStorage.getItem('seenTopics');
    if (stored) seenIds = new Set(JSON.parse(stored));
  } catch (_) {}
  try {
    const stored = localStorage.getItem('usedTopics');
    if (stored) usedTopics = JSON.parse(stored);
  } catch (_) {}

  // Load topics from inline data (topics-data.js)
  if (typeof TOPICS === 'undefined' || !TOPICS.length) {
    renderError('Could not load safety topics. Make sure topics-data.js is in the same folder as index.html.');
    return;
  }
  allTopics = TOPICS;

  buildCategoryDropdown();
  wireEvents();
  loadInitialTopic();
});

// ---------- Category Dropdown ----------
function buildCategoryDropdown() {
  // Special filter at top
  const divider = document.createElement('option');
  divider.disabled = true;
  divider.textContent = '──────────────';
  categorySelect.appendChild(divider);

  const unusedOpt = document.createElement('option');
  unusedOpt.value = '__unused__';
  unusedOpt.textContent = '★ Not used yet';
  categorySelect.appendChild(unusedOpt);

  const divider2 = document.createElement('option');
  divider2.disabled = true;
  divider2.textContent = '──────────────';
  categorySelect.appendChild(divider2);

  // Category options
  const cats = [...new Set(allTopics.map(t => t.category))].sort();
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

// ---------- Event Wiring ----------
function wireEvents() {
  newTopicBtn.addEventListener('click', () => {
    const next = pickRandom();
    showTopic(next, true);
  });

  categorySelect.addEventListener('change', () => {
    rebuildFiltered();
    const next = pickRandom();
    showTopic(next, true);
  });

  copyTextBtn.addEventListener('click', copyText);
  copyLinkBtn.addEventListener('click', copyLink);
  printBtn.addEventListener('click', () => window.print());

  brandLink.addEventListener('click', (e) => {
    e.preventDefault();
    categorySelect.value = '';
    rebuildFiltered();
    showTopic(pickRandom(), true);
  });

  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const t = allTopics.find(t => t.id === hash);
      if (t) { syncCategoryToTopic(t); showTopic(t, false); }
    }
  });
}

// ---------- Initial Load ----------
function loadInitialTopic() {
  const hash = window.location.hash.slice(1);
  if (hash) {
    const t = allTopics.find(t => t.id === hash);
    if (t) { syncCategoryToTopic(t); showTopic(t, false); return; }
  }
  rebuildFiltered();
  showTopic(pickRandom(), true);
}

// ---------- Filtered Set ----------
function rebuildFiltered() {
  const val = categorySelect.value;
  if (val === '__unused__') {
    filteredTopics = allTopics.filter(t => !usedTopics[t.id]);
    if (filteredTopics.length === 0) {
      // All topics have been used — show them all with a note
      filteredTopics = [...allTopics];
      showToast('You\'ve used every topic! Showing all.');
    }
  } else if (val) {
    filteredTopics = allTopics.filter(t => t.category === val);
  } else {
    filteredTopics = [...allTopics];
  }
  currentIndex = 0;
}

function syncCategoryToTopic(topic) {
  categorySelect.value = '';
  rebuildFiltered();
  const idx = filteredTopics.findIndex(t => t.id === topic.id);
  if (idx !== -1) currentIndex = idx;
}

// ---------- Topic Selection ----------
// Priority: unseen+unused → unseen → unused → all
function pickRandom() {
  if (filteredTopics.length === 0) return allTopics[0];

  const unseenUnused = filteredTopics.filter(t => !seenIds.has(t.id) && !usedTopics[t.id]);
  const unseenOnly   = filteredTopics.filter(t => !seenIds.has(t.id));
  const unusedOnly   = filteredTopics.filter(t => !usedTopics[t.id]);

  const pool =
    unseenUnused.length > 0 ? unseenUnused :
    unseenOnly.length   > 0 ? unseenOnly   :
    unusedOnly.length   > 0 ? unusedOnly   :
    filteredTopics;

  const t = pool[Math.floor(Math.random() * pool.length)];
  currentIndex = filteredTopics.findIndex(x => x.id === t.id);
  markSeen(t.id);
  return t;
}

function markSeen(id) {
  seenIds.add(id);
  try { localStorage.setItem('seenTopics', JSON.stringify([...seenIds])); } catch (_) {}
}

function markUsed(id) {
  usedTopics[id] = (usedTopics[id] || 0) + 1;
  try { localStorage.setItem('usedTopics', JSON.stringify(usedTopics)); } catch (_) {}
}

// ---------- Render ----------
function showTopic(topic, updateHash) {
  if (!topic) return;
  markSeen(topic.id);

  if (updateHash) history.replaceState(null, '', `#${topic.id}`);

  const catTopics   = filteredTopics.length > 0 ? filteredTopics : allTopics;
  const position    = catTopics.findIndex(t => t.id === topic.id);
  const filterLabel = categorySelect.value === '__unused__' ? 'unused topics'
                    : categorySelect.value || 'all topics';

  const useCount   = usedTopics[topic.id] || 0;
  const usedLabel  = useCount === 0 ? '✓ I Used This in a Meeting'
                   : useCount === 1 ? '✓ Used in 1 Meeting'
                   : `✓ Used in ${useCount} Meetings`;
  const usedClass  = useCount > 0 ? 'btn btn-used is-used' : 'btn btn-used';
  const usedDisabled = useCount > 0 ? 'disabled' : '';

  const counterText = position !== -1
    ? `${position + 1} / ${catTopics.length}`
    : '';

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
        ${topic.key_points.map(pt => `<li>${escHtml(pt)}</li>`).join('')}
      </ul>
    </div>

    ${topic.stat ? `
    <div class="topic-stat" role="note">
      <strong>Did You Know?</strong>
      ${escHtml(topic.stat)}
    </div>` : ''}

    ${topic.discussion_prompt ? `
    <div class="topic-discussion">
      <p>${escHtml(topic.discussion_prompt)}</p>
    </div>` : ''}

    <div class="topic-card-footer">
      <p class="topic-source-ref">Source: ${escHtml(topic.source)} — ${escHtml(topic.source_ref)}</p>
      <button id="use-this-btn" class="${usedClass}" type="button"
              aria-label="Mark this topic as used in a meeting"
              aria-pressed="${useCount > 0}" ${usedDisabled}>
        ${escHtml(usedLabel)}
      </button>
    </div>

    <div class="topic-nav" role="navigation" aria-label="Browse topics">
      <button class="nav-arrow" id="nav-prev" aria-label="Previous topic" ${position <= 0 ? 'disabled' : ''}>←</button>
      <span class="nav-label">Browse ${escHtml(filterLabel)}</span>
      <button class="nav-arrow" id="nav-next" aria-label="Next topic" ${position >= catTopics.length - 1 ? 'disabled' : ''}>→</button>
    </div>
  `;

  // Wire "I Used This"
  document.getElementById('use-this-btn').addEventListener('click', function () {
    markUsed(topic.id);
    this.textContent = '✓ Used in 1 Meeting';
    this.classList.add('is-used');
    this.setAttribute('aria-pressed', 'true');
    this.disabled = true;
    showToast('✓ Marked as used!');
  });

  // Wire prev/next
  const prevBtn = document.getElementById('nav-prev');
  const nextBtn = document.getElementById('nav-next');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateDelta(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateDelta(1));
}

function navigateDelta(delta) {
  const catTopics = filteredTopics.length > 0 ? filteredTopics : allTopics;
  const topic = catTopics[currentIndex + delta];
  if (!topic) return;
  currentIndex += delta;
  markSeen(topic.id);
  history.replaceState(null, '', `#${topic.id}`);
  showTopic(topic, false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderError(msg) {
  topicCard.innerHTML = `
    <div class="state-empty">
      <h2>⚠ Something went wrong</h2>
      <p>${escHtml(msg)}</p>
    </div>`;
}

// ---------- Sharing ----------
function copyText() {
  const topic = currentTopic();
  if (!topic) return;

  const lines = [
    `SAFETY TOPIC: ${topic.title}`,
    '',
    topic.summary,
    '',
    'Key Points:',
    ...topic.key_points.map(p => `  • ${p}`),
  ];
  if (topic.stat)             lines.push('', `Stat: ${topic.stat}`);
  if (topic.discussion_prompt) lines.push('', `Discussion: ${topic.discussion_prompt}`);
  lines.push('', `Source: ${topic.source} — ${topic.source_ref}`);

  copyToClipboard(lines.join('\n'))
    .then(() => showToast('✓ Text copied to clipboard'))
    .catch(() => showToast('Copy failed — try selecting the text manually'));
}

function copyLink() {
  const url = window.location.href.split('#')[0] + window.location.hash;
  copyToClipboard(url)
    .then(() => showToast('✓ Link copied to clipboard'))
    .catch(() => showToast('Copy failed'));
}

// ---------- Helpers ----------
function currentTopic() {
  const hash = window.location.hash.slice(1);
  return hash ? allTopics.find(t => t.id === hash) : null;
}

function badgeClass(source) {
  const s = (source || '').toUpperCase();
  if (s.includes('OSHA'))  return 'badge badge-osha';
  if (s.includes('DOE'))   return 'badge badge-doe';
  if (s.includes('NIOSH')) return 'badge badge-niosh';
  return 'badge badge-other';
}

function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
}
