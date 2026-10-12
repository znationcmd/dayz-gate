/* CMD PWA Auto Update — checks every new Railway deployment, never removes local data. */
(()=>{"use strict";if(!("serviceWorker"in navigator)||!window.isSecureContext)return;
const versionKey="cmd-pwa-version-"+location.host;
let current=null,pending=null,busy=false,lastReload=0;
const isEditing=()=>!!(document.activeElement&&document.activeElement.matches?.("input,textarea,[contenteditable],select"))||
!!document.querySelector("[data-unsaved='true'],[data-dirty='true'],dialog[open],.modal.show");
function canReload(){return !document.hidden&&!isEditing()&&(!lastReload||Date.now()-lastReload>20000)}
async function activate(next){if(!next||!canReload()){pending=next;return}lastReload=Date.now();
try{sessionStorage.setItem(versionKey,next)}catch{}
try{const r=await navigator.serviceWorker.getRegistration("/");if(r)await r.update().catch(()=>{})}catch{}
location.reload();}
async function check(){if(busy)return;busy=true;try{
const res=await fetch("/api/pwa/version?nocache="+Date.now(),{cache:"no-store",headers:{"accept":"application/json"}});if(!res.ok)return;
const data=await res.json(),v=String(data.version||"");if(!v)return;
if(!current){try{current=sessionStorage.getItem(versionKey)||localStorage.getItem(versionKey)||null}catch{}}
if(!current){current=v;try{sessionStorage.setItem(versionKey,v);localStorage.setItem(versionKey,v)}catch{};return}
if(v!==current){pending=v;try{localStorage.setItem(versionKey,v)}catch{};await activate(v);return}
if(pending){const p=pending;pending=null;await activate(p)}
}catch{}finally{busy=false}}
window.addEventListener("pageshow",check);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
document.addEventListener("focus",check);
setInterval(()=>{if(!document.hidden)check()},90000);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",check,{once:true});else check();
})();