'use strict';
const V=3;
const D={};
const blank=()=>({op:null,mat:null,sub:null,shapes:[],bearb:null,r:'',ap:'',f:'',vc:'',mdl:{ic:'',tyk:'',rad:''},brk:'',kval:''});
const S=Object.assign({v:V,step:0,back:false,recent:[],fav:[],theme:'auto',fold:{}},blank());
const $=s=>document.querySelector(s), app=$('#app');
const STEPS=['Operation','Materiale','Plattetype','Bearbejdning','Data','Resultat'];
const fmt=v=>String(v).replace('.',',');
const num=v=>parseFloat(String(v).replace(',','.'));
const MN={sandvik:'Sandvik',palbit:'Palbit'};
const RADIER=[0.4,0.8,1.2,1.6,2.4];

/* ---------- start, nulstilling, fejlskærm ---------- */
async function getJSON(n,valgfri){
  try{const r=await fetch(`data/${n}.json`);if(!r.ok)throw new Error(`${n}.json: ${r.status}`);return await r.json()}
  catch(e){if(valgfri)return null;throw e}
}
async function hardReset(genindlaes=true){
  try{localStorage.removeItem('pg')}catch(e){}
  try{const rs=await navigator.serviceWorker?.getRegistrations?.();for(const r of rs||[])await r.unregister()}catch(e){}
  try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}
  if(genindlaes)location.replace(location.pathname);
}
function fatal(e){
  console.error(e);
  app.innerHTML=`<div class="card warn"><h2>Noget gik galt</h2><p>Appen kunne ikke vises. Det skyldes ofte gamle gemte data eller dårlig forbindelse.</p><p class="mut">${String(e&&e.message||e).replace(/</g,'&lt;')}</p><button class="primary" id="fx">Nulstil og prøv igen</button></div>`;
  $('#trin').textContent='';
  $('#fx').onclick=()=>hardReset(true);
}
async function load(){
  try{
    if(new URLSearchParams(location.search).has('reset')){await hardReset(false);history.replaceState(null,'',location.pathname)}
    for(const n of ['materials','operations','insert-shapes','manufacturers','rules','palbit','start','guide'])D[n]=await getJSON(n);
    D.svv=(await getJSON('sandvik-values',true))||{};
    restore();applyTheme();
    $('#theme').onclick=()=>{S.theme={auto:'light',light:'dark',dark:'auto'}[S.theme]||'auto';save();applyTheme()};
    if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
    render();
  }catch(e){fatal(e)}
}
function applyTheme(){
  document.documentElement.dataset.theme=S.theme;
  $('#theme').textContent={auto:'🌓',light:'☀️',dark:'🌙'}[S.theme]||'🌓';
  $('#theme').title='Udseende: '+({auto:'automatisk',light:'lyst',dark:'mørkt'}[S.theme]);
}
function restore(){
  let o={};try{o=JSON.parse(localStorage.getItem('pg')||'{}')||{}}catch(e){}
  Object.assign(S,blank(),{v:V,back:false,recent:Array.isArray(o.recent)?o.recent.slice(0,5):[],fav:Array.isArray(o.fav)?o.fav.slice(0,12):[],theme:['auto','light','dark'].includes(o.theme)?o.theme:'auto',fold:(o.fold&&typeof o.fold==='object')?o.fold:{}});
  if(o.op==='turn_od'||o.op==='turn_id')o.op='turn';
  const ops=D.operations.operations, opObj=ops.find(x=>x.id===o.op&&!x.snart);
  const grpO=D.materials.groups.find(g=>g.id===o.mat), subOk=grpO&&grpO.sub.some(s=>s.id===o.sub);
  if(opObj)S.op=opObj.id;
  if(grpO){S.mat=grpO.id;if(subOk)S.sub=o.sub}
  if(D.operations.bearbejdning.some(b=>b.id===o.bearb))S.bearb=o.bearb;
  if(Array.isArray(o.shapes))S.shapes=o.shapes.filter(x=>typeof x==='string').slice(0,12);
  if(o.mdl&&typeof o.mdl==='object')S.mdl={ic:String(o.mdl.ic||''),tyk:String(o.mdl.tyk||''),rad:String(o.mdl.rad||'')};
  for(const k of ['r','ap','f','vc','brk','kval'])if(typeof o[k]==='string'||typeof o[k]==='number')S[k]=String(o[k]);
  S.step=(S.op&&S.sub&&S.bearb)?5:0;
}
const save=()=>{try{localStorage.setItem('pg',JSON.stringify(S))}catch(e){}};
const op=()=>D.operations.operations.find(o=>o.id===S.op);
const grp=()=>D.materials.groups.find(g=>g.id===S.mat);

