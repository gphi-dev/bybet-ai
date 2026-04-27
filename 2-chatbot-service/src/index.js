import { config } from "dotenv";
import { validateEnv } from "./config/validateEnv.js";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createCorsMiddleware } from "./config/corsConfig.js";
import { loadSecrets } from "./config/secrets.js";

await bootstrap();

async function bootstrap() {
  await loadSecrets();
  config();
  validateEnv();

  const { default: botRoutes } = await import("./routes/botRoutes.js");

  const app = express();

  function parseTrustProxy(rawValue) {
    const raw = String(rawValue ?? "").trim();
    if (!raw) return false;

    const lower = raw.toLowerCase();
    if (lower === "false" || lower === "0" || lower === "off") return false;

    // "true" means the app is behind a trusted proxy hop.
    // Map to 1 (not boolean true) to avoid blindly trusting every hop.
    if (lower === "true" || lower === "on") return 1;

    if (/^\d+$/.test(raw)) return Number(raw);

    // Allow explicit Express trust-proxy values (e.g., loopback, linklocal, uniquelocal).
    return raw;
  }

  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  app.set("trust proxy", trustProxy);

  app.use(helmet());
  app.use(createCorsMiddleware());

  app.get("/health", (_req, res) => {
    const hasGeminiApiKey = Boolean(
      process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim(),
    );
    const environment = process.env.NODE_ENV || "development";
    const timestamp = new Date().toISOString();

    if (hasGeminiApiKey) {
      return res.status(200).json({
        status: "ok",
        readiness: "ready",
        checks: {
          geminiApiKey: "present",
        },
        environment,
        timestamp,
      });
    }

    return res.status(503).json({
      status: "degraded",
      readiness: "not_ready",
      checks: {
        geminiApiKey: "missing",
      },
      environment,
      timestamp,
    });
  });

  const botLimiter = rateLimit({
    windowMs: 60_000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests. Please try again shortly." },
  });

  app.use(express.json({ limit: "1mb" }));
  app.use("/api/bot", botLimiter, botRoutes);

  const PORT = Number(process.env.PORT) || 4001;
  const baseUrl = `http://localhost:${PORT}`;

  const server = app.listen(PORT, () => {
    console.log(`[startup] listening on port ${PORT}`);
    console.log(`[startup] trust proxy: ${String(trustProxy)}`);
    console.log(`[startup] health: GET ${baseUrl}/health`);
    console.log(`[startup] bot:   POST ${baseUrl}/api/bot/ask`);
  });

  function shutdown(signal) {
    console.log(`[shutdown] received ${signal}, closing HTTP server...`);
    server.close((err) => {
      if (err) {
        console.error("[shutdown] error while closing", err);
        process.exit(1);
      }
      console.log("[shutdown] HTTP server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("[shutdown] forced exit after timeout");
      process.exit(1);
    }, 10_000).unref();
  }

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}
