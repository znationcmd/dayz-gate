const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const schema = require('./schema');
const postgres = Boolean(process.env.DATABASE_URL);
const context = new AsyncLocalStorage();
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'dayzgate.db');
let pool, sqlite, initialization;

// All application statements use positional placeholders, never string interpolation.
function pgSql(sql) {
  let index = 0;
  return sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?|\bLIKE\b/gi, token => token === '?' ? `$${++index}` : token.toUpperCase() === 'LIKE' ? 'ILIKE' : token);
}
function normalize(row) {
  if (!row) return row;
  for (const key of ['c', 'expires_at']) if (typeof row[key] === 'string') row[key] = Number(row[key]);
  return row;
}
async function query(sql, args, mode) {
  if (postgres) {
    const result = await (context.getStore() || pool).query(pgSql(sql), args);
    if (mode === 'run') return { changes: result.rowCount };
    return mode === 'get' ? normalize(result.rows[0]) : result.rows.map(normalize);
  }
  if (!context.getStore()) await sqliteQueue;
  return sqlite.prepare(sql)[mode](...args);
}
function prepare(sql) {
  return Object.fromEntries(['get', 'all', 'run'].map(mode => [mode, (...args) => query(sql, args, mode)]));
}
async function transaction(fn) {
  if (postgres) {
    if (context.getStore()) return fn();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await context.run(client, fn);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }
  }
  // SQLite is only used locally. Async transactions must keep their connection exclusive.
  if (context.getStore()) return fn();
  const previous = sqliteQueue;
  let release;
  sqliteQueue = new Promise(resolve => { release = resolve; });
  await previous;
  let began = false;
  try { sqlite.exec('BEGIN IMMEDIATE'); began = true; const result = await context.run('sqlite', fn); sqlite.exec('COMMIT'); return result; }
  catch (err) { if (began) sqlite.exec('ROLLBACK'); throw err; }
  finally { release(); }
}
let sqliteQueue = Promise.resolve();

async function importSqlite() {
  const migration = 'sqlite-import-v1';
  if (await prepare('SELECT name FROM database_migrations WHERE name=?').get(migration)) return;
  if (!fs.existsSync(dbPath)) return;
  const Database = require('better-sqlite3');
  const old = new Database(dbPath, { readonly: true, fileMustExist: true });
  const tables = ['whitelist_requests', 'nitrado_connection', 'nitrado_scoped', 'discord_dashboard_links', 'guild_settings', 'app_settings', 'founder_accounts', 'founder_invites', 'dashboard_sessions'];
  let imported = 0;
  try {
    await transaction(async () => {
      // Serialize imports if two replicas start together.
      await (context.getStore()).query('SELECT pg_advisory_xact_lock(724182019)');
      if (await prepare('SELECT name FROM database_migrations WHERE name=?').get(migration)) return;
      for (const table of tables) {
        if (!old.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
        const allowed = new Set((await prepare('SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=?').all(table)).map(row => row.column_name));
        for (const row of old.prepare(`SELECT * FROM ${table}`).all()) {
          const keys = Object.keys(row).filter(key => allowed.has(key));
          const result = await prepare(`INSERT INTO ${table} (${keys.map(key => `"${key}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')}) ON CONFLICT DO NOTHING`).run(...keys.map(key => row[key]));
          imported += result.changes;
        }
      }
      for (const table of ['whitelist_requests', 'founder_accounts']) {
        await (context.getStore()).query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM ${table}), 0), 1), EXISTS(SELECT 1 FROM ${table}))`);
      }
      await prepare('INSERT INTO database_migrations(name) VALUES(?)').run(migration);
    });
    console.log(`Migration SQLite vers Postgres : ${imported} ligne(s) importée(s)`);
  } finally { old.close(); }
}
async function initialize() {
  if (postgres) {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
    pool.on('error', err => console.error('Connexion Postgres interrompue :', err.code || err.name));
    await pool.query(schema(true));
    await pool.query('ALTER TABLE whitelist_requests ADD COLUMN IF NOT EXISTS nitrado_sync_status TEXT; ALTER TABLE whitelist_requests ADD COLUMN IF NOT EXISTS nitrado_sync_message TEXT');
    await importSqlite();
  } else {
    const Database = require('better-sqlite3');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(schema(false));
    const columns = sqlite.prepare('PRAGMA table_info(whitelist_requests)').all().map(c => c.name);
    for (const column of ['nitrado_sync_status', 'nitrado_sync_message']) if (!columns.includes(column)) sqlite.exec(`ALTER TABLE whitelist_requests ADD COLUMN ${column} TEXT`);
  }
  await transaction(async () => {
    await prepare("INSERT INTO nitrado_scoped SELECT 'owner',access_token_enc,refresh_token_enc,expires_at,scope,updated_at FROM nitrado_connection WHERE id=1 ON CONFLICT(scope_id) DO NOTHING").run();
    await prepare('DELETE FROM nitrado_connection').run();
  });
  console.log(`Base de données DayZ Gate prête : ${postgres ? 'Postgres' : 'SQLite (local)'}`);
}
module.exports = {
  prepare, transaction,
  init: () => initialization ||= initialize(),
  backend: postgres ? 'postgres' : 'sqlite',
  ping: () => prepare('SELECT 1 AS ok').get(),
  close: async () => { if (pool) await pool.end(); if (sqlite) sqlite.close(); }
};
