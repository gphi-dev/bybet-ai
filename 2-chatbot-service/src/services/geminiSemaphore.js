/**
 * Shared concurrency limiter for all Gemini API calls.
 * Prevents the backend from overwhelming the external AI under load.
 */

const MAX_CONCURRENT = 20;
let inFlight = 0;

export function geminiSlotAvailable() {
  return inFlight < MAX_CONCURRENT;
}

export function acquireGeminiSlot() {
  if (inFlight >= MAX_CONCURRENT) return false;
  inFlight++;
  return true;
}

export function releaseGeminiSlot() {
  if (inFlight > 0) inFlight--;
}
