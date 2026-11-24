/* SafetyTopic — delivery-data.js
   Delivery-status helpers for the Browse page, shared as a plain global
   script (no ES modules) so both the static site (file:// and GitHub
   Pages) and the Vitest harness can load it via <script src>.
   Pure and defensive: never mutates inputs, never throws on malformed
   data. Date conventions mirror app.js Program Pulse (PULSE_ISO_DATE_RE,
   suggestNextTopic) — see each JSDoc block for the exact rules. */

'use strict';

/** Matches strict YYYY-MM-DD calendar date strings (mirrors app.js). */
const DELIVERY_ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Builds a per-topic delivery index over a meeting log.
 *
 * Malformed-data conventions (mirroring suggestNextTopic/Pulse):
 * - Log entries without a string topicId are skipped entirely.
 * - Log entries whose id is not in the catalog contribute nothing
 *   (unknown ids have no browse row).
 * - Any entry with a string topicId counts its topic as delivered, even
 *   when the date is missing, non-string, or not ISO-shaped.
 * - Only strict YYYY-MM-DD dates feed `lastDate` (the most recent one).
 * - Catalog topics with a non-string id are skipped; duplicate catalog
 *   ids keep the first occurrence.
 * - A non-array log is treated as empty; a non-array catalog yields an
 *   empty index. Neither input is mutated; no exception escapes.
 *
 * @param {{ topicId: string, date: string }[]|*} log - The meeting log
 *   (localStorage "meetingLog" entries) or any malformed value.
 * @param {{ id: string }[]|*} topics - The topic catalog or any value.
 * @returns {Map<string, {count: number, lastDate: string|null,
 *   neverDelivered: boolean>}|Map<string, never>} Map keyed by topic id:
 *   `count` is all deliveries (any date shape), `lastDate` the newest
 *   ISO date or null, `neverDelivered` true iff count is 0.
 */
function buildDeliveryIndex(log, topics) {
  const safeLog = Array.isArray(log) ? log : [];
  const safeTopics = Array.isArray(topics) ? topics : [];

  const ids = new Set();
  for (const t of safeTopics) {
    if (t && typeof t.id === 'string' && !ids.has(t.id)) {
      ids.add(t.id);
    }
  }

  const index = new Map();
  for (const id of ids) {
    index.set(id, { count: 0, lastDate: null, neverDelivered: true });
  }

  for (const entry of safeLog) {
    if (!entry || typeof entry.topicId !== 'string') continue;
    const slot = index.get(entry.topicId);
    if (!slot) continue;
    slot.count += 1;
    slot.neverDelivered = false;
    if (
      typeof entry.date === 'string' &&
      DELIVERY_ISO_DATE_RE.test(entry.date) &&
      (slot.lastDate === null || entry.date > slot.lastDate)
    ) {
      slot.lastDate = entry.date;
    }
  }
  return index;
}

/**
 * Builds a per-category delivery index over a meeting log, mirroring
 * suggestNextTopic's category semantics: a category's `lastDate` is the
 * newest strict-ISO entry date among its catalog topics (null when it
 * has none), `delivered` counts catalog topics with at least one log
 * entry of any date shape, and `total` counts unique catalog topics.
 * Unknown log ids and entries without a string topicId contribute
 * nothing; malformed catalog entries are skipped; duplicate topic ids
 * keep their first occurrence. Neither input is mutated; no exception
 * escapes.
 * @param {{ topicId: string, date: string }[]|*} log - The meeting log.
 * @param {{ id: string, category: string }[]|*} topics - The catalog.
 * @returns {Map<string, {lastDate: string|null, delivered: number,
 *   total: number>}|Map<string, never>} Map keyed by category name.
 */
