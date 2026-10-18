const CACHE='dayz-gate-v27-motion-bc-20261018';
const ASSETS=['/','/app.js?v=25','/help.js?v=18','/i18n.js?v=23','/ai-worker.js?v=18','/manifest-dayz-gate-2026.webmanifest','/dayz-gate-official-2026.svg?v=24','/dayz-tools.js?v=18','/dayz-premium-3d.css?v=20261018-premium-1','/dayz-premium-3d.js?v=20261018-premium-1','/dayz-motion-bc.css?v=20261018-bc-1','/dayz-motion-bc.js?v=20261018-bc-1'];
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
