const crypto=require('crypto');
const db=require('./db');
const session=require('express-session');
db.exec(`CREATE TABLE IF NOT EXISTS founder_accounts(id INTEGER PRIMARY KEY,username TEXT UNIQUE NOT NULL,guild_id TEXT NOT NULL,password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS founder_invites(token_hash TEXT PRIMARY KEY,guild_id TEXT NOT NULL,expires_at INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS dashboard_sessions(sid TEXT PRIMARY KEY,data TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS guild_settings(guild_id TEXT PRIMARY KEY,whitelist_role_id TEXT);`);
function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex')}
function verifyPassword(password,hash){try{const [salt,key]=hash.split(':');const input=crypto.scryptSync(password,salt,64);const expected=Buffer.from(key,'hex');return input.length===expected.length&&crypto.timingSafeEqual(input,expected)}catch{return false}}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex')}
class Store extends session.Store{
 get(sid,cb){try{const row=db.prepare('SELECT data FROM dashboard_sessions WHERE sid=? AND expires_at>?').get(sid,Date.now());cb(null,row?JSON.parse(row.data):null)}catch(e){cb(e)}}
 set(sid,data,cb){try{const expiry=data.cookie.expires?new Date(data.cookie.expires).getTime():Date.now()+30*86400000;db.prepare('INSERT INTO dashboard_sessions VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at').run(sid,JSON.stringify(data),expiry);db.prepare('DELETE FROM dashboard_sessions WHERE expires_at<?').run(Date.now());cb?.()}catch(e){cb?.(e)}}
 destroy(sid,cb){try{db.prepare('DELETE FROM dashboard_sessions WHERE sid=?').run(sid);cb?.()}catch(e){cb?.(e)}}
 touch(sid,data,cb){this.set(sid,data,cb)}
}
function canAccess(req,row){return req.session.role!=='founder'||row.server_name.startsWith(req.session.guildId+':')}
function mount(app,mustLogin,client){
 const owner=(req,res,next)=>{if(req.session.role==='founder')return res.status(403).json({error:'Réservé au propriétaire DayZ Gate'});next()};
 app.post('/api/founder/discord-login',async(req,res)=>{
  const token=String(req.body.token||'');if(token.length>100)return res.status(400).json({error:'Lien invalide'});
  const row=db.prepare('SELECT * FROM discord_dashboard_links WHERE token_hash=? AND expires_at>?').get(tokenHash(token),Date.now());if(!row)return res.status(401).json({error:'Lien expiré ou déjà utilisé. Relance /dashboard dans ton Discord.'});
  try{const guild=await client.guilds.fetch(row.guild_id);const member=await guild.members.fetch(row.user_id);if(guild.ownerId!==row.user_id&&!member.permissions.has(32n)&&!member.permissions.has(8n))return res.status(403).json({error:'Droits fondateur nécessaires sur ce Discord'});
   const removed=db.prepare('DELETE FROM discord_dashboard_links WHERE token_hash=?').run(row.token_hash);if(!removed.changes)return res.status(401).json({error:'Lien déjà utilisé'});
   req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Connexion impossible'});req.session.admin=row.username;req.session.role='founder';req.session.authMethod='discord';req.session.guildId=row.guild_id;req.session.discordUserId=row.user_id;req.session.save(()=>res.json({ok:true}))});
  }catch{return res.status(403).json({error:'Impossible de vérifier tes droits Discord. Relance /dashboard.'})}
 });
 app.post('/api/founder/choose',mustLogin,owner,(req,res)=>{const id=String(req.body.guildId||'');if(!client.guilds.cache.has(id))return res.status(400).json({error:'Discord inconnu'});req.session.selectedGuildId=id;res.json({ok:true})});
 app.get('/api/founder/guilds'  ,mustLogin,(req,res)=>{let guilds=[...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name}));if(req.session.role==='founder')guilds=guilds.filter(g=>g.id===req.session.guildId);res.json(guilds)});
 app.post('/api/founder/invites',mustLogin,owner,(req,res)=>{const guildId=String(req.body.guildId||'');if(!client.guilds.cache.has(guildId))return res.status(400).json({error:'Le bot doit être présent dans ce Discord'});const token=crypto.randomBytes(32).toString('base64url');db.prepare('INSERT INTO founder_invites VALUES(?,?,?,0)').run(tokenHash(token),guildId,Date.now()+48*3600000);res.json({token,expiresInHours:48})});
 app.post('/api/founder/register',(req,res)=>{const {token,username,password}=req.body;if(!token||typeof username!=='string'||typeof password!=='string'||!/^[-\w.]{3,40}$/.test(username)||password.length<12||password.length>128)return res.status(400).json({error:'Identifiant de 3 à 40 caractères et mot de passe de 12 à 128 caractères requis'});try{db.transaction(()=>{const invite=db.prepare('SELECT * FROM founder_invites WHERE token_hash=? AND used=0 AND expires_at>?').get(tokenHash(String(token)),Date.now());if(!invite)throw Error('Invitation expirée ou déjà utilisée');if(db.prepare('SELECT id FROM founder_accounts WHERE username=?').get(username)||username===process.env.DASHBOARD_USER)throw Error('Identifiant déjà utilisé');db.prepare('INSERT INTO founder_accounts(username,guild_id,password_hash) VALUES(?,?,?)').run(username,invite.guild_id,hashPassword(password));db.prepare('UPDATE founder_invites SET used=1 WHERE token_hash=?').run(invite.token_hash)})();res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});
 app.get('/api/founder/accounts',mustLogin,owner,(req,res)=>res.json(db.prepare('SELECT id,username,guild_id,active FROM founder_accounts').all()));
 app.post('/api/founder/accounts/:id/disable',mustLogin,owner,(req,res)=>{db.prepare('UPDATE founder_accounts SET active=0 WHERE id=?').run(req.params.id);res.json({ok:true})});
 app.get('/api/founder/settings',mustLogin,(req,res)=>{const id=req.session.role==='founder'?req.session.guildId:String(req.query.guildId||'');res.json(db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(id)||{guild_id:id,whitelist_role_id:''})});
 app.post('/api/founder/settings',mustLogin,async(req,res)=>{const id=req.session.role==='founder'?req.session.guildId:String(req.body.guildId||'');const roleId=String(req.body.roleId||'');try{const guild=await client.guilds.fetch(id);if(roleId){const role=await guild.roles.fetch(roleId);if(!role||role.id===guild.id||role.managed)throw Error('Choisis un rôle Discord valide pour la whitelist')}db.prepare('INSERT INTO guild_settings VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET whitelist_role_id=excluded.whitelist_role_id').run(id,roleId);res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});
}
module.exports={Store,verifyPassword,canAccess,mount};