/* ---------- navigation og rulning ---------- */
let PS=null; const sc=id=>{PS=id};
function doScroll(){if(!PS)return;const el=document.getElementById(PS);PS=null;if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;requestAnimationFrame(()=>el.scrollIntoView({behavior:calm?'auto':'smooth',block:'start'}))}
function go(n){S.step=n;save();render();scrollTo(0,0)}
function nav(prev,nextOk,nextLabel='Næste →'){
  const tilbage=S.back&&S.step<5;
  return `<div class="nav" id="sec-nav">${prev&&!tilbage?'<button data-act="prev">← Tilbage</button>':''}${tilbage?`<button class="primary" data-act="toresult" ${nextOk?'':'disabled'}>Tilbage til resultat →</button>`:(nextOk!==null?`<button class="primary" data-act="next" ${nextOk?'':'disabled'}>${nextLabel}</button>`:'')}</div>`;
}
function bindNav(){
  app.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==='prev')go(S.step-1);else if(a==='next')go(S.step+1);
    else if(a==='toresult'){S.back=false;go(5)}
    else if(a==='reset'){const k=S.theme,rc=S.recent,fv=S.fav,fd=S.fold;localStorage.removeItem('pg');Object.assign(S,blank(),{step:0,back:false,recent:rc,fav:fv,theme:k,fold:fd});save();render()}
  });
}
function render(){
  try{
    $('#trin').textContent=`Trin ${S.step+1}/${STEPS.length}: ${STEPS[S.step]}${S.back&&S.step<5?' · retter valg':''}`;
    ({0:r0,1:r1,2:r2,3:r3,4:r4,5:r5})[S.step]();
    doScroll();
  }catch(e){fatal(e)}
}

/* ---------- hjælpere om platten ---------- */
function shapesList(){
  if(op()?.drejning)return D['insert-shapes'].turning.filter(s=>s.kode!=='Andet');
  return D['insert-shapes'].andre[S.op]||[];
}
function baseKode(){return S.shapes.length===1&&/^[A-Z]{4}$/.test(S.shapes[0])?S.shapes[0]:null}
function modelKode(){
  const b=baseKode(); if(!b)return S.shapes.length?S.shapes.join(', '):'';
  const m=S.mdl||{}; return b+(m.ic||'__')+(m.tyk||'__')+(m.rad||'__');
}
const utenBryder=()=>{const b=baseKode();return !!b&&b[3]==='A'};
const modelKomplet=()=>{const b=baseKode(),m=S.mdl||{};return !!(b&&m.ic&&m.tyk&&m.rad)};
const sandvikKode=(br,kv)=>{const m=S.mdl||{},b=baseKode();return b?`${b} ${m.ic} ${m.tyk} ${m.rad}${br?'-'+br:''}${kv?' '+kv:''}`:''};
const palbitKode=(br,kv)=>{const m=S.mdl||{},b=baseKode();return b?`${b} ${m.ic}${m.tyk}${m.rad}${br?'-'+br:''}${kv?' '+kv:''}`:''};
function shapeIcon(l){
  const P={C:'2,20 20,4.9 38,20 20,35.1',D:'2,20 20,10.6 38,20 20,29.4',V:'2,20 20,14.3 38,20 20,25.7',T:'20,4 37,34 3,34',S:'6,6 34,6 34,34 6,34'}[l];
  if(l==='W'){const t=[20,100,20,100,20,100];let d=0,x=0,y=0;const pts=[[0,0]];for(const a of t){x+=Math.cos(d*Math.PI/180);y-=Math.sin(d*Math.PI/180);pts.push([x,y]);d+=a}pts.pop();
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys),k=32/Math.max(w,h);
    const q=pts.map(p=>[(4+(p[0]-Math.min(...xs))*k+(32-w*k)/2).toFixed(1),(4+(p[1]-Math.min(...ys))*k+(32-h*k)/2).toFixed(1)].join(',')).join(' ');
    return `<svg class="shp" viewBox="0 0 40 40"><polygon points="${q}"/><circle cx="20" cy="20" r="3"/></svg>`}
  if(l==='R')return `<svg class="shp" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15"/><circle cx="20" cy="20" r="3"/></svg>`;
  return P?`<svg class="shp" viewBox="0 0 40 40"><polygon points="${P}"/><circle cx="20" cy="20" r="3"/></svg>`:'';
}
const key=e=>JSON.stringify([e.op,e.mat,e.sub,e.bearb,e.shapes,e.mdl]);
const completeSel=()=>!!(S.op&&S.mat&&S.sub&&S.bearb);
function entry(){return {op:S.op,mat:S.mat,sub:S.sub,bearb:S.bearb,shapes:[...S.shapes],mdl:{...S.mdl},brk:S.brk,kval:S.kval,r:S.r,ap:S.ap,f:S.f,vc:S.vc}}
const label=e=>`${e.sub} · ${e.bearb} · ${e.mdl&&e.mdl.ic&&e.shapes.length===1?e.shapes[0]+e.mdl.ic+e.mdl.tyk+e.mdl.rad:(e.shapes.join(', ')||'alle typer')}`;
function pushRecent(){
  if(!completeSel())return; const e=entry(), k=key(e);
  S.recent=[e,...S.recent.filter(x=>key(x)!==k)].slice(0,5);save();
}
const isFav=()=>S.fav.some(x=>key(x)===key(entry()));
function toggleFav(){const k=key(entry());S.fav=S.fav.some(x=>key(x)===k)?S.fav.filter(x=>key(x)!==k):[entry(),...S.fav].slice(0,12);save()}
function openEntry(e){Object.assign(S,blank(),{back:false},JSON.parse(JSON.stringify(e)));S.step=5;save();render();scrollTo(0,0)}

