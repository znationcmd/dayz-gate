const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { grantWhitelistRole, removeWhitelistRole } = require("./bot");
const nitrado = require("./nitrado");
const founders=require("./founders");
const isVerifiedCmdCofounder=(id)=>/^\d{15,22}$/.test(String(id||''))&&String(process.env.CMD_FOUNDER_DISCORD_IDS||'').split(/[\s,;]+/).includes(String(id));
const radio=require('./radio');
const premium=require('./premium');
const topServers=require('./top-servers');
const fileValidator=require('./file-validator');
const community=require('./community');
const {client}=require("./bot");
const {ChannelType,PermissionFlagsBits}=require("discord.js");

function verifyDiscordBridgeToken(token){
  const secret=String(process.env.DISCORD_BRIDGE_SECRET||'');
  if(secret.length<32)throw Object.assign(new Error('Passerelle Discord non configurée'),{status:503});
  const parts=String(token||'').split('.');
  if(parts.length!==2)throw Object.assign(new Error('Connexion Discord invalide'),{status:401});
  const [payload,sig]=parts;
  const expected=crypto.createHmac('sha256',secret).update(payload).digest('base64url');
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))throw Object.assign(new Error('Connexion Discord invalide'),{status:401});
  let data;try{data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'))}catch{throw Object.assign(new Error('Connexion Discord invalide'),{status:401})}
  if(data?.v!==1||!data?.user?.id||!Array.isArray(data.guilds)||Number(data.exp)<Date.now())throw Object.assign(new Error('Connexion Discord expirée'),{status:401});
  data.guilds=data.guilds.filter(g=>/^\d{15,22}$/.test(String(g.id||''))).slice(0,100).map(g=>({id:String(g.id),name:String(g.name||g.id).slice(0,100),icon:g.icon?'https://cdn.discordapp.com/icons/'+g.id+'/'+g.icon+'.webp?size=128':null,owner:Boolean(g.owner),permissions:String(g.permissions||'0'),installed:false,memberCount:0}));
  return data;
}

function cmdMcpGuard(req,res,next){
  const secret=String(process.env.CMD_MCP_SECRET||'');
  const supplied=String(req.get('x-cmd-mcp-secret')||'');
  if(secret.length<32||supplied.length!==secret.length)return res.status(401).json({error:'Accès MCP refusé'});
  const ok=crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(secret));
  if(!ok)return res.status(401).json({error:'Accès MCP refusé'});
  next();
}
const discordChannelTypes={text:ChannelType.GuildText,voice:ChannelType.GuildVoice,category:ChannelType.GuildCategory,announcement:ChannelType.GuildAnnouncement,forum:ChannelType.GuildForum};
const channelTypeLabel=t=>Object.entries(discordChannelTypes).find(([,v])=>v===t)?.[0]||String(t);
async function cmdGuild(id){
  if(!client.isReady())throw Object.assign(new Error('Bot Discord non connecté'),{status:503});
  const g=await client.guilds.fetch(String(id));
  if(!g)throw Object.assign(new Error('Discord introuvable'),{status:404});
  return g;
}
async function cmdStructure(id){
  const g=await cmdGuild(id);await g.channels.fetch();await g.roles.fetch();
  const me=await g.members.fetchMe().catch(()=>null);
  return {
    id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,memberCount:g.memberCount||0,
    bot:{id:client.user?.id||null,name:client.user?.username||null,highestRolePosition:me?.roles?.highest?.position??null},
    channels:[...g.channels.cache.values()].map(ch=>({id:ch.id,name:ch.name,type:channelTypeLabel(ch.type),typeId:ch.type,parentId:ch.parentId||null,position:ch.rawPosition??ch.position??0,topic:'topic'in ch?(ch.topic||null):null})).sort((a,b)=>a.position-b.position||a.name.localeCompare(b.name,'fr')),
    roles:[...g.roles.cache.values()].map(r=>({id:r.id,name:r.name,color:r.hexColor,position:r.position,hoist:r.hoist,mentionable:r.mentionable,managed:r.managed,permissions:r.permissions.bitfield.toString(),everyone:r.id===g.id})).sort((a,b)=>b.position-a.position)
  };
}

