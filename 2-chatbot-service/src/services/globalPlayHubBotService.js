/**
 * Main bot orchestrator for ByBet chatbot.
 *
 * Flow:
 *   1. Normalize message (basic + intent normalizer for Taglish/shorthand)
 *   2. Safety check (refuse harmful content)
 *   3. Quick deterministic replies (greeting, math, date/time)
 *   4. Route: ByBet signal or strong FAQ match → grounded ByBet answer
 *   5. Route: everything else → conversational Gemini + soft redirect
 *   6. Fallback only if generation fails
 */

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  normalizeMessage,
  findBestKnowledgeMatch,
  findTopKnowledgeMatches,
} from "./bybetKnowledgeMatcher.js";
import { normalizeForIntent } from "./intentNormalizer.js";
import { buildPrompt, buildHarmlessChatPrompt } from "./buildPrompt.js";
import { generateWithPromptDetailed } from "./globalPlayHubChatAgent.mjs";
import { getHistory, addTurn, getMemory, updateMemory } from "./chatHistory.js";
import { formatBotReply } from "./formatBotReply.js";
import { logError, logInfo, logWarn } from "../utils/logger.js";
import {
  isBybetRelated,
  isUnsafe,
  tryQuickDeterministicReply,
} from "./offTopicQuickReply.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bybetKnowledgePath = path.join(__dirname, "bybet-knowledge.json");
const bybetKnowledgeBase = JSON.parse(
  readFileSync(bybetKnowledgePath, "utf-8"),
);

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const MAIN_GEMINI_TIMEOUT_MS = 10_000;

export const BYBET_FALLBACK_MESSAGE =
  "I'm having trouble generating an answer right now. I can help with ByBet topics like registration, deposits, withdrawals, KYC, passwords, promotions, and sports betting. Could you tell me more about what you need?";

const SAFETY_REFUSAL =
  "I can't help with that, but I'm here for ByBet topics like deposits, withdrawals, KYC, promotions, and sports betting.";

const HARMLESS_FALLBACK =
  "I'm not sure about that one, but I can help with ByBet topics like deposits, withdrawals, KYC, promotions, and sports betting. What do you need?";

/** @type {Map<string, Promise<void>>} */
const sessionLocks = new Map();

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isWeakResponse(text) {
  if (text == null || typeof text !== "string") return true;
  return text.trim().length < 15;
}

function stripMarkdown(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .trim();
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      if (promise && typeof promise.cancel === "function") {
        promise.cancel();
      }
      reject(new Error(label));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function classifyGenerationOutcome(scope, outcome, context, durationMs) {
  if (!outcome || typeof outcome !== "object") {
    logWarn("bot_generation_classified", {
      ...context,
      outcome: scope,
      reason: "unknown_generation_error",
      durationMs,
    });
    return "unknown_generation_error";
  }

  if (!outcome.ok) {
    const reason = outcome.reason || "unknown_generation_error";
    logWarn("bot_generation_classified", {
      ...context,
      outcome: scope,
      reason,
      durationMs,
    });
    return reason;
  }

  if (isWeakResponse(outcome.text)) {
    logWarn("bot_generation_classified", {
      ...context,
      outcome: scope,
      reason: "gemini_weak_response",
      durationMs,
    });
    return "gemini_weak_response";
  }

  return null;
}

function buildOutcomeContext(message, sessionId, logContext) {
  return {
    ...logContext,
    messageLength: logContext?.messageLength ?? message.length,
    hasSession: logContext?.hasSession ?? Boolean(sessionId),
  };
}

function logResponseOutcome(context, startedAtMs, outcome, reason = null) {
  logInfo("bot_response_outcome", {
    ...context,
    outcome,
    reason,
    durationMs: Date.now() - startedAtMs,
  });
}

function formatFaqContext(matches) {
  if (!matches || matches.length === 0) {
    return "No relevant FAQ entries found for this question.";
  }
  return matches
    .map(({ entry }) => {
      const q = entry.question || entry.id || "";
      return `[${entry.category}] ${q}\n${stripMarkdown(entry.answer)}`;
    })
    .join("\n\n");
}

function retrieveFaqContext(intentCleaned, normalizedMessage, limit = 5) {
  const primary = findTopKnowledgeMatches(
    intentCleaned,
    bybetKnowledgeBase,
    limit,
  );
  const alt = findTopKnowledgeMatches(
    normalizedMessage,
    bybetKnowledgeBase,
    limit,
  );

  const seen = new Set(primary.map((m) => m.entry.id));
  for (const m of alt) {
    if (!seen.has(m.entry.id)) {
      primary.push(m);
      seen.add(m.entry.id);
    }
  }

  return primary
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (Number(b.entry.priority) || 0) - (Number(a.entry.priority) || 0);
    })
    .slice(0, limit);
}

