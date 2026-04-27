/**
 * Gemini generation layer for ByBet chatbot.
 *
 * Accepts a fully assembled prompt and returns the model's text response.
 * Uses the shared concurrency semaphore to prevent overloading the API.
 */

import { config } from "dotenv";
config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_CONFIG } from "../config/geminiConfig.js";
import { acquireGeminiSlot, releaseGeminiSlot } from "./geminiSemaphore.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @typedef {{
 *   ok: true,
 *   text: string
 * } | {
 *   ok: false,
 *   reason: "gemini_semaphore_full" | "gemini_empty_response" | "gemini_provider_error",
 *   error?: Error
 * }} GeminiGenerationOutcome
 */

function normalizeGeneratedText(result) {
  const text = result?.response?.text?.();
  if (typeof text !== "string") return "";
  return text.trim();
}

/**
 * Generate a response from a pre-built prompt string.
 *
 * @param {string} prompt — fully assembled prompt including FAQ context, history, and user message
 * @returns {Promise<GeminiGenerationOutcome>} structured generation outcome
 */
export async function generateWithPromptDetailed(prompt) {
  if (!acquireGeminiSlot()) {
    return { ok: false, reason: "gemini_semaphore_full" };
  }

  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    releaseGeminiSlot();
  };

  const task = (async () => {
    try {
      const model = genAI.getGenerativeModel(GEMINI_CONFIG);
      const result = await model.generateContent(prompt);
      const text = normalizeGeneratedText(result);
      if (!text) {
        return { ok: false, reason: "gemini_empty_response" };
      }
      return { ok: true, text };
    } catch (error) {
      return { ok: false, reason: "gemini_provider_error", error };
    } finally {
      releaseOnce();
    }
  })();

  // Timeout wrapper can call cancel() to release the slot immediately,
  // even if the SDK call is still running in the background.
  task.cancel = releaseOnce;
  return task;
}

/**
 * Backward-compatible string helper.
 *
 * @param {string} prompt
 * @returns {Promise<string|null>}
 */
export async function generateWithPrompt(prompt) {
  const outcome = await generateWithPromptDetailed(prompt);
  return outcome.ok ? outcome.text : null;
}
