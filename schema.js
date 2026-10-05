// One schema for both local SQLite and the Railway PostgreSQL database.
module.exports = postgres => {
  const id = postgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const clock = postgres ? '(CURRENT_TIMESTAMP::text)' : 'CURRENT_TIMESTAMP';
  const expiry = postgres ? 'BIGINT' : 'INTEGER';
  return `
CREATE TABLE IF NOT EXISTS whitelist_requests (
 id ${id}, discord_user_id TEXT NOT NULL, discord_username TEXT NOT NULL,
 game_name TEXT NOT NULL, platform TEXT NOT NULL, server_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT,
 created_at TEXT NOT NULL DEFAULT ${clock}, reviewed_at TEXT,
 nitrado_sync_status TEXT, nitrado_sync_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_status ON whitelist_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_game_name ON whitelist_requests(game_name);
CREATE TABLE IF NOT EXISTS nitrado_connection (
 id INTEGER PRIMARY KEY CHECK (id = 1), access_token_enc TEXT,
 refresh_token_enc TEXT, expires_at ${expiry}, scope TEXT,
 updated_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE TABLE IF NOT EXISTS nitrado_scoped (
 scope_id TEXT PRIMARY KEY, access_token_enc TEXT, refresh_token_enc TEXT,
 expires_at ${expiry}, scope TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS discord_dashboard_links (
 token_hash TEXT PRIMARY KEY, guild_id TEXT NOT NULL, user_id TEXT NOT NULL,
 username TEXT NOT NULL, expires_at ${expiry} NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_settings (guild_id TEXT PRIMARY KEY, whitelist_role_id TEXT);
CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS founder_accounts (
 id ${id}, username TEXT UNIQUE NOT NULL, guild_id TEXT NOT NULL,
 password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT DEFAULT ${clock}
);
CREATE TABLE IF NOT EXISTS founder_invites (
 token_hash TEXT PRIMARY KEY, guild_id TEXT NOT NULL, expires_at ${expiry} NOT NULL,
 used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS dashboard_sessions (
 sid TEXT PRIMARY KEY, data TEXT NOT NULL, expires_at ${expiry} NOT NULL
);
CREATE TABLE IF NOT EXISTS database_migrations (name TEXT PRIMARY KEY);
`;
};
