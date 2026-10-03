const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const defaultPath = path.join(__dirname, "..", "data", "dayzgate.db");
const dbPath = process.env.DB_PATH || defaultPath;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS whitelist_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT NOT NULL,
  discord_username TEXT NOT NULL,
  game_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  server_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  nitrado_sync_status TEXT,
  nitrado_sync_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_status
ON whitelist_requests(status);

CREATE INDEX IF NOT EXISTS idx_requests_game_name
ON whitelist_requests(game_name);

CREATE TABLE IF NOT EXISTS nitrado_connection (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  expires_at INTEGER,
  scope TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// Migration douce pour les anciennes bases V1/V2/V3.
const columns = db.prepare("PRAGMA table_info(whitelist_requests)").all().map(c => c.name);
if (!columns.includes("nitrado_sync_status")) {
  db.exec("ALTER TABLE whitelist_requests ADD COLUMN nitrado_sync_status TEXT");
}
if (!columns.includes("nitrado_sync_message")) {
  db.exec("ALTER TABLE whitelist_requests ADD COLUMN nitrado_sync_message TEXT");
}

module.exports = db;
