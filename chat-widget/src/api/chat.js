/**
 * 2-chatbot-service: `POST /api/bot/ask` with `{ message, sessionId? }` → `{ text }`
 *
 * @param {{ apiUrl: string, apiKey?: string, widgetSecret?: string, sessionId?: string | null }} config
 * @param {string} message
 * @returns {Promise<string>}
 */
export async function sendChatMessage(config, message) {
  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }
  if (config.widgetSecret) {
    headers['X-Widget-Token'] = config.widgetSecret;
  }

  const body = { message };
  if (config.sessionId) {
    body.sessionId = config.sessionId;
  }

  let reply;
  try {
    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const errText =
        data && typeof data.error === 'string'
          ? data.error
          : raw || res.statusText;
      throw new Error(errText);
    }

    if (data && typeof data.text === 'string') {
      reply = data.text;
    } else if (data && typeof data.reply === 'string') {
      reply = data.reply;
    } else {
      reply = 'Sorry, the server returned an unexpected response.';
    }
  } catch (e) {
    reply = getMockReply(config.apiUrl, message, e);
  }
  return reply;
}

/**
 * @param {string} apiUrl
 * @param {string} message
 * @param {unknown} err
 */
function getMockReply(apiUrl, message, err) {
  const q = (message || '').trim() || '(empty)';
  const reason = err instanceof Error ? err.message : String(err);
  return `Could not reach the chat service (“${q}”). Start 2-chatbot-service (e.g. port 4001) and set window.CHATBOT_CONFIG.apiUrl to your /api/bot/ask URL. ${reason}`;
}
