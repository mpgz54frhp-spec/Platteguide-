const C='platteguide-v11';
const F=['./','index.html','style.css','app.js','manifest.webmanifest','icons/icon.svg','icons/wnmg.svg','icons/endmill-head.svg','icons/drill.svg','data/materials.json','data/operations.json','data/insert-shapes.json','data/manufacturers.json','data/rules.json','data/palbit.json','data/start.json','data/guide.json','data/sandvik-values.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.allSettled(F.map(u=>c.add(u)))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Network-first. Kun gode svar caches. Aldrig undefined tilbage: cache -> index.html -> 503.
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    try{const r=await fetch(e.request);if(r&&r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{})}return r}
    catch(err){
      const m=await caches.match(e.request);if(m)return m;
      if(e.request.mode==='navigate'){const i=(await caches.match('index.html'))||(await caches.match('./'));if(i)return i}
      return new Response('Offline',{status:503,statusText:'Offline'});
    }
  })());
});
