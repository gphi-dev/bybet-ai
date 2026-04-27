/**
 * Deterministic intent normalization for ByBet chatbot.
 *
 * Transforms messy real-world input (Taglish, shorthand, typos, filler)
 * into cleaner text for FAQ matching. No AI calls. Stateless.
 * Concurrency-safe: no shared mutable state.
 */

/* ------------------------------------------------------------------ */
/*  Phrase-level replacements (longest-first to avoid partial matches) */
/* ------------------------------------------------------------------ */

const PHRASE_REPLACEMENTS = [
  ["customer service", "customer support"],
  ["can you assist", "can you help"],
  ["turuan mo ko", "teach me"],
  ["turuan moko", "teach me"],
  ["tulong naman", "help"],
  ["assist me", "help me"],
].sort((a, b) => b[0].length - a[0].length);

/* ------------------------------------------------------------------ */
/*  Filipino verb-prefix handling (mag-/nag-/magpa-/nagpa- + verb)    */
/* ------------------------------------------------------------------ */

const VERB_TARGETS = [
  "deposit",
  "withdraw",
  "withdrawal",
  "register",
  "registration",
  "login",
  "kyc",
  "verify",
  "verification",
  "bet",
  "betting",
  "cashout",
  "payout",
].join("|");

const RE_MAG_COMPOUND = new RegExp(
  `\\b(?:mag|nag|magpa|nagpa)(${VERB_TARGETS})\\b`,
  "gi",
);

const RE_MAG_SEPARATED = new RegExp(
  `\\b(?:mag|nag|magpa|nagpa)\\s+(${VERB_TARGETS})\\b`,
  "gi",
);

/* ------------------------------------------------------------------ */
/*  Word-level: Taglish → English                                     */
/* ------------------------------------------------------------------ */

const TAGLISH_MAP = {
  pano: "how",
  paano: "how",
  ano: "what",
  anong: "what",
  bakit: "why",
  saan: "where",
  kailan: "when",
  nakalimutan: "forgot",
  nakalimot: "forgot",
  hindi: "not",
  di: "not",
  wala: "no",
  walang: "no",
  gusto: "want",
  ayaw: "not want",
  kuha: "get",
  makuha: "get",
  natanggap: "received",
  tanggap: "receive",
  padala: "send",
  bayad: "payment",
  pera: "money",
  tulong: "help",
  tulungan: "help",
  kailangan: "need",
  problema: "problem",
  angpao: "bonus",
  angpaw: "bonus",
  libre: "free",
  buksan: "open",
  pwede: "can",
  puede: "can",
  salamat: "thanks",
  alam: "know",
  dito: "here",
  gawin: "do",
  gawa: "do",
  sira: "broken",
  mali: "wrong",
  tama: "correct",
  assist: "help",
};

/* ------------------------------------------------------------------ */
/*  Word-level: shorthand / abbreviation expansion                    */
/* ------------------------------------------------------------------ */

const SHORTHAND_MAP = {
  wd: "withdrawal",
  dep: "deposit",
  depo: "deposit",
  reg: "register",
  pwd: "password",
  pw: "password",
  acct: "account",
  acc: "account",
  cs: "customer support",
  csr: "customer support",
  wp: "withdrawal password",
  lp: "login password",
  sb: "sports betting",
  promo: "promotion",
  promos: "promotions",
};

/* ------------------------------------------------------------------ */
/*  Filler / particle set                                             */
/* ------------------------------------------------------------------ */

const FILLERS = new Set([
  // Filipino particles
  "po",
  "ba",
  "naman",
  "kasi",
  "nga",
  "lang",
  "na",
  "pa",
  "yung",
  "yun",
  "talaga",
  "din",
  "rin",
  "daw",
  "raw",
  // Filipino pronouns (low signal for FAQ matching)
  "ko",
  "mo",
  "niya",
  // Interjections
  "eh",
  "ah",
  "oh",
  "uh",
  "um",
  // Courtesy / address
  "pls",
  "please",
  "sir",
  "maam",
  "madam",
]);

/* ------------------------------------------------------------------ */
/*  Domain terms for conservative typo correction                     */
/* ------------------------------------------------------------------ */

const DOMAIN_TERMS = [
  "deposit",
  "withdrawal",
  "withdraw",
  "register",
  "registration",
  "password",
  "account",
  "verification",
  "verify",
  "verified",
  "promotion",
  "bonus",
  "support",
  "balance",
  "betting",
  "sports",
  "payment",
  "payout",
  "cashout",
  "maintenance",
  "wagering",
  "turnover",
  "rollover",
];

