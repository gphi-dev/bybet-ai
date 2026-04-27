const STORAGE_KEY = 'bybet-chatbot-session-id';

/**
 * Stable id for 2-chatbot-service `sessionId` (server-side history / memory).
 * @param {string | undefined | null} override — from `window.CHATBOT_CONFIG.sessionId`
 * @returns {string | null}
 */
export function getOrCreateSessionId(override) {
  if (override) return override;
  if (typeof sessionStorage === 'undefined') return null;
  let sid = sessionStorage.getItem(STORAGE_KEY);
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(STORAGE_KEY, sid);
  }
  return sid;
}