/* ---------- trin 1: operation ---------- */
function r0(){
  const hist=[...S.fav.map(e=>({e,fav:true})),...S.recent.filter(e=>!S.fav.some(f=>key(f)===key(e))).map(e=>({e,fav:false}))].slice(0,6);
  app.innerHTML=`${hist.length?`<h2>Hurtigstart</h2><div class="grid">${hist.map((h,i)=>`<button class="hq" data-hq="${i}">${h.fav?'⭐':'🕘'} <b>${label(h.e)}</b></button>`).join('')}</div>`:''}
  <h2 style="margin-top:1.2rem">Hvad skal du lave?</h2><div class="grid">${D.operations.operations.map(o=>o.snart
    ?`<button class="op snart" disabled><img class="opimg" src="${o.billede}" alt=""><b>${o.navn}</b><br><span class="badge" style="background:#6b7585">Kommer snart</span></button>`
    :`<button data-op="${o.id}" class="op ${S.op===o.id?'sel':''}"><img class="opimg" src="${o.billede}" alt=""><b>${o.navn}</b></button>`).join('')}</div>${nav(false,!!S.op)}`;
  app.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{if(S.op!==b.dataset.op){S.shapes=[]}S.op=b.dataset.op;sc('sec-nav');save();render()});
  app.querySelectorAll('[data-hq]').forEach(b=>b.onclick=()=>openEntry(hist[+b.dataset.hq].e));
  bindNav();
}

/* ---------- trin 2: materiale ---------- */
function r1(){
  const g=grp();
  app.innerHTML=`<h2>Materiale (ISO)</h2><div class="grid">${D.materials.groups.map(x=>`<button data-m="${x.id}" class="${S.mat===x.id?'sel':''}"><span class="badge" style="background:${x.farve}">${x.id}</span>${x.navn.replace(/^. – /,'')}</button>`).join('')}</div>
  ${g?`<h3 id="sec-sub">Undergruppe</h3><div class="grid">${g.sub.map(s=>`<button data-s="${s.id}" class="${S.sub===s.id?'sel':''}">${s.id} ${s.navn}</button>`).join('')}</div><p class="mut">${g.spaan}</p>`:''}
  ${nav(true,!!S.sub)}`;
  app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.mat=b.dataset.m;S.sub=null;sc('sec-sub');if(S.mat!=='K'){S.shapes=S.shapes.filter(k=>!(D['insert-shapes'].turning.find(t=>t.kode===k)||{}).uspaanbryder);S.mdl={ic:'',tyk:'',rad:''}}save();render()});
  app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{S.sub=b.dataset.s;sc('sec-nav');save();render()});
  bindNav();
}

/* ---------- trin 3: plattetype og model ---------- */
const palHas=re=>Object.keys(D.palbit.models).some(k=>re.test(k));
function r2(){
  const L=shapesList(), I=D['insert-shapes'].iso1832;
  const btn=s=>`<button data-sh="${s.kode}" class="shape ${S.shapes.includes(s.kode)?'sel':''}">${shapeIcon(s.kode[0])}<span><b>${s.kode}</b><br><span class="mut">${s.info}</span></span></button>`;
  const med=L.filter(s=>!s.uspaanbryder), neg=med.filter(s=>s.kode[1]==='N'), pos=med.filter(s=>s.kode[1]!=='N'), uden=S.mat==='K'?L.filter(s=>s.uspaanbryder):[];
  const grupper=op()?.drejning?`<h3>Negative (…N)</h3><div class="grid">${neg.map(btn).join('')}</div><h3>Positive</h3><div class="grid">${pos.map(btn).join('')}</div>${uden.length?`<h3>Uden spånbryder (…A) · kun støbejern</h3><div class="grid">${uden.map(btn).join('')}</div>`:'<p class="mut">Platter uden spånbryder (DNMA, WNMA m.fl.) vises kun ved støbejern (K).</p>'}`:`<div class="grid">${med.map(btn).join('')}</div>`;
  app.innerHTML=`<h2>Plattetype</h2><p class="mut">Vælg én type for at vælge præcis model. Vælger du ingen, gælder alle typer.</p>${grupper}${op()?.drejning?modelBygger(I):''}${nav(true,true)}`;
  app.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.sh;S.shapes=S.shapes.includes(k)?S.shapes.filter(x=>x!==k):[...S.shapes,k];S.mdl={ic:'',tyk:'',rad:''};sc(op()?.drejning&&S.shapes.length===1?'sec-model':'sec-nav');save();render()});
  app.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{S.mdl[el.dataset.k]=el.value;
    if(el.dataset.k==='rad'){const v=I.radius[el.value];if(v!==undefined)S.r=String(v)}
    if(modelKomplet())sc('sec-nav');save();render()});
  bindNav();
}
function opts(obj,sel,fmtf){return `<option value="">–</option>`+Object.entries(obj).filter(([k])=>k[0]!=='_').sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`<option value="${k}" ${sel===k?'selected':''}>${fmtf(k,v)}</option>`).join('')}
function modelBygger(I){
  const b=baseKode(); if(!b)return `<p class="mut">Vælg præcis én plattetype (fx WNMG) for at vælge størrelse, tykkelse og radius.</p>`;
  const st=D['insert-shapes'].storrelser[b[0]]; const m=S.mdl;
  if(!st)return `<p class="mut">Ingen størrelsestabel for form ${b[0]} endnu.</p>`;
  const ikke=re=>palHas(re)?'':' · ikke hos Palbit';
  const ic=m.ic||'\\d\\d', tk=m.tyk||'\\d\\d';
  return `<div class="card" id="sec-model"><h3>Vælg model</h3><div class="code">${modelKode()}</div>
  <p class="mut">${b}: ${I.form[b[0]]||''}, frivinkel ${I.frivinkel[b[1]]||b[1]}, type ${b[3]}. Resten vælger du her.</p>
  <label>Størrelse</label><select data-k="ic">${opts(st,m.ic,(k,v)=>k+' – IC '+fmt(v.ic)+' mm'+(v.std?' ★':'')+(v.bekraeftet===false?' · ikke bekræftet':'')+ikke(new RegExp('^'+b+k)))}</select>
  <div class="row"><div><label>Tykkelse</label><select data-k="tyk">${opts(I.tykkelse,m.tyk,(k,v)=>k+' – '+fmt(v)+' mm'+ikke(new RegExp('^'+b+ic+k)))}</select></div>
  <div><label>Næseradius</label><select data-k="rad">${opts(I.radius,m.rad,(k,v)=>k+' – r '+fmt(v)+' mm'+ikke(new RegExp('^'+b+ic+tk+k)))}</select></div></div>
  <p class="mut">★ = IC 12,7. "Ikke hos Palbit" betyder kun, at kombinationen mangler i Palbits katalog. Sandvik kan godt have den. Størrelseskoder er vejledende (ISO 1832), tjek mod katalog.</p></div>`;
}

