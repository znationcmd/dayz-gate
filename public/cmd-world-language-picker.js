/* CMD universal language picker — 8148 ISO 639-3 / BCP47 entries.
 * A language preference is NOT a claim that every interface text is translated.
 * Works without cookies, API keys, databases, tracking or paid services.
 */
(function(){
 "use strict";
 if(typeof window==="undefined"||window.CMDWorldLanguagePicker)return;
 const tag=/^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,5}(?:-x(?:-[a-z0-9]{1,8}){1,5})?$/i;
 const originalChoices=["fr","en","us","de","es","it","ru","ko","ja","zh","co","pt"];
 const status={languages:null,loading:null};
 const STORE="cmd-world-language",MODE="cmd-world-language-mode",PAGE_SIZE=75;
 const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const write=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
 const existing=()=>read(STORE)||"fr";
 function detect(){
  const langs=[...(Array.isArray(navigator.languages)?navigator.languages:[]),navigator.language];
  try{langs.push(Intl.DateTimeFormat().resolvedOptions().locale)}catch{}
  const preferred=langs.map(validate).find(Boolean)||"fr";let zone="";
  try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch{}
  const zones={"Europe/Berlin":"de-DE","Europe/Rome":"it-IT","Europe/Madrid":"es-ES",
    "Europe/Paris":"fr-FR","Europe/Lisbon":"pt-PT","Europe/Vienna":"de-AT",
    "Europe/Amsterdam":"nl-NL","Europe/London":"en-GB","Europe/Warsaw":"pl-PL",
    "Europe/Prague":"cs-CZ","Europe/Stockholm":"sv-SE","Europe/Copenhagen":"da-DK",
    "Asia/Tokyo":"ja-JP","Asia/Seoul":"ko-KR","Asia/Kolkata":"hi-IN",
    "America/Sao_Paulo":"pt-BR","America/Mexico_City":"es-MX"};
  if(zones[zone])return zones[zone];
  const multilingual={"Europe/Zurich":"CH","Europe/Brussels":"BE","America/Toronto":"CA"};
  if(multilingual[zone])return validate(preferred.split("-")[0]+"-"+multilingual[zone])||preferred;
  return preferred;
 }
 function initLocale(){
  const old=read(STORE),mode=read(MODE);
  if(old&&!mode)write(MODE,"manual"); // Previously selected users keep their choice.
  if(old&&(mode==="manual"||!mode))return old;
  const code=detect();write(STORE,code);write(MODE,"auto");return code;
 }
 const root=document.createElement("div");
 root.id="cmd-world-language-root";
 root.style.cssText="position:fixed;right:14px;bottom:14px;z-index:2147483000;pointer-events:none";
 const shadow=root.attachShadow({mode:"open"});
 const style=document.createElement("style");
 style.textContent=`
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}
.trigger{pointer-events:auto;display:flex;gap:6px;align-items:center;justify-content:center;min-width:51px;min-height:48px;padding:9px;border:1px solid #9772ff;color:#fff;border-radius:15px;background:linear-gradient(145deg,#281443,#111322);box-shadow:0 8px 28px #0008}
.panel{pointer-events:auto;position:absolute;bottom:58px;right:0;width:min(360px,calc(100vw - 25px));height:min(510px,calc(100dvh - 100px));padding:16px;display:flex;flex-direction:column;gap:10px;color:#f8f4ff;border:1px solid #9b69ec;border-radius:18px;background:#111323;box-shadow:0 14px 40px #000b;font:14px/1.4 system-ui,-apple-system,Arial,sans-serif}
.panel[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}.head strong{font-size:16px}
.close{border:1px solid #65517c;border-radius:10px;background:#27203b;color:#fff;padding:5px 12px}
input{min-height:42px;border:1px solid #604984;border-radius:10px;background:#202239;color:#fff;padding:9px;width:100%;outline-offset:2px}
.results{min-height:80px;overflow-y:auto;flex:1;border:1px solid #2d2541;border-radius:9px}
.choice{display:block;width:100%;background:transparent;color:#e9e6f5;border:0;border-bottom:1px solid #342e4c;text-align:left;padding:9px 10px;overflow-wrap:anywhere}
.choice:hover,.choice:focus{background:#352052}
.muted{font-size:12px;color:#cfc4e9;line-height:1.45;margin:0}
.status{font-size:12px;color:#bcefd3;min-height:20px;overflow-wrap:anywhere}
.auto{display:flex;align-items:center;gap:9px;cursor:pointer;color:#efe6ff;font-size:13px}
.auto input{width:20px;height:20px;min-height:20px}
.more{width:100%;min-height:44px;border:1px solid #775ea1;border-radius:10px;background:#23233d;color:#fff;padding:11px}
.counter{font-size:12px;color:#d5cbe7;margin:0}
.alphabet{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;flex:none}
.letter{background:#231935;color:#ece3ff;border:1px solid #735c9b;border-radius:8px;min-width:0;min-height:39px;font-weight:750;padding:3px}
.letter[aria-pressed="true"]{border-color:#70dafa;background:#403064;box-shadow:0 0 0 1px #70dafa55}
.letter:focus-visible{outline:2px solid #fff;outline-offset:1px}

`;
 const trigger=document.createElement("button");trigger.type="button";trigger.className="trigger";
 trigger.setAttribute("aria-label","Choisir une langue ou un dialecte");
 trigger.title="Langues du monde, y compris le suisse allemand";trigger.textContent="🌐";
 const panel=document.createElement("section");panel.className="panel";panel.hidden=true;
 panel.setAttribute("aria-label","Langues et dialectes du monde");panel.setAttribute("role","dialog");
 const head=document.createElement("div");head.className="head";
 const title=document.createElement("strong");title.textContent="🌐 Langues du monde";
 const close=document.createElement("button");close.type="button";close.className="close";close.textContent="Fermer";head.append(title,close);
 const query=document.createElement("input");query.type="search";query.placeholder="Rechercher : suisse allemand, bernois, gsw-CH…";
 query.setAttribute("aria-label","Rechercher une langue ou un dialecte");
 const automatic=document.createElement("label");automatic.className="auto";
 const checkbox=document.createElement("input");checkbox.type="checkbox";
 const autoLabel=document.createElement("span");autoLabel.textContent="🌍 Détecter la langue automatiquement";
 automatic.append(checkbox,autoLabel);
 const autoInfo=document.createElement("p");autoInfo.className="muted";
 const counter=document.createElement("p");counter.className="counter";
 const alphabet=document.createElement("div");alphabet.className="alphabet";
 alphabet.setAttribute("role","group");alphabet.setAttribute("aria-label","Langues classées par lettre de A à Z");
 const letters=["Toutes",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ","#"];let letter="";
 for(const key of letters){
  const item=document.createElement("button");item.type="button";item.className="letter";item.dataset.letter=key;
  item.textContent=key==="Toutes"?"Tout":key==="#"?"Autres":key;
  item.setAttribute("aria-label",key==="Toutes"?"Toutes les langues":key==="#"?"Langues à écriture non latine et autres": "Langues commençant par "+key);
  item.setAttribute("aria-pressed",String(key==="Toutes"));
  alphabet.append(item);
 }
 function showLetters(){alphabet.querySelectorAll("[data-letter]").forEach(el=>el.setAttribute("aria-pressed",String((el.dataset.letter==="Toutes"?"":el.dataset.letter)===letter)))}
 const results=document.createElement("div");results.className="results";results.setAttribute("role","group");
 const custom=document.createElement("input");custom.type="text";custom.maxLength=64;
 custom.placeholder="Code régional personnel : gsw-CH-x-bern";
 custom.setAttribute("aria-label","Code de langue régional BCP 47");
 const applyCustom=document.createElement("button");applyCustom.type="button";applyCustom.className="close";applyCustom.textContent="Utiliser ce code";
 const note=document.createElement("p");note.className="muted";
 note.textContent="Les 8 148 codes identifient des langues, pas 8 148 traductions. Si une interface n'est pas traduite, elle garde sa langue existante. Le dialecte suisse allemand peut utiliser l'allemand standard comme secours.";
 const msg=document.createElement("p");msg.className="status";msg.setAttribute("role","status");
 const customRow=document.createElement("details");const summary=document.createElement("summary");
 summary.textContent="Autres dialectes (code régional facultatif)";
 const customControls=document.createElement("div");customControls.append(custom,applyCustom);
 customRow.append(summary,customControls);
 panel.append(head,automatic,autoInfo,query,alphabet,counter,results,customRow,note,msg);
 shadow.append(style,panel,trigger);
 function fallback(code){
  const base=String(code).split("-")[0].toLowerCase();
  return ({gsw:"de",fra:"fr",eng:"en",deu:"de",ger:"de",spa:"es",ita:"it",zho:"zh",cos:"co",por:"pt"})[base]||base;
 }
 function validate(input){
  const raw=String(input||"").trim();if(!tag.test(raw)||raw.length>64)return null;
  try{return Intl.getCanonicalLocales(raw)[0]||null}catch{return null}
 }
 function save(code,label,mode="manual"){
  const safe=validate(code);if(!safe){msg.textContent="Code BCP 47 invalide.";return}
  const fb=fallback(safe);
  write(STORE,safe);write(MODE,mode);checkbox.checked=mode==="auto";
  document.documentElement.lang=safe;
  const ids=["language","mobile-language","lng","cmd-sphere-language","cmdLanguageChoice","cmdSettingsLanguagePicker"];
  for(const id of ids){
   const select=document.getElementById(id);
   if(!select||select.tagName!=="SELECT")continue;
   const candidates=[safe,fb,fb==="en"?"us":""];
   const match=candidates.find(c=>c&&[...select.options].some(option=>option.value===c));
   if(match&&select.value!==match){
    select.value=match;select.dispatchEvent(new Event("change",{bubbles:true}));
   }
  }
  const known=originalChoices.includes(fb);
  if(known){
   const legacyKeys=["cmdLang","cmdpad-language","cmdpad-ui-lang","dayz-gate-language","ark-language","cmd-browser-lang"];
   for(const key of legacyKeys){try{if(localStorage.getItem(key)!==null)localStorage.setItem(key,fb)}catch{}}
  }
  window.dispatchEvent(new CustomEvent("cmd-world-language-change",{detail:{language:safe,fallback:fb,mode}}));
  msg.textContent="✓ "+(label||safe)+" · "+safe+" · "+(mode==="auto"?"automatique":"manuel")+". "+(safe!==fb?"Interface existante : "+fb+" si disponible.":"");
  autoInfo.textContent=mode==="auto"?"Langue déduite de la langue et de la région de l'appareil, sans GPS.":"Choix personnel conservé jusqu'à changement.";
  if(status.languages)render();
  trigger.setAttribute("aria-label","Langue choisie : "+safe);
  trigger.title="Langue : "+safe;
 }
 let matched=[],shown=0;
 function nextPage(){
  results.querySelector('[data-cmd-more]')?.remove();
  const end=Math.min(shown+PAGE_SIZE,matched.length),active=existing();
  for(let i=shown;i<end;i++){
   const [code,name]=matched[i];const button=document.createElement("button");
   button.type="button";button.className="choice";
   button.setAttribute("aria-pressed",String(code===active));
   button.textContent=(code===active?"✓ ":"")+name+" · "+code;
   button.addEventListener("click",()=>save(code,name));results.append(button);
  }
  shown=end;
  counter.textContent=shown.toLocaleString("fr-FR")+" / "+matched.length.toLocaleString("fr-FR")+" langues affichées";
  if(shown<matched.length){
   const more=document.createElement("button");more.type="button";more.className="more";more.dataset.cmdMore="1";
   more.textContent="Afficher la suite · "+(matched.length-shown).toLocaleString("fr-FR")+" restantes";
   more.addEventListener("click",nextPage);results.append(more);
  }
 }
 function render(){
  results.replaceChildren();shown=0;matched=[];
  if(!status.languages){results.textContent="Chargement du catalogue…";return}
  const queryText=query.value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  if(!queryText&&letter){
   for(const [code,name] of status.languages){
    const first=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").charAt(0).toUpperCase();
    if(letter==="#"?!/^[A-Z]$/.test(first):first===letter)matched.push([code,name]);
   }
  }else if(!queryText){
   const byCode=new Map(status.languages),seen=new Set();
   const priority=[existing(),"fr","en","de","es","it","co","gsw-CH","gsw-CH-x-bern","gsw-CH-x-zueri","gsw-CH-x-basel","gsw-CH-x-wallis","gsw-CH-x-luzern"];
   for(const code of priority)if(byCode.has(code)&&!seen.has(code)){matched.push([code,byCode.get(code)]);seen.add(code)}
   for(const entry of status.languages)if(!seen.has(entry[0])){matched.push(entry);seen.add(entry[0])}
  }else{
   for(const [code,name] of status.languages){
    const full=(code+" "+name).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    if(full.includes(queryText))matched.push([code,name]);
   }
  }
  if(matched.length)nextPage();else{
   counter.textContent="0 langue trouvée";
   results.textContent="Aucune langue trouvée. Essaie un autre nom ou un code.";
  }
 }
 async function load(){
  if(status.languages)return;
  if(!status.loading){
   status.loading=fetch("/cmd-world-languages.json",{cache:"force-cache"})
    .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(o=>{if(!Array.isArray(o.languages)||o.languages.length<8000)throw Error("Catalogue incomplet");status.languages=o.languages})
    .catch(e=>{msg.textContent="Catalogue indisponible : "+e.message+". Saisie régionale possible.";results.textContent="Recherche indisponible."})
    .finally(()=>{status.loading=null;render()});
  }
  await status.loading;
 }
 async function toggle(){panel.hidden=!panel.hidden;trigger.setAttribute("aria-expanded",String(!panel.hidden));if(!panel.hidden){query.focus();await load();}}
 trigger.addEventListener("click",toggle);
 close.addEventListener("click",()=>{panel.hidden=true;trigger.setAttribute("aria-expanded","false");trigger.focus()});
 query.addEventListener("input",()=>{letter="";showLetters();render()});
 alphabet.addEventListener("click",event=>{
  const button=event.target.closest("button[data-letter]");
  if(!button||!alphabet.contains(button))return;
  letter=button.dataset.letter==="Toutes"?"":button.dataset.letter;
  query.value="";showLetters();render();
 });
 checkbox.addEventListener("change",()=>{if(checkbox.checked)save(detect(),"Langue de l'appareil","auto");else save(existing(),"Langue actuelle","manual")});
 applyCustom.addEventListener("click",()=>save(custom.value,custom.value));
 custom.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();save(custom.value,custom.value)}});
 document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!panel.hidden){panel.hidden=true;trigger.setAttribute("aria-expanded","false")}});
 document.addEventListener("DOMContentLoaded",()=>{if(!document.getElementById(root.id))document.body.append(root)},{once:true});
 if(document.readyState!=="loading")document.body.append(root);
 const saved=initLocale();checkbox.checked=read(MODE)==="auto";
 autoInfo.textContent=checkbox.checked?"Langue détectée : "+saved+" (appareil et région, sans GPS).":"Langue choisie personnellement : "+saved;
 if(validate(saved))document.documentElement.lang=saved;
 if(checkbox.checked)window.addEventListener("DOMContentLoaded",()=>window.dispatchEvent(
  new CustomEvent("cmd-world-language-change",{detail:{language:saved,fallback:fallback(saved),mode:"auto"}})
 ),{once:true});
 window.CMDWorldLanguagePicker={get language(){return existing()},open:()=>{if(panel.hidden)void toggle()},set:(code)=>save(code,code)};
})();
