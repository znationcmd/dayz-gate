const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {DatabaseSync} = require('node:sqlite');
class Database {
  constructor(filename) { this.connection = new DatabaseSync(filename); }
  exec(sql) { return this.connection.exec(sql); }
  pragma(sql) { return this.connection.exec('PRAGMA '+sql); }
  prepare(sql) { return this.connection.prepare(sql); }
  close() { this.connection.close(); }
}
require.cache[require.resolve('better-sqlite3')] = {exports:Database};
delete process.env.DATABASE_URL;
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'dayz-sqlite-test-'));
process.env.DB_PATH = path.join(temporary,'db.sqlite');
const db = require('../db');
test('local SQLite fallback uses the same async API and preserves rollback', async () => {
  try {
    await db.init();
    assert.equal(db.backend,'sqlite');
    await db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run('test','value');
    assert.equal((await db.prepare('SELECT value FROM app_settings WHERE key=?').get('test')).value,'value');
    await assert.rejects(db.transaction(async()=>{
      await db.prepare('UPDATE app_settings SET value=? WHERE key=?').run('changed','test');
      throw Error('rollback');
    }));
    assert.equal((await db.prepare('SELECT value FROM app_settings WHERE key=?').get('test')).value,'value');
  } finally { await db.close(); fs.rmSync(temporary,{recursive:true,force:true}); }
});
