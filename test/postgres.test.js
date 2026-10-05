const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { PGlite } = require('@electric-sql/pglite');

// Run application SQL on the actual PostgreSQL engine compiled to WASM.
// Only the pg network transport is replaced; queries, constraints and rollbacks are real.
const engine = new PGlite();
let gate = Promise.resolve();
class Pool {
  on() {}
  async query(sql, params = []) {
    if (sql.includes(';')) {
      const results = await engine.exec(sql);
      return { rows: results.at(-1)?.rows || [], rowCount: results.at(-1)?.affectedRows || 0 };
    }
    const result = await engine.query(sql, params);
    return { rows: result.rows, rowCount: result.affectedRows };
  }
  async connect() {
    const previous = gate;
    let release;
    gate = new Promise(resolve => { release = resolve; });
    await previous;
    return { query: this.query.bind(this), release };
  }
  async end() {}
}
require.cache[require.resolve('pg')] = { exports: { Pool } };
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'dayz-gate-test-'));
process.env.DATABASE_URL = 'postgres://test-unused';
process.env.DB_PATH = path.join(temporary, 'previous.db');
process.env.DASHBOARD_USER = 'owner';
process.env.DASHBOARD_PASSWORD = 'test-owner-password';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.NODE_ENV = 'test';
// Use Node's SQLite engine for fixtures where native addons cannot be built.
const { DatabaseSync } = require('node:sqlite');
class Database {
  constructor(filename, options = {}) { this.connection = new DatabaseSync(filename, { readOnly: Boolean(options.readonly) }); }
  exec(sql) { return this.connection.exec(sql); }
  prepare(sql) { return this.connection.prepare(sql); }
  close() { this.connection.close(); }
}
require.cache[require.resolve('better-sqlite3')] = { exports: Database };
const old = new Database(process.env.DB_PATH);
old.exec(require('../schema')(false));
old.prepare('INSERT INTO founder_accounts(id,username,guild_id,password_hash) VALUES(?,?,?,?)').run(40, 'legacy', 'guild-a', 'old-password-hash');
old.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run('legacy-setting', 'keep-me');
old.prepare('INSERT INTO nitrado_connection(id,access_token_enc,expires_at) VALUES(1,?,?)').run('encrypted-legacy-token', Date.now() + 3600000);
old.close();
const db = require('../db');
const guild = { id:'guild-a', name:'Guild A', ownerId:'discord-owner', members:{ fetch: async () => ({ permissions:{has:()=>true}, roles:{add:async()=>{},remove:async()=>{}} }) }, roles:{ fetch:async id => ({id,managed:false}) } };
const otherGuild = {...guild, id:'guild-b', name:'Guild B'};
const fakeClient = { guilds:{cache:new Map([[guild.id,guild],[otherGuild.id,otherGuild]]), fetch:async id => id===guild.id?guild:otherGuild } };
// Avoid real Discord login and role operations in dashboard tests.
require.cache[require.resolve('../bot')] = { exports:{client:fakeClient, grantWhitelistRole:async()=>{},removeWhitelistRole:async()=>{}} };
let server, base;
async function start() {
  server = require('../dashboard')().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise(resolve => server.close(resolve)); }
function browser() {
  let cookie = '';
  return async (url, body, method=body?'POST':'GET') => {
    const response = await fetch(base+url, {method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body?JSON.stringify(body):undefined});
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    const json = await response.json();
    return {status:response.status, json};
  };
}
before(async () => { await db.init(); await start(); });
after(async () => { await stop(); await db.close(); await engine.close(); fs.rmSync(temporary,{recursive:true,force:true}); });

