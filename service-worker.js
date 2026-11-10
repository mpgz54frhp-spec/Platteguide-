const C='platteguide-v17';
const F=['./','index.html','style.css','app.js','milling.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/icon-180.png','icons/wnmg.svg','icons/endmill-head.svg','icons/drill.svg','data/materials.json','data/operations.json','data/insert-shapes.json','data/manufacturers.json','data/rules.json','data/palbit.json','data/start.json','data/guide.json','data/sandvik-values.json','data/palbit-values.json','data/milling.json'];
// Installation: hent alt frisk. Første gang aktiveres straks; ved opdatering venter den nye version, til brugeren trykker "opdater".
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>Promise.allSettled(F.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>{if(r.ok)return c.put(u,r)})))));
  if(!self.registration.active)self.skipWaiting();
});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Cache først (hurtigt, også på dårligt net), opdatér cachen i baggrunden. Kun gode svar caches. Aldrig undefined tilbage.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    const c=await caches.open(C);
    const m=await c.match(e.request,{ignoreSearch:e.request.mode==='navigate'});
    const net=fetch(e.request).then(r=>{if(r&&r.ok)c.put(e.request,r.clone()).catch(()=>{});return r});
    if(m){e.waitUntil(net.catch(()=>{}));return m}
    try{return await net}
    catch(err){
      if(e.request.mode==='navigate'){const i=(await c.match('index.html'))||(await c.match('./'));if(i)return i}
      return new Response('Offline',{status:503,statusText:'Offline'});
    }
  })());
});