function cmdSerializeMessage(m){
  return {
    id:String(m.id),channelId:String(m.channelId||''),guildId:m.guildId?String(m.guildId):null,
    content:String(m.content||''),timestamp:m.createdAt?.toISOString?.()||null,editedTimestamp:m.editedAt?.toISOString?.()||null,
    author:{id:String(m.author?.id||''),username:String(m.member?.displayName||m.author?.globalName||m.author?.username||'Utilisateur'),tag:String(m.author?.username||''),bot:Boolean(m.author?.bot),avatar:m.author?.displayAvatarURL?.({extension:'webp',size:128})||null},
    attachments:[...(m.attachments?.values?.()||[])].map(a=>({id:String(a.id),filename:a.name||a.filename||'fichier',url:a.url,proxyUrl:a.proxyURL||null,contentType:a.contentType||null,size:Number(a.size||0),width:a.width??null,height:a.height??null,description:a.description||null})),
    embeds:(m.embeds||[]).map(e=>e.toJSON?e.toJSON():e),
    stickers:[...(m.stickers?.values?.()||[])].map(st=>({id:String(st.id),name:st.name,formatType:st.format})),
    reactions:[...(m.reactions?.cache?.values?.()||[])].map(r=>({count:Number(r.count||0),me:Boolean(r.me),emoji:{id:r.emoji?.id||null,name:r.emoji?.name||null,animated:Boolean(r.emoji?.animated)}})),
    mentions:[...(m.mentions?.users?.values?.()||[])].map(u=>({id:String(u.id),username:String(u.globalName||u.username||'Utilisateur'),avatar:u.displayAvatarURL?.({extension:'webp',size:128})||null})),
    mentionRoles:[...(m.mentions?.roles?.keys?.()||[])].map(String),pinned:Boolean(m.pinned),tts:Boolean(m.tts),type:Number(m.type||0),
    reference:m.reference?{messageId:m.reference.messageId||null,channelId:m.reference.channelId||null,guildId:m.reference.guildId||null}:null,
    referencedMessage:m.reference&&m.reference.messageId&&m.channel?.messages?null:null,
    contentIntentEnabled:process.env.DISCORD_MESSAGE_CONTENT==='true'
  };
}
async function cmdMessages(guildId,channelId,before,limit=100){
  const g=await cmdGuild(guildId);const ch=await g.channels.fetch(String(channelId||''));
  if(!ch||String(ch.guildId||'')!==String(g.id)||!ch.isTextBased?.()||!ch.messages)throw Object.assign(new Error('Salon texte introuvable ou inaccessible'),{status:404});
  const n=Math.max(1,Math.min(100,Number(limit)||100)),opts={limit:n};if(before&&/^\d{15,22}$/.test(String(before)))opts.before=String(before);
  const rows=await ch.messages.fetch(opts);const arr=[...rows.values()];
  return {channel:{id:ch.id,name:ch.name||ch.id,type:channelTypeLabel(ch.type),topic:'topic'in ch?(ch.topic||null):null,parentId:ch.parentId||null},messages:arr.map(cmdSerializeMessage),hasMore:arr.length===n,nextBefore:arr.length?arr[arr.length-1].id:null,contentIntentEnabled:process.env.DISCORD_MESSAGE_CONTENT==='true'};
}

function cmdSerializeWebhook(w){
  const owner=w.owner||w.user||null;
  return {id:String(w.id),guildId:w.guildId?String(w.guildId):null,channelId:w.channelId?String(w.channelId):null,name:String(w.name||'Webhook'),avatar:w.avatarURL?.({extension:'webp',size:128})||null,type:Number(w.type||1),creator:owner?{id:String(owner.id||''),username:String(owner.globalName||owner.username||owner.tag||'Discord')}:null};
}
async function cmdWebhooks(guildId){
  const g=await cmdGuild(guildId);const rows=await g.fetchWebhooks();
  return {guildId:g.id,webhooks:[...rows.values()].map(cmdSerializeWebhook).sort((a,b)=>a.name.localeCompare(b.name,'fr'))};
}