/* ---------- trin 4: bearbejdning ---------- */
function r3(){
  app.innerHTML=`<h2>Bearbejdning</h2><div class="grid">${D.operations.bearbejdning.map(b=>`<button data-b="${b.id}" class="${S.bearb===b.id?'sel':''}"><b>${b.navn}</b><br><span class="mut">${b.ap}</span></button>`).join('')}</div>${nav(true,!!S.bearb)}`;
  app.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{S.bearb=b.dataset.b;sc('sec-nav');save();render()});
  bindNav();
}

/* ---------- Sandviks startværdier ---------- */
function svData(brk,kval){
  const e=D.svv[sandvikKode(brk,kval)]; if(!e)return null;
  const ks=Object.keys(e), exact=ks.find(x=>x.slice(0,2)===S.sub);
  const k=exact||(S.mat==='S'?null:ks.find(x=>x[0]===S.mat)); return k?{k,naerm:!exact,...e[k]}:null;
}
function rng(a){return Array.isArray(a)&&a.length===3?{s:a[0],lo:Math.min(a[1],a[2]),hi:Math.max(a[1],a[2])}:null}
function svLinje(brk,kval){
  const d=svData(brk,kval); if(!d)return '';
  const t=(n,a,u)=>{const r=rng(a);return r?`${n} <b>${fmt(r.s)}</b> (${fmt(r.lo)}–${fmt(r.hi)}) ${u}`:''};
  const chk=(v,a)=>{const r=rng(a),x=num(v);if(!r||!(x>0))return '';return x>=r.lo&&x<=r.hi?'✅':'⚠️'};
  const mine=[['ap',S.ap,d.ap],['f',S.f,d.fn],['vc',S.vc,d.vc]].map(([n,v,a])=>chk(v,a)?`${chk(v,a)} ${n} ${fmt(v)}`:'').filter(Boolean).join(' · ');
  return `<div class="sv">📈 Sandviks startværdier (${d.naerm?'nærmeste materiale ':''}${d.k}${d.hb?', '+d.hb+' HB':''}): ${[t('vc',d.vc,'m/min'),t('f',d.fn,'mm/omdr.'),t('ap',d.ap,'mm')].filter(Boolean).join(' · ')}${mine?`<br><span class="mut">Dine værdier: ${mine} (✅ i området, ⚠️ uden for)</span>`:''}</div>`;
}

/* ---------- trin 5: skæredata ---------- */
function radiusForslag(){
  const f=num(S.f); if(!(f>0))return '';
  const fac=S.bearb==='skrub'?D.rules.radius.skrubMaxF:D.rules.radius.slutMaxF, min=f/fac, r=RADIER.find(x=>x>=min-1e-9);
  return r?`<p class="mut">Til f = ${fmt(f)} bør r være mindst ${fmt(min.toFixed(2))} mm (tommelfingerregel). Nærmeste standardradius: <button class="mini" data-setr="${r}">r ${fmt(r)}</button></p>`
    :`<p class="mut">Til f = ${fmt(f)} er der ingen standardradius op til 2,4 mm, der opfylder tommelfingerreglen. Sænk f.</p>`;
}
function r4(){
  const first=sandvikList()[0], brk=utenBryder()?'':(first?.brk||''), sv=first&&modelKomplet()?svData(brk,first.kval):null;
  app.innerHTML=`<h2>Skæredata (valgfrit)</h2><p class="mut">Indtast dine egne værdier. Appen tjekker f mod næseradius og mod Sandviks startværdier.</p>
  <div class="row"><div><label>Næseradius r (mm)</label><input id="r" inputmode="decimal" value="${fmt(S.r)}"></div>
  <div><label>Tilspænding f (mm/omdr.)</label><input id="f" inputmode="decimal" value="${fmt(S.f)}"></div></div>
  <div class="row"><div><label>Skæredybde ap (mm)</label><input id="ap" inputmode="decimal" value="${fmt(S.ap)}"></div>
  <div><label>Skærehastighed vc (m/min)</label><input id="vc" inputmode="decimal" value="${fmt(S.vc)}"></div></div>
  <div id="rsug">${radiusForslag()}</div>
  ${sv?`<div class="card" style="margin-top:1rem"><b>Sandviks startværdier</b> for ${sandvikKode(brk,first.kval)}:<br>${svLinje(brk,first.kval).replace('📈 Sandviks startværdier','Til')}</div>`:''}
  ${nav(true,true,'Vis resultat →')}`;
  for(const id of ['r','f','ap','vc'])$('#'+id).oninput=e=>{S[id]=e.target.value.trim();save();if(id==='f'){$('#rsug').innerHTML=radiusForslag();bindR()}};
  const bindR=()=>app.querySelectorAll('[data-setr]').forEach(b=>b.onclick=()=>{S.r=b.dataset.setr;const code=Object.entries(D['insert-shapes'].iso1832.radius).find(([k,v])=>v===+b.dataset.setr);if(code&&baseKode())S.mdl.rad=code[0];save();render()});
  bindR();bindNav();
}

