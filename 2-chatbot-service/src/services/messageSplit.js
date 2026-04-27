import { normalizeMessage } from "./bybetKnowledgeMatcher.js";
import { SOFT_BYBET_REDIRECT } from "./offTopicQuickReply.js";

const MAX_PARTS = 3;

/** Fix common typos so FAQ/off-topic can match. */
export function fixCommonQuestionTypos(clause) {
  return clause.trim().replace(/\bwhat\s+it\b/gi, "what is");
}

/**
 * True if this chunk can stand alone as a question or math fragment.
 */
export function looksLikeStandaloneQuestionOrMath(s) {
  const t = fixCommonQuestionTypos(s).replace(/\?+$/, "").trim();
  if (t.length < 2) return false;
  const compact = t.replace(/\s+/g, "");
  if (/^\d{1,9}[+\-*xX]\d{1,9}$/.test(compact)) return true;
  if (/^\d{1,9}\s*[+\-*]\s*\d{1,9}$/.test(t)) return true;
  if (
    /^(what\'?s|what is|what are|who\'?s|who is|who are|how do|how does|how is|how are|when|where|why|can i|define |explain |tell me)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^(is|are)\s+[a-z']/i.test(t)) return true;
  if (
    t.length < 100 &&
    /\b(otp|not received|not\s+received|kyc|deposit|withdraw|register|withdrawal)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Strip leading small talk so "I like oranges, what is an orange" → focus on the question.
 */
export function extractQuestionFocus(clause) {
  let s = clause.trim();
  if (!s) return "";
  const m = s.match(
    /^[^.!?]{0,120}?,\s*((?:what|who|how|when|where|why|tell me|define|explain)\s+.+)/i,
  );
  if (m) return m[1].trim();
  return s;
}

function expandShortByBetClause(part) {
  const p = part.trim().replace(/\?+$/, "");
  if (p.length > 35) return part.trim();
  if (
    /^(deposit|withdraw|withdrawal|register|registration|kyc|verify|verification)$/i.test(p)
  ) {
    return `how do i ${p}`;
  }
  return part.trim();
}

function normalizeSegment(s) {
  return expandShortByBetClause(
    extractQuestionFocus(fixCommonQuestionTypos(s)),
  );
}

/**
 * Split on comma only when intents are clearly separate (avoid "I like X, what is Y" as [I like X, ...]).
 */
function tryCommaSplit(normalized) {
  if (!/,/.test(normalized)) return null;
  const parts = normalized.split(/,\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const capped = parts.slice(0, MAX_PARTS);

  if (capped.length === 2) {
    const [a, b] = capped;
    const aTrim = a.trim();
    const bTrim = b.trim();
    const aMath = /^\d{1,9}\s*[+\-*]\s*\d{1,9}$/.test(aTrim);
    const aOk = looksLikeStandaloneQuestionOrMath(aTrim);
    const bOk = looksLikeStandaloneQuestionOrMath(bTrim);
    if (aMath && bOk) return [a, b];
    if (aOk && bOk) return [a, b];
    const shortLead =
      aTrim.split(/\s+/).length <= 4 &&
      aTrim.length <= 28 &&
      !/\b(i|we)\s+(like|love|hate|think)\b/i.test(aTrim);
    if (bOk && shortLead) return [a, b];
  }

  let hits = 0;
  for (const p of capped) {
    const t = p.trim();
    if (looksLikeStandaloneQuestionOrMath(t)) hits += 1;
    else if (/^\d{1,9}\s*[+\-*]\s*\d{1,9}$/.test(t)) hits += 1;
  }
  if (hits >= 2) return capped;

  return null;
}

/**
 * Split a user message into 2–3 meaningful sub-questions (max 3).
 * Preserves clause order. Returns [normalized] if no multi-part split applies.
 */
export function splitUserMessageIntoParts(message) {
  const normalized = normalizeMessage(message);
  if (!normalized) return [];

  let segments = [];

  if (/\s+and\s+/i.test(normalized)) {
    segments = normalized
      .split(/\s+and\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (segments.length <= 1 && /\s+also\s+/i.test(normalized)) {
    segments = normalized
      .split(/\s+also\s+/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (segments.length <= 1 && /\.\s+[A-Za-z]/.test(normalized)) {
    segments = normalized.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
  }
  if (segments.length <= 1 && /\?\s+[A-Za-z]/.test(normalized)) {
    segments = normalized.split(/\?\s+/).map((s) => s.trim()).filter(Boolean);
  }
  if (segments.length <= 1) {
    const comma = tryCommaSplit(normalized);
    if (comma && comma.length >= 2) {
      segments = comma;
    }
  }

  if (segments.length <= 1) {
    return [normalized];
  }

  segments = segments.map(normalizeSegment).filter(Boolean);

  if (segments.length > MAX_PARTS) {
    segments = segments.slice(0, MAX_PARTS);
  }

  if (segments.length <= 1) {
    return [normalized];
  }

  return segments;
}

/**
 * Merge multi-part resolutions in **caller order** (same order as parts[]).
 * Soft redirect only when there is off-topic and **no** FAQ segment.
 */
export function combineAnswerParts(results) {
  const hasFaq = results.some((r) => r.type === "faq");
  const hasOff = results.some((r) => r.type === "offtopic");

  const chunks = results.map((r) => r.text).filter(Boolean);
  let out = chunks.join(" ");

  if (hasOff && !hasFaq) {
    out = `${out} ${SOFT_BYBET_REDIRECT}`;
  }

  return out.trim();
}
