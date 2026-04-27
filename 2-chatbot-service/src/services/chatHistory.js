/**
 * Simple in-memory session-based chat history.
 *
 * Stores the last few conversation turns per session ID.
 * TTL-based expiration prevents unbounded memory growth.
 * No external dependencies. Concurrency-safe for single-process use.
 */

const MAX_TURNS = 12;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;

/** @type {Map<string, { turns: Array<{user:string,bot:string}>, memory: Object, ts: number }>} */
const sessions = new Map();

function isExpired(session, now) {
  return now - session.ts > SESSION_TTL_MS;
}

function pruneExpiredSessions(now) {
  for (const [id, session] of sessions) {
    if (isExpired(session, now)) {
      sessions.delete(id);
    }
  }
}

function evictLeastRecentlyUsedSession() {
  let oldestId = null;
  let oldestTs = Infinity;

  for (const [id, session] of sessions) {
    if (session.ts < oldestTs) {
      oldestTs = session.ts;
      oldestId = id;
    }
  }

  if (oldestId !== null) {
    sessions.delete(oldestId);
  }
}

function ensureSessionCapacity(now) {
  if (sessions.size < MAX_SESSIONS) return;
  pruneExpiredSessions(now);
  if (sessions.size >= MAX_SESSIONS) {
    evictLeastRecentlyUsedSession();
  }
}

/**
 * Return the recent conversation turns for a session.
 * Returns an empty array if the session doesn't exist or has expired.
 *
 * @param {string|null} sessionId
 * @returns {Array<{user: string, bot: string}>}
 */
export function getHistory(sessionId) {
  if (!sessionId) return [];
  const now = Date.now();
  const s = sessions.get(sessionId);
  if (!s) return [];
  if (isExpired(s, now)) {
    sessions.delete(sessionId);
    return [];
  }
  s.ts = now;
  return [...s.turns];
}

/**
 * Append a user/bot exchange to the session's history.
 * Automatically evicts the oldest turn when the limit is exceeded,
 * and drops the oldest session when the global cap is reached.
 *
 * @param {string|null} sessionId
 * @param {string} userMsg
 * @param {string} botMsg
 */
export function addTurn(sessionId, userMsg, botMsg) {
  if (!sessionId) return;
  const now = Date.now();

  let s = sessions.get(sessionId);
  if (!s) {
    ensureSessionCapacity(now);
    s = { turns: [], memory: {}, ts: now };
    sessions.set(sessionId, s);
  }

  s.turns.push({ user: userMsg, bot: botMsg });
  if (s.turns.length > MAX_TURNS) s.turns.shift();
  s.ts = now;
}

/**
 * Return the session-level memory (name, preferences, etc.).
 * @param {string|null} sessionId
 * @returns {Object}
 */
export function getMemory(sessionId) {
  if (!sessionId) return {};
  const now = Date.now();
  const s = sessions.get(sessionId);
  if (!s) return {};
  if (isExpired(s, now)) {
    sessions.delete(sessionId);
    return {};
  }
  s.ts = now;
  return { ...s.memory };
}

/**
 * Merge new facts into the session's memory.
 * @param {string|null} sessionId
 * @param {{ name?: string, likes?: string, favorite?: string }} facts
 */
export function updateMemory(sessionId, facts) {
  if (!sessionId || !facts) return;
  const now = Date.now();

  let s = sessions.get(sessionId);
  if (!s) {
    ensureSessionCapacity(now);
    s = { turns: [], memory: {}, ts: now };
    sessions.set(sessionId, s);
  }

  if (facts.name) s.memory.name = facts.name;

  if (facts.likes) {
    if (!Array.isArray(s.memory.likes)) s.memory.likes = [];
    const lower = facts.likes.toLowerCase();
    if (!s.memory.likes.some((l) => l.toLowerCase() === lower)) {
      s.memory.likes.push(facts.likes);
    }
  }

  if (facts.favorite) s.memory.favorite = facts.favorite;

  s.ts = now;
}

/**
 * Manually clear a session's history.
 * @param {string|null} sessionId
 */
export function clearHistory(sessionId) {
  if (sessionId) sessions.delete(sessionId);
}
