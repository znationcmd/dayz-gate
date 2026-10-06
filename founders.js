const crypto=require('crypto');
const db=require('./db');
const session=require('express-session');
let lastSessionCleanup=0;
async function cleanupSessions(){const now=Date.now();if(now-lastSessionCleanup<15*60*1000)return;lastSessionCleanup=now;await db.prepare('DELETE FROM dashboard_sessions WHERE expires_at<?').run(now)}

function hashPassword(password){const salt=crypto.randomBytes(16).toString('hex');return salt+':'+crypto.scryptSync(password,salt,64).toString('hex')}
function verifyPassword(password,hash){try{const [salt,key]=hash.split(':');const input=crypto.scryptSync(password,salt,64);const expected=Buffer.from(key,'hex');return input.length===expected.length&&crypto.timingSafeEqual(input,expected)}catch{return false}}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex')}
class Store extends session.Store{
 async get(sid,cb){try{const row=(await db.prepare('SELECT data FROM dashboard_sessions WHERE sid=? AND expires_at>?').get(sid,Date.now()));cb(null,row?JSON.parse(row.data):null)}catch(e){cb(e)}}
 async set(sid,data,cb){try{const expiry=data.cookie.expires?new Date(data.cookie.expires).getTime():Date.now()+30*86400000;await db.prepare('INSERT INTO dashboard_sessions VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET data=excluded.data,expires_at=excluded.expires_at').run(sid,JSON.stringify(data),expiry);await cleanupSessions();cb?.()}catch(e){cb?.(e)}}
 async destroy(sid,cb){try{(await db.prepare('DELETE FROM dashboard_sessions WHERE sid=?').run(sid));cb?.()}catch(e){cb?.(e)}}
 async touch(sid,data,cb){try{const expiry=data.cookie?.expires?new Date(data.cookie.expires).getTime():Date.now()+30*86400000;await db.prepare('UPDATE dashboard_sessions SET expires_at=? WHERE sid=?').run(expiry,sid);await cleanupSessions();cb?.()}catch(e){cb?.(e)}}
}
function canAccess(req,row){const id=req.session.selectedGuildId||req.session.guildId;return req.session.role!=='founder'||Boolean(id&&row.server_name.startsWith(id+':'))}
function mount(app,mustLogin,client){
 const owner=(req,res,next)=>{if(req.session.role==='founder')return res.status(403).json({error:'Réservé au propriétaire DayZ Gate'});next()};
 app.post('/api/founder/discord-login',async (req,res)=>{
  const token=String(req.body.token||'');if(token.length>100)return res.status(400).json({error:'Lien invalide'});
  const row=(await db.prepare('SELECT * FROM discord_dashboard_links WHERE token_hash=? AND expires_at>?').get(tokenHash(token),Date.now()));if(!row)return res.status(401).json({error:'Lien expiré ou déjà utilisé. Relance /dashboard dans ton Discord.'});
  try{const guild=await client.guilds.fetch(row.guild_id);const member=await guild.members.fetch(row.user_id);if(guild.ownerId!==row.user_id&&!member.permissions.has(32n)&&!member.permissions.has(8n))return res.status(403).json({error:'Droits fondateur nécessaires sur ce Discord'});
   const removed=(await db.prepare('DELETE FROM discord_dashboard_links WHERE token_hash=?').run(row.token_hash));if(!removed.changes)return res.status(401).json({error:'Lien déjà utilisé'});
   req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Connexion impossible'});req.session.admin=row.username;req.session.role='founder';req.session.authMethod='discord';req.session.guildId=row.guild_id;req.session.discordUserId=row.user_id;req.session.save(()=>res.json({ok:true}))});
  }catch{return res.status(403).json({error:'Impossible de vérifier tes droits Discord. Relance /dashboard.'})}
 });
 app.post('/api/founder/choose',mustLogin,owner,async (req,res)=>{const id=String(req.body.guildId||'');if(!client.guilds.cache.has(id))return res.status(400).json({error:'Discord inconnu'});req.session.selectedGuildId=id;res.json({ok:true})});
 app.get('/api/founder/guilds',mustLogin,async (req,res)=>{
  let guilds=[...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name}));
  if(req.session.role==='founder'){
    if(req.session.authMethod==='discord'&&req.session.discordUserId){
      const allowed=[];
      for(const g of guilds){
        try{const guild=await client.guilds.fetch(g.id);const member=await guild.members.fetch(req.session.discordUserId);if(guild.ownerId===req.session.discordUserId||member.permissions.has(32n)||member.permissions.has(8n))allowed.push(g)}catch{}
      }
      guilds=allowed;
    }else guilds=guilds.filter(g=>g.id===(req.session.selectedGuildId||req.session.guildId));
  }
  res.json(guilds);
});
 app.post('/api/founder/invites',mustLogin,owner,async (req,res)=>{const guildId=String(req.body.guildId||'');if(!client.guilds.cache.has(guildId))return res.status(400).json({error:'Le bot doit être présent dans ce Discord'});const token=crypto.randomBytes(32).toString('base64url');(await db.prepare('INSERT INTO founder_invites VALUES(?,?,?,0)').run(tokenHash(token),guildId,Date.now()+48*3600000));res.json({token,expiresInHours:48})});
 app.post('/api/founder/register',async (req,res)=>{const {token,username,password}=req.body;if(!token||typeof username!=='string'||typeof password!=='string'||!/^[-\w.]{3,40}$/.test(username)||password.length<12||password.length>128)return res.status(400).json({error:'Identifiant de 3 à 40 caractères et mot de passe de 12 à 128 caractères requis'});try{await db.transaction(async ()=>{const invite=(await db.prepare('SELECT * FROM founder_invites WHERE token_hash=? AND used=0 AND expires_at>?').get(tokenHash(String(token)),Date.now()));if(!invite)throw Error('Invitation expirée ou déjà utilisée');if((await db.prepare('SELECT id FROM founder_accounts WHERE username=?').get(username))||username===process.env.DASHBOARD_USER)throw Error('Identifiant déjà utilisé');(await db.prepare('INSERT INTO founder_accounts(username,guild_id,password_hash) VALUES(?,?,?)').run(username,invite.guild_id,hashPassword(password)));if(!(await db.prepare('UPDATE founder_invites SET used=1 WHERE token_hash=? AND used=0').run(invite.token_hash)).changes)throw Error('Invitation déjà utilisée')});res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});
 app.get('/api/founder/accounts',mustLogin,owner,async (req,res)=>res.json((await db.prepare('SELECT id,username,guild_id,active FROM founder_accounts').all())));
 app.post('/api/founder/accounts/:id/disable',mustLogin,owner,async (req,res)=>{(await db.prepare('UPDATE founder_accounts SET active=0 WHERE id=?').run(req.params.id));res.json({ok:true})});
 app.get('/api/founder/settings',mustLogin,async (req,res)=>{const id=req.session.role==='founder'?(req.session.selectedGuildId||req.session.guildId):String(req.query.guildId||'');res.json((await db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(id))||{guild_id:id,whitelist_role_id:''})});
 app.post('/api/founder/settings',mustLogin,async (req,res)=>{const id=req.session.role==='founder'?(req.session.selectedGuildId||req.session.guildId):String(req.body.guildId||'');const roleId=String(req.body.roleId||'');try{const guild=await client.guilds.fetch(id);if(roleId){const role=await guild.roles.fetch(roleId);if(!role||role.id===guild.id||role.managed)throw Error('Choisis un rôle Discord valide pour la whitelist')}(await db.prepare('INSERT INTO guild_settings VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET whitelist_role_id=excluded.whitelist_role_id').run(id,roleId));res.json({ok:true})}catch(e){res.status(400).json({error:e.message})}});
}
module.exports={Store,verifyPassword,canAccess,mount};

