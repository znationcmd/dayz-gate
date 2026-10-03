const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const crypto = require("crypto");
const db = require("./db");
const { grantWhitelistRole, removeWhitelistRole } = require("./bot");
const nitrado = require("./nitrado");

function buildDashboard() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: process.env.SESSION_SECRET || "change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 12
    }
  }));

  app.use(express.static(path.join(__dirname, "..", "public")));

  const mustBeLoggedIn = (req, res, next) => {
    if (req.session?.admin) return next();
    if (req.path.startsWith("/auth/")) return res.redirect("/");
    res.status(401).json({ error: "Non autorisé" });
  };

  app.get("/health", (req, res) => res.json({ ok: true, service: "dayz-gate" }));

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.DASHBOARD_USER && password === process.env.DASHBOARD_PASSWORD) {
      req.session.admin = username;
      return res.json({ ok: true });
    }
    res.status(401).json({ error: "Identifiants incorrects" });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/me", (req, res) => {
    res.json({ loggedIn: Boolean(req.session?.admin) });
  });

  app.get("/api/public-config", (req, res) => {
    res.json({ discordInviteUrl: process.env.DISCORD_INVITE_URL || "" });
  });

  // ---------- NITRADO OAUTH ----------
  app.get("/auth/nitrado/start", mustBeLoggedIn, (req, res) => {
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
    const status = nitrado.getConnectionStatus();
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

  app.post("/api/nitrado/select", mustBeLoggedIn, (req, res) => {
    const { serviceId, serviceLabel, whitelistFile } = req.body;
    if (!serviceId) return res.status(400).json({ error: "Service Nitrado manquant" });
    nitrado.selectServer(serviceId, serviceLabel, whitelistFile);
    res.json({ ok: true, selected: nitrado.getConnectionStatus().selected });
  });

  app.post("/api/nitrado/disconnect", mustBeLoggedIn, (req, res) => {
    nitrado.disconnect();
    res.json({ ok: true });
  });

  app.get("/api/stats", mustBeLoggedIn, (req, res) => {
    const stats = {
      total: db.prepare("SELECT COUNT(*) c FROM whitelist_requests").get().c,
      pending: db.prepare("SELECT COUNT(*) c FROM whitelist_requests WHERE status='pending'").get().c,
      approved: db.prepare("SELECT COUNT(*) c FROM whitelist_requests WHERE status='approved'").get().c,
      rejected: db.prepare("SELECT COUNT(*) c FROM whitelist_requests WHERE status='rejected'").get().c
    };
    res.json(stats);
  });

  app.get("/api/requests", mustBeLoggedIn, (req, res) => {
    const q = String(req.query.q || "").trim();
    let rows;
    if (q) {
      const like = `%${q}%`;
      rows = db.prepare(`
        SELECT * FROM whitelist_requests
        WHERE game_name LIKE ? OR discord_username LIKE ? OR platform LIKE ? OR server_name LIKE ?
        ORDER BY id DESC
      `).all(like, like, like, like);
    } else {
      rows = db.prepare("SELECT * FROM whitelist_requests ORDER BY id DESC").all();
    }
    res.json(rows);
  });

  app.post("/api/requests/:id/approve", mustBeLoggedIn, async (req, res) => {
    const row = db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Demande introuvable" });

    let syncStatus = "not_applicable";
    let syncMessage = "Validation Discord uniquement";

    // Nitrado documente l'automatisation fichier pour DayZ PC.
    // Sur console, on garde la validation dans DayZ Gate sans prétendre à une API non documentée.
    if (row.platform === "PC" && nitrado.getConnectionStatus().connected && nitrado.getConnectionStatus().selected.serviceId) {
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

    db.prepare(`
      UPDATE whitelist_requests
      SET status='approved', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
          nitrado_sync_status=?, nitrado_sync_message=?
      WHERE id=?
    `).run(req.session.admin, syncStatus, syncMessage, req.params.id);

    try { await grantWhitelistRole(row.discord_user_id); }
    catch (e) { console.error("Impossible d'attribuer le rôle Discord :", e.message); }

    res.json({ ok: true, nitrado: { status: syncStatus, message: syncMessage } });
  });

  app.post("/api/requests/:id/reject", mustBeLoggedIn, async (req, res) => {
    const row = db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Demande introuvable" });

    db.prepare(`
      UPDATE whitelist_requests
      SET status='rejected', reviewed_by=?, reviewed_at=CURRENT_TIMESTAMP,
          nitrado_sync_status='not_applicable', nitrado_sync_message='Demande refusée'
      WHERE id=?
    `).run(req.session.admin, req.params.id);

    try { await removeWhitelistRole(row.discord_user_id); }
    catch (e) { console.error("Impossible de retirer le rôle Discord :", e.message); }

    res.json({ ok: true });
  });

  app.delete("/api/requests/:id", mustBeLoggedIn, async (req, res) => {
    const row = db.prepare("SELECT * FROM whitelist_requests WHERE id=?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Demande introuvable" });
    db.prepare("DELETE FROM whitelist_requests WHERE id=?").run(req.params.id);
    try { await removeWhitelistRole(row.discord_user_id); }
    catch (e) { console.error("Impossible de retirer le rôle Discord :", e.message); }
    res.json({ ok: true });
  });

  return app;
}

module.exports = buildDashboard;