/* ---------- forslag pr. fabrikant ---------- */
function soeg(x){
  const fmtq=x.soegFormat, brk=utenBryder()?'':S.brk;
  const q=fmtq==='palbit'?(modelKomplet()?palbitKode(brk,S.kval):(S.shapes[0]||'')+(S.kval?' '+S.kval:''))
                         :(modelKomplet()?sandvikKode(brk,S.kval):(S.shapes[0]||'')+(S.kval?' '+S.kval:''));
  if(x.soegUrl&&q)return x.soegUrl.replace('{q}',encodeURIComponent(q));
  const g=['site:'+x.dom,modelKomplet()?modelKode():(S.shapes.join(' OR ')||'indexable turning inserts'),brk,S.kval].filter(Boolean).join(' ');
  return 'https://www.google.com/search?q='+encodeURIComponent(g);
}
function subOk(f){return !f.sub||f.sub.includes(S.sub)}
const svUrl=q=>D.manufacturers.makers.find(x=>x.id==='sandvik').soegUrl.replace('{q}',encodeURIComponent(q));
function sandvikList(){
  const F=D.start.sandvik.forslag, own=((F[S.mat]||{})[S.bearb]||[]).filter(subOk);
  const ov=(D.start.overlap||{})[S.mat]||[], extra=[];
  for(const g of ov)for(const f of ((F[g]||{})[S.bearb]||[])){
    if(own.some(o=>o.brk===f.brk&&o.kval===f.kval)||extra.some(o=>o.brk===f.brk&&o.kval===f.kval))continue;
    extra.push({...f,rolle:'alt',fra:g,note:'Stålplatte, kan også bruges i støbejern. '+f.note})}
  return own.concat(extra);
}
const HINT='<div class="hint"><span>← hårdere</span><span>sejere →</span></div>';
function sandvikForslag(){
  const lst=sandvikList(); if(!lst.length)return `<p class="mut">Ingen Sandvik-forslag lagt ind for ISO ${S.mat} / ${S.bearb}.</p>`;
  const st=D.start.sandvik, gk=S.mat==='N'||S.mat==='H', ua=utenBryder();
  const gnavn=k=>/^\d/.test(k)?'GC'+k:k;
  const grupper=(arr)=>{const m=new Map();for(const f of arr){const b=(gk||ua)?'':(f.brk||'');if(!m.has(b))m.set(b,[]);m.get(b).push(f)}return [...m]};
  const kort=(b,fs)=>{
    const sorted=[...fs].sort((x,y)=>rk(x.kval)-rk(y.kval));
    const kodeFor=f=>modelKomplet()&&!gk?sandvikKode(b,f.kval):'';
    const titel=modelKomplet()&&!gk?`${baseKode()} ${S.mdl.ic} ${S.mdl.tyk} ${S.mdl.rad}${b?'-'+b:''}`:(b?b:'Kvaliteter');
    const link=f=>{const k=kodeFor(f);return k?svUrl(k):svUrl('GRADE:"'+f.kval.replace(/^GC/,'')+'"')};
    const foerst=sorted.find(f=>f.rolle==='foerst')||sorted[0];
    const knap=sorted.map(f=>`<a class="btn${f.rolle==='foerst'?' primary':''}" style="padding:.4rem .6rem" target="_blank" rel="noopener" href="${link(f)}">${f.rolle==='foerst'?'⭐ ':''}${f.kval} ${ua&&modelKomplet()?'🔎':'↗'}</a>`).join('');
    const rows=sorted.map(f=>`<div class="svrow"><b>${gnavn(f.kval)}</b>${f.rolle==='foerst'?' ⭐ førstevalg':' · alternativ'}${f.fra?' <span class="badge" style="background:#2f6fdb">fra stål</span>':''}<br><span class="mut">${f.note}</span>${kodeFor(f)?svLinje(b,f.kval):''}<button class="mini" data-use="${f.kval}" data-brk="${b}">Brug ${f.kval}</button></div>`).join('');
    return `<div class="card" style="margin:.4rem 0"><b>${titel}</b><div class="chiprow">${knap}</div>${sorted.length>1?HINT:''}<button data-use="${foerst.kval}" data-brk="${b}" style="margin-top:.4rem">Brug ${b?b+' ':''}som valg</button><details class="noter"><summary class="mut">Noter og startværdier (${sorted.length})</summary>${rows}</details></div>`;
  };
  const egne=lst.filter(f=>!f.fra), stal=lst.filter(f=>f.fra);
  let h=`<div class="mut" style="margin:.4rem 0"><b>Startforslag fra Sandvik</b></div>`+grupper(egne).map(([b,fs])=>kort(b,fs)).join('');
  if(stal.length)h+=`<div class="mut" style="margin:.6rem 0 .2rem"><b>Stålplatter (ISO P) – kan også bruges i støbejern</b> <span class="badge" style="background:#2f6fdb">fra stål</span></div>`+grupper(stal).map(([b,fs])=>kort(b,fs)).join('');
  return h+`<p class="mut">Spånbryderens anvendelse (PF/MF = slut, PM/MM/KM/SM = medium, PR/MR/KR = skrub) stammer fra Sandviks eget katalog. ${st.verificeret} <a style="color:var(--acc)" target="_blank" rel="noopener" href="${st.kilde_grades}">Kvaliteter: Sandvik</a>. Tjek altid dit eget katalog.</p>`;
}
const rk=k=>{const m=String(k).match(/(\d\d)\D*$/);return m?parseInt(m[1]):0};
function guideBox(maker){
  const G=(D.guide[maker]||{})[S.mat]; const navn=MN[maker]||maker;
  if(!G)return `<details class="guide"><summary>📘 Hård ↔ sej (${navn})</summary><p class="mut">Ingen hård/sej-rangering for ISO ${S.mat} fundet hos ${navn}. Jeg gætter ikke.</p></details>`;
  const cur=new Set([S.kval, ...(maker==='sandvik'?sandvikList().map(f=>f.kval):[]), ...(maker==='palbit'?((palbitRec()||{}).kval||[]):[])].filter(Boolean));
  const hit=k=>cur.has(k)||cur.has(k.replace(/^GC/,''));
  return `<details class="guide"><summary>📘 Hård ↔ sej (${navn}, ISO ${S.mat})</summary>
  <div class="bar"></div><div class="lbl"><span>Hårdere · mere slidstærk</span><span>Sejere · mere sikker</span></div>
  ${[...G.raekke].sort((a,b)=>rk(a.kval)-rk(b.kval)).map((r,i)=>`<div class="gr${hit(r.kval)?' cur':''}"><div class="n">${i+1}</div><div><b>${r.navn}</b>${hit(r.kval)?' <span class="mut">(foreslået her)</span>':''}<br><span class="mut">${r.txt}</span></div></div>`).join('')}
  <p class="mut"><b>Tommelfingerregel:</b> jo lavere tal (de to sidste cifre), jo hårdere og mere slidstærk. Jo højere tal, jo sejere og mere sikker.${G.regel?' '+G.regel:''}</p>
  <p class="mut">Vejledende. Udledt af ${navn}s egne beskrivelser (<a style="color:var(--acc)" target="_blank" rel="noopener" href="${G.kilde}">kilde</a>). Tjek altid kataloget.</p></details>`;
}
function startKort(){
  const sv=sandvikList().filter(f=>f.rolle==='foerst')[0], pa=palbitAvail(), pr=pa.rec, mk=modelKomplet()?modelKode():'';
  const rows=[];
  if(sv){const brk=utenBryder()?'':(sv.brk||'');rows.push(`<div><b>Sandvik:</b> ${modelKomplet()&&S.mat!=='N'&&S.mat!=='H'?'<span class="code" style="font-size:1rem">'+sandvikKode(brk,sv.kval)+'</span>':(brk?brk+' ':'')+sv.kval}</div>`)}
  if(pr&&!mk)rows.push(`<div><b>Palbit:</b> ${pr.brk[0]}${pr.kval?' '+pr.kval[0]:''}</div>`);
  else if(pr&&pa.b)rows.push(`<div><b>Palbit:</b> <span class="code" style="font-size:1rem">${mk.slice(0,4)} ${mk.slice(4)}-${pa.b}${pa.g?' '+pa.g:''}</span>${pa.g?'':' · vælg kvalitet i listen'}${pr.status==='kilde'?'':' <span class="mut">(ikke bekræftet)</span>'}</div>`);
  else if(pr&&mk)rows.push(`<div><b>Palbit:</b> <span class="mut">ingen af de foreslåede spånbrydere (${pr.brk.join('/')}) findes til ${mk} – se listen nedenfor</span></div>`);
  if(!rows.length)return '';
  const e=sv&&modelKomplet()?svLinje(utenBryder()?'':(sv.brk||''),sv.kval):'';
  return `<div class="card ok"><b>🚀 Start her</b> <span class="mut">(til ${S.sub} · ${S.bearb})</span>${rows.join('')}${e}<p class="mut" style="margin:.4rem 0 0">Udgangspunkt, ikke facit. Tjek i fabrikantens katalog, og ret ud fra dine forhold.</p></div>`;
}
function palbitAvail(){
  const rec=palbitRec(), mk=modelKomplet()?modelKode():''; if(!rec||!mk)return {rec,b:null,g:null};
  const items=D.palbit.models[mk]||[]; const ok=items.filter(([b,g])=>{const iso=D.palbit.iso[b+'|'+g];return !iso||iso.includes(S.mat)});
  const b=rec.brk.find(x=>ok.some(([bb])=>bb===x)); const gs=b&&rec.kval?rec.kval.filter(g=>ok.some(([bb,gg])=>bb===b&&gg===g)):[];
  return {rec,b:b||null,g:gs[0]||null};
}
function palbitRec(){const r=(D.start.palbit[S.mat]||{})[S.bearb];return r||null}
function palbitForslag(){
  const P=D.palbit, mk=modelKomplet()?modelKode():'', items=mk&&P.models[mk], rec=palbitRec();
  if(!mk)return `<p class="mut">Vælg en komplet model for at se Palbits sortiment.</p>`;
  if(!items)return `<p class="mut">${mk} findes ikke i Palbits katalog over drejeplatter (negative/positive, ekstern drejning).</p>`;
  const byB={}; let n=0;
  for(const [b,g,a] of items){const iso=P.iso[b+'|'+g]; if(iso&&!iso.includes(S.mat))continue; (byB[b||'(ingen)']??=[]).push([b,g,a]); n++}
  if(!n)return `<p class="mut">${mk} findes hos Palbit, men ingen spånbryder/kvalitet er klassificeret til ISO ${S.mat}.</p>`;
  const link=(b,g,a)=>P.base+P.folder[mk.slice(0,2)]+'/insert-'+mk.slice(0,4).toLowerCase()+'-'+mk.slice(4)+'-'+(b?b.toLowerCase()+'-':'')+g.toLowerCase()+'-'+a.toLowerCase();
  const chip=(b,l)=>`<div class="card" style="margin:.4rem 0"><b>${mk.slice(0,4)} ${mk.slice(4)}${b==='(ingen)'?'':'-'+b}</b><div class="chiprow">${[...l].sort((x,y)=>rk(x[1])-rk(y[1])).map(([bb,g,a])=>`<a class="btn${rec&&rec.kval&&rec.kval.includes(g)?' primary':''}" style="padding:.4rem .6rem" target="_blank" rel="noopener" href="${link(bb,g,a)}">${g} ↗</a>`).join('')}</div>${l.length>1?HINT:''}<button data-use="${l[0][1]}" data-brk="${b==='(ingen)'?'':b}" style="margin-top:.4rem">Brug ${b==='(ingen)'?'':b+' '}som valg</button></div>`;
  const recB=rec?rec.brk.filter(b=>byB[b]):[]; const rest=Object.entries(byB).filter(([b])=>!recB.includes(b)&&(!utenBryder()||b==='(ingen)'));
  let h='';
  if(rec){
    const st=rec.status==='kilde'?'Kilde: Palbits PDF om spånbrydere (rustfrit og HRSA)':'Ikke bekræftet. Stammer ikke fra Palbits egen side';
    h+=`<div class="mut" style="margin:.4rem 0"><b>Startforslag fra Palbit</b> · ${st}</div>`;
    h+=recB.length?recB.map(b=>chip(b,byB[b])).join('')+`<p class="mut">${rec.note}${rec.kval?` Anbefalede kvaliteter (fremhævet): ${rec.kval.join(', ')}.`:''}</p>`
       :`<p class="mut">Den foreslåede spånbryder (${rec.brk.join('/')}) findes ikke til ${mk} i Palbits katalog.</p>`;
  } else h+=`<p class="mut">Ingen Palbit-anbefaling for ISO ${S.mat} / ${S.bearb} fundet.</p>`;
  h+=`<p class="mut">Startværdier (vc, f, ap): ingen fundet hos Palbit for denne kombination. Jeg gætter ikke.</p>`;
  const ov=(D.start.overlap||{})[S.mat]||[];
  for(const g of ov){
    const pr=(D.start.palbit[g]||{})[S.bearb]; if(!pr)continue;
    const byG={}; for(const [b,gr,a] of items){const iso=P.iso[b+'|'+gr]; if(!iso||!iso.includes(g)||!pr.brk.includes(b))continue;(byG[b]??=[]).push([b,gr,a])}
    const ents=Object.entries(byG); if(!ents.length)continue;
    h+=`<div class="mut" style="margin:.6rem 0 .2rem"><b>Stålplatter (ISO ${g}) – kan også bruges i støbejern</b> <span class="badge" style="background:#2f6fdb">fra stål</span></div>`+ents.map(([b,l])=>chip(b,l)).join('')+`<p class="mut">Baseret på erfaring (stålplatter fungerer også i støbejern), ikke på Palbits egen klassificering.</p>`;
  }
  if(rest.length)h+=`<details><summary class="mut">Øvrige varer i sortimentet til ISO ${S.mat} (${rest.reduce((a,[,l])=>a+l.length,0)})</summary>${rest.map(([b,l])=>chip(b,l)).join('')}</details>`;
  return h+`<p class="mut">Kilde: palbit.pt (produktdata, ISO-gruppen er Palbits egen klassificering).</p>`;
}

