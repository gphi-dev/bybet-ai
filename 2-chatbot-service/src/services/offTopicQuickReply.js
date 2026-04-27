/**
 * Simplified off-topic classification and deterministic quick replies.
 *
 * Provides three utilities for the main orchestrator:
 *   isBybetRelated()            — ByBet/gambling signal detection
 *   isUnsafe()                  — harmful/sensitive content blocking
 *   tryQuickDeterministicReply() — instant answers for greeting/math/date/identity
 *
 * Everything else (general knowledge, casual chat, social reactions) is
 * handled by the main Gemini path with a conversational prompt.
 */

import { normalizeMessage } from "./bybetKnowledgeMatcher.js";

/* ------------------------------------------------------------------ */
/*  Constants (kept for backward compatibility with messageSplit.js)   */
/* ------------------------------------------------------------------ */

export const SOFT_BYBET_REDIRECT =
  "If you want, I can also help with ByBet topics like registration, KYC, deposits, withdrawals, and sports betting.";

/* ------------------------------------------------------------------ */
/*  Signal detection                                                   */
/* ------------------------------------------------------------------ */

const BYBET_OR_GAMBLING_SIGNAL =
  /\b(bybet|deposit|withdraw|withdrawal|kyc|pagcor|sports\s*betting|sportsbook|wagering|turnover|rollover|bonus|promotion|promo|angpao|angpaw|offer|offers|reward|rewards|otp|gcash|paymaya|maya|payout|odds|wager|parlay|jackpot|casino|poker|slot|lottery|bookie|bookmaker|fixture|handicap|spread|moneyline|bet|bets|register|registration|sign\s*up|log\s*in|login|password|account|verify|verification|verified|bank|wallet|live\s*(?:agent|chat|support)|customer\s*(?:support|service)|mag\s*(?:deposit|withdraw|register|login|kyc))\b/i;

const HARM_OR_SENSITIVE_BLOCK =
  /\b(suicide|self[- ]harm|kill (yourself|myself)|bomb|terror|weapon|hack|ransomware|malware|phishing|scam\s+how|how\s+to\s+(make|build)\s+(a\s+)?(bomb|weapon|drug)|\bporn(ography)?\b|sexual\s+assault|rape\b|heroin|cocaine|meth)\b|child\s+(porn|abuse|exploitation)/i;

export function isBybetRelated(message) {
  const raw = normalizeMessage(message);
  return raw ? BYBET_OR_GAMBLING_SIGNAL.test(raw) : false;
}

export function isUnsafe(message) {
  const raw = normalizeMessage(message);
  return raw ? HARM_OR_SENSITIVE_BLOCK.test(raw) : false;
}

/* ------------------------------------------------------------------ */
/*  Deterministic quick replies (no AI calls, instant responses)       */
/* ------------------------------------------------------------------ */

function tryGreeting(t) {
  if (t.length > 90) return null;
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/i.test(t)) {
    return "Hi there! I'm here to help with ByBet, including registration, KYC, deposits, withdrawals, and sports betting. What would you like to know?";
  }
  return null;
}

function tryWhoAreYou(t) {
  if (/^who are you\??$/.test(t)) {
    return "I'm ByBet's virtual assistant. I can help with accounts, deposits, withdrawals, and sports betting.";
  }
  return null;
}

function tryTellMeAJoke(t) {
  if (/^tell me a joke\b/i.test(t)) {
    return "Why did the football team go to the bank? To get their quarterback.";
  }
  return null;
}

function tryDateOrTime(t) {
  const asksDate =
    /\bwhat('?s)?\s+(is\s+)?(the\s+)?(date|day)\b/i.test(t) ||
    /\bwhat\s+date\b/i.test(t) ||
    /\b(today'?s\s+date|date\s+today)\b/i.test(t);

  const asksTime =
    /\bwhat('?s)?\s+(is\s+)?(the\s+)?time\b/i.test(t) ||
    /\bwhat\s+time\s+is\s+it\b/i.test(t) ||
    /\bcurrent\s+time\b/i.test(t);

  const asksBoth = /\b(time|date)\s+(and|&)\s+(date|time)\b/i.test(t);

  if (!asksDate && !asksTime && !asksBoth) return null;

  const d = new Date();

  if (asksBoth || (asksDate && asksTime)) {
    const ds = d.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const ts = d.toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `It's ${ts} on ${ds}.`;
  }

  if (asksDate) {
    return `Today's date is ${d.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}.`;
  }

  return `The current time is ${d.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })}.`;
}

function trySimpleMath(compactNoSpaces) {
  const t = compactNoSpaces.replace(/\s+/g, "");
  const m = t.match(/^(\d{1,9})([+\-*])(\d{1,9})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[3]);
  let out;
  if (m[2] === "+") out = a + b;
  else if (m[2] === "-") out = a - b;
  else out = a * b;
  return `${m[1]} ${m[2]} ${m[3]} = ${out}.`;
}

function tryMathFromWhatIsPhrase(t) {
  const a = t.match(/^what'?s\s+(\d{1,9}\s*[+\-*]\s*\d{1,9})\s*\??$/i);
  const b = t.match(/^what\s+is\s+(\d{1,9}\s*[+\-*]\s*\d{1,9})\s*\??$/i);
  const inner = (a || b)?.[1];
  if (!inner) return null;
  return trySimpleMath(inner.replace(/\s/g, ""));
}

/**
 * Try quick deterministic replies that don't need AI.
 * Returns a plain text string, or null if no match.
 */
export function tryQuickDeterministicReply(message) {
  const raw = normalizeMessage(message);
  if (!raw) return null;
  const t = raw.trim();

  const greet = tryGreeting(t);
  if (greet) return greet;

  const who = tryWhoAreYou(t);
  if (who) return who;

  const joke = tryTellMeAJoke(t);
  if (joke) return joke;

  const dateOrTime = tryDateOrTime(t);
  if (dateOrTime) return dateOrTime;

  const mathWhat = tryMathFromWhatIsPhrase(t);
  if (mathWhat) return mathWhat;

  const mathLine = trySimpleMath(t.replace(/\s/g, ""));
  if (mathLine) return mathLine;

  return null;
}
