export function validateEnv() {
  const nodeEnv = String(process.env.NODE_ENV || "development").trim().toLowerCase();
  const isProduction = nodeEnv === "production";
  const geminiApiKey = String(process.env.GEMINI_API_KEY || "").trim();
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  const widgetSecret = String(process.env.WIDGET_SECRET || "").trim();
  const sessionTtlMinutesRaw = String(process.env.SESSION_TTL_MINUTES || "").trim();
  const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "").trim();
  const trustProxyRaw = String(process.env.TRUST_PROXY || "").trim().toLowerCase();
  const trustProxyConfigured = Boolean(trustProxyRaw);
  const trustProxyEnabled = !["false", "0", "off", "no"].includes(trustProxyRaw);

  if (!geminiApiKey) {
    const message =
      "[startup] GEMINI_API_KEY is required in production. Refusing to start with broken AI configuration.";
    if (isProduction) {
      throw new Error(message);
    }
    console.warn("[startup] GEMINI_API_KEY is not set. AI generation may be unavailable in non-production.");
  }

  if (!databaseUrl) {
    const message =
      "[startup] DATABASE_URL is required in production. Refusing to start with broken session DB configuration.";
    if (isProduction) {
      throw new Error(message);
    }
    console.warn("[startup] DATABASE_URL is not set. PostgreSQL session storage may be unavailable in non-production.");
  }

  if (!widgetSecret) {
    const message =
      "[startup] WIDGET_SECRET is required in production. Refusing to start with broken widget authentication configuration.";
    if (isProduction) {
      throw new Error(message);
    }
    console.warn("[startup] WIDGET_SECRET is not set. /api/bot/ask may be publicly accessible in non-production.");
  }

  if (sessionTtlMinutesRaw) {
    const sessionTtlMinutes = Number(sessionTtlMinutesRaw);
    const isValidTtl = Number.isFinite(sessionTtlMinutes) && sessionTtlMinutes > 0;
    if (!isValidTtl) {
      const message =
        "[startup] SESSION_TTL_MINUTES must be a positive number.";
      if (isProduction) {
        throw new Error(message);
      }
      console.warn(message);
    }
  }

  if (isProduction && !allowedOrigins) {
    console.warn(
      "[startup] ALLOWED_ORIGINS is missing in production. CORS configuration may be too permissive or broken.",
    );
  }

  if (isProduction && (!trustProxyConfigured || !trustProxyEnabled)) {
    console.warn(
      "[startup] TRUST_PROXY is missing or disabled in production. Client IP/rate-limit behavior may be incorrect behind a proxy.",
    );
  }
}
