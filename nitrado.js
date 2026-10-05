const crypto = require("crypto");
const path = require("path");
const db = require("./db");
const {AsyncLocalStorage}=require('async_hooks');const scopeContext=new AsyncLocalStorage();const currentScope=()=>scopeContext.getStore()||'owner';
db.exec(`CREATE TABLE IF NOT EXISTS nitrado_scoped(scope_id TEXT PRIMARY KEY,access_token_enc TEXT,refresh_token_enc TEXT,expires_at INTEGER,scope TEXT,updated_at TEXT);
INSERT OR IGNORE INTO nitrado_scoped SELECT 'owner',access_token_enc,refresh_token_enc,expires_at,scope,updated_at FROM nitrado_connection WHERE id=1;
DELETE FROM nitrado_connection;`);
const scopedKey=key=>currentScope()==='owner'?key:currentScope()+':'+key;


const AUTH_URL = process.env.NITRADO_AUTH_URL || "https://oauth.nitrado.net/oauth/v2/auth";
const TOKEN_URL = process.env.NITRADO_TOKEN_URL || "https://oauth.nitrado.net/oauth/v2/token";
const API_BASE = process.env.NITRADO_API_BASE || "https://api.nitrado.net";
const DEFAULT_SCOPE = process.env.NITRADO_SCOPE || "user_info service";

function encryptionKey() {
  const secret = process.env.NITRADO_TOKEN_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("NITRADO_TOKEN_SECRET ou SESSION_SECRET manquant");
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(b => b.toString("base64url")).join(".");
}

function decrypt(payload) {
  if (!payload) return null;
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

function getRedirectUri() {
  if (process.env.NITRADO_REDIRECT_URI) return process.env.NITRADO_REDIRECT_URI;
  const base = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("PUBLIC_BASE_URL manquant");
  return `${base}/auth/nitrado/callback`;
}

function isConfigured() {
  return Boolean(process.env.NITRADO_CLIENT_ID && process.env.NITRADO_CLIENT_SECRET && (process.env.NITRADO_REDIRECT_URI || process.env.PUBLIC_BASE_URL));
}

function buildAuthorizationUrl(state) {
  if (!isConfigured()) throw new Error("Configuration OAuth Nitrado incomplète");
  const url = new URL(AUTH_URL);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("client_id", process.env.NITRADO_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", DEFAULT_SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

async function postToken(params) {
  const body = new URLSearchParams({
    client_id: process.env.NITRADO_CLIENT_ID,
    client_secret: process.env.NITRADO_CLIENT_SECRET,
    ...params
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
    body
  });

  const raw = await response.text();
  let json;
  try { json = JSON.parse(raw); } catch { json = { raw }; }
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.message || json.error || `OAuth Nitrado HTTP ${response.status}`);
  }
  return json;
}

function saveTokenData(token) {
  const expiresAt = token.expires_in ? Date.now() + Number(token.expires_in) * 1000 : null;
  const previous = db.prepare("SELECT refresh_token_enc FROM nitrado_scoped WHERE scope_id=?").get(currentScope());
  const refreshEnc = token.refresh_token ? encrypt(token.refresh_token) : previous?.refresh_token_enc || null;

  db.prepare(`
    INSERT INTO nitrado_scoped(scope_id, access_token_enc, refresh_token_enc, expires_at, scope, updated_at)
    VALUES(?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(scope_id) DO UPDATE SET
      access_token_enc=excluded.access_token_enc,
      refresh_token_enc=excluded.refresh_token_enc,
      expires_at=excluded.expires_at,
      scope=excluded.scope,
      updated_at=CURRENT_TIMESTAMP
  `).run(currentScope(),encrypt(token.access_token), refreshEnc, expiresAt, token.scope || DEFAULT_SCOPE);
}

async function exchangeCode(code) {
  const token = await postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri()
  });
  saveTokenData(token);
  return token;
}

async function refreshAccessToken(refreshToken) {
  const token = await postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  saveTokenData(token);
  return token.access_token;
}

async function getAccessToken() {
  const row = db.prepare("SELECT * FROM nitrado_scoped WHERE scope_id=?").get(currentScope());
  if (!row?.access_token_enc) throw new Error("Compte Nitrado non connecté");

  if (!row.expires_at || row.expires_at > Date.now() + 60_000) {
    return decrypt(row.access_token_enc);
  }

  if (!row.refresh_token_enc) throw new Error("Session Nitrado expirée, reconnecte le compte");
  return refreshAccessToken(decrypt(row.refresh_token_enc));
}