async function runWithSessionLock(sessionId, task) {
  if (!sessionId) return task();

  const previous = sessionLocks.get(sessionId) || Promise.resolve();
  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const queued = previous.then(() => current);
  sessionLocks.set(sessionId, queued);

  try {
    await previous.catch(() => {});
    return await task();
  } finally {
    releaseCurrent();
    if (sessionLocks.get(sessionId) === queued) {
      sessionLocks.delete(sessionId);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Memory extraction                                                  */
/* ------------------------------------------------------------------ */

function extractMemoryFacts(rawMessage) {
  const facts = {};
  let m;

  m = rawMessage.match(/\bmy name is (\w+)/i);
  if (m) facts.name = m[1];

  if (!facts.name) {
    m = rawMessage.match(/\bcall me (\w+)/i);
    if (m) facts.name = m[1];
  }

  if (!facts.name) {
    m = rawMessage.match(/\bako si (\w+)/i);
    if (m) facts.name = m[1];
  }

  if (!facts.name) {
    m = rawMessage.match(/\bI am ([A-Z]\w+)/);
    if (m) facts.name = m[1];
  }

  m = rawMessage.match(/\bi (?:really )?like ([\w\s]{1,40})/i);
  if (m) facts.likes = m[1].replace(/[.,!?]+$/, "").trim();

  if (!facts.likes) {
    m = rawMessage.match(/\bgusto ko (?:ang |ng )?([\w\s]{1,40})/i);
    if (m) facts.likes = m[1].replace(/[.,!?]+$/, "").trim();
  }

  m = rawMessage.match(/\bmy favou?rite (?:\w+ )?is ([\w\s]{1,40})/i);
  if (m) facts.favorite = m[1].replace(/[.,!?]+$/, "").trim();

  return Object.keys(facts).length > 0 ? facts : null;
}

/* ------------------------------------------------------------------ */
/*  Main handler                                                       */
/* ------------------------------------------------------------------ */

/**
 * @param {string} message — raw user input
 * @param {string|null} [sessionId=null] — optional session for chat history
 * @returns {Promise<{text: string}>}
 */
export async function handleGlobalPlayHubBotMessage(message, sessionId = null, logContext = {}) {
  return runWithSessionLock(sessionId, async () => {
    const startedAtMs = Date.now();
    const outcomeContext = buildOutcomeContext(message, sessionId, logContext);
    const normalizedMessage = normalizeMessage(message);

    if (!normalizedMessage) {
      logResponseOutcome(
        outcomeContext,
        startedAtMs,
        "empty_input_guidance",
        "empty_normalized_message",
      );
      return {
        text: "Please enter a message so I can help with ByBet account and support questions.",
      };
    }

    const intent = normalizeForIntent(message);
    const intentCleaned = intent.cleaned || normalizedMessage;

    if (intentCleaned !== normalizedMessage) {
      logInfo("bot_message_normalized", {
        ...logContext,
        normalized: true,
        originalLength: normalizedMessage.length,
        normalizedLength: intentCleaned.length,
      });
    }

  /* ---- 0. Extract and store memory facts ---- */

    const memoryFacts = extractMemoryFacts(message);
    if (memoryFacts && sessionId) {
      updateMemory(sessionId, memoryFacts);
    }

  /* ---- 1. Safety check ---- */

    if (isUnsafe(message)) {
      if (sessionId) addTurn(sessionId, message, SAFETY_REFUSAL);
      logResponseOutcome(
        outcomeContext,
        startedAtMs,
        "unsafe_refusal",
        "unsafe_input_detected",
      );
      return { text: SAFETY_REFUSAL };
    }

  /* ---- 2. Quick deterministic replies (greeting, math, date/time) ---- */

    const quickReply = tryQuickDeterministicReply(message);
    if (quickReply) {
      const text = formatBotReply(quickReply);
      if (sessionId) addTurn(sessionId, message, text);
      logResponseOutcome(
        outcomeContext,
        startedAtMs,
        "deterministic_reply",
        "quick_deterministic_path",
      );
      return { text };
    }

  /* ---- 3. Determine routing ---- */

    const bybetSignal =
      isBybetRelated(message) || isBybetRelated(intentCleaned);

    const faqHit =
      findBestKnowledgeMatch(intentCleaned, bybetKnowledgeBase) ||
      findBestKnowledgeMatch(normalizedMessage, bybetKnowledgeBase);

    const chatHistory = getHistory(sessionId);
    const userMemory = getMemory(sessionId);

  /* ---- 4. ByBet grounded path ---- */

    if (bybetSignal || faqHit) {
      console.log("[BYBET PATH]", bybetSignal ? "signal" : "faq_hit");
      let fallbackReason = "unknown_generation_error";

      const topMatches = retrieveFaqContext(intentCleaned, normalizedMessage);
      const faqContext = formatFaqContext(topMatches);

      const prompt = buildPrompt({
        userMessage: message,
        normalizedMessage: intentCleaned,
        faqContext,
        chatHistory,
        userMemory,
      });

      try {
        const generationStartMs = Date.now();
        const outcome = await withTimeout(
          generateWithPromptDetailed(prompt),
          MAIN_GEMINI_TIMEOUT_MS,
          "gemini_timeout",
        );

        const classified = classifyGenerationOutcome(
          "bybet_generation",
          outcome,
          logContext,
          Date.now() - generationStartMs,
        );
        if (!classified) {
          const text = formatBotReply(outcome.text);
          if (sessionId) addTurn(sessionId, message, text);
          logInfo("bot_generation_succeeded", {
            ...outcomeContext,
            outcome: "bybet_generation",
            durationMs: Date.now() - generationStartMs,
          });
          logResponseOutcome(outcomeContext, startedAtMs, "bybet_gemini_success");
          return { text };
        }
        fallbackReason = classified;
      } catch (err) {
        const reason =
          err?.message === "gemini_timeout"
            ? "gemini_timeout"
            : "unknown_generation_error";
        fallbackReason = reason;
        logError("bot_generation_failed", {
          ...outcomeContext,
          outcome: "bybet_generation",
          reason,
          errorMessage: err?.message || "unknown_error",
        });
      }

      if (sessionId) addTurn(sessionId, message, BYBET_FALLBACK_MESSAGE);
      logResponseOutcome(outcomeContext, startedAtMs, "bybet_fallback", fallbackReason);
      return { text: BYBET_FALLBACK_MESSAGE };
    }

  /* ---- 5. Harmless non-ByBet path ---- */

    console.log("[HARMLESS PATH]");
    let fallbackReason = "unknown_generation_error";

    const harmlessPrompt = buildHarmlessChatPrompt({
      userMessage: message,
      chatHistory,
      userMemory,
    });

    try {
      const generationStartMs = Date.now();
      const outcome = await withTimeout(
        generateWithPromptDetailed(harmlessPrompt),
        MAIN_GEMINI_TIMEOUT_MS,
        "gemini_timeout",
      );

      const classified = classifyGenerationOutcome(
        "harmless_generation",
        outcome,
        logContext,
        Date.now() - generationStartMs,
      );
      if (!classified) {
        const text = formatBotReply(outcome.text);
        if (sessionId) addTurn(sessionId, message, text);
        logInfo("bot_generation_succeeded", {
          ...outcomeContext,
          outcome: "harmless_generation",
          durationMs: Date.now() - generationStartMs,
        });
        logResponseOutcome(outcomeContext, startedAtMs, "harmless_gemini_success");
        return { text };
      }
      fallbackReason = classified;
    } catch (err) {
      const reason =
        err?.message === "gemini_timeout"
          ? "gemini_timeout"
          : "unknown_generation_error";
      fallbackReason = reason;
      logError("bot_generation_failed", {
        ...outcomeContext,
        outcome: "harmless_generation",
        reason,
        errorMessage: err?.message || "unknown_error",
      });
    }

    if (sessionId) addTurn(sessionId, message, HARMLESS_FALLBACK);
    logResponseOutcome(
      outcomeContext,
      startedAtMs,
      "harmless_fallback",
      fallbackReason,
    );
    return { text: HARMLESS_FALLBACK };
  });
}
