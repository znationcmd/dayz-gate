let deferredPrompt;const install=document.querySelector("#install");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;if(install)install.hidden=false});
if(install)install.onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;install.hidden=true};
if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!matchMedia("(display-mode: standalone)").matches){const x=document.querySelector("#ios");if(x)x.style.display="block"}
fetch("/api/public-config").then(r=>r.json()).then(c=>{["discord","discord2"].forEach(id=>{const a=document.getElementById(id);if(a&&c.discordInviteUrl)a.href=c.discordInviteUrl})});

async function login(){const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:u.value,password:p.value})});if(r.ok)return renderAdmin();msg.textContent=(await r.json()).error}
async function api(url,opt){const r=await fetch(url,opt);if(r.status===401){location.reload();throw Error("Session expirée")}const d=await r.json();if(!r.ok)throw Error(d.error||"Erreur");return d}
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function platform(p){return p==="PC"?"🖥️":p==="Xbox"?"🟢":"🔵"}
async function renderAdmin(){
 document.body.innerHTML='<div class="shell"></div>';
 renderWelcomeDashboard();
 const shell=document.querySelector('.shell');shell.classList.add('main');
 const account=shell.querySelector('.reference-account');account.textContent='Déconnexion';account.removeAttribute('onclick');account.onclick=logout;
 const search=shell.querySelector('.reference-search');search.id='search';search.oninput=e=>loadRows(e.target.value);
 const panels=shell.querySelectorAll('.reference-panels>.reference-box');
 panels[0].querySelector('.reference-empty').innerHTML=`<strong>Compte Nitrado</strong><p id="nitrado">Chargement…</p><button class="reference-red" onclick="location.href='/auth/nitrado/start'">Connecter Nitrado</button>`;
 const table=panels[1].querySelector('table');table.className='table reference-table';table.innerHTML='<thead><tr><th>Joueur</th><th>Plateforme</th><th>Serveur</th><th>Statut</th><th>Action</th></tr></thead><tbody id="rows"></tbody>';
 panels[2].querySelector('.reference-stats').id='stats';
 shell.querySelector('.reference-top').insertAdjacentHTML('afterend','<h2 class="title" style="position:absolute;left:-9999px">Dashboard</h2>');
 shell.querySelectorAll('[onclick]').forEach(button=>{if((button.getAttribute('onclick')||'').includes('showLogin')){const label=button.closest('section')?.querySelector('h2')?.textContent.trim()||'Demandes';const item=menuItems.find(([name])=>label.includes(name));button.removeAttribute('onclick');button.onclick=()=>openMenuPage(item?.[1]||'requests',label,true)}});
 const playerSearch=shell.querySelector('.reference-bottom input');playerSearch.removeAttribute('onfocus');playerSearch.oninput=e=>{window.approvedOnly=true;loadRows(e.target.value)};
 mountMenu(true);await refresh();
}