function cmdPlain(v){
  try{return JSON.parse(JSON.stringify(v,(k,x)=>typeof x==='bigint'?x.toString():x))}catch{return null}
}
function cmdIntegrationRow(i){
  const app=i.application||null,user=i.user||null;
  return {id:String(i.id||''),name:String(i.name||''),type:String(i.type||''),enabled:i.enabled!==false,roleId:i.role?.id||i.roleId||null,
    user:user?{id:String(user.id||''),username:String(user.globalName||user.username||user.tag||'Utilisateur'),bot:Boolean(user.bot)}:null,
    application:app?{id:String(app.id||''),name:String(app.name||''),bot:app.bot?{id:String(app.bot.id||''),username:String(app.bot.username||''),avatar:app.bot.displayAvatarURL?.({extension:'webp',size:128})||null}:null}:null,
    scopes:Array.isArray(i.scopes)?i.scopes:[]};
}
async function cmdThreadSnapshot(g){
  const by=new Map();
  try{const active=await g.channels.fetchActiveThreads();for(const t of active.threads.values())by.set(t.id,t)}catch{}
  return [...by.values()].map(t=>({id:String(t.id),name:String(t.name||t.id),type:'thread',typeId:t.type,parentId:t.parentId||null,ownerId:t.ownerId||null,
    archived:Boolean(t.archived),locked:Boolean(t.locked),autoArchiveDuration:t.autoArchiveDuration??null,createdTimestamp:t.createdTimestamp||null,archiveTimestamp:t.archiveTimestamp||null}));
}
async function cmdExtras(guildId){
  const g=await cmdGuild(guildId);await g.fetch().catch(()=>{});
  const errors={};const take=async(name,fn,fallback)=>{try{return await fn()}catch(e){errors[name]=e.message;return fallback}};
  const integrations=await take('integrations',async()=>[...(await g.fetchIntegrations()).values()].map(cmdIntegrationRow),[]);
  const botIds=[...new Set(integrations.flatMap(i=>[i.user?.bot&&i.user?.id,i.application?.bot?.id]).filter(Boolean).map(String))];
  const bots=[];
  for(const id of botIds){
    const m=await g.members.fetch(id).catch(()=>null);if(!m)continue;
    bots.push({id:String(id),username:String(m.user?.globalName||m.user?.username||id),avatar:m.user?.displayAvatarURL?.({extension:'webp',size:128})||null,nickname:m.nickname||null,
      roles:[...m.roles.cache.values()].map(r=>({id:String(r.id),name:r.name,position:r.position})),permissions:m.permissions?.bitfield?.toString?.()||null});
  }
  const autoModeration=await take('autoModeration',async()=>[...(await g.autoModerationRules.fetch()).values()].map(x=>cmdPlain(x.toJSON?x.toJSON():x)),[]);
  const scheduledEvents=await take('scheduledEvents',async()=>[...(await g.scheduledEvents.fetch()).values()].map(x=>cmdPlain(x.toJSON?x.toJSON():x)),[]);
  const emojis=await take('emojis',async()=>[...(await g.emojis.fetch()).values()].map(e=>({id:String(e.id),name:e.name,animated:Boolean(e.animated),url:e.imageURL?.({extension:e.animated?'gif':'webp',size:128})||null})),[]);
  const stickers=await take('stickers',async()=>[...(await g.stickers.fetch()).values()].map(st=>({id:String(st.id),name:st.name,description:st.description||null,tags:st.tags||null,format:Number(st.format),url:st.url||null})),[]);
  const threads=await take('threads',async()=>await cmdThreadSnapshot(g),[]);
  return {guild:{id:g.id,name:g.name,description:g.description||null,icon:g.iconURL({extension:'webp',size:256})||null,banner:g.bannerURL?.({extension:'webp',size:1024})||null,splash:g.splashURL?.({extension:'webp',size:1024})||null,
    ownerId:g.ownerId||null,memberCount:g.memberCount||0,verificationLevel:Number(g.verificationLevel||0),preferredLocale:g.preferredLocale||null,premiumTier:Number(g.premiumTier||0),features:[...(g.features||[])]},
    integrations,bots,autoModeration,scheduledEvents,emojis,stickers,threads,errors};
}

