import { handleGlobalPlayHubBotMessage } from "../services/globalPlayHubBotService.js";
import { randomUUID } from "crypto";
import { logError, logInfo, logWarn } from "../utils/logger.js";

const SESSION_ID_REGEX = /^[A-Za-z0-9_-]+$/;
const BOT_ROUTE = "/api/bot/ask";

export async function askBot(req, res) {
  const requestId = randomUUID();
  try {
    const expectedWidgetSecret = String(process.env.WIDGET_SECRET || "").trim();
    const providedWidgetToken = String(req.get("X-Widget-Token") || "").trim();

    if (expectedWidgetSecret) {
      if (!providedWidgetToken) {
        logWarn("bot_request_unauthorized", {
          requestId,
          route: BOT_ROUTE,
          reason: "missing_widget_token",
        });
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (providedWidgetToken !== expectedWidgetSecret) {
        logWarn("bot_request_unauthorized", {
          requestId,
          route: BOT_ROUTE,
          reason: "invalid_widget_token",
        });
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const rawMessage = req.body?.message;

    if (rawMessage === undefined || rawMessage === null) {
      logWarn("bot_request_invalid", {
        requestId,
        route: BOT_ROUTE,
        reason: "message_required",
      });
      return res.status(400).json({ error: "message is required" });
    }
    if (typeof rawMessage !== "string") {
      logWarn("bot_request_invalid", {
        requestId,
        route: BOT_ROUTE,
        reason: "message_not_string",
      });
      return res.status(400).json({ error: "message must be a string" });
    }

    const message = rawMessage.trim();

    if (message.length > 500) {
      logWarn("bot_request_invalid", {
        requestId,
        route: BOT_ROUTE,
        reason: "message_too_long",
        messageLength: message.length,
      });
      return res.status(400).json({
        error: "Message too long. Please keep it under 500 characters.",
      });
    }

    const rawSessionId = req.body?.sessionId;
    let sessionId = null;

    if (rawSessionId !== undefined && rawSessionId !== null) {
      if (typeof rawSessionId !== "string") {
        logWarn("bot_request_invalid", {
          requestId,
          route: BOT_ROUTE,
          reason: "session_id_not_string",
          messageLength: message.length,
        });
        return res.status(400).json({ error: "Invalid sessionId." });
      }

      const trimmedSessionId = rawSessionId.trim();
      if (
        !trimmedSessionId ||
        trimmedSessionId.length > 128 ||
        !SESSION_ID_REGEX.test(trimmedSessionId)
      ) {
        logWarn("bot_request_invalid", {
          requestId,
          route: BOT_ROUTE,
          reason: "session_id_invalid_format",
          messageLength: message.length,
        });
        return res.status(400).json({ error: "Invalid sessionId." });
      }

      sessionId = trimmedSessionId;
    }

    logInfo("bot_request_received", {
      requestId,
      route: BOT_ROUTE,
      messageLength: message.length,
      hasSession: Boolean(sessionId),
    });

    const { text } = await handleGlobalPlayHubBotMessage(message, sessionId, {
      requestId,
      route: BOT_ROUTE,
      messageLength: message.length,
      hasSession: Boolean(sessionId),
    });
    return res.json({ text });
  } catch (err) {
    logError("bot_request_failed", {
      requestId,
      route: BOT_ROUTE,
      reason: "controller_exception",
      errorMessage: err?.message || "unknown_error",
    });
    return res.status(500).json({ error: "Internal server error" });
  }
}
