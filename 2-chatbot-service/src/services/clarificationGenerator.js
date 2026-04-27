/**
 * Template-based clarification messages for ambiguous intents.
 *
 * No AI calls — purely deterministic. Used when the classifier detects
 * a general topic area but confidence is too low for a direct FAQ answer.
 */

/* ------------------------------------------------------------------ */
/*  Intent → topic area mapping                                        */
/* ------------------------------------------------------------------ */

const INTENT_TO_AREA = {
  deposit_how: "deposit",
  deposit_pending: "deposit",
  deposit_rejected: "deposit",
  withdraw_how: "withdrawal",
  withdraw_pending: "withdrawal",
  withdraw_rejected: "withdrawal",
  kyc_process: "kyc",
  kyc_rejected: "kyc",
  kyc_status: "kyc",
  password_reset: "password",
  withdrawal_password: "password",
  promotion_general: "promotion",
  promotion_claim: "promotion",
  register_how: "registration",
  otp_issue: "otp",
  bank_bind: "bank",
  sports_betting_basics: "betting",
  legitimacy: "legitimacy",
  responsible_gaming: "responsible_gaming",
};

/* ------------------------------------------------------------------ */
/*  Clarification templates per topic area                             */
/* ------------------------------------------------------------------ */

const TEMPLATES = {
  deposit:
    "It sounds like your question is about deposits. Could you tell me more? For example:\n• How to make a deposit\n• A deposit that hasn't arrived yet\n• A deposit that was rejected",

  withdrawal:
    "It sounds like your question is about withdrawals. Could you tell me more? For example:\n• How to withdraw\n• A withdrawal that's still processing\n• A withdrawal that was rejected",

  kyc:
    "It sounds like your question is about KYC verification. Could you tell me more? For example:\n• How to complete KYC\n• How long KYC review takes\n• A KYC submission that was rejected",

  password:
    "Are you asking about your login password or your withdrawal password? Let me know and I'll walk you through the right steps.",

  promotion:
    "Are you asking about available promotions in general, or do you want help claiming a specific bonus?",

  registration:
    "Are you trying to create a new ByBet account? Let me know what step you're on and I'll help.",

  otp:
    "Are you having trouble receiving your OTP code? Let me know and I'll walk you through troubleshooting steps.",

  bank:
    "Are you trying to add a bank account or e-wallet, or do you need to change an existing one?",

  betting:
    "Would you like to learn how sports betting works on ByBet — things like odds, stakes, and bet types?",

  legitimacy:
    "Are you asking whether ByBet is licensed, or do you need information about the company?",

  responsible_gaming:
    "Are you looking for information about deposit limits, self-exclusion, or responsible gaming resources?",
};

const GENERIC_CLARIFICATION =
  "I want to make sure I give you the right answer. Could you tell me a bit more about what you need help with? I can assist with registration, deposits, withdrawals, KYC verification, passwords, promotions, and sports betting basics.";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Generate a short clarifying question based on the classified intent.
 *
 * @param {string} intent — the classified intent label
 * @returns {string} a human-readable clarification prompt
 */
export function generateClarification(intent) {
  const area = INTENT_TO_AREA[intent];
  if (area && TEMPLATES[area]) {
    return TEMPLATES[area];
  }
  return GENERIC_CLARIFICATION;
}
