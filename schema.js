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
CREATE TABLE IF NOT EXISTS dayz_activity_logs (
 event_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, server_id TEXT NOT NULL DEFAULT '',
 event_type TEXT NOT NULL, player_name TEXT, player_id TEXT, killer_name TEXT, killer_id TEXT,
 cause TEXT, weapon TEXT, distance REAL, x REAL, y REAL, z REAL,
 log_time TEXT, occurred_at TEXT NOT NULL DEFAULT ${clock}, raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_dayz_activity_guild_time ON dayz_activity_logs(guild_id,occurred_at);
CREATE TABLE IF NOT EXISTS dayz_construction_logs (
 event_id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, server_id TEXT NOT NULL DEFAULT '',
 player_name TEXT, player_id TEXT, object_name TEXT NOT NULL,
 x REAL, y REAL, z REAL, log_time TEXT, occurred_at TEXT NOT NULL DEFAULT ${clock}, raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_dayz_construction_guild_time ON dayz_construction_logs(guild_id,occurred_at);
CREATE TABLE IF NOT EXISTS radio_settings (
 guild_id TEXT PRIMARY KEY, frequency TEXT NOT NULL DEFAULT '87.8 MHz',
 channel_id TEXT, station_name TEXT NOT NULL DEFAULT 'DAYZ GATE RADIO',
 updated_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE TABLE IF NOT EXISTS radio_messages (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, author_id TEXT NOT NULL,
 kind TEXT NOT NULL DEFAULT 'hq', message TEXT NOT NULL,
 frequency TEXT NOT NULL DEFAULT '87.8 MHz', created_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE INDEX IF NOT EXISTS idx_radio_messages_guild_time ON radio_messages(guild_id,created_at);
CREATE TABLE IF NOT EXISTS recurring_messages (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL,
 message TEXT NOT NULL, interval_minutes INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
 next_run_at ${expiry} NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE TABLE IF NOT EXISTS premium_codes (
 id TEXT PRIMARY KEY, code_hash TEXT UNIQUE NOT NULL, product TEXT NOT NULL, billing TEXT NOT NULL,
 duration_days INTEGER NOT NULL, max_servers INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT ${clock}, used_by TEXT, used_scope TEXT, used_at TEXT
);
CREATE TABLE IF NOT EXISTS premium_subscriptions (
 id TEXT PRIMARY KEY, scope_id TEXT NOT NULL, user_id TEXT NOT NULL, product TEXT NOT NULL,
 starts_at TEXT NOT NULL DEFAULT ${clock}, expires_at TEXT NOT NULL, source_code_id TEXT,
 created_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_active ON premium_subscriptions(scope_id,user_id,product,expires_at);
CREATE TABLE IF NOT EXISTS premium_servers (
 id TEXT PRIMARY KEY, scope_id TEXT NOT NULL, label TEXT NOT NULL, service_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT ${clock}, UNIQUE(scope_id,service_id)
);
CREATE TABLE IF NOT EXISTS premium_payment_requests (
 id TEXT PRIMARY KEY, scope_id TEXT NOT NULL, user_id TEXT NOT NULL, product TEXT NOT NULL,
 billing TEXT NOT NULL, amount_cents INTEGER NOT NULL, reference TEXT UNIQUE NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL DEFAULT ${clock}, validated_at TEXT
);
CREATE TABLE IF NOT EXISTS member_xp (
 guild_id TEXT NOT NULL, user_id TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0,
 level INTEGER NOT NULL DEFAULT 0, last_message_at ${expiry} NOT NULL DEFAULT 0,
 PRIMARY KEY(guild_id,user_id)
);
CREATE TABLE IF NOT EXISTS warnings (
 id ${id}, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, moderator_id TEXT NOT NULL,
 reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT ${clock}
);
CREATE TABLE IF NOT EXISTS database_migrations (name TEXT PRIMARY KEY);
`;
};