test('imports SQLite without deleting it and advances account sequences', async () => {
  assert.equal((await db.prepare('SELECT value FROM app_settings WHERE key=?').get('legacy-setting')).value,'keep-me');
  assert.ok(fs.existsSync(process.env.DB_PATH));
  assert.equal((await db.prepare('SELECT access_token_enc FROM nitrado_scoped WHERE scope_id=?').get('owner')).access_token_enc,'encrypted-legacy-token');
  const result = await db.prepare('INSERT INTO founder_accounts(username,guild_id,password_hash) VALUES(?,?,?) RETURNING id').get('sequence-check','guild-b','hash');
  assert.ok(result.id > 40);
});
test('transaction failure rolls back its account and settings writes', async () => {
  await assert.rejects(db.transaction(async () => {
    await db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?)').run('rollback-test','temporary');
    throw Error('intentional failure');
  }));
  assert.equal(await db.prepare('SELECT value FROM app_settings WHERE key=?').get('rollback-test'),undefined);
});
test('owner and founder accounts, scopes, whitelist actions and sessions persist', async () => {
  const owner = browser();
  assert.equal((await owner('/api/stats')).status,401);
  assert.equal((await owner('/api/login',{username:'owner',password:'test-owner-password'})).status,200);
  assert.equal((await owner('/health')).json.database,'postgres');
  const invite = (await owner('/api/founder/invites',{guildId:'guild-a'})).json;
  const founder = browser();
  assert.equal((await founder('/api/founder/register',{token:invite.token,username:'founder-a',password:'founder-password-test'})).status,200);
  assert.equal((await founder('/api/founder/register',{token:invite.token,username:'founder-second',password:'founder-password-test'})).status,400);
  assert.equal((await founder('/api/login',{username:'founder-a',password:'founder-password-test'})).status,200);
  await db.prepare('INSERT INTO whitelist_requests(discord_user_id,discord_username,game_name,platform,server_name) VALUES(?,?,?,?,?)').run('user-a','User A','Gamer A','Xbox','guild-a:server');
  await db.prepare('INSERT INTO whitelist_requests(discord_user_id,discord_username,game_name,platform,server_name) VALUES(?,?,?,?,?)').run('user-b','User B','Gamer B','Xbox','guild-b:server');
  const stats = await founder('/api/stats');
  assert.deepEqual(stats.json,{total:1,pending:1,approved:0,rejected:0});
  const rows = (await founder('/api/requests')).json;
  assert.equal(rows.length,1);
  assert.equal((await founder('/api/requests?q=GAMER')).json.length,1);
  const hidden = await db.prepare('SELECT id FROM whitelist_requests WHERE discord_user_id=?').get('user-b');
  assert.equal((await founder(`/api/requests/${hidden.id}/approve`,{})).status,404);
  assert.equal((await founder(`/api/requests/${rows[0].id}/approve`,{})).status,200);
  assert.equal((await founder('/api/stats')).json.approved,1);
  assert.equal((await founder('/api/founder/settings',{roleId:'whitelist-role'})).status,200);
  assert.equal((await founder('/api/founder/settings')).json.whitelist_role_id,'whitelist-role');
  assert.equal((await founder('/api/nitrado/select',{serviceId:'123',serviceLabel:'Selected server'})).status,200);
  const status = (await founder('/api/nitrado/status')).json;
  assert.equal(status.selected.serviceId,'123');
  assert.equal(status.connected,false);
  assert.equal((await owner('/api/nitrado/status')).json.selected.serviceId,'');
  await stop(); await start();
  assert.equal((await founder('/api/me')).json.loggedIn,true);
  assert.equal((await founder('/api/stats')).json.approved,1);
  assert.equal((await founder('/api/nitrado/status')).json.selected.serviceId,'123');
  assert.equal((await founder(`/api/requests/${rows[0].id}/reject`,{})).status,200);
  assert.equal((await founder(`/api/requests/${rows[0].id}`,undefined,'DELETE')).status,200);
  assert.equal((await founder('/api/stats')).json.total,0);
  const account = (await owner('/api/founder/accounts')).json.find(row=>row.username==='founder-a');
  assert.equal((await owner(`/api/founder/accounts/${account.id}/disable`,{})).status,200);
  assert.equal((await founder('/api/stats')).status,401);
  assert.equal((await founder('/api/me')).json.loggedIn,false);
});

test('a founder invitation cannot create two accounts concurrently', async () => {
  const owner = browser();
  await owner('/api/login',{username:'owner',password:'test-owner-password'});
  const {token} = (await owner('/api/founder/invites',{guildId:'guild-a'})).json;
  const attempts = await Promise.all(['race-a','race-b'].map(username=>browser()('/api/founder/register',{token,username,password:'concurrent-password'})));
  assert.deepEqual(attempts.map(result=>result.status).sort(),[200,400]);
  const rows = await db.prepare("SELECT username FROM founder_accounts WHERE username IN (?,?)").all('race-a','race-b');
  assert.equal(rows.length,1);
});

test('Discord command handlers persist whitelist requests and one-use dashboard links', async () => {
  const {EventEmitter} = require('node:events');
  class Client extends EventEmitter { constructor() { super(); this.guilds=fakeClient.guilds; this.user={tag:'test-bot', displayAvatarURL:()=> 'https://example.test/avatar.png'}; } }
  require.cache[require.resolve('discord.js')] = {exports:{Client, GatewayIntentBits:{Guilds:1}}};
  delete require.cache[require.resolve('../bot')];
  const {client} = require('../bot');
  function command(commandName) {
    let done;
    const complete = new Promise(resolve=>{done=resolve});
    const interaction = {commandName,guildId:'guild-a',guild,user:{id:'discord-owner',username:'Owner',tag:'Owner#1234'},
      isChatInputCommand:()=>true, deferred:false,
      options:{getString:name=>({plateforme:'Xbox',identifiant:'Discord Gamer',serveur:'command-server'}[name])},
      deferReply:async()=>{interaction.deferred=true}, editReply:async payload=>{done(payload)},reply:async payload=>{done(payload)} };
    client.emit('interactionCreate',interaction);
    return complete;
  }
  assert.match((await command('whitelist')).content,/Demande envoyée/);
  assert.match((await command('whitelist')).content,/déjà une demande/);
  const payload = await command('dashboard');
  const link = payload.components[0].components[0].url;
  const token = link.split('#founder-login=')[1];
  assert.ok(token);
  const founder = browser();
  assert.equal((await founder('/api/founder/discord-login',{token})).status,200);
  assert.equal((await browser()('/api/founder/discord-login',{token})).status,401);
  assert.equal((await founder('/api/me')).json.guildId,'guild-a');
});