const SKIP_TYPO_CHECK = new Set([
  ...DOMAIN_TERMS,
  ...Object.keys(TAGLISH_MAP),
  ...Object.keys(SHORTHAND_MAP),
  ...FILLERS,
]);

const GENERAL_TYPO_MAP = {
  ostrictch: "ostrich",
  ostritch: "ostrich",
  ostich: "ostrich",
  orang: "orange",
  oragne: "orange",
  bananna: "banana",
  bannana: "banana",
  banan: "banana",
  depoist: "deposit",
  depsoit: "deposit",
  deposite: "deposit",
  wthdraw: "withdraw",
  widthdraw: "withdraw",
  withdrawl: "withdrawal",
  regsiter: "register",
  registar: "register",
  regiter: "register",
  pasword: "password",
  passowrd: "password",
  passwrd: "password",
  acount: "account",
  accont: "account",
  acocunt: "account",
  promtion: "promotion",
  promoton: "promotion",
  prommotion: "promotion",
  wthdrawal: "withdrawal",
  verfication: "verification",
  verifcation: "verification",
};

/* ------------------------------------------------------------------ */
/*  Levenshtein distance                                              */
/* ------------------------------------------------------------------ */

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * Correct obvious typos of domain terms only.
 * Short words (4–6 chars) require edit distance ≤ 1;
 * longer words allow ≤ 2.
 */
function correctDomainTypo(word) {
  if (word.length < 4 || SKIP_TYPO_CHECK.has(word)) return word;

  const maxDist = word.length <= 6 ? 1 : 2;
  let best = null;
  let bestDist = maxDist + 1;

  for (const term of DOMAIN_TERMS) {
    if (Math.abs(term.length - word.length) > maxDist) continue;
    const d = levenshtein(word, term);
    if (d > 0 && d < bestDist) {
      best = term;
      bestDist = d;
    }
  }

  return best ?? word;
}

/* ------------------------------------------------------------------ */
/*  Pipeline stages                                                   */
/* ------------------------------------------------------------------ */

function basicNormalize(text) {
  if (text == null || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/['\u2018\u2019`]/g, "'")
    .replace(/["\u201C\u201D]/g, '"')
    .replace(/([?!.])\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function applyPhrases(text) {
  let out = text;
  for (const [from, to] of PHRASE_REPLACEMENTS) {
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${esc}\\b`, "gi"), to);
  }
  return out;
}

function handleMagNag(text) {
  return text.replace(RE_MAG_COMPOUND, "$1").replace(RE_MAG_SEPARATED, "$1");
}

function mapWords(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^([a-z0-9'-]+)([^a-z0-9'-]*)$/);
      if (!m) return w;
      const [, core, tail] = m;
      const mapped = TAGLISH_MAP[core] ?? SHORTHAND_MAP[core];
      return mapped != null ? mapped + tail : w;
    })
    .join(" ");
}

function stripFillers(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const kept = words.filter(
    (w) => !FILLERS.has(w.replace(/[^a-z0-9'-]/g, "")),
  );
  return kept.length > 0 ? kept.join(" ") : text;
}

function fixTypos(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const m = w.match(/^([a-z]+)([^a-z]*)$/);
      if (!m) return w;
      const core = m[1];
      const tail = m[2];
      if (GENERAL_TYPO_MAP[core]) return GENERAL_TYPO_MAP[core] + tail;
      return correctDomainTypo(core) + tail;
    })
    .join(" ");
}

function cleanup(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s([?!.,])/g, "$1")
    .trim();
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Normalize a raw user message for intent detection and FAQ matching.
 *
 * @param {string} message
 * @returns {{ raw: string, normalized: string, cleaned: string, tokens: string[] }}
 *
 * - `raw`        — original input, untouched
 * - `normalized` — after linguistic transforms (Taglish, shorthand, typos);
 *                  keeps all words for richer Gemini / logging context
 * - `cleaned`    — after additional filler removal, optimized for FAQ matching
 * - `tokens`     — cleaned text split into individual words
 */
export function normalizeForIntent(message) {
  const raw = typeof message === "string" ? message : "";

  let text = basicNormalize(raw);
  if (!text) return { raw, normalized: "", cleaned: "", tokens: [] };

  text = applyPhrases(text);
  text = handleMagNag(text);
  text = mapWords(text);
  text = fixTypos(text);

  const normalized = cleanup(text);

  text = stripFillers(text);
  const cleaned = cleanup(text);
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  return { raw, normalized, cleaned, tokens };
}
