// Røgtest: node tests/smoke.js  (kræver Playwright med Chromium)
const {chromium}=require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{
  let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
  const f=path.join(ROOT,path.normalize(p));
  if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);
});
const fejl=[];const ok=(navn,betingelse)=>{console.log((betingelse?'✅ ':'❌ ')+navn);if(!betingelse)fejl.push(navn)};
(async()=>{
  await new Promise(r=>srv.listen(0,r));const U='http://localhost:'+srv.address().port+'/';
  const b=await chromium.launch();
  const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const p=await c.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  const next=()=>p.click('[data-act="next"]');
  // drejning
  await p.goto(U+'?reset');await p.click('[data-op="turn"]');await next();
  await p.click('[data-m="P"]');await p.click('[data-s="P2"]');await next();
  await p.click('[data-sh="WNMG"]');await p.selectOption('[data-k="ic"]','08');await p.selectOption('[data-k="tyk"]','04');await p.selectOption('[data-k="rad"]','12');await next();
  await p.click('[data-b="skrub"]');await next();await next();await p.waitForSelector('.rhead');
  ok('drejning: WNMG080412 P2 skrub giver Sandvik-forslag',(await p.innerText('#app')).includes('WNMG 08 04 12-PR 4425'));
  // skadelig tekst i felt skal ende som ren tekst
  await p.fill('#kval','"><b id="x">4425</b>');await p.dispatchEvent('#kval','change');await p.waitForSelector('.rhead');
  ok('felt-input renses (ingen HTML-indsprøjtning)',await p.$('#x')===null&&(await p.inputValue('#kval'))==='b idx4425/b');
  // fræsning
  await p.goto(U+'?reset');await p.click('[data-op="mill"]');await next();
  await p.click('[data-m="P"]');await p.click('[data-s="P2"]');await next();
  await p.click('[data-mt="skulder"]');await next();await p.click('[data-b="medium"]');await next();await next();await p.waitForSelector('.rhead');
  const t=await p.innerText('#app');
  ok('fræsning: Palbit-linjer og Sandvik-serier vises',/linjer med skæredata/.test(t)&&/CoroMill 490/.test(t));
  ok('fræsning: sammenligningstabel vises',await p.$('table.cmp')!==null);
  // ødelagte gemte data må ikke give fejlskærm
  await p.evaluate(()=>localStorage.setItem('pg',JSON.stringify({v:3,op:'mill',mat:'P',sub:'P2',bearb:'slut',mtype:'<img src=x>',fav:[{op:'turn',mat:'P',sub:'<script>',bearb:'slut'},null,7],recent:'x',brk:'<i>'})));
  await p.goto(U);await p.waitForSelector('[data-op="turn"]');
  ok('ødelagte gemte data sorteres fra',!(await p.innerText('#app')).includes('Noget gik galt')&&await p.$('.hq')===null);
  ok('ingen konsolfejl (inkl. CSP)',errs.length===0);if(errs.length)console.log(errs);
  await b.close();srv.close();
  if(fejl.length){console.log('\nFEJL: '+fejl.join('; '));process.exit(1)}console.log('\nAlt ok');
})().catch(e=>{console.error(e);process.exit(1)});
