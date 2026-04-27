import cors from "cors";

const LOCAL_ORIGIN_REGEX =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw || !String(raw).trim()) {
    return null;
  }
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * CORS: use ALLOWED_ORIGINS (comma-separated) when set.
 * If unset, allow only localhost / 127.0.0.1 / ::1 (any port) for local dev.
 */
export function createCorsMiddleware() {
  const list = parseAllowedOrigins();

  if (list && list.length > 0) {
    return cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        if (list.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    });
  }

  return cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (LOCAL_ORIGIN_REGEX.test(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  });
}
