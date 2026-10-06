const CACHE='dayz-gate-v15-discord';
const ASSETS=['/','/app.js?v=15','/help.js?v=15','/i18n.js?v=15','/ai-worker.js?v=15','/manifest-dayz-gate-2026.webmanifest','/dayz-gate-official-2026.svg','/dayz-tools.js?v=15'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('dayz-gate-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
 event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
   if(response.ok&&ASSETS.some(a=>a.split('?')[0]===url.pathname))caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));
   return response;
 }).catch(()=>caches.match(event.request).then(response=>response||(event.request.mode==='navigate'?caches.match('/'):Response.error()))));
});
