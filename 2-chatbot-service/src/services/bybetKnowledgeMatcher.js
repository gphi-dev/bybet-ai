/**
 * Stateless, deterministic FAQ matching for ByBet support answers.
 * Concurrency-safe: no shared mutable state.
 */

/** Minimum total score to treat a knowledge entry as a confident match. */
export const STRONG_MATCH_MIN_SCORE = 3;

const SCORE_EXACT_PHRASE = 3;
const SCORE_TOKEN_HIT = 1;

/**
 * @param {string} message
 * @returns {string}
 */
export function normalizeMessage(message) {
  if (message == null || typeof message !== "string") {
    return "";
  }
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * @param {string} normalizedMessage
 * @param {string} phrase
 * @returns {boolean}
 */
function hasExactPhrase(normalizedMessage, phrase) {
  const p = phrase.trim();
  if (!p) return false;
  return normalizedMessage.includes(p);
}

/**
 * Partial token hits when the full keyword phrase is not a substring match.
 * @param {string} normalizedMessage
 * @param {string} phrase
 * @returns {number}
 */
function tokenHits(normalizedMessage, phrase) {
  const words = phrase
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  if (words.length === 0) return 0;
  let hits = 0;
  for (const w of words) {
    if (normalizedMessage.includes(w)) hits += 1;
  }
  return hits;
}

/**
 * @param {string} message
 * @param {{ keywords?: string[] }} entry
 * @returns {number}
 */
export function scoreKnowledgeEntry(message, entry) {
  const normalizedMessage = normalizeMessage(message);
  if (!normalizedMessage || !entry || !Array.isArray(entry.keywords)) {
    return 0;
  }

  /** Best single-keyword score wins (avoids inflated totals from overlapping keywords). */
  let best = 0;
  for (const keyword of entry.keywords) {
    const kw = normalizeMessage(keyword);
    if (!kw) continue;
    let s = 0;
    if (hasExactPhrase(normalizedMessage, kw)) {
      s = SCORE_EXACT_PHRASE;
    } else {
      const hits = tokenHits(normalizedMessage, kw);
      s = hits * SCORE_TOKEN_HIT;
    }
    if (s > best) best = s;
  }

  return best;
}

/**
 * @param {string} message
 * @param {unknown[]} knowledgeBase
 * @returns {{ entry: object, score: number } | null}
 */
export function findBestKnowledgeMatch(message, knowledgeBase) {
  if (!Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
    return null;
  }

  let best = null;
  let bestScore = -1;
  let bestPriority = -Infinity;

  for (const entry of knowledgeBase) {
    if (!entry || typeof entry !== "object") continue;
    const score = scoreKnowledgeEntry(message, entry);
    const priority = Number(entry.priority) || 0;

    if (
      score > bestScore ||
      (score === bestScore && priority > bestPriority)
    ) {
      best = entry;
      bestScore = score;
      bestPriority = priority;
    }
  }

  if (!best || bestScore < STRONG_MATCH_MIN_SCORE) {
    return null;
  }

  return { entry: best, score: bestScore };
}

/**
 * Top-N entries by score for Gemini context (may be below strong threshold).
 * @param {string} message
 * @param {unknown[]} knowledgeBase
 * @param {number} [limit=5]
 * @returns {Array<{ entry: object, score: number }>}
 */
export function findTopKnowledgeMatches(message, knowledgeBase, limit = 5) {
  if (!Array.isArray(knowledgeBase) || knowledgeBase.length === 0) {
    return [];
  }

  const scored = knowledgeBase
    .filter((e) => e && typeof e === "object")
    .map((entry) => ({
      entry,
      score: scoreKnowledgeEntry(message, entry),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const pa = Number(a.entry.priority) || 0;
      const pb = Number(b.entry.priority) || 0;
      return pb - pa;
    });

  return scored.slice(0, Math.max(0, limit));
}
