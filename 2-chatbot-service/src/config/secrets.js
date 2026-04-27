import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

export async function loadSecrets() {
  const nodeEnv = String(process.env.NODE_ENV || "development").trim().toLowerCase();
  const isProduction = nodeEnv === "production";
  const projectId = String(process.env.GCP_PROJECT_ID || "").trim();

  if (!isProduction) {
    console.log("[startup] Secret loading skipped: NODE_ENV is not production.");
    return;
  }

  if (!projectId) {
    console.log("[startup] Secret loading skipped: GCP_PROJECT_ID is not set.");
    return;
  }

  const secretName = `projects/${projectId}/secrets/GEMINI_API_KEY/versions/latest`;

  try {
    const [version] = await client.accessSecretVersion({ name: secretName });
    const raw = version.payload?.data?.toString() || "";
    const geminiApiKey = raw.trim();

    if (!geminiApiKey) {
      console.warn("[startup] Loaded GEMINI_API_KEY from Secret Manager but value is empty.");
      return;
    }

    process.env.GEMINI_API_KEY = geminiApiKey;
    console.log("[startup] Loaded GEMINI_API_KEY from GCP Secret Manager.");
  } catch (error) {
    console.error("[startup] Failed to load GEMINI_API_KEY from GCP Secret Manager.", error);
    throw error;
  }
}