function permissionObject(allow=[],deny=[]){
  const out={};
  for(const name of allow){if(!(name in PermissionFlagsBits))throw Object.assign(new Error('Permission Discord inconnue: '+name),{status:400});out[name]=true}
  for(const name of deny){if(!(name in PermissionFlagsBits))throw Object.assign(new Error('Permission Discord inconnue: '+name),{status:400});out[name]=false}
  return out;
}
async function cmdAction(body){
  const g=await cmdGuild(body.guildId);const action=String(body.action||'');
  if(action==='create_category'){
    const ch=await g.channels.create({name:String(body.name||'Nouvelle catégorie').slice(0,100),type:ChannelType.GuildCategory,position:Number.isFinite(Number(body.position))?Number(body.position):undefined,reason:'CMD Discord MCP'});
    return {ok:true,channel:{id:ch.id,name:ch.name,type:'category',position:ch.position}};
  }
  if(action==='create_channel'){
    const type=discordChannelTypes[String(body.type||'text')];if(type===undefined)throw Object.assign(new Error('Type de salon invalide'),{status:400});
    const ch=await g.channels.create({name:String(body.name||'nouveau-salon').slice(0,100),type,parent:body.parentId||undefined,topic:body.topic&&type===ChannelType.GuildText?String(body.topic).slice(0,1024):undefined,position:Number.isFinite(Number(body.position))?Number(body.position):undefined,reason:'CMD Discord MCP'});
    return {ok:true,channel:{id:ch.id,name:ch.name,type:channelTypeLabel(ch.type),parentId:ch.parentId||null,position:ch.position}};
  }
  if(action==='update_channel'){
    const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)throw Object.assign(new Error('Salon introuvable'),{status:404});
    const edit={reason:'CMD Discord MCP'};if(body.name!==undefined)edit.name=String(body.name).slice(0,100);if(body.parentId!==undefined)edit.parent=body.parentId||null;if(body.topic!==undefined&&'setTopic'in ch)edit.topic=body.topic?String(body.topic).slice(0,1024):null;
    await ch.edit(edit);if(body.position!==undefined)await ch.setPosition(Number(body.position),{reason:'CMD Discord MCP'});
    return {ok:true,channel:{id:ch.id,name:ch.name,parentId:ch.parentId||null,position:ch.position}};
  }
  if(action==='delete_channel'){
    const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)throw Object.assign(new Error('Salon introuvable'),{status:404});
    const result={id:ch.id,name:ch.name};await ch.delete('CMD Discord MCP');return {ok:true,deleted:result};
  }
  if(action==='create_role'){
    const opts={name:String(body.name||'Nouveau rôle').slice(0,100),hoist:Boolean(body.hoist),mentionable:Boolean(body.mentionable),reason:'CMD Discord MCP'};
    if(body.color)opts.color=String(body.color);if(body.permissions!==undefined)opts.permissions=BigInt(String(body.permissions));
    const role=await g.roles.create(opts);if(body.position!==undefined)await role.setPosition(Number(body.position),{reason:'CMD Discord MCP'});
    return {ok:true,role:{id:role.id,name:role.name,color:role.hexColor,position:role.position}};
  }
  if(action==='update_role'){
    const role=await g.roles.fetch(String(body.roleId||''));if(!role||role.id===g.id)throw Object.assign(new Error('Rôle introuvable ou protégé'),{status:404});
    const opts={reason:'CMD Discord MCP'};if(body.name!==undefined)opts.name=String(body.name).slice(0,100);if(body.color!==undefined)opts.color=body.color?String(body.color):null;if(body.hoist!==undefined)opts.hoist=Boolean(body.hoist);if(body.mentionable!==undefined)opts.mentionable=Boolean(body.mentionable);if(body.permissions!==undefined)opts.permissions=BigInt(String(body.permissions));
    await role.edit(opts);if(body.position!==undefined)await role.setPosition(Number(body.position),{reason:'CMD Discord MCP'});
    return {ok:true,role:{id:role.id,name:role.name,color:role.hexColor,position:role.position}};
  }
  if(action==='delete_role'){
    const role=await g.roles.fetch(String(body.roleId||''));if(!role||role.id===g.id)throw Object.assign(new Error('Rôle introuvable ou protégé'),{status:404});
    const result={id:role.id,name:role.name};await role.delete('CMD Discord MCP');return {ok:true,deleted:result};
  }
  if(action==='set_channel_permissions'){
    const ch=await g.channels.fetch(String(body.channelId||''));if(!ch)throw Object.assign(new Error('Salon introuvable'),{status:404});
    const target=body.targetType==='member'?await g.members.fetch(String(body.targetId||'')):await g.roles.fetch(String(body.targetId||''));
    if(!target)throw Object.assign(new Error('Rôle ou membre introuvable'),{status:404});
    await ch.permissionOverwrites.edit(target,permissionObject(body.allow||[],body.deny||[]),{reason:'CMD Discord MCP'});
    return {ok:true,channelId:ch.id,targetId:String(body.targetId)};
  }
  if(action==='send_message'){
    const ch=await g.channels.fetch(String(body.channelId||''));if(!ch||String(ch.guildId||'')!==String(g.id)||!ch.isTextBased?.())throw Object.assign(new Error('Salon texte introuvable ou inaccessible'),{status:404});
    const content=String(body.content||'').trim().slice(0,2000);if(!content)throw Object.assign(new Error('Message vide'),{status:400});
    const options={content,allowedMentions:{parse:['users','roles'],repliedUser:false}};if(body.replyTo&&/^\d{15,22}$/.test(String(body.replyTo)))options.reply={messageReference:String(body.replyTo),failIfNotExists:false};
    const m=await ch.send(options);return {ok:true,message:cmdSerializeMessage(m),sentAsBot:true};
  }
  throw Object.assign(new Error('Action MCP inconnue'),{status:400});
}

