const C='platteguide-v1';
const F=['./','index.html','style.css','app.js','manifest.webmanifest','icons/icon.svg','data/materials.json','data/operations.json','data/insert-shapes.json','data/manufacturers.json','data/rules.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
