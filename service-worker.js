const C='platteguide-v7';
const F=['./','index.html','style.css','app.js','manifest.webmanifest','icons/icon.svg','data/materials.json','data/operations.json','data/insert-shapes.json','data/manufacturers.json','data/rules.json','data/grades.json','data/palbit.json','data/start.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Network-first: nye versioner hentes straks, cache bruges kun offline
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)));
});
