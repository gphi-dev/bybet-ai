/**
 * Optional keyword groups for future use or tooling.
 * Primary FAQ routing uses bybet-knowledge.json + bybetKnowledgeMatcher.js.
 */
export const keywordGroups = {
  product: [
    "bybet",
    "betting platform",
    "sports betting",
    "sportsbook",
    "bet",
  ],

  legal: [
    "legal",
    "licensed",
    "license",
    "pagcor",
    "regulated",
    "regulation",
    "legit",
    "authorized",
    "compliant",
    "compliance",
  ],

  safety: [
    "safe",
    "safety",
    "responsible gaming",
    "responsible",
    "player safety",
    "protection",
    "secure",
    "security",
  ],

  careers: [
    "career",
    "careers",
    "job",
    "jobs",
    "apply",
    "application",
    "hiring",
    "vacancy",
    "vacancies",
    "opening",
    "openings",
    "recruitment",
  ],

  missionVision: ["mission", "vision", "goal", "goals", "purpose"],

  philosophyValues: [
    "philosophy",
    "values",
    "core values",
    "principles",
    "business philosophy",
  ],

  payments: [
    "deposit",
    "withdraw",
    "withdrawal",
    "otp",
    "kyc",
    "verification",
  ],
};

export function getMatchedKeywordGroups(userQuery = "") {
  const query = userQuery.toLowerCase();

  return Object.entries(keywordGroups)
    .filter(([, keywords]) =>
      keywords.some((keyword) => query.includes(keyword)),
    )
    .map(([groupName]) => groupName);
}