function buildCategoryDeliveryIndex(log, topics) {
  const safeLog = Array.isArray(log) ? log : [];
  const safeTopics = Array.isArray(topics) ? topics : [];

  // First occurrence of each id wins, so duplicates never double-count.
  const topicById = new Map();
  for (const t of safeTopics) {
    if (
      t &&
      typeof t.id === 'string' &&
      typeof t.category === 'string' &&
      !topicById.has(t.id)
    ) {
      topicById.set(t.id, t);
    }
  }

  const index = new Map();
  for (const t of topicById.values()) {
    if (!index.has(t.category)) {
      index.set(t.category, { lastDate: null, delivered: 0, total: 0 });
    }
    index.get(t.category).total += 1;
  }

  const deliveredIds = new Set();
  for (const entry of safeLog) {
    if (!entry || typeof entry.topicId !== 'string') continue;
    const t = topicById.get(entry.topicId);
    if (!t) continue;
    deliveredIds.add(entry.topicId);
    const slot = index.get(t.category);
    if (
      typeof entry.date === 'string' &&
      DELIVERY_ISO_DATE_RE.test(entry.date) &&
      (slot.lastDate === null || entry.date > slot.lastDate)
    ) {
      slot.lastDate = entry.date;
    }
  }
  for (const id of deliveredIds) {
    index.get(topicById.get(id).category).delivered += 1;
  }
  return index;
}

/**
 * Deterministic neglect comparison for two catalog topics, mirroring
 * suggestNextTopic's conventions. Ordered rules:
 * 1. Never-delivered topics (count 0 — any log entry counts) come first.
 * 2. Among delivered topics, a null lastDate (delivered only through
 *    malformed dates) sorts before any dated topic (""-first convention).
 * 3. Otherwise the older ISO last-delivered date comes first (ISO
 *    strings compare chronologically as plain strings).
 * 4. Full ties break alphabetically by topic id.
 * A topic absent from the index is treated as never-delivered.
 * @param {{ id: string }} a - First topic.
 * @param {{ id: string }} b - Second topic.
 * @param {Map<string, {count: number, lastDate: string|null,
 *   neverDelivered: boolean>}|null} deliveryIndex - Index from
 *   buildDeliveryIndex.
 * @returns {number} Negative when a is more neglected, positive when b
 *   is, 0 only for identical ids.
 */
function compareTopicNeglect(a, b, deliveryIndex) {
  const safeIndex = deliveryIndex instanceof Map ? deliveryIndex : new Map();
  const slotA = (a && safeIndex.get(a.id)) || {
    count: 0,
    lastDate: null,
    neverDelivered: true,
  };
  const slotB = (b && safeIndex.get(b.id)) || {
    count: 0,
    lastDate: null,
    neverDelivered: true,
  };

  if (slotA.neverDelivered !== slotB.neverDelivered) {
    return slotA.neverDelivered ? -1 : 1;
  }
  const dateA = slotA.lastDate ?? '';
  const dateB = slotB.lastDate ?? '';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  const idA = a && typeof a.id === 'string' ? a.id : '';
  const idB = b && typeof b.id === 'string' ? b.id : '';
  if (idA !== idB) return idA < idB ? -1 : 1;
  return 0;
}

/**
 * Deterministic neglect comparison for two category names, mirroring
 * suggestNextTopic's category ranking: a category with no ISO-dated
 * entries (null lastDate, the ""-first convention) comes first, then
 * the oldest last-delivered date, then alphabetical category name.
 * A category absent from the index is treated as undated.
 * @param {string} a - First category name.
 * @param {string} b - Second category name.
 * @param {Map<string, {lastDate: string|null, delivered: number,
 *   total: number>}|null} categoryIndex - Index from
 *   buildCategoryDeliveryIndex.
 * @returns {number} Negative when a is more neglected, positive when b
 *   is, 0 only for identical names.
 */
function compareCategoryNeglect(a, b, categoryIndex) {
  const safeIndex = categoryIndex instanceof Map ? categoryIndex : new Map();
  const dateA = safeIndex.get(a)?.lastDate ?? '';
  const dateB = safeIndex.get(b)?.lastDate ?? '';
  if (dateA !== dateB) return dateA < dateB ? -1 : 1;
  if (a !== b) return a < b ? -1 : 1;
  return 0;
}
