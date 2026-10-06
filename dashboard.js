const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { grantWhitelistRole, removeWhitelistRole } = require("./bot");
const nitrado = require("./nitrado");
const founders=require("./founders");
const radio=require('./radio');
const {client}=require("./bot");

function buildDashboard() {
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
  app.use(express.json());
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
  app.use(express.static(path.join(__dirname,"public"),{etag:false,maxAge:0,setHeaders:r=>r.set("Cache-Control","no-store")}));

  const mustBeLoggedIn = async (req, res, next) => {
    if (req.session?.admin) {
      if(req.session.authMethod==='discord'&&Date.now()-(req.session.discordVerifiedAt||0)>60000){
        try{const guild=await client.guilds.fetch(req.session.guildId);const member=await guild.members.fetch(req.session.discordUserId);if(guild.ownerId!==req.session.discordUserId&&!member.permissions.has(32n)&&!member.permissions.has(8n))throw Error('Droits retirés');req.session.discordVerifiedAt=Date.now()}catch{return res.status(403).json({error:'Droits fondateur Discord requis'})}
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
  radio.mount(app,mustBeLoggedIn);
  app.post('/api/login',async (req,res)=>{
    const key=req.ip;const now=Date.now();const tries=loginAttempts.get(key)||{count:0,time:now};if(now-tries.time>900000){tries.count=0;tries.time=now}if(tries.count>=10)return res.status(429).json({error:'Réessaie dans 15 minutes'});tries.count++;loginAttempts.set(key,tries);
    const {username,password}=req.body;if(typeof username!=='string'||typeof password!=='string'||password.length>128)return res.status(401).json({error:'Identifiants incorrects'});
    let account=null;const owner=process.env.DASHBOARD_USER&&process.env.DASHBOARD_PASSWORD&&username===process.env.DASHBOARD_USER&&password===process.env.DASHBOARD_PASSWORD;
    if(!owner){account=(await db.prepare('SELECT * FROM founder_accounts WHERE username=? AND active=1').get(username));if(!account||!founders.verifyPassword(password,account.password_hash))return res.status(401).json({error:'Identifiants incorrects'})}
    req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Connexion impossible'});req.session.admin=username;req.session.role=owner?'owner':'founder';if(account){req.session.guildId=account.guild_id;req.session.accountId=account.id}loginAttempts.delete(key);req.session.save(()=>res.json({ok:true}))});
  });

  app.post("/api/logout", async (req,res)=> {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/me", async (req,res)=> {
    const active=req.session.role!=="founder"||req.session.authMethod==="discord"||Boolean((await db.prepare("SELECT id FROM founder_accounts WHERE id=? AND active=1").get(req.session.accountId)));
    res.json({ loggedIn: Boolean(req.session?.admin)&&active,role:req.session.role||"owner",guildId:req.session.guildId||null });
  });

  app.get("/api/public-config", async (req,res)=> {
    res.json({ discordInviteUrl: process.env.DISCORD_INVITE_URL || "" });
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
    await nitrado.selectServer(serviceId, serviceLabel, whitelistFile);
    res.json({ ok: true, selected: (await nitrado.getConnectionStatus()).selected });
  });

  app.post("/api/nitrado/disconnect", mustBeLoggedIn, async (req,res)=> {
    await nitrado.disconnect();
    res.json({ ok: true });
  });

  app.get("/api/stats", mustBeLoggedIn, async (req,res)=> {
    const filter=req.session.role==='founder'?' WHERE server_name LIKE ?':'';
    const args=req.session.role==='founder'?[req.session.guildId+':%']:[];
    const count=async status=>(await db.prepare('SELECT COUNT(*) c FROM whitelist_requests'+filter+(status?(filter?' AND':' WHERE')+' status=?':'')).get(...args,...(status?[status]:[]))).c;
    const stats={total:await count(),pending:await count('pending'),approved:await count('approved'),rejected:await count('rejected')};
    res.json(stats);
  });

  app.get("/api/requests", mustBeLoggedIn, async (req,res)=> {
    const q = String(req.query.q || "").trim();
    const params=[];const conditions=[];
    if(req.session.role==='founder'){conditions.push('server_name LIKE ?');params.push(req.session.guildId+':%')}
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