/* ---------- trin 6: resultat ---------- */
function chips(){
  const m=modelKode()||'alle typer';
  const c=(t,v,step)=>`<button class="chip" data-edit="${step}"><span class="mut">${t}</span> <b>${v}</b> ✏️</button>`;
  return `<div class="chips">${c('Materiale',S.sub,1)}${c('Bearbejdning',S.bearb,3)}${c('Platte',m,2)}${c('Skæredata',[S.r&&'r '+fmt(S.r),S.f&&'f '+fmt(S.f),S.ap&&'ap '+fmt(S.ap)].filter(Boolean).join(' · ')||'ikke angivet',4)}</div><p class="mut" style="margin:.2rem 0 .8rem">Tryk på et valg for at ændre det og vende direkte tilbage hertil.</p>`;
}
function makerStatus(id){
  if(id==='sandvik'){const l=sandvikList().filter(f=>!f.fra);const n=new Set(l.map(f=>f.brk||f.kval)).size;const nb=new Set(l.map(f=>f.brk).filter(Boolean)).size;return l.length?`${l.length} ${l.length===1?'kvalitet':'kvaliteter'}${nb&&!utenBryder()?', '+nb+(nb===1?' spånbryder':' spånbrydere'):''} til ISO ${S.mat}`:'ingen forslag'}
  if(!modelKomplet())return 'vælg komplet model';
  const items=D.palbit.models[modelKode()];if(!items)return 'modellen findes ikke i kataloget';
  const n=items.filter(([b,g])=>{const iso=D.palbit.iso[b+'|'+g];return !iso||iso.includes(S.mat)}).length;return n?`${n} varer til ISO ${S.mat}`:'ingen varer til ISO '+S.mat}