async function refresh(){const s=await api("/api/stats");stats.innerHTML=[["Whitelistés",s.approved],["En attente",s.pending],["Traitées",s.total],["Refusées",s.rejected ]].map((x,i)=>`<div><b style="color:${["#2ee1b0","#eeab53","#65c8f9","#ef374b"][i]}">${x[1]}</b><span>${x[0]}</span></div>`).join("");await loadRows("");try{const n=await api("/api/nitrado/status");nitrado.textContent=n.connected?(n.selected?.serviceLabel||n.user?.username||"Nitrado connecté"):"Non connecté"}catch(e){nitrado.textContent="Non connecté"}}
async function loadRows(q){const a=await api("/api/requests?q="+encodeURIComponent(q));rows.innerHTML=a.filter(r=>!window.approvedOnly||r.status==="approved").slice(0,30).map(r=>`<tr><td><b>${esc(r.game_name)}</b><br><span class="muted">${esc(r.discord_username)}</span></td><td>${platform(r.platform)} ${esc(r.platform)}</td><td>${esc(String(r.server_name||"").replace(/^\\d+:/,""))}</td><td><span class="pill ${r.status==="approved"?"approve":r.status==="rejected"?"reject":""}">${r.status==="pending"?"En attente":r.status==="approved"?"Approuvé":"Refusé"}</span></td><td>${r.status==="pending"?`<button class="smallbtn" onclick="decide(${r.id},'approve')">✓</button><button class="smallbtn red" onclick="decide(${r.id},'reject')">✕</button>`:""}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">Aucune demande</td></tr>'}
async function decide(id,a){await api(`/api/requests/${id}/${a}`,{method:"POST"});await refresh()}
async function logout(){await fetch("/api/logout",{method:"POST"});location.reload()}
async function consumeFounderDiscordLogin(){
 const hash=location.hash.slice(1);
 if(!hash.startsWith('founder-login='))return false;
 const token=decodeURIComponent(hash.slice('founder-login='.length));
 history.replaceState(null,'',location.pathname+location.search);
 try{
  const r=await fetch('/api/founder/discord-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error||'Connexion Discord impossible');
  await renderAdmin();
 }catch(e){
  renderWelcomeDashboard();mountMenu(false);showLogin();
  const msg=document.getElementById('msg');if(msg)msg.textContent=e.message||'Connexion Discord impossible';
 }
 return true;
}
(async()=>{if(await consumeFounderDiscordLogin())return;fetch("/api/me").then(r=>r.json()).then(m=>{if(m.loggedIn)renderAdmin()})})();

// Shared navigation, including the welcome screen and the installed application.
const menuItems=[['Dashboard','home'],['Configuration','settings'],['Messages','messages'],['Arrivées et départs','welcome'],['Rôles automatiques','autoroles'],['Vérification','verification'],['Niveaux','levels'],['Invitations','invitations'],['Réputation','reputation'],['Salons vocaux temporaires','tempvoice'],["Route de l’Infini",'infinity'],['Suggestions','suggestions'],['Rôles sécurisés','secureroles'],['Modération','moderation'],['Auto-Modération','automod'],['Signalements','reports'],['Logs','logs'],['Tickets','tickets'],['Lots & Giveaways','giveaways'],['Sondages','polls'],['Embeds','embeds'],['Snippets','snippets'],['Notifications sociales','social'],['Messages récurrents','recurring'],['Salons de statistiques','statschannels'],['Compteurs','counters'],['Anniversaires','birthdays'],['Commandes personnalisées','customcommands'],['Réactions de mots','wordreactions'],['Starboards','starboard'],['Rôles-Réactions','reactionroles'],['Premium','premium'],['CMD Top Serveur','topservers'],['Demandes','requests'],['Joueurs','players'],['Whitelist','shield'],['Serveurs','servers'],['Banque','bank'],['RP','rp'],['Shop','shop'],['Loterie','lottery'],['Mini-jeux','minigames'],['Radio','radio'],['Cartes','map'],['Mods','mods'],['Outils','tools'],['Validateur','validator'],['Statistiques','stats'],['Partenariats','partners']];
const menuGroups=[['PARAMÈTRES',['settings','messages']],['ACCUEIL DES MEMBRES',['home','welcome','autoroles','verification','requests','players','shield']],['ENGAGEMENT',['levels','invitations','reputation','tempvoice','infinity','suggestions','bank','rp','shop','lottery','minigames']],['SÉCURITÉ',['secureroles','moderation','automod','reports','logs']],['COMMUNICATION',['tickets','giveaways','polls','embeds','snippets','social','recurring','statschannels','counters','radio']],['COMMUNAUTÉ',['birthdays','customcommands','wordreactions','starboard','reactionroles']],['SERVEUR DAYZ',['servers','map','mods','tools','validator','stats']],['RÉSEAU',['premium','topservers','partners']]];
const iconPaths={premium:'M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',radio:'M4 10a8 8 0 0 1 16 0M7 10a5 5 0 0 1 10 0M10 10a2 2 0 0 1 4 0M12 12v9',home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',topservers:'M3 20h18M5 20v-4h14v4M7 16l2-7h6l2 7M9 5h6M12 3v2',requests:'M8 3h8v3H8zM8 4H5v17h14V4h-3M8 11h8M8 16h8',players:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3a4 4 0 0 1 0 8',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7zM8 12l3 3 5-6',servers:'M3 3h18v7H3zM3 14h18v7H3zM6 6h1M6 17h1M15 6h3M15 17h3',map:'m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',mods:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',tools:'M14 6a6 6 0 0 0-7 7L2 18l4 4 5-5a6 6 0 0 0 7-7l-4 4-4-4z',logs:'M4 2h11l5 5v15H4zM14 2v6h6M8 12h8M8 16h8',stats:'M4 21V13h3v8M11 21V8h3v13M18 21V3h3v18',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 4-3 1-1 4H9l-1-4-3-1-2-4 2-5 3-1z',partners:'M8 12h8M12 8v8M5 5h14v14H5z',bank:'M4 10h16M5 10v8M9 10v8M15 10v8M19 10v8M3 18h18M12 3 3 8h18z',rp:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21a8 8 0 0 1 16 0',shop:'M4 7h16l-1 13H5L4 7M8 7a4 4 0 0 1 8 0',tickets:'M3 8a2 2 0 0 0 0 4v5h18v-5a2 2 0 0 0 0-4V3H3zM12 7v6',lottery:'M12 2v20M2 12h20M5 5l14 14M19 5 5 19',minigames:'M8 8h8a5 5 0 0 1 5 5v3a3 3 0 0 1-5 2l-2-2H10l-2 2a3 3 0 0 1-5-2v-3a5 5 0 0 1 5-5z'};
function menuIcon(key){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${iconPaths[key]}"/></svg>`}
function mountMenu(authenticated=false){
 document.querySelector('.side')?.remove();document.querySelector('.mobileNav')?.remove();document.querySelector('.nav')?.remove();
 document.querySelector('.gate-draft-header')?.remove();document.querySelector('.gate-guild-rail')?.remove();document.querySelector('.gate-mobile-guild-strip')?.remove();document.querySelector('.gate-side')?.remove();document.querySelector('.gate-shade')?.remove();document.querySelector('.gate-toggle')?.remove();
 if(!document.getElementById('gate-menu-style')){
  const style=document.createElement('style');style.id='gate-menu-style';style.textContent=`
  :root{--gate-header:88px;--gate-rail:72px;--gate-panel:330px}
  .gate-draft-header{position:fixed;left:0;right:0;top:0;height:calc(var(--gate-header) + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px);z-index:70;display:none;align-items:center;justify-content:space-between;background:#202428;border-bottom:1px solid #30363a;box-shadow:0 6px 18px #0005}
  .gate-draft-header button{width:54px;height:54px;padding:0;border:0;background:transparent;color:#e36754;font-size:30px;display:grid;place-items:center}
  .gate-draft-header>img{position:absolute;left:50%;transform:translateX(-50%);width:46px;height:46px;object-fit:contain}.gate-draft-actions{display:flex;align-items:center;gap:0;margin-left:auto}.gate-draft-refresh{font-size:30px!important;font-weight:900!important}.gate-draft-refresh:disabled{opacity:.45}
  .gate-draft-grid{display:grid!important;grid-template-columns:repeat(2,13px);grid-template-rows:repeat(2,13px);gap:5px!important}
  .gate-draft-grid i{display:block;width:13px;height:13px;border-radius:2px;background:#e36754}
  .gate-guild-rail{position:fixed;left:0;top:0;bottom:0;z-index:54;width:72px;padding:18px 8px;display:flex;flex-direction:column;align-items:center;gap:12px;background:#1f2327;border-right:1px solid #34393d;overflow-y:auto}
  .gate-guild-btn{position:relative;width:52px;height:52px;min-height:52px;border-radius:50%;border:2px solid transparent;padding:0;overflow:hidden;background:#2b3136;color:white;display:grid;place-items:center;font-weight:800;font-size:12px}
  .gate-guild-btn img{width:100%;height:100%;object-fit:cover}.gate-guild-btn.active{border-color:#e36754;box-shadow:0 0 0 3px #e3675422}.gate-guild-btn.active:before{content:'';position:fixed;left:0;width:4px;height:34px;background:#e36754;border-radius:0 3px 3px 0}.gate-guild-btn.not-installed{opacity:.46;filter:grayscale(.72);border-style:dashed}.gate-guild-btn.not-installed:after{content:'+';position:absolute;right:0;bottom:0;width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#252a2e;border:1px solid #111;color:#fff;font-size:17px;line-height:1;filter:none}.gate-guild-btn.not-installed:hover{opacity:.78;filter:grayscale(.35)}.gate-server-context.not-installed{opacity:.62}.gate-server-context.not-installed img,.gate-server-context.not-installed .fallback{filter:grayscale(.72);opacity:.65}
  .gate-side{position:fixed;left:72px;top:0;bottom:0;width:330px;z-index:53;display:flex;flex-direction:column;background:#303538;border-right:1px solid #3c4246;box-shadow:8px 0 22px #0004;overflow:hidden}
  .gate-side-top{padding:18px 20px 14px;border-bottom:1px solid #3c4246}
  .gate-server-context{display:flex;align-items:center;gap:11px;min-height:48px;margin-bottom:13px}.gate-server-context img,.gate-server-context .fallback{width:42px;height:42px;border-radius:50%;object-fit:cover;background:#22282c;display:grid;place-items:center;font-size:11px;font-weight:800}.gate-server-context strong{display:block;max-width:225px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:15px}.gate-server-context small{display:block;color:#8f989e;margin-top:2px;font-size:11px}
  .gate-search-wrap{display:flex;align-items:center;gap:10px;background:#252a2e;border:1px solid #3a4146;border-radius:10px;padding:0 13px;height:52px}.gate-search-wrap span{font-size:24px;color:#aab2b6}.gate-search-wrap input{border:0!important;background:transparent!important;box-shadow:none!important;padding:0!important;color:white!important;font-size:15px}.gate-search-wrap input::placeholder{color:#777f85}
  .gate-links{flex:1;min-height:0;overflow-y:auto;padding:12px 12px 28px}
  .gate-group{margin-bottom:18px}.gate-group h3{display:flex;align-items:center;justify-content:space-between;margin:0 0 5px;padding:0 8px;color:#8c9499;font-size:12px;letter-spacing:.10em;font-weight:800}.gate-group h3:after{content:'⌄';font-size:15px;color:#737c81}
  .gate-links button{width:100%;display:flex;align-items:center;gap:13px;min-height:47px;text-align:left;border:0;border-radius:8px;background:transparent;color:#d1d5d7;padding:10px 12px;font-size:15px;font-weight:500}.gate-links button:hover{background:#3a4044}.gate-links button.selected{background:#3b4145;color:#fff}.gate-links svg{width:22px;height:22px;flex-shrink:0;color:#d4d8da}
  .gate-discord{margin:10px 12px 16px;padding:12px;border-radius:10px;background:#262c30;color:#ddd;text-decoration:none;border:1px solid #41474b;font-size:12px}.gate-discord strong{display:block;font-size:13px;margin-bottom:2px}
  .gate-toggle,.gate-shade{display:none}.gate-close{display:none}.gate-menu-open{overflow:hidden!important}
  .shell{margin-left:402px;max-width:none;padding:22px 26px 70px}.admin{display:block;margin-left:402px;background:transparent}.main{padding:24px}.top{margin-bottom:34px}
  .gate-menu-notice{background:#110b0de8;border:1px solid #922032;padding:20px;border-radius:12px;margin:20px 0}.gate-menu-notice h2{margin:0 0 8px}.gate-menu-notice p{color:#bdc2c5;line-height:1.6}
  @media(max-width:800px){
    .gate-draft-header{display:flex}.shell,.admin{margin-left:0}.shell{padding:calc(var(--gate-header) + env(safe-area-inset-top,0px) + 12px) 16px 40px}.main{padding:calc(var(--gate-header) + env(safe-area-inset-top,0px) + 12px) 14px 30px}
    .gate-guild-rail{top:calc(var(--gate-header) + env(safe-area-inset-top,0px));transform:translateX(-110%);transition:transform .2s;height:calc(100dvh - var(--gate-header) - env(safe-area-inset-top,0px))}
    .gate-side{top:calc(var(--gate-header) + env(safe-area-inset-top,0px));left:72px;width:min(330px,calc(82vw - 72px));height:calc(100dvh - var(--gate-header) - env(safe-area-inset-top,0px));transform:translateX(calc(-100% - 72px));transition:transform .2s}
    .gate-menu-open .gate-guild-rail{transform:translateX(0)}.gate-side.open{transform:translateX(0)}
    .gate-shade.open{display:block;position:fixed;inset:calc(var(--gate-header) + env(safe-area-inset-top,0px)) 0 0 0;background:#0007;z-index:50}
    .gate-close{display:none}.hero h1{font-size:clamp(34px,10vw,48px)}.topbar{flex-direction:column}.flow,.stats{grid-template-columns:1fr 1fr}.content{grid-template-columns:1fr}
  }
  @media(max-width:540px){:root{--gate-rail:66px}.gate-guild-rail{width:66px}.gate-guild-btn{width:48px;height:48px;min-height:48px}.gate-side{left:66px;width:min(315px,calc(88vw - 66px))}}
  `;document.head.appendChild(style)
 }
 const header=document.createElement('header');header.className='gate-draft-header';header.innerHTML='<button type="button" class="gate-draft-menu" aria-label="Menu">☰</button><img src="/icon.svg" alt="DAYZ GATE"><div class="gate-draft-actions"><button id="dayz-force-refresh" type="button" class="gate-draft-refresh" aria-label="Actualiser" title="Actualiser">↻</button><button type="button" class="gate-draft-grid" aria-label="Modules"><i></i><i></i><i></i><i></i></button></div>';
 const rail=document.createElement('div');rail.className='gate-guild-rail';rail.setAttribute('aria-label','Discord installés');
 const mobileStrip=document.createElement('div');mobileStrip.className='gate-mobile-guild-strip';mobileStrip.setAttribute('aria-label','Discord installés');mobileStrip.hidden=true;
 const side=document.createElement('aside');side.className='gate-side';side.id='gate-side';
 const grouped=menuGroups.map(([title,keys])=>{const rows=keys.map(key=>{const item=menuItems.find(([,k])=>k===key);if(!item)return'';const [label]=item;return `<button data-page="${key}" data-search="${(label+' '+key).toLowerCase()}">${menuIcon(key)}<span>${label}</span></button>`}).join('');return rows?`<section class="gate-group" data-group><h3>${title}</h3>${rows}</section>`:''}).join('');
 side.innerHTML=`<div class="gate-side-top"><div class="gate-server-context"><div class="fallback">DZ</div><div><strong>DAYZ GATE</strong><small>Discord sélectionné</small></div></div><label class="gate-search-wrap"><span>⌕</span><input class="gate-module-search" placeholder="Rechercher un module" autocomplete="off"></label></div><nav class="gate-links" aria-label="Menu principal">${grouped}</nav><a class="gate-discord" href="https://discord.gg/uyUKxs7Fac" target="_blank" rel="noopener"><strong>Rejoindre le Discord DAYZ GATE</strong><span>discord.gg/uyUKxs7Fac</span></a>`;
 const shade=document.createElement('div');shade.className='gate-shade';
 const toggle=header.querySelector('.gate-draft-menu'),gridButton=header.querySelector('.gate-draft-grid'),refreshButton=header.querySelector('.gate-draft-refresh');
 const open=()=>{side.classList.add('open');shade.classList.add('open');document.body.classList.add('gate-menu-open')};
 const close=()=>{side.classList.remove('open');shade.classList.remove('open');document.body.classList.remove('gate-menu-open')};
 toggle.onclick=()=>side.classList.contains('open')?close():open();gridButton.onclick=()=>side.classList.contains('open')?close():open();if(refreshButton)refreshButton.onclick=forceDayzGateRefresh;shade.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 side.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{side.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b===button));close();openMenuPage(button.dataset.page,menuItems.find(([,k])=>k===button.dataset.page)?.[0]||button.textContent.trim(),authenticated)});
 const search=side.querySelector('.gate-module-search');search.oninput=()=>{const q=search.value.trim().toLowerCase();side.querySelectorAll('[data-page]').forEach(b=>b.hidden=!!q&&!b.dataset.search.includes(q));side.querySelectorAll('[data-group]').forEach(g=>g.hidden=![...g.querySelectorAll('[data-page]')].some(b=>!b.hidden))};
 document.body.prepend(shade,side,rail,mobileStrip,header);
 if(authenticated){
  api('/api/me').then(async me=>{
   if(!me.discordLinked&&me.discordAccountUrl&&!sessionStorage.getItem('dayz-discord-link-tried')){
    sessionStorage.setItem('dayz-discord-link-tried','1');location.href=me.discordAccountUrl;return;
   }
   const guilds=Array.isArray(me.guilds)?me.guilds:[];
   const selected=me.selectedGuildId||me.guildId||guilds.find(g=>g.installed!==false)?.id||guilds[0]?.id||'';
   const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
   const bubbles=guilds.map(g=>{const installed=g.installed!==false;return `<button type="button" class="gate-guild-btn ${installed?'':'not-installed'} ${g.id===selected&&installed?'active':''}" data-guild="${esc(g.id)}" data-installed="${installed?'1':'0'}" title="${esc(g.name)}${installed?'':' · Bot non installé · Cliquer pour inviter'}">${g.icon?`<img src="${esc(g.icon)}" alt="">`:`<span>${esc(initials(g.name))}</span>`}</button>`}).join('');
   rail.innerHTML=bubbles;
   mobileStrip.hidden=!guilds.length;
   mobileStrip.innerHTML=guilds.length?`<strong>DISCORD</strong><div class="gate-mobile-guild-scroll">${bubbles}</div>`:'';
   const current=guilds.find(g=>g.id===selected)||guilds.find(g=>g.installed!==false)||guilds[0];
   const config=await fetch('/api/public-config',{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
   const invite=config.botInstallUrl||config.discordInviteUrl||'';
   const inviteFor=id=>{if(!invite)return'';try{const u=new URL(invite);if(id){u.searchParams.set('guild_id',id);u.searchParams.set('disable_guild_select','true')}return u.toString()}catch{return invite}};
   const installGuild=async id=>{
    const url=inviteFor(id);if(!url)return;
    const popup=window.open('about:blank','dayz-gate-bot-install');
    if(!popup){location.href=url;return}
    try{popup.opener=null;popup.location.href=url}catch{}
    const started=Date.now();
    const timer=setInterval(async()=>{
      if(Date.now()-started>120000){clearInterval(timer);return}
      try{
        const next=await api('/api/me'),ready=(next.guilds||[]).find(g=>String(g.id)===String(id)&&g.installed!==false);
        if(!ready)return;
        clearInterval(timer);
        await api('/api/guild/select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
        try{popup.location.href=location.origin+'/?installedGuild='+encodeURIComponent(id)}catch{}
        location.reload();
      }catch{}
    },1500);
   };
   const ctx=side.querySelector('.gate-server-context');
   if(current&&ctx){const installed=current.installed!==false;ctx.classList.toggle('not-installed',!installed);ctx.innerHTML=`${current.icon?`<img src="${esc(current.icon)}" alt="">`:`<div class="fallback">${esc(initials(current.name))}</div>`}<div><strong>${esc(current.name)}</strong><small>${installed?'Bot installé':'Bot non installé'} · ${Number(current.memberCount||0)} membre(s)</small></div>${invite?`<a class="smallbtn red" href="${esc(inviteFor(installed?'':current.id))}" target="_blank" rel="noopener">＋ Inviter DAYZ GATE</a>`:''}`}
   else if(ctx)ctx.innerHTML=`<div><strong>Mes Discord</strong><small>Aucun serveur installé sélectionné.</small></div>${me.discordAccountUrl?`<a class="smallbtn red" href="${esc(me.discordAccountUrl)}">＋ Afficher mes Discord</a>`:''}`;
   const bindGuilds=root=>root?.querySelectorAll('[data-guild]').forEach(b=>b.onclick=async()=>{if(b.dataset.installed==='0'){await installGuild(b.dataset.guild);return}await api('/api/guild/select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.dataset.guild})});location.reload()});
   bindGuilds(rail);bindGuilds(mobileStrip);
  }).catch(()=>{});
 }
 if(window.mountHelp)window.mountHelp();
}
const SHARED_TOP_SERVERS_API='https://bot-ark-production.up.railway.app/api/top-servers';
async function showSharedTopServers(main){
 const me=await api('/api/me').catch(()=>({}));const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>🏆 TOP SERVEURS</h2><p>Classement commun à DAYZ GATE, BOT ARK et EXTINCTION ++ RSS.</p>'+(me.role==='owner'?'<p><button class="reference-red" onclick="addSharedTopServerGate()">+ Ajouter un serveur</button></p>':'')+'<div id="shared-top-servers">Chargement…</div>';main.querySelector('.title').after(notice);
 try{const r=await fetch(SHARED_TOP_SERVERS_API,{cache:'no-store'}),rows=await r.json();if(!r.ok)throw Error();document.getElementById('shared-top-servers').innerHTML=rows.length?rows.map((s,i)=>`<article class="reference-box" style="margin-top:10px"><h3>#${i+1} — ${esc(s.name)}</h3><p>${esc(s.game)} · ${esc(s.address||'Adresse non publiée')}</p><p><b>${s.votes_24h}</b> votes / 24h · ${s.votes} total</p><button class="reference-red" onclick="voteSharedTopServer('${esc(s.id)}')">Voter</button>${s.discord_url?` <a class="smallbtn" href="${esc(s.discord_url)}" target="_blank" rel="noopener">Discord ↗</a>`:''}</article>`).join(''):'<p>Aucun serveur inscrit.</p>';}catch{document.getElementById('shared-top-servers').textContent='Classement temporairement indisponible.';}
}
async function voteSharedTopServer(id){
 const r=await fetch(SHARED_TOP_SERVERS_API+'/'+encodeURIComponent(id)+'/vote',{method:'POST'}),d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.error||'Vote impossible');alert(d.accepted?'Vote enregistré.':'Tu as déjà voté aujourd’hui.');openMenuPage('topservers','Top Serveurs',true);
}
async function addSharedTopServerGate(){
 const name=prompt('Nom du serveur :');if(!name)return;
 const game=prompt('Jeu :','DayZ')||'DayZ';
 const address=prompt('Adresse / IP :','')||'';
 const discord_url=prompt('Lien Discord :','')||'';
 const website=prompt('Site web :','')||'';
 const image_url=prompt('Image :','')||'';
 const description=prompt('Description :','')||'';
 await api('/api/top-servers/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,game,address,discord_url,website,image_url,description})});
 alert('Serveur ajouté au Top Serveurs.');openMenuPage('topservers','Top Serveurs',true);
}
window.voteSharedTopServer=voteSharedTopServer;window.addSharedTopServerGate=addSharedTopServerGate;


async function showPremiumGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>★ PREMIUM DAYZ GATE</h2><p>Multi-serveur jusqu’à <strong>20 serveurs</strong> : 2,99 €/mois ou 25 €/an. Pass de combat Premium : 2,99 €/mois ou 25 €/an.</p><div id="gate-premium">Chargement…</div>';main.querySelector('.title').after(notice);
 try{
  const d=await api('/api/premium'),admin=(await api('/api/me')).role==='owner'?await api('/api/premium/admin').catch(()=>null):null;
  const active=x=>x?'<span class="pill approve">ACTIF jusqu’au '+esc(new Date(x.expires_at).toLocaleString('fr-FR'))+'</span>':'<span class="pill">Inactif</span>';
  document.getElementById('gate-premium').innerHTML=`
   ${d.complimentary?'<section class="reference-box" style="margin-top:14px"><h3>🎁 Premium propriétaire</h3><p><b>Offert à vie</b> · Multi-serveur + Pass de combat Premium · <b>serveurs illimités</b>.</p></section>':''}
   <div class="reference-panels" style="margin-top:14px">
    <section class="reference-box"><h3>Premium Multi-serveur</h3><p>${d.unlimitedServers?'<b>Serveurs DayZ illimités</b> pour le propriétaire.':'Jusqu’à <b>20 serveurs DayZ</b>.'}</p>${active(d.multiserver)}${d.complimentary?'<p><b>Offert propriétaire · à vie</b></p>':'<p><button class="reference-red" onclick="premiumBuyGate(\'multiserver\',\'monthly\')">2,99 € / mois</button> <button class="smallbtn" onclick="premiumBuyGate(\'multiserver\',\'yearly\')">25 € / an</button></p>'}</section>
    <section class="reference-box"><h3>Pass de combat Premium</h3><p>Droit Premium pour le Season Pass.</p>${active(d.battlepass)}${d.complimentary?'<p><b>Offert propriétaire · à vie</b></p>':'<p><button class="reference-red" onclick="premiumBuyGate(\'battlepass\',\'monthly\')">2,99 € / mois</button> <button class="smallbtn" onclick="premiumBuyGate(\'battlepass\',\'yearly\')">25 € / an</button></p>'}</section>
    ${d.complimentary?'':`<section class="reference-box"><h3>Activation</h3><p><input id="premium-code" placeholder="Code d’activation"><button class="reference-red" onclick="premiumRedeemGate()">Activer</button></p><p><a class="reference-red" href="${esc(d.paypalUrl)}" target="_blank" rel="noopener">Payer avec PayPal ↗</a></p></section>`}
   </div>
   <section class="reference-box" style="margin-top:14px"><h3>Serveurs enregistrés — ${d.unlimitedServers?d.servers.length+' / illimité':d.servers.length+'/'+d.maxServers}</h3>${d.servers.map(s=>`<p><b>${esc(s.label)}</b> · Nitrado #${esc(s.service_id)} <button class="smallbtn red" onclick="premiumRemoveServerGate('${esc(s.id)}')">Supprimer</button></p>`).join('')||'<p>Aucun serveur enregistré.</p>'}</section>
   ${admin?`<section class="reference-box" style="margin-top:14px"><h3>Administration Premium</h3><p>Génère aussi un code manuellement, comme sur EXTINCTION ++ RSS.</p><p><button class="smallbtn" onclick="premiumGenerateGate('multiserver','monthly')">Code Multi 1 mois</button> <button class="smallbtn" onclick="premiumGenerateGate('multiserver','yearly')">Code Multi 1 an</button> <button class="smallbtn" onclick="premiumGenerateGate('battlepass','monthly')">Code Pass 1 mois</button> <button class="smallbtn" onclick="premiumGenerateGate('battlepass','yearly')">Code Pass 1 an</button></p><h3>Validation paiements</h3><p>PayPal.me ne confirme pas automatiquement le paiement au bot : vérifie la référence puis génère le code.</p>${(admin.requests||[]).filter(x=>x.status==='pending').map(r=>`<p><b>${esc(r.reference)}</b> · ${esc(r.product)} · ${esc(r.billing)} · ${(Number(r.amount_cents)/100).toFixed(2)} € <button class="reference-red" onclick="premiumApproveGate('${esc(r.id)}')">Paiement vérifié → code</button></p>`).join('')||'<p>Aucune demande en attente.</p>'}</section>`:''}`;
 }catch(e){document.getElementById('gate-premium').textContent=e.message||'Premium indisponible.'}
}
async function premiumBuyGate(product,billing){const r=await api('/api/premium/payment-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,billing})});alert('Référence PayPal : '+r.reference+'\nMontant : '+r.amount+'\nAjoute cette référence dans la note du paiement.');window.open(r.paypalUrl,'_blank','noopener')}
async function premiumRedeemGate(){const code=document.getElementById('premium-code')?.value||'';await api('/api/premium/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});alert('Premium activé.');openMenuPage('premium','Premium',true)}
async function premiumRemoveServerGate(id){await api('/api/premium/servers/'+encodeURIComponent(id),{method:'DELETE'});openMenuPage('premium','Premium',true)}
async function premiumApproveGate(id){const r=await api('/api/premium/admin/approve/'+encodeURIComponent(id),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});prompt('Code à transmettre au client :',r.code);openMenuPage('premium','Premium',true)}
async function premiumGenerateGate(product,billing){const r=await api('/api/premium/admin/code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,billing})});prompt('Code Premium généré :',r.code);}
Object.assign(window,{premiumBuyGate,premiumRedeemGate,premiumRemoveServerGate,premiumApproveGate,premiumGenerateGate});

async function showRadioGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>📻 DAYZ GATE RADIO</h2><p>Messages RP, annonces serveur et rappels récurrents.</p><div id="gate-radio">Chargement…</div>';main.querySelector('.title').after(notice);
 try{const d=await api('/api/radio'),s=d.settings||{};document.getElementById('gate-radio').innerHTML=`
  <section class="reference-box" style="margin-top:12px"><h3>Station</h3><p><input id="radio-name" value="${esc(s.station_name||'DAYZ GATE RADIO')}" placeholder="Nom"><input id="radio-frequency" value="${esc(s.frequency||'87.8 MHz')}" placeholder="87.8 MHz"><input id="radio-channel" value="${esc(s.channel_id||'')}" placeholder="ID salon Discord"><button class="reference-red" onclick="saveRadioGate()">Enregistrer</button></p></section>
  <section class="reference-box" style="margin-top:12px"><h3>Diffuser maintenant</h3><p><select id="radio-kind"><option value="hq">HQ</option><option value="ambiance">Ambiance</option><option value="alerte">Alerte</option></select><input id="radio-message" placeholder="Message radio"><button class="reference-red" onclick="sendRadioGate()">Diffuser</button></p></section>
  <section class="reference-box" style="margin-top:12px"><h3>Rappel récurrent</h3><p><input id="radio-rec-channel" value="${esc(s.channel_id||'')}" placeholder="ID salon"><input id="radio-rec-message" placeholder="Message"><input id="radio-rec-minutes" type="number" min="5" value="60" placeholder="Minutes"><button class="reference-red" onclick="recurringRadioGate()">Programmer</button></p></section>
  <section class="reference-box" style="margin-top:12px"><h3>Historique radio</h3>${(d.history||[]).map(x=>`<p><b>${esc(x.frequency)}</b> · ${esc(x.kind)} · ${esc(x.message)}</p>`).join('')||'<p>Aucun message.</p>'}</section>`;}catch(e){document.getElementById('gate-radio').textContent=e.message||'Radio indisponible.'}
}
async function saveRadioGate(){await api('/api/radio/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stationName:document.getElementById('radio-name').value,frequency:document.getElementById('radio-frequency').value,channelId:document.getElementById('radio-channel').value})});openMenuPage('radio','Radio',true)}
async function sendRadioGate(){await api('/api/radio/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:document.getElementById('radio-kind').value,message:document.getElementById('radio-message').value})});openMenuPage('radio','Radio',true)}
async function recurringRadioGate(){await api('/api/radio/recurring',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channelId:document.getElementById('radio-rec-channel').value,message:document.getElementById('radio-rec-message').value,intervalMinutes:Number(document.getElementById('radio-rec-minutes').value)})});openMenuPage('radio','Radio',true)}
Object.assign(window,{saveRadioGate,sendRadioGate,recurringRadioGate});

function showToolsGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>🛠 Suite complète d’outils DayZ Gate</h2><p>Chaque outil ci-dessous génère, modifie, diagnostique ou télécharge un vrai fichier/configuration.</p><div id="dayz-tool-suite">Chargement des outils…</div>';main.querySelector('.title').after(notice);
 const mount=()=>{const el=document.getElementById('dayz-tool-suite');if(el&&window.DayzGateTools)window.DayzGateTools.mount(el)};
 if(window.DayzGateTools)return mount();
 let script=document.getElementById('dayz-tools-script');
 if(script){script.addEventListener('load',mount,{once:true});return}
 script=document.createElement('script');script.id='dayz-tools-script';script.src='/dayz-tools.js?v=9';script.onload=mount;script.onerror=()=>{const el=document.getElementById('dayz-tool-suite');if(el)el.innerHTML='<p>Impossible de charger les outils. Recharge la page.</p>'};document.head.appendChild(script);
}
let gateValidatorFile=null,gateValidatorResult=null;
function showFileValidatorGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML=`<h2>🧰 Validateur & correcteur de fichiers</h2><p>JSON, XML et INI · 5 Mo maximum. Le bot ne corrige que ce qui est sûr.</p>
 <section class="reference-box" style="margin-top:14px"><input id="gate-validator-file" type="file" accept=".json,.xml,.ini,application/json,application/xml,text/xml,text/plain"><p><button class="reference-red" onclick="runFileValidatorGate()">Analyser et corriger</button></p><div id="gate-validator-result"></div></section>`;main.querySelector('.title').after(notice);
 document.getElementById('gate-validator-file').onchange=e=>{gateValidatorFile=e.target.files?.[0]||null;gateValidatorResult=null;document.getElementById('gate-validator-result').textContent='';};
}
async function runFileValidatorGate(){
 const box=document.getElementById('gate-validator-result');if(!gateValidatorFile){box.textContent='Choisis un fichier.';return}
 if(gateValidatorFile.size>5*1024*1024){box.textContent='Fichier trop volumineux (5 Mo maximum).';return}
 box.textContent='Analyse en cours…';
 try{
  const content=await gateValidatorFile.text();
  const data=await api('/api/file-validator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:gateValidatorFile.name,content})});
  gateValidatorResult=data;
  const title=data.valid?'✅ Fichier valide':data.correctable?'🛠 Correction disponible':'❌ Correction manuelle nécessaire';
  const error=!data.valid&&data.error?'<p><b>Ligne '+esc(data.line||'?')+(data.column?', colonne '+esc(data.column):'')+'</b><br>'+esc(data.error)+'</p>':'';
  const fixes=(data.fixes||[]).length?'<h4>Corrections proposées</h4><ul>'+data.fixes.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  const warnings=(data.warnings||[]).length?'<h4>Points à vérifier</h4><ul>'+data.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'';
  const download=data.correctable?'<button class="reference-red" onclick="downloadCorrectedDayzGate()">Télécharger le fichier corrigé</button>':'';
  box.innerHTML='<h3>'+title+'</h3><p>'+esc(data.format||'')+'</p>'+error+fixes+warnings+download;
 }catch(e){box.textContent=e.message||'Analyse impossible.'}
}
function downloadCorrectedDayzGate(){
 if(!gateValidatorResult?.correctedContent||!gateValidatorFile)return;
 const dot=gateValidatorFile.name.lastIndexOf('.'),base=dot>0?gateValidatorFile.name.slice(0,dot):gateValidatorFile.name,ext=dot>0?gateValidatorFile.name.slice(dot):'';
 const blob=new Blob([gateValidatorResult.correctedContent],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=base+'.corrige'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
Object.assign(window,{runFileValidatorGate,downloadCorrectedDayzGate});


async function showCommunityGate(main,key){
 const me=await api('/api/me').catch(()=>({})),d=await api('/api/community');
 const owner=me.role==='owner';
 const n=x=>new Intl.NumberFormat('fr-FR').format(Number(x)||0);
 const notice=document.createElement('section');notice.className='gate-menu-notice';
 const tx=(d.wallet?.transactions||[]).slice(0,10).map(x=>'<p><b>'+esc(x.kind)+'</b> · '+(Number(x.amount)>=0?'+':'')+n(x.amount)+' · '+esc(x.created_at||'')+'</p>').join('')||'<p>Aucun mouvement.</p>';
 if(key==='bank')notice.innerHTML='<h2>🏦 Banque & monnaie</h2><p>Solde : <b>'+n(d.wallet?.balance)+' crédits</b></p><section class="reference-box"><h3>Payer un joueur</h3><input id="bank-user" placeholder="ID Discord du joueur"><input id="bank-amount" type="number" min="1" placeholder="Montant"><button class="reference-red" onclick="communityPayGate()">Envoyer</button></section>'+(owner?'<section class="reference-box" style="margin-top:12px"><h3>Crédit propriétaire</h3><input id="credit-user" placeholder="ID Discord (vide = toi)"><input id="credit-amount" type="number" min="1" placeholder="Montant"><button class="reference-red" onclick="communityCreditGate()">Ajouter</button></section>':'')+'<section class="reference-box" style="margin-top:12px"><h3>Historique</h3>'+tx+'</section>';
 if(key==='rp'){const p=d.profile||{};notice.innerHTML='<h2>🎭 Profil RP</h2><section class="reference-box"><input id="rp-job" value="'+esc(p.job||'Survivant')+'" placeholder="Métier"><input id="rp-faction" value="'+esc(p.faction||'')+'" placeholder="Faction"><textarea id="rp-bio" placeholder="Bio RP">'+esc(p.bio||'')+'</textarea><button class="reference-red" onclick="saveRpGate()">Enregistrer le profil</button></section>';}
 if(key==='shop'){const items=(d.shop||[]).map(x=>'<article class="reference-box" style="margin-top:10px"><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'')+'</p><p><b>'+n(x.price)+' crédits</b></p><button class="reference-red" onclick="buyShopGate(\''+esc(x.id)+'\')">Acheter</button></article>').join('')||'<p>Boutique vide.</p>';notice.innerHTML='<h2>🛒 Shop communautaire</h2>'+(owner?'<section class="reference-box"><h3>Créer un article</h3><input id="shop-name" placeholder="Nom"><input id="shop-price" type="number" min="0" placeholder="Prix"><input id="shop-desc" placeholder="Description"><button class="reference-red" onclick="createShopGate()">Créer</button></section>':'')+'<div>'+items+'</div>';}
 if(key==='tickets'){const rows=(d.tickets||[]).map(x=>'<p><b>'+esc(x.subject)+'</b> · '+esc(x.status)+' · '+esc(x.id)+(x.status==='open'?' <button class="smallbtn red" onclick="closeTicketGate(\''+esc(x.id)+'\')">Fermer</button>':'')+'</p>').join('')||'<p>Aucun ticket.</p>';notice.innerHTML='<h2>🎫 Tickets</h2><section class="reference-box"><input id="ticket-subject" placeholder="Sujet du ticket"><button class="reference-red" onclick="openTicketGate()">Ouvrir un ticket</button></section><section class="reference-box" style="margin-top:12px"><h3>Mes tickets</h3>'+rows+'</section>';}
 if(key==='lottery'){const l=d.lottery||{};notice.innerHTML='<h2>🎟️ Loterie</h2><p>Cagnotte : <b>'+n(l.pot)+' crédits</b> · '+n(l.tickets)+' tickets · tes tickets : '+n(l.mine)+'</p><section class="reference-box"><input id="lottery-count" type="number" min="1" max="10" value="1"><button class="reference-red" onclick="buyLotteryGate()">Acheter (100 crédits/ticket)</button>'+(owner?' <button class="smallbtn" onclick="drawLotteryGate()">Tirer le gagnant</button>':'')+'</section>';}
 if(key==='minigames'){notice.innerHTML='<h2>🎮 Mini-jeux</h2><p>Jeux gratuits avec récompenses en crédits virtuels.</p><section class="reference-box"><select id="minigame-name"><option value="chifoumi">Chifoumi</option><option value="de">Dé</option><option value="devinette">Devinette DayZ</option></select><input id="minigame-choice" placeholder="pierre / feuille / ciseaux, 1-6 ou réponse"><button class="reference-red" onclick="playMinigameGate()">Jouer</button><div id="minigame-result"></div></section>';}
 main.querySelector('.title').after(notice);
}
async function communityPayGate(){await api('/api/community/pay',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:document.getElementById('bank-user').value,amount:Number(document.getElementById('bank-amount').value)})});alert('Paiement envoyé.');openMenuPage('bank','Banque',true)}
async function communityCreditGate(){await api('/api/community/credit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:document.getElementById('credit-user').value,amount:Number(document.getElementById('credit-amount').value)})});alert('Crédits ajoutés.');openMenuPage('bank','Banque',true)}
async function saveRpGate(){await api('/api/community/rp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({job:document.getElementById('rp-job').value,faction:document.getElementById('rp-faction').value,bio:document.getElementById('rp-bio').value})});alert('Profil RP enregistré.');openMenuPage('rp','RP',true)}
async function createShopGate(){await api('/api/community/shop',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:document.getElementById('shop-name').value,price:Number(document.getElementById('shop-price').value),description:document.getElementById('shop-desc').value})});openMenuPage('shop','Shop',true)}
async function buyShopGate(id){await api('/api/community/shop/'+encodeURIComponent(id)+'/buy',{method:'POST'});alert('Achat enregistré.');openMenuPage('shop','Shop',true)}
async function openTicketGate(){await api('/api/community/ticket',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:document.getElementById('ticket-subject').value})});openMenuPage('tickets','Tickets',true)}
async function closeTicketGate(id){await api('/api/community/ticket/'+encodeURIComponent(id)+'/close',{method:'POST'});openMenuPage('tickets','Tickets',true)}
async function buyLotteryGate(){await api('/api/community/lottery/buy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:Number(document.getElementById('lottery-count').value)})});openMenuPage('lottery','Loterie',true)}
async function drawLotteryGate(){const r=await api('/api/community/lottery/draw',{method:'POST'});alert('Gagnant : '+r.winnerId+' · '+r.prize+' crédits');openMenuPage('lottery','Loterie',true)}
async function playMinigameGate(){const r=await api('/api/community/minigame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:document.getElementById('minigame-name').value,choice:document.getElementById('minigame-choice').value})});document.getElementById('minigame-result').textContent=r.needsChoice?r.prompt:(r.text+(r.reward?' · +'+r.reward+' crédits':''));}
Object.assign(window,{communityPayGate,communityCreditGate,saveRpGate,createShopGate,buyShopGate,openTicketGate,closeTicketGate,buyLotteryGate,drawLotteryGate,playMinigameGate});

async function showServersGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>🖥️ Serveurs DayZ</h2><div id="servers-gate">Chargement…</div>';main.querySelector('.title').after(notice);
 try{const s=await api('/api/nitrado/status');let html='<section class="reference-box"><h3>Nitrado</h3><p>'+(s.connected?'✅ Connecté':'❌ Non connecté')+'</p>'+(s.connected?'<button class="smallbtn red" onclick="disconnectNitradoGate()">Déconnecter</button>':'<button class="reference-red" onclick="location.href=\'/auth/nitrado/start\'">Connecter Nitrado</button>')+'</section>';if(s.connected){const rows=await api('/api/nitrado/services');html+='<section class="reference-box" style="margin-top:12px"><h3>Services</h3>'+rows.map(x=>'<p><b>'+esc(x.label)+'</b> · #'+esc(x.id)+' · '+esc(x.status||'')+' <button class="smallbtn" onclick="selectNitradoGate(\''+esc(x.id)+'\',\''+esc(x.label).replace(/'/g,'&#39;')+'\')">Sélectionner</button></p>').join('')+'</section>';}document.getElementById('servers-gate').innerHTML=html;}catch(e){document.getElementById('servers-gate').textContent=e.message}
}
async function selectNitradoGate(id,label){const whitelistFile=prompt('Chemin whitelist.txt DayZ PC (optionnel) :','')||'';await api('/api/nitrado/select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:id,serviceLabel:label,whitelistFile})});alert('Serveur sélectionné.');openMenuPage('servers','Serveurs',true)}
async function disconnectNitradoGate(){await api('/api/nitrado/disconnect',{method:'POST'});openMenuPage('servers','Serveurs',true)}

async function showModsGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>🧩 Mods DayZ</h2><section class="reference-box"><input id="mod-workshop" placeholder="Workshop ID Steam"><input id="mod-name" placeholder="Nom du mod"><input id="mod-notes" placeholder="Notes"><button class="reference-red" onclick="addModGate()">Ajouter / mettre à jour</button></section><div id="mods-list"></div>';main.querySelector('.title').after(notice);
 const rows=await api('/api/mods');document.getElementById('mods-list').innerHTML=rows.map(x=>'<section class="reference-box" style="margin-top:10px"><h3>'+esc(x.name)+'</h3><p>Workshop : '+esc(x.workshop_id)+(x.notes?' · '+esc(x.notes):'')+'</p><button class="smallbtn red" onclick="removeModGate(\''+esc(x.id)+'\')">Supprimer de la liste</button></section>').join('')||'<p>Aucun mod enregistré.</p>';
}
async function addModGate(){await api('/api/mods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({workshopId:document.getElementById('mod-workshop').value,name:document.getElementById('mod-name').value,notes:document.getElementById('mod-notes').value})});openMenuPage('mods','Mods',true)}
async function removeModGate(id){await api('/api/mods/'+encodeURIComponent(id),{method:'DELETE'});openMenuPage('mods','Mods',true)}

async function showLogsGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>📄 Logs DayZ</h2><div id="logs-gate">Chargement…</div>';main.querySelector('.title').after(notice);
 const d=await api('/api/logs?limit=200'),fmt=x=>[x.occurred_at||x.log_time,x.event_type,x.player_name,x.killer_name,x.weapon,x.object_name,(x.x!=null&&x.z!=null)?'X '+x.x+' Z '+x.z:''].filter(Boolean).map(esc).join(' · ');
 document.getElementById('logs-gate').innerHTML='<section class="reference-box"><h3>Activité</h3>'+(d.activity.length?d.activity.map(x=>'<p>'+fmt(x)+'</p>').join(''):'<p>Aucun log activité importé.</p>')+'</section><section class="reference-box" style="margin-top:12px"><h3>Constructions</h3>'+(d.construction.length?d.construction.map(x=>'<p>'+fmt(x)+'</p>').join(''):'<p>Aucun log construction importé.</p>')+'</section>';
}
async function showStatsGate(main){
 const [s,c]=await Promise.all([api('/api/stats'),api('/api/community')]),notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>📊 Statistiques</h2><div class="reference-stats"><div><b>'+s.approved+'</b><span>Whitelistés</span></div><div><b>'+s.pending+'</b><span>En attente</span></div><div><b>'+s.rejected+'</b><span>Refusés</span></div><div><b>'+c.wallet.balance+'</b><span>Crédits personnels</span></div></div>';main.querySelector('.title').after(notice);
}
async function showSettingsGate(main){
 const [s,n]=await Promise.all([api('/api/community-settings'),api('/api/nitrado/status').catch(()=>({connected:false}))]),notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>⚙️ Configuration</h2><section class="reference-box"><h3>Rôle whitelist Discord</h3><input id="settings-role" value="'+esc(s.whitelist_role_id||'')+'" placeholder="ID rôle Discord"><button class="reference-red" onclick="saveSettingsGate()">Enregistrer</button></section><section class="reference-box" style="margin-top:12px"><h3>Nitrado</h3><p>'+(n.connected?'✅ Compte connecté':'❌ Non connecté')+'</p><button class="reference-red" onclick="openMenuPage(\'servers\',\'Serveurs\',true)">Gérer les serveurs</button></section>';main.querySelector('.title').after(notice);
}
async function saveSettingsGate(){await api('/api/community-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({whitelistRoleId:document.getElementById('settings-role').value})});alert('Configuration enregistrée.');}

function showMapGate(main){
 const notice=document.createElement('section');notice.className='gate-menu-notice';notice.innerHTML='<h2>🗺️ Cartes & repères</h2><p>Crée des repères DayZ exportables en JSON. Les coordonnées ne sont jamais inventées.</p><section class="reference-box"><input id="map-name" placeholder="Nom du repère"><input id="map-x" type="number" step="any" placeholder="X"><input id="map-y" type="number" step="any" placeholder="Y / altitude"><input id="map-z" type="number" step="any" placeholder="Z"><button class="reference-red" onclick="addMapMarkerGate()">Ajouter le repère</button><button class="smallbtn" onclick="downloadMapMarkersGate()">Télécharger JSON</button><pre id="map-markers-output" style="white-space:pre-wrap"></pre></section>';main.querySelector('.title').after(notice);renderMapMarkersGate();
}
let gateMapMarkers=[];
function addMapMarkerGate(){const name=document.getElementById('map-name').value.trim(),x=Number(document.getElementById('map-x').value),y=Number(document.getElementById('map-y').value),z=Number(document.getElementById('map-z').value);if(!name||![x,y,z].every(Number.isFinite))return alert('Nom + X/Y/Z requis.');gateMapMarkers.push({name,x,y,z});renderMapMarkersGate()}
function renderMapMarkersGate(){const o=document.getElementById('map-markers-output');if(o)o.textContent=JSON.stringify(gateMapMarkers,null,2)}
function downloadMapMarkersGate(){const b=new Blob([JSON.stringify(gateMapMarkers,null,2)+'\n'],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='dayz-gate-markers.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

Object.assign(window,{selectNitradoGate,disconnectNitradoGate,addModGate,removeModGate,saveSettingsGate,addMapMarkerGate,downloadMapMarkersGate});

function showDiscordModuleGate(main,key,label){
  document.querySelector('.gate-menu-notice')?.remove();
  const notice=document.createElement('section');
  notice.className='gate-menu-notice';
  notice.innerHTML='<h2>'+esc(label)+'</h2><p>Rubrique Discord ajoutée sans supprimer les outils DayZ existants.</p><section class="reference-box"><h3>Configuration du module</h3><p>Le propriétaire choisira ici le salon Discord, les rôles et les options du module.</p><p><b>Clé :</b> '+esc(key)+'</p></section>';
  main.querySelector('.title')?.after(notice);
}

function openMenuPage(key,label,authenticated){
 document.querySelector('.gate-menu-notice')?.remove();
 if(key==='topservers'){location.href='https://cmd-top-serveur-production.up.railway.app/';return}
 if(!authenticated){if(key==='home'){window.scrollTo({top:0,behavior:'smooth'});return}showLogin(label);return}
 const main=document.querySelector('.main');window.approvedOnly=key==='players'||key==='shield';
 if(['messages','welcome','autoroles','verification','levels','invitations','reputation','tempvoice','infinity','suggestions','secureroles','moderation','automod','reports','giveaways','polls','embeds','snippets','social','recurring','statschannels','counters','birthdays','customcommands','wordreactions','starboard','reactionroles'].includes(key)){showDiscordModuleGate(main,key,label);return}
 if(key==='premium'){showPremiumGate(main);return}
 if(key==='radio'){showRadioGate(main);return}
 if(key==='tools'){showToolsGate(main);return}
 if(key==='validator'){showFileValidatorGate(main);return}
 if(['bank','rp','shop','tickets','lottery','minigames'].includes(key)){showCommunityGate(main,key);return}
 if(key==='servers'){showServersGate(main);return}
 if(key==='mods'){showModsGate(main);return}
 if(key==='logs'){showLogsGate(main);return}
 if(key==='stats'){showStatsGate(main);return}
 if(key==='settings'){showSettingsGate(main);return}
 if(key==='map'){showMapGate(main);return}
 if(key==='partners'){main.insertAdjacentHTML('afterbegin','<section class="gate-menu-notice"><h2>INTERPOL · PARTENARIATS OFFICIELS</h2><p><strong>EXTINCTION ++ RSS</strong> ↔ <strong>DAYZ GATE</strong> ↔ <strong>BOT ARK</strong></p><p>Réseau commun Valhalla Extinction : actualités, outils serveurs, communautés et services connectés.</p></section>');return}
 main.querySelector('.title').textContent=label;
 if(['home','requests','players','shield'].includes(key)){loadRows(document.getElementById('search').value);document.getElementById('rows').closest('section').querySelector('h2').textContent=window.approvedOnly?'Joueurs whitelistés':'Demandes récentes';document.getElementById('rows').closest('section').scrollIntoView({behavior:'smooth'});return}
 if(key==='home'){window.scrollTo({top:0,behavior:'smooth'});return}
 showToolsGate(main);
}
renderWelcomeDashboard();
mountMenu();
const helperScript=document.createElement("script");helperScript.src="/help.js";document.head.appendChild(helperScript);

function showLogin(label='le Dashboard'){
 const modal=document.getElementById('gate-login');if(!modal)return;
 modal.querySelector('.sub').textContent='Connecte-toi pour administrer DayZ Gate.';if(!modal.querySelector('.discord-login-guide')){const guide=document.createElement('p');guide.className='discord-login-guide sub';guide.innerHTML='Fondateur ? Dans ton Discord, utilise <b>/dashboard</b> de DayZ Gate puis <b>Ouvrir mon Dashboard</b> pour te connecter automatiquement.';modal.querySelector('.sub').after(guide)}modal.showModal();document.getElementById('u').focus();
}
function renderWelcomeDashboard(){
 const shell=document.querySelector('.shell');if(!shell)return;
 shell.innerHTML=`<div class="reference-top"><input class="reference-search" placeholder="Rechercher un joueur…" aria-label="Rechercher un joueur"><button class="reference-account" onclick="showLogin()">${menuIcon('players')} Admin ▾</button></div><section class="reference-hero" aria-label="Paysage de Chernarus"></section><div class="reference-flow">${[['requests','DEMANDE DE WHITELIST','Depuis Discord'],['logs','INFORMATIONS','Pseudo, plateforme et serveur'],['shield','VALIDATION','Par les admins<br>Accepté ou refusé'],['players','RÔLE DISCORD AUTOMATIQUE','Whitelist'],['servers','ACCÈS SERVEUR','PC • Xbox • PlayStation']].map(([icon,title,sub])=>`<button class="reference-step" onclick="showLogin()">${menuIcon(icon)}<strong>${title}</strong><span>${sub}</span><i>→</i></button>`).join('')}</div>
 <div class="reference-panels"><section class="reference-box"><header><h2>${menuIcon('servers')} Serveurs</h2><button onclick="showLogin('Serveurs')">Voir les serveurs →</button></header><div class="reference-empty">${menuIcon('servers')}<strong>Tes serveurs DayZ</strong><p>Connecte-toi pour afficher les serveurs de ta communauté.</p><button class="reference-red" onclick="showLogin('Serveurs')">Connexion</button></div></section>
 <section class="reference-box"><header><h2>${menuIcon('requests')} Demandes récentes</h2><button onclick="showLogin('Demandes')">Voir toutes →</button></header><table class="reference-table"><thead><tr><th>Joueur</th><th>Plateforme</th><th>Date</th><th>Statut</th></tr></thead><tbody><tr><td colspan="4" class="reference-table-empty">Connecte-toi pour afficher les demandes de whitelist.</td></tr></tbody></table></section>
 <section class="reference-box"><header><h2>${menuIcon('stats')} Statistiques</h2><span>7 derniers jours</span></header><div class="reference-stats">${[['#2ee1b0','Joueurs whitelistés'],['#eeab53','Demandes en attente'],['#65c8f9','Demandes traitées'],['#ef374b','Refusées']].map(([color,label])=>`<div><b style="color:${color}">—</b><span>${label}</span></div>`).join('')}</div><h3 class="reference-chart-title">Activité des demandes</h3><div class="reference-chart-empty">Statistiques disponibles après connexion</div></section></div>
 <div class="reference-bottom"><section class="reference-box"><header><h2>${menuIcon('players')} Joueurs whitelistés</h2><button class="reference-red" onclick="showLogin('Joueurs')">+ Voir les joueurs →</button></header><input placeholder="Rechercher un joueur…" aria-label="Rechercher un joueur whitelisté" onfocus="showLogin('Joueurs')"></section><section class="reference-box"><header><h2>${menuIcon('mods')} Mods</h2><button onclick="showLogin('Mods')">Voir les mods →</button></header><p>Gestion des mods Steam</p></section><section class="reference-box"><header><h2>${menuIcon('tools')} Outils</h2><button onclick="showLogin('Outils')">Ouvrir les outils →</button></header><p>Mises à jour, validation, nettoyage</p></section></div>
 <dialog id="gate-login"><button class="login-close" aria-label="Fermer" onclick="document.getElementById('gate-login').close()">×</button><h2>Connexion DayZ Gate</h2><p class="sub">Connecte-toi pour administrer DayZ Gate.</p><div class="fields"><input id="u" autocomplete="username" placeholder="Identifiant"><input id="p" type="password" autocomplete="current-password" placeholder="Mot de passe"><button class="reference-red" onclick="login()">Connexion</button></div><p id="msg" role="alert"></p></dialog>`;
 const style=document.createElement('style');style.textContent=`
 .shell{padding:10px 18px 24px!important;background:linear-gradient(0deg,#33040970,transparent 65%);min-height:100vh}.top{display:none}.reference-top{height:44px;display:flex;justify-content:flex-end;align-items:center;gap:18px}.reference-search{width:45%;margin-right:auto;margin-left:25%;background:#070a0de8;padding:11px 15px;border:1px solid #49434b;border-radius:8px;font-size:12px}.reference-account{display:flex;align-items:center;gap:12px;background:#080a0ee8;border:1px solid #49434b;color:white;padding:10px 18px;font-size:13px}.reference-account svg{width:20px;height:20px}.reference-hero{height:250px}.reference-flow{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:14px}.reference-step{position:relative;min-height:148px;padding:16px 20px 16px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;color:white;background:linear-gradient(135deg,#29080ddd,#050708ee);border:1px solid #b71a2b;border-radius:11px;box-shadow:0 0 14px #e0172733,inset 0 1px 10px #9e0b1740}.reference-step>svg{width:44px;height:44px;color:#ef3349;margin-bottom:3px;stroke-width:2}.reference-step:nth-child(2)>svg{color:#85cce6}.reference-step:nth-child(5)>svg{color:#b8ced0}.reference-step strong{font-family:Impact,'Arial Narrow',system-ui,sans-serif;font-stretch:condensed;font-size:17px;max-width:150px;line-height:1.1}.reference-step span{font-size:12px;font-weight:400;line-height:1.5;color:#cad0d6}.reference-step i{position:absolute;right:9px;top:50%;font-style:normal;font-size:24px;color:#ed2540}.reference-panels{display:grid;grid-template-columns:1fr 1.07fr 1fr;gap:13px}.reference-box{min-width:0;padding:13px 12px;background:linear-gradient(130deg,#0d1115f0,#040709ef);border:1px solid #841422;border-radius:12px;box-shadow:0 0 12px #ec19392b}.reference-box header{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-bottom:15px}.reference-box h2{display:flex;align-items:center;gap:10px;margin:0;font-size:14px;font-weight:700}.reference-box h2 svg{width:21px;height:21px;color:#d5dce1;flex-shrink:0}.reference-box header button,.reference-box header>span{padding:7px 9px;font-size:10px;font-weight:400;background:#11161be8;border:1px solid #242c32;color:#d4dbe0;border-radius:5px;white-space:nowrap}.reference-empty{min-height:202px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid #2d363a;border-radius:8px;text-align:center;padding:15px;color:#adb5bb}.reference-empty svg{width:28px;height:28px;margin-bottom:10px}.reference-empty strong{color:#eee;font-size:14px}.reference-empty p{font-size:12px;line-height:1.6}.reference-red,.reference-box header .reference-red{background:linear-gradient(135deg,#bc0c23,#76091a);border:1px solid #e02541;color:white;border-radius:5px;padding:9px 14px;font-size:12px}.reference-table{width:100%;border-collapse:collapse;font-size:11px}.reference-table th{background:#131a20;color:#a8b2bc;text-align:left;font-weight:400;padding:10px 7px}.reference-table-empty{height:191px;color:#9ba5ad;text-align:center;line-height:1.7;padding:18px}.reference-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.reference-stats>div{padding:9px 7px;background:#11171ccf;border:1px solid #253038;border-radius:7px}.reference-stats b{display:block;font-size:25px;font-weight:500}.reference-stats span{font-size:9px;color:#d2d9dd;line-height:1.4;display:block}.reference-chart-title{font-size:12px;margin:17px 0 9px}.reference-chart-empty{height:115px;display:grid;place-items:center;border-bottom:1px solid #343a42;background:repeating-linear-gradient(0deg,transparent 0 37px,#a7b4c715 38px 39px);font-size:11px;text-align:center;color:#929da6}.reference-bottom{display:grid;grid-template-columns:1fr 1.07fr 1fr;gap:13px;margin-top:13px}.reference-bottom .reference-box{min-height:90px}.reference-bottom header{margin-bottom:8px}.reference-bottom p{margin:0 0 0 30px;color:#9ba7b0;font-size:11px}.reference-bottom input{padding:8px 12px;font-size:11px}.gate-brand{justify-content:center;flex-direction:column;gap:0;padding-bottom:18px}.gate-brand img{width:112px;height:112px}.gate-brand strong{font-family:Impact,system-ui,sans-serif;font-size:25px}.gate-brand small{display:inline;margin-left:6px;font-size:25px;letter-spacing:2px}.gate-links button{padding:9px 14px;min-height:40px}.gate-side{padding-top:8px}.gate-discord strong{font-family:Impact,system-ui,sans-serif}.gate-discord{margin-top:25px}#gate-login{position:fixed;width:min(480px,calc(100% - 28px));background:#090c0f;color:white;border:1px solid #cf1836;border-radius:14px;padding:28px;box-shadow:0 0 80px #000}#gate-login::backdrop{background:#000a;backdrop-filter:blur(6px)}#gate-login .fields{display:grid;grid-template-columns:1fr;gap:10px}.login-close{position:absolute;right:8px;top:4px;font-size:24px;color:#eee;background:none}.sub{font-size:13px;color:#aeb8c0}#msg{color:#fa7586;font-size:13px}
 @media(min-width:801px) and (max-width:1150px){.reference-panels,.reference-bottom{grid-template-columns:1fr 1fr}.reference-panels>section:last-child,.reference-bottom>section:last-child{grid-column:1/-1}.reference-flow{gap:7px}.reference-step{padding:12px 14px 12px 6px}.reference-step strong{font-size:14px}}
 @media(max-width:800px){.shell{padding:76px 14px 24px!important}.reference-top{height:44px}.reference-search{margin-left:0;margin-right:0;width:100%;min-width:0}.reference-account{padding:10px}.reference-hero{height:170px}.reference-flow{grid-template-columns:repeat(2,1fr);gap:9px}.reference-step{min-height:132px}.reference-step:last-child{grid-column:1/-1;min-height:110px}.reference-panels,.reference-bottom{grid-template-columns:1fr}.reference-box{padding:15px}.reference-box h2{font-size:15px}.reference-stats span{font-size:10px}.gate-side{padding-top:52px}.gate-discord{margin-top:auto}.reference-empty{min-height:150px}.reference-table-empty{height:150px}}
 `;document.head.appendChild(style);
}

const languageScript=document.createElement("script");languageScript.src="/i18n.js";document.head.appendChild(languageScript);

const gatePolish=document.createElement('style');gatePolish.textContent=`
@keyframes dayzBackgroundDrift{0%{background-position:center center}50%{background-position:53% 46%}100%{background-position:center center}}
body{animation:dayzBackgroundDrift 34s ease-in-out infinite;background-size:auto,112% 112%!important;background-attachment:fixed}
@media(max-width:800px){.shell,.main{padding-top:calc(132px + env(safe-area-inset-top,0px))!important}.gate-toggle{top:calc(12px + env(safe-area-inset-top,0px))}.reference-top{position:absolute;top:calc(72px + env(safe-area-inset-top,0px));left:14px;right:14px;height:48px!important;display:flex!important;align-items:center!important;gap:8px!important}.reference-top .reference-search{display:none}.reference-account{flex:1;justify-content:center;min-height:46px}.gate-language{min-height:46px!important}.gate-side{padding-top:calc(54px + env(safe-area-inset-top,0px))!important}}
@media(prefers-reduced-motion:reduce){body{animation:none}}
`;document.head.appendChild(gatePolish);

let dayzGateSw=null;
const DAYZ_PWA_VERSION='21';
const DAYZ_RELOAD_KEY='dayz-pwa-reloaded-'+DAYZ_PWA_VERSION;
async function forceDayzGateRefresh(){
 const btn=document.getElementById('dayz-force-refresh');if(btn){btn.disabled=true;btn.dataset.oldText=btn.textContent;btn.textContent='…'}
 try{
  if('caches' in window){
   const keys=await caches.keys();
   await Promise.all(keys.filter(k=>k.startsWith('dayz-gate-')).map(k=>caches.delete(k)));
  }
  if('serviceWorker' in navigator){
   dayzGateSw=await navigator.serviceWorker.register('/sw.js?v='+DAYZ_PWA_VERSION,{scope:'/',updateViaCache:'none'});
   await dayzGateSw.update().catch(()=>{});
  }
 }catch{}
 location.reload();
}
function mountDayzRefreshButton(){
 if(document.getElementById('dayz-force-refresh'))return;
 const b=document.createElement('button');b.id='dayz-force-refresh';b.type='button';b.textContent='↻ Actualiser';b.title='Vérifier et charger la dernière version';
 b.style.cssText='position:fixed;right:14px;top:calc(14px + env(safe-area-inset-top,0px));z-index:9999;background:#12171b;color:#fff;border:1px solid #e11b2b;border-radius:12px;padding:10px 13px;font-weight:800;box-shadow:0 8px 22px #0008';
 b.onclick=forceDayzGateRefresh;document.body.appendChild(b);
}
if('serviceWorker' in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  try{
   if(sessionStorage.getItem(DAYZ_RELOAD_KEY)==='1')return;
   sessionStorage.setItem(DAYZ_RELOAD_KEY,'1');
  }catch{}
  location.reload();
 });
 window.addEventListener('load',async()=>{
  mountDayzRefreshButton();
  try{
   dayzGateSw=await navigator.serviceWorker.register('/sw.js?v='+DAYZ_PWA_VERSION,{scope:'/',updateViaCache:'none'});
   await dayzGateSw.update().catch(()=>{});
  }catch{}
 });
}else window.addEventListener('load',mountDayzRefreshButton);
window.forceDayzGateRefresh=forceDayzGateRefresh;

const gateMobileGuildStyle=document.createElement('style');gateMobileGuildStyle.textContent=`
/* DayZ Gate visible mobile Discord strip v15 */
.gate-mobile-guild-strip{display:none}
@media(max-width:800px){
 .gate-mobile-guild-strip:not([hidden]){
   position:fixed;left:0;right:0;top:calc(var(--gate-header) + env(safe-area-inset-top,0px));z-index:61;
   height:64px;padding:7px 10px;display:flex;align-items:center;gap:10px;
   background:rgba(18,21,24,.97);border-bottom:1px solid rgba(225,27,43,.30);
   box-shadow:0 8px 24px #0007;backdrop-filter:blur(16px)
 }
 .gate-mobile-guild-strip>strong{font-size:10px;letter-spacing:.13em;color:#8f989e;writing-mode:vertical-rl;transform:rotate(180deg)}
 .gate-mobile-guild-scroll{display:flex;align-items:center;gap:9px;overflow-x:auto;overflow-y:hidden;min-width:0;flex:1;scrollbar-width:none}
 .gate-mobile-guild-scroll::-webkit-scrollbar{display:none}
 .gate-mobile-guild-strip .gate-guild-btn{width:46px;height:46px;min-width:46px;min-height:46px;flex:0 0 46px;border-radius:50%}
 .gate-mobile-guild-strip .gate-guild-btn.active:before{display:none}
 .gate-menu-open .gate-mobile-guild-strip{display:none!important}
 .shell,.main{padding-top:calc(var(--gate-header) + 76px + env(safe-area-inset-top,0px))!important}
}
`;document.head.appendChild(gateMobileGuildStyle);
