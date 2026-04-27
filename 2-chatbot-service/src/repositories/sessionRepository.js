import { query } from "../db/postgres.js";

export async function getSession(sessionId) {
  const result = await query(
    `SELECT session_id, history, memory, expires_at, created_at, updated_at
     FROM chat_sessions
     WHERE session_id = $1`,
    [sessionId],
  );

  return result.rows[0] || null;
}

export async function upsertSession(sessionId, history, memory, expiresAt) {
  const result = await query(
    `INSERT INTO chat_sessions (session_id, history, memory, expires_at)
     VALUES ($1, $2::jsonb, $3::jsonb, $4)
     ON CONFLICT (session_id)
     DO UPDATE SET
       history = EXCLUDED.history,
       memory = EXCLUDED.memory,
       expires_at = EXCLUDED.expires_at,
       updated_at = NOW()
     RETURNING session_id, history, memory, expires_at, created_at, updated_at`,
    [sessionId, JSON.stringify(history ?? []), JSON.stringify(memory ?? {}), expiresAt],
  );

  return result.rows[0];
}

export async function deleteSession(sessionId) {
  const result = await query(
    `DELETE FROM chat_sessions
     WHERE session_id = $1`,
    [sessionId],
  );

  return result.rowCount;
}

export async function deleteExpiredSessions() {
  const result = await query(
    `DELETE FROM chat_sessions
     WHERE expires_at < NOW()`,
  );

  return result.rowCount;
}