function r5(){
  pushRecent();
  const g=grp(), R=D.rules, m=D.manufacturers.makers;
  const r=num(S.r), f=num(S.f), ap=num(S.ap);
  let checks='';
  if(r>0&&f>0){
    const lim=(S.bearb==='skrub'?R.radius.skrubMaxF:R.radius.slutMaxF)*r;
    const Rz=fmt((f*f/(8*r)*1000).toFixed(1));
    checks+= f>lim? `<div class="card warn">⚠️ f = ${fmt(f)} er højere end vejledende ca. ${fmt(lim.toFixed(2))} mm/omdr. for r = ${fmt(r)}. Overvej større r eller lavere f.<br><span class="mut">Teoretisk Rz ≈ ${Rz} µm (f²/8r)</span></div>`
      : `<div class="card ok">✅ f = ${fmt(f)} ligger inden for tommelfingerreglen (max ca. ${fmt(lim.toFixed(2))}).<br><span class="mut">Teoretisk Rz ≈ ${Rz} µm (f²/8r)</span></div>`;
  }
  if(r>0&&ap>0&&ap<r&&S.bearb!=='slut') checks+=`<div class="card warn">⚠️ ap (${fmt(ap)}) er mindre end r (${fmt(r)}). Det giver ofte tryk/vibration i skær. Tjek mod katalog.</div>`;
  const shapes=S.shapes.length?S.shapes.join(', '):'alle typer';
  const resume=[
    `Operation: ${op().drejning?'Drejning (udvendig/indvendig)':op().navn}`,`Materiale: ${S.sub} ${g.sub.find(s=>s.id===S.sub).navn}`,
    `Plattetype: ${shapes}${modelKomplet()?' ('+modelKode()+')':''}`,S.brk&&!utenBryder()?`Spånbryder: ${S.brk}`:'',S.kval?`Kvalitet: ${S.kval}`:'',
    `Bearbejdning: ${S.bearb}`,
    S.r?`r = ${fmt(S.r)} mm`:'',S.f?`f = ${fmt(S.f)} mm/omdr.`:'',S.ap?`ap = ${fmt(S.ap)} mm`:'',S.vc?`vc = ${fmt(S.vc)} m/min`:''].filter(Boolean).join('\n');
  app.innerHTML=`<div class="rhead"><h2>Anbefaling</h2><button class="mini" id="fav">${isFav()?'⭐ Gemt':'☆ Gem som favorit'}</button></div>
  ${chips()}
  ${startKort()}
  ${checks}
  <div class="card"><span class="badge" style="background:${g.farve}">${g.id}</span><b>ISO ${S.sub}</b> – ${g.sub.find(s=>s.id===S.sub).navn}<br><span class="mut">${R.materialeNoter[g.id]}</span></div>
  <h3>Søg hos fabrikant</h3>
  <div class="card"><b>Model</b><div class="code">${modelKode()||'alle typer'}</div><div class="row">${utenBryder()?'':`<div><label>Spånbryder (valgfri)</label><input id="brk" placeholder="fx PM" value="${S.brk||''}"></div>`}<div><label>Kvalitet (valgfri)</label><input id="kval" placeholder="fx 4325" value="${S.kval||''}"></div></div><p class="mut">Spånbryder og kvalitet hedder forskelligt hos hver fabrikant. Skriv dem selv ind.</p></div>
  ${m.map(x=>`<details class="maker card" data-fold="${x.id}" ${S.fold[x.id]===false?'':'open'}><summary><b>${x.navn}</b> <span class="mut">· ${makerStatus(x.id)}</span></summary><div class="srow"><a class="btn primary" target="_blank" rel="noopener" href="${soeg(x)}">🔎 Søg ${modelKode()||'platter'} ↗</a><a class="btn" target="_blank" rel="noopener" href="${x.url}">Forside ↗</a></div>${x.id==='sandvik'?sandvikForslag()+guideBox('sandvik'):x.id==='palbit'?palbitForslag()+guideBox('palbit'):''}</details>`).join('')}
  <div class="card"><b>Resumé (til indtastning)</b><pre style="white-space:pre-wrap;margin:.4rem 0">${resume}</pre><div class="nav" style="margin-top:.4rem"><button id="cp">📋 Kopiér</button><button id="sh">📤 Del</button></div></div>
  ${nav(true,null)}<div class="nav"><button data-act="reset">↺ Start forfra</button></div>`;
  app.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{S.kval=b.dataset.use;if(b.dataset.brk!==undefined)S.brk=b.dataset.brk;save();render();scrollTo(0,0)});
  app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{S.back=true;go(+b.dataset.edit)});
  for(const id of ['brk','kval']){const el=$('#'+id);if(el)el.onchange=e=>{S[id]=e.target.value.trim();save();render()}}
  $('#fav').onclick=()=>{toggleFav();render()};
  $('#cp').onclick=()=>{navigator.clipboard?.writeText(resume);$('#cp').textContent='✅ Kopieret'};
  $('#sh').onclick=()=>{if(navigator.share)navigator.share({title:'Platteguide',text:resume}).catch(()=>{});else{navigator.clipboard?.writeText(resume);$('#sh').textContent='✅ Kopieret'}};
  app.querySelectorAll('details[data-fold]').forEach(d=>d.addEventListener('toggle',()=>{S.fold[d.dataset.fold]=d.open;save()}));
  bindNav();
}
load();