function buildDashboard() {
  const scopeId=req=>req.session.selectedGuildId||req.session.guildId||'owner';
  const app = express();
  // Express 4 does not catch rejected promises from async route handlers.
  for (const method of ['get', 'post', 'delete']) {
    const register = app[method].bind(app);
    app[method] = (route, ...handlers) => handlers.length === 0 ? register(route) : register(route, ...handlers.map(handler => (req, res, next) => {
      Promise.resolve().then(() => handler(req, res, next)).catch(next);
    }));
  }

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({limit:'6mb'}));
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || "change-me",
    store: new founders.Store(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 30
    }
  }));

  const appleIcon=Buffer.from("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","base64");
  app.get("/dayz-gate-apple-180.jpg",async (req,res)=>{res.set("Cache-Control","no-store");res.type("jpg").send(appleIcon)});
  app.use(express.static(path.join(__dirname,"public"),{etag:true,maxAge:"5m"}));

  const mustBeLoggedIn = async (req, res, next) => {
    if (req.session?.admin) {
      if(req.session.authMethod==='discord'&&!isVerifiedCmdCofounder(req.session.discordUserId)&&Date.now()-(req.session.discordVerifiedAt||0)>60000){
        const targetGuild=req.session.selectedGuildId||req.session.guildId;
        if(targetGuild){
          try{const guild=await client.guilds.fetch(targetGuild);const member=await guild.members.fetch(req.session.discordUserId);if(guild.ownerId!==req.session.discordUserId&&!member.permissions.has(32n)&&!member.permissions.has(8n))throw Error('Droits retirés');req.session.discordVerifiedAt=Date.now()}catch{return res.status(403).json({error:'Droits fondateur Discord requis'})}
        }
      }
      if(req.session.role==='founder'&&req.session.authMethod!=='discord'&&!(await db.prepare("SELECT id FROM founder_accounts WHERE id=? AND active=1").get(req.session.accountId)))return res.status(401).json({error:"Compte désactivé"});
      return next();
    }
    if (req.path.startsWith("/auth/")) return res.redirect("/");
    res.status(401).json({ error: "Non autorisé" });
  };

  app.get("/health", async (req,res)=> {
    await db.ping();
    res.json({ ok: true, service: "dayz-gate", database: db.backend });
  });

  const loginAttempts=new Map();
  app.use((req,res,next)=>{if(['POST','DELETE','PUT','PATCH'].includes(req.method)&&req.headers.origin){try{if(new URL(req.headers.origin).host!==req.get('host'))return res.status(403).json({error:'Origine non autorisée'})}catch{return res.status(403).json({error:'Origine non autorisée'})}}next()});
  app.use((req,res,next)=>nitrado.withScope(req.session.role==='founder'?req.session.guildId:(req.session.selectedGuildId||'owner'),next));
  founders.mount(app,mustBeLoggedIn,client);
  radio.mount(app,mustBeLoggedIn,client);
  premium.mount(app,mustBeLoggedIn);
  community.mount(app,mustBeLoggedIn);
  app.post('/api/top-servers/register',mustBeLoggedIn,async(req,res)=>{if(req.session.role!=='owner')return res.status(403).json({error:'Réservé au propriétaire'});res.json(await topServers.register({...req.body,source_bot:'DAYZ GATE'}));});
  app.post('/api/file-validator',mustBeLoggedIn,async(req,res)=>{try{res.json(fileValidator.validateFile(String(req.body.filename||''),String(req.body.content||'')))}catch(e){res.status(400).json({error:e.message})}});
  app.get('/api/logs',mustBeLoggedIn,async(req,res)=>{
    const gid=scopeId(req),limit=Math.max(20,Math.min(500,Number(req.query.limit)||200));
    const activity=await db.prepare('SELECT * FROM dayz_activity_logs WHERE guild_id=? ORDER BY occurred_at DESC LIMIT ?').all(gid,limit);
    const construction=await db.prepare('SELECT * FROM dayz_construction_logs WHERE guild_id=? ORDER BY occurred_at DESC LIMIT ?').all(gid,limit);
    res.json({activity,construction});
  });
  app.get('/api/mods',mustBeLoggedIn,async(req,res)=>res.json(await db.prepare('SELECT * FROM dayz_mods WHERE guild_id=? ORDER BY name').all(scopeId(req))));
  app.post('/api/mods',mustBeLoggedIn,async(req,res)=>{
    const workshopId=String(req.body.workshopId||'').trim(),name=String(req.body.name||'').trim().slice(0,120),notes=String(req.body.notes||'').trim().slice(0,500);
    if(!/^\d{5,20}$/.test(workshopId)||!name)return res.status(400).json({error:'Workshop ID et nom requis'});
    const id=crypto.randomUUID(),gid=scopeId(req);
    await db.prepare("INSERT INTO dayz_mods(id,guild_id,workshop_id,name,notes) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,workshop_id) DO UPDATE SET name=excluded.name,notes=excluded.notes,enabled=1").run(id,gid,workshopId,name,notes);
    res.json(await db.prepare('SELECT * FROM dayz_mods WHERE guild_id=? AND workshop_id=?').get(gid,workshopId));
  });
  app.delete('/api/mods/:id',mustBeLoggedIn,async(req,res)=>{await db.prepare('DELETE FROM dayz_mods WHERE guild_id=? AND id=?').run(scopeId(req),req.params.id);res.json({ok:true})});
  app.get('/api/community-settings',mustBeLoggedIn,async(req,res)=>{
    const gid=scopeId(req),row=await db.prepare('SELECT * FROM guild_settings WHERE guild_id=?').get(gid);
    res.json(row||{guild_id:gid,whitelist_role_id:''});
  });
  app.post('/api/community-settings',mustBeLoggedIn,async(req,res)=>{
    const gid=scopeId(req),role=String(req.body.whitelistRoleId||'').trim();
    if(role&&!/^\d{15,25}$/.test(role))return res.status(400).json({error:'ID rôle Discord invalide'});
    await db.prepare('INSERT INTO guild_settings(guild_id,whitelist_role_id) VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET whitelist_role_id=excluded.whitelist_role_id').run(gid,role);
    res.json({ok:true,guild_id:gid,whitelist_role_id:role});
  });
  app.post('/api/login',async (req,res)=>{
    const key=req.ip;const now=Date.now();if(loginAttempts.size>2000)for(const [ip,item] of loginAttempts)if(now-item.time>900000)loginAttempts.delete(ip);const tries=loginAttempts.get(key)||{count:0,time:now};if(now-tries.time>900000){tries.count=0;tries.time=now}if(tries.count>=10)return res.status(429).json({error:'Réessaie dans 15 minutes'});tries.count++;loginAttempts.set(key,tries);
    const {username,password}=req.body;if(typeof username!=='string'||typeof password!=='string'||password.length>128)return res.status(401).json({error:'Identifiants incorrects'});
    let account=null;const owner=process.env.DASHBOARD_USER&&process.env.DASHBOARD_PASSWORD&&username===process.env.DASHBOARD_USER&&password===process.env.DASHBOARD_PASSWORD;
    if(!owner){account=(await db.prepare('SELECT * FROM founder_accounts WHERE username=? AND active=1').get(username));if(!account||!founders.verifyPassword(password,account.password_hash))return res.status(401).json({error:'Identifiants incorrects'})}
    req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Connexion impossible'});req.session.admin=username;req.session.role=owner?'owner':'founder';if(account){req.session.guildId=account.guild_id;req.session.accountId=account.id}loginAttempts.delete(key);req.session.save(()=>res.json({ok:true}))});
  });

  app.post("/api/logout", async (req,res)=> {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/auth/discord-account", async (req,res)=> {
    try{
      const bridge=new URL(process.env.DISCORD_ACCOUNT_BRIDGE_URL||"https://dashboard-production-e07b.up.railway.app/api/mod-auth/login");
      bridge.searchParams.set("bridge",req.protocol+"://"+req.get("host"));
      res.redirect(bridge.toString());
    }catch{return res.redirect("/")}
  });
  app.get("/auth/discord-bridge", async (req,res)=> {
    try{
      const data=verifyDiscordBridgeToken(req.query.token);
      if(req.session.authMethod==='discord'&&req.session.discordUserId&&String(req.session.discordUserId)!==String(data.user.id))return res.status(403).send('Compte Discord différent de la session.');
      const installed=client.isReady()?[...client.guilds.cache.values()]:[];
      const manageable=new Set(data.guilds.map(g=>String(g.id)));
      const firstInstalled=installed.find(g=>manageable.has(String(g.id)))||null;
      if(!req.session?.admin)await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));
      req.session.admin=true;
      req.session.role=isVerifiedCmdCofounder(data.user.id)||req.session.role==='owner'?'owner':'founder';
      req.session.authMethod='discord';
      req.session.discordUserId=String(data.user.id);
      req.session.discordVerifiedAt=Date.now();
      req.session.discordAccountUserId=String(data.user.id);
      req.session.discordAccountName=String(data.user.name||"Discord").slice(0,100);
      req.session.discordAccountGuilds=data.guilds;
      req.session.discordAccountLinkedAt=Date.now();
      if(firstInstalled){
        req.session.guildId=firstInstalled.id;
        req.session.selectedGuildId=firstInstalled.id;
      }
      req.session.save(()=>res.redirect("/"));
    }catch(e){res.status(e.status||401).send(e.message||"Connexion Discord invalide")}
  });
  app.get("/api/me", async (req,res)=> {
    const active=req.session.role!=="founder"||req.session.authMethod==="discord"||Boolean((await db.prepare("SELECT id FROM founder_accounts WHERE id=? AND active=1").get(req.session.accountId)));
    const loggedIn=Boolean(req.session?.admin)&&active;
    let guilds=[];
    const linked=loggedIn&&Array.isArray(req.session.discordAccountGuilds)&&req.session.discordAccountGuilds.length?req.session.discordAccountGuilds:[];
    if(loggedIn&&client.isReady()){
      const installed=[...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,ownerId:g.ownerId,memberCount:g.memberCount||0,installed:true})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
      if(linked.length&&(req.session.role==='owner'||!req.session.discordUserId||String(req.session.discordUserId)===String(req.session.discordAccountUserId))){
        const live=new Map(installed.map(g=>[String(g.id),g]));
        guilds=linked.map(g=>live.has(String(g.id))?{...g,...live.get(String(g.id)),installed:true}:{...g,installed:false,memberCount:0}).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
      }else if(req.session.role==='owner')guilds=installed;
      else if(req.session.authMethod==='discord'&&req.session.discordUserId){
        for(const g of installed){
          try{
            const guild=client.guilds.cache.get(g.id)||await client.guilds.fetch(g.id);
            const member=await guild.members.fetch(req.session.discordUserId);
            if(guild.ownerId===req.session.discordUserId||member.permissions.has(32n)||member.permissions.has(8n))guilds.push(g);
          }catch{}
        }
      }else guilds=installed.filter(g=>g.id===(req.session.selectedGuildId||req.session.guildId));
    }else if(loggedIn&&linked.length)guilds=linked.map(g=>({...g,installed:false,memberCount:0}));
    const preferred=req.session.selectedGuildId||req.session.guildId;
    const selected=(guilds.find(g=>String(g.id)===String(preferred)&&g.installed!==false)||guilds.find(g=>g.installed!==false))?.id||null;
    res.json({ loggedIn,role:req.session.role||"owner",guildId:req.session.guildId||null,selectedGuildId:selected,guilds,discordLinked:Boolean(req.session.discordAccountLinkedAt),discordAccountUrl:"/auth/discord-account" });
  });
  app.post("/api/guild/select", mustBeLoggedIn, async (req,res)=> {
    const id=String(req.body?.id||'');
    const guild=client.isReady()?client.guilds.cache.get(id):null;
    if(!guild)return res.status(404).json({error:'Ce Discord n’est pas installé sur DAYZ GATE.'});
    if(req.session.role!=='owner'){
      if(req.session.authMethod!=='discord'||!req.session.discordUserId)return res.status(403).json({error:'Accès refusé à ce Discord.'});
      try{
        const member=await guild.members.fetch(req.session.discordUserId);
        if(guild.ownerId!==req.session.discordUserId&&!member.permissions.has(32n)&&!member.permissions.has(8n))return res.status(403).json({error:'Droits fondateur nécessaires sur ce Discord.'});
      }catch{return res.status(403).json({error:'Accès refusé à ce Discord.'})}
    }
    req.session.selectedGuildId=id;
    req.session.save(()=>res.json({ok:true,id,name:guild.name,icon:guild.iconURL({extension:'webp',size:128})||null}));
  });

  app.get("/api/cmd-discord/guilds",cmdMcpGuard,async(req,res)=>{if(!client.isReady())return res.status(503).json({error:'Bot Discord non connecté'});res.json([...client.guilds.cache.values()].map(g=>({id:g.id,name:g.name,icon:g.iconURL({extension:'webp',size:128})||null,memberCount:g.memberCount||0})).sort((a,b)=>a.name.localeCompare(b.name,'fr')))});
  app.get("/api/cmd-discord/invite",cmdMcpGuard,async(req,res)=>{const clientId=String(process.env.DISCORD_CLIENT_ID||client.user?.id||"");if(!clientId)return res.status(503).json({error:"Client ID Discord absent"});const url=String(process.env.DISCORD_INVITE_URL||"")||`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=268454928&integration_type=0&scope=bot%20applications.commands`;res.json({bot:"dayz",name:"DAYZ GATE",clientId,url})});
  app.get("/api/cmd-discord/structure",cmdMcpGuard,async(req,res)=>res.json(await cmdStructure(req.query.guildId)));
  app.get("/api/cmd-discord/messages",cmdMcpGuard,async(req,res)=>res.json(await cmdMessages(req.query.guildId,req.query.channelId,req.query.before||'',req.query.limit||100)));
  app.get("/api/cmd-discord/webhooks",cmdMcpGuard,async(req,res)=>res.json(await cmdWebhooks(req.query.guildId)));
  app.get("/api/cmd-discord/extras",cmdMcpGuard,async(req,res)=>res.json(await cmdExtras(req.query.guildId)));
  app.post("/api/cmd-discord/action",cmdMcpGuard,async(req,res)=>res.json(await cmdAction(req.body||{})));

  app.get("/api/public-config", async (req,res)=> {
    const clientId=process.env.DISCORD_CLIENT_ID||"";
    const botInstallUrl=clientId?`https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&permissions=268454928&integration_type=0&scope=bot%20applications.commands`:"";
    res.json({ discordInviteUrl: process.env.DISCORD_INVITE_URL || "", botInstallUrl });
  });

  // ---------- NITRADO OAUTH ----------
  app.get("/auth/nitrado/start", mustBeLoggedIn, async (req,res)=> {
    try {
      const state = crypto.randomBytes(24).toString("hex");
      req.session.nitradoOauthState = state;
      res.redirect(nitrado.buildAuthorizationUrl(state));
    } catch (err) {
      res.status(500).send(`Configuration Nitrado incomplète : ${err.message}`);
    }
  });

  app.get("/auth/nitrado/callback", mustBeLoggedIn, async (req, res) => {
    try {
      if (!req.query.code) throw new Error("Code OAuth manquant");
      if (!req.query.state || req.query.state !== req.session.nitradoOauthState) {
        throw new Error("État OAuth invalide");
      }
      delete req.session.nitradoOauthState;
      await nitrado.exchangeCode(String(req.query.code));
      res.redirect("/?nitrado=connected#nitrado");
    } catch (err) {
      console.error("OAuth Nitrado:", err);
      res.redirect(`/?nitrado=error&message=${encodeURIComponent(err.message)}#nitrado`);
    }
  });

  app.get("/api/nitrado/status", mustBeLoggedIn, async (req, res) => {
    const status = await nitrado.getConnectionStatus();
    if (!status.connected) return res.json(status);
    try {
      const user = await nitrado.getUser();
      res.json({ ...status, user: { id: user.id, username: user.username || user.name || "Nitrado" } });
    } catch (err) {
      res.json({ ...status, apiError: err.message });
    }
  });

  app.get("/api/nitrado/services", mustBeLoggedIn, async (req, res) => {
    try {
      const services = await nitrado.getServices();
      res.json(services.map(s => ({
        id: s.id,
        type: s.type || "service",
        status: s.status || "",
        username: s.username || "",
        details: s.details || {},
        label: s.details?.name || s.details?.game || s.username || `${s.type || "Service"} #${s.id}`
      })));
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  app.post("/api/nitrado/select", mustBeLoggedIn, async (req,res)=> {
    const { serviceId, serviceLabel, whitelistFile } = req.body;
    if (!serviceId) return res.status(400).json({ error: "Service Nitrado manquant" });
    await premium.registerServer(premium.scope(req),premium.user(req),serviceLabel||('DayZ #'+serviceId),serviceId,req.session.role==='owner');
    await nitrado.selectServer(serviceId, serviceLabel, whitelistFile);
    res.json({ ok: true, selected: (await nitrado.getConnectionStatus()).selected });
  });

  app.post("/api/nitrado/disconnect", mustBeLoggedIn, async (req,res)=> {
    await nitrado.disconnect();
    res.json({ ok: true });
  });

  app.get("/api/stats", mustBeLoggedIn, async (req,res)=> {
    const scoped=scopeId(req);const filter=req.session.role==='founder'?' WHERE server_name LIKE ?':'';
    const args=req.session.role==='founder'?[scoped+':%']:[];
    const count=async status=>(await db.prepare('SELECT COUNT(*) c FROM whitelist_requests'+filter+(status?(filter?' AND':' WHERE')+' status=?':'')).get(...args,...(status?[status]:[]))).c;
    const stats={total:await count(),pending:await count('pending'),approved:await count('approved'),rejected:await count('rejected')};
    res.json(stats);
  });

  app.get("/api/requests", mustBeLoggedIn, async (req,res)=> {
    const q = String(req.query.q || "").trim();
    const params=[];const conditions=[];
    if(req.session.role==='founder'){conditions.push('server_name LIKE ?');params.push(scopeId(req)+':%')}
    if(q){conditions.push('(game_name LIKE ? OR discord_username LIKE ? OR platform LIKE ? OR server_name LIKE ?)');params.push(...Array(4).fill('%'+q+'%'))}
    const rows=(await db.prepare('SELECT * FROM whitelist_requests'+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY id DESC').all(...params));
    res.json(rows);
  });

  app.post("/api/requests/:id/approve", mustBeLoggedIn, async (req, res) => {
    const row = (await db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id));
    if (!row || !founders.canAccess(req,row)) return res.status(404).json({ error: "Demande introuvable" });

    let syncStatus = "not_applicable";
    let syncMessage = "Validation Discord uniquement";

    // Nitrado documente l'automatisation fichier pour DayZ PC.
    // Sur console, on garde la validation dans DayZ Gate sans prétendre à une API non documentée.
    if (row.platform === "PC" && (req.session.role==='founder'||req.session.selectedGuildId===row.server_name.split(":")[0]) && (await nitrado.getConnectionStatus()).connected && (await nitrado.getConnectionStatus()).selected.serviceId) {
      try {
        const result = await nitrado.addPcWhitelistEntry(row.game_name);
        syncStatus = result.changed ? "synced" : "already_present";
        syncMessage = result.message;
      } catch (err) {
        syncStatus = "error";
        syncMessage = err.message;
        console.error("Sync whitelist Nitrado :", err);
      }
    } else if (row.platform !== "PC") {
      syncStatus = "console_manual";
      syncMessage = "Console : validation enregistrée, gestion whitelist via l’interface Nitrado";
    }

    (await db.prepare(`
      UPDATE whitelist_requests
      SET status='approved', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
          nitrado_sync_status=?, nitrado_sync_message=?
      WHERE id=?
    `).run(req.session.admin, syncStatus, syncMessage, req.params.id));

    try { await grantWhitelistRole(row.discord_user_id,row.server_name.split(":")[0]); }
    catch (e) { console.error("Impossible d'attribuer le rôle Discord :", e.message); }

    res.json({ ok: true, nitrado: { status: syncStatus, message: syncMessage } });
  });

  app.post("/api/requests/:id/reject", mustBeLoggedIn, async (req, res) => {
    const row = (await db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id));
    if (!row || !founders.canAccess(req,row)) return res.status(404).json({ error: "Demande introuvable" });

    (await db.prepare(`
      UPDATE whitelist_requests
      SET status='rejected', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
          nitrado_sync_status='not_applicable', nitrado_sync_message='Demande refusée'
      WHERE id=?
    `).run(req.session.admin, req.params.id));

    try { await removeWhitelistRole(row.discord_user_id,row.server_name.split(":")[0]); }
    catch (e) { console.error("Impossible de retirer le rôle Discord :", e.message); }

    res.json({ ok: true });
  });

  app.delete("/api/requests/:id", mustBeLoggedIn, async (req, res) => {
    const row = (await db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id));
    if (!row || !founders.canAccess(req,row)) return res.status(404).json({ error: "Demande introuvable" });
    (await db.prepare("DELETE FROM whitelist_requests WHERE id=?").run(req.params.id));
    try { await removeWhitelistRole(row.discord_user_id,row.server_name.split(":")[0]); }
    catch (e) { console.error("Impossible de retirer le rôle Discord :", e.message); }
    res.json({ ok: true });
  });

  app.use((err, req, res, next) => {
    console.error('Erreur Dashboard :', err.code || err.name);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'Opération impossible, réessaie dans un instant.' });
  });
  return app;
}

module.exports = buildDashboard;