async function api(pathname, options = {}) {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_BASE}${pathname}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      ...(options.headers || {})
    }
  });

  const raw = await response.text();
  let json;
  try { json = raw ? JSON.parse(raw) : {}; } catch { json = { raw }; }
  if (!response.ok) {
    const err = new Error(json.message || json.error || `Nitrado API HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return json.data ?? json;
}

async function getUser() {
  const data = await api("/user");
  return data.user || data;
}

async function getServices() {
  const data = await api("/services");
  return data.services || [];
}

function setSetting(key, value) {
  db.prepare(`
    INSERT INTO app_settings(key,value) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(scopedKey(key), value == null ? null : String(value));
}

function getSetting(key, fallback = "") {
  return db.prepare("SELECT value FROM app_settings WHERE key=?").get(scopedKey(key))?.value ?? fallback;
}

function getSelectedServer() {
  return {
    serviceId: getSetting("nitrado_service_id"),
    serviceLabel: getSetting("nitrado_service_label"),
    whitelistFile: getSetting("nitrado_whitelist_file", process.env.NITRADO_WHITELIST_FILE || "dayzstandalone/whitelist.txt")
  };
}

function selectServer(serviceId, serviceLabel, whitelistFile) {
  setSetting("nitrado_service_id", serviceId);
  setSetting("nitrado_service_label", serviceLabel || `Service ${serviceId}`);
  setSetting("nitrado_whitelist_file", whitelistFile || process.env.NITRADO_WHITELIST_FILE || "dayzstandalone/whitelist.txt");
}

async function downloadFile(serviceId, remoteFile) {
  const query = new URLSearchParams({ file: remoteFile });
  const data = await api(`/services/${encodeURIComponent(serviceId)}/gameservers/file_server/download?${query}`);
  const token = data.token;
  if (!token?.url || !token?.token) throw new Error("Token de téléchargement Nitrado absent");

  const url = new URL(token.url);
  url.searchParams.set("token", token.token);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Téléchargement whitelist HTTP ${response.status}`);
  return response.text();
}

async function writeFile(serviceId, remoteFile, content) {
  const dir = path.posix.dirname(remoteFile);
  const file = path.posix.basename(remoteFile);
  const body = new URLSearchParams({ path: dir === "." ? "" : dir, file });

  const data = await api(`/services/${encodeURIComponent(serviceId)}/gameservers/file_server/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const token = data.token;
  if (!token?.url || !token?.token) throw new Error("Token d’upload Nitrado absent");

  const upload = await fetch(token.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/binary",
      "token": token.token
    },
    body: content
  });
  if (!upload.ok) throw new Error(`Upload whitelist HTTP ${upload.status}`);
  return true;
}

async function addPcWhitelistEntry(gameUid) {
  const selected = getSelectedServer();
  if (!selected.serviceId) throw new Error("Aucun serveur Nitrado sélectionné");
  const uid = String(gameUid || "").trim();
  if (!uid) throw new Error("UID joueur vide");

  let current = "";
  try {
    current = await downloadFile(selected.serviceId, selected.whitelistFile);
  } catch (err) {
    // Si le fichier n'existe pas encore, on le crée. Toute autre erreur reste remontée.
    if (err.status && err.status !== 404) throw err;
  }

  const lines = current.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (lines.includes(uid)) return { changed: false, message: "Déjà présent dans whitelist.txt" };
  lines.push(uid);
  await writeFile(selected.serviceId, selected.whitelistFile, `${lines.join("\n")}\n`);
  return { changed: true, message: "Ajouté à whitelist.txt — redémarrage du serveur requis pour appliquer la modification" };
}

function getConnectionStatus() {
  const row = db.prepare("SELECT expires_at, scope, updated_at FROM nitrado_scoped WHERE scope_id=?").get(currentScope());
  const selected = getSelectedServer();
  return {
    configured: isConfigured(),
    connected: Boolean(row),
    scope: row?.scope || "",
    updatedAt: row?.updated_at || "",
    selected
  };
}

function disconnect() {
  db.prepare("DELETE FROM nitrado_scoped WHERE scope_id=?").run(currentScope());
  setSetting("nitrado_service_id", "");
  setSetting("nitrado_service_label", "");
}

module.exports = {
  withScope:(scope,fn)=>scopeContext.run(scope,fn),
  buildAuthorizationUrl,
  exchangeCode,
  getUser,
  getServices,
  getConnectionStatus,
  selectServer,
  addPcWhitelistEntry,
  disconnect,
  getRedirectUri,
  isConfigured
};
