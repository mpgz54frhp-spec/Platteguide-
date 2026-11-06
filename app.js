'use strict';
const D={}, S={step:0,op:null,mat:null,sub:null,shapes:[],spaan:null,bearb:null,r:'',ap:'',f:'',vc:'',mdl:{ic:'',tyk:'',rad:''},brk:'',kval:''};
const $=s=>document.querySelector(s), app=$('#app');
const STEPS=['Operation','Materiale','Plattetype','Spånform','Data','Resultat'];

async function load(){
  for(const n of ['materials','operations','insert-shapes','manufacturers','rules']){
    D[n]=await (await fetch(`data/${n}.json`)).json();
  }
  try{Object.assign(S,JSON.parse(localStorage.getItem('pg')||'{}'))}catch(e){}
  S.mdl=S.mdl||{ic:'',tyk:'',rad:''};
  S.step=(S.op&&S.sub&&S.spaan&&S.bearb)?5:0;
  if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  render();
}
const save=()=>localStorage.setItem('pg',JSON.stringify(S));
const op=()=>D.operations.operations.find(o=>o.id===S.op);
const grp=()=>D.materials.groups.find(g=>g.id===S.mat);
function go(n){S.step=n;save();render();scrollTo(0,0)}
function nav(prev,nextOk,nextLabel='Næste →'){
  return `<div class="nav">${prev?'<button data-act="prev">← Tilbage</button>':''}${nextOk!==null?`<button class="primary" data-act="next" ${nextOk?'':'disabled'}>${nextLabel}</button>`:''}</div>`;
}
function shapesList(){
  if(op()?.drejning) return D['insert-shapes'].turning;
  return D['insert-shapes'].andre[S.op]||[];
}
function render(){
  $('#trin').textContent=`Trin ${S.step+1}/${STEPS.length}: ${STEPS[S.step]}`;
  ({0:r0,1:r1,2:r2,3:r3,4:r4,5:r5})[S.step]();
}
function r0(){
  app.innerHTML=`<h2>Hvad skal du lave?</h2><div class="grid">${D.operations.operations.map(o=>`<button data-op="${o.id}" class="${S.op===o.id?'sel':''}">${o.ikon} ${o.navn}</button>`).join('')}</div>${nav(false,!!S.op)}`;
  app.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{if(S.op!==b.dataset.op){S.shapes=[]}S.op=b.dataset.op;save();render()});
  bindNav();
}
function r1(){
  const g=grp();
  app.innerHTML=`<h2>Materiale (ISO)</h2><div class="grid">${D.materials.groups.map(x=>`<button data-m="${x.id}" class="${S.mat===x.id?'sel':''}"><span class="badge" style="background:${x.farve}">${x.id}</span>${x.navn.replace(/^. – /,'')}</button>`).join('')}</div>
  ${g?`<h3>Undergruppe</h3><div class="grid">${g.sub.map(s=>`<button data-s="${s.id}" class="${S.sub===s.id?'sel':''}">${s.id} ${s.navn}</button>`).join('')}</div><p class="mut">${g.spaan}</p>`:''}
  ${nav(true,!!S.sub)}`;
  app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.mat=b.dataset.m;S.sub=null;save();render()});
  app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{S.sub=b.dataset.s;save();render()});
  bindNav();
}
function baseKode(){return S.shapes.length===1&&/^[A-Z]{4}$/.test(S.shapes[0])?S.shapes[0]:null}
function modelKode(){
  const b=baseKode(); if(!b)return S.shapes.length?S.shapes.join(', '):'';
  const m=S.mdl||{}; return b+(m.ic||'__')+(m.tyk||'__')+(m.rad||'__');
}
const modelKomplet=()=>{const b=baseKode(),m=S.mdl||{};return !!(b&&m.ic&&m.tyk&&m.rad)};
function r2(){
  const L=shapesList(), I=D['insert-shapes'].iso1832;
  app.innerHTML=`<h2>Plattetype</h2><p class="mut">Vælg én type for at vælge præcis model. Vælger du ingen, gælder alle typer.</p>
  <div class="grid">${L.map(s=>`<button data-sh="${s.kode}" class="${S.shapes.includes(s.kode)?'sel':''}"><b>${s.kode}</b><br><span class="mut">${s.info}</span></button>`).join('')}</div>
  ${op()?.drejning?modelBygger(I):''}${nav(true,true)}`;
  app.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.sh;S.shapes=S.shapes.includes(k)?S.shapes.filter(x=>x!==k):[...S.shapes,k];S.mdl={ic:'',tyk:'',rad:''};save();render()});
  app.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{S.mdl[el.dataset.k]=el.value;
    if(el.dataset.k==='rad'){const v=I.radius[el.value];if(v!==undefined)S.r=String(v)}
    save();render()});
  bindNav();
}
function opts(obj,sel,fmt){return `<option value="">–</option>`+Object.entries(obj).map(([k,v])=>`<option value="${k}" ${sel===k?'selected':''}>${fmt?fmt(k,v):k+' – '+v}</option>`).join('')}
function modelBygger(I){
  const b=baseKode(); if(!b)return `<p class="mut">Vælg præcis én plattetype (fx WNMG) for at vælge størrelse, tykkelse og radius.</p>`;
  const st=D['insert-shapes'].storrelser[b[0]]; const m=S.mdl;
  if(!st)return `<p class="mut">Ingen størrelsestabel for form ${b[0]} endnu.</p>`;
  return `<div class="card"><h3>Vælg model</h3><div class="code">${modelKode()}</div>
  <p class="mut">${b}: ${I.form[b[0]]||''}, frivinkel ${I.frivinkel[b[1]]||b[1]}, type ${b[3]}. Resten vælger du her.</p>
  <label>Størrelse</label><select data-k="ic">${opts(st,m.ic,(k,v)=>k+' – IC '+v.ic+' mm'+(v.std?' ★':''))}</select>
  <div class="row"><div><label>Tykkelse</label><select data-k="tyk">${opts(I.tykkelse,m.tyk,(k,v)=>k+' – '+v+' mm')}</select></div>
  <div><label>Næseradius</label><select data-k="rad">${opts(I.radius,m.rad,(k,v)=>k+' – r '+v+' mm')}</select></div></div>
  <p class="mut">★ = IC 12,7. Størrelseskoder er vejledende (ISO 1832). Tjek mod katalog.</p></div>`;
}
function r3(){
  const R=D.rules;
  app.innerHTML=`<h2>Spånform & bearbejdning</h2>
  <h3>Ønsket spån</h3><div class="grid">${R.spaanform.map(s=>`<button data-sp="${s.id}" class="${S.spaan===s.id?'sel':''}"><b>${s.navn}</b><br><span class="mut">${s.forklaring}</span></button>`).join('')}</div>
  <h3>Bearbejdning</h3><div class="grid">${D.operations.bearbejdning.map(b=>`<button data-b="${b.id}" class="${S.bearb===b.id?'sel':''}"><b>${b.navn}</b><br><span class="mut">${b.ap}</span></button>`).join('')}</div>
  ${nav(true,!!(S.spaan&&S.bearb))}`;
  app.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{S.spaan=b.dataset.sp;save();render()});
  app.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{S.bearb=b.dataset.b;save();render()});
  bindNav();
}
function r4(){
  app.innerHTML=`<h2>Skæredata (valgfrit)</h2><p class="mut">Indtast dine egne værdier. Appen tjekker f mod næseradius. Den foreslår ikke selv tal.</p>
  <div class="row"><div><label>Næseradius r (mm)</label><input id="r" inputmode="decimal" value="${S.r}"></div>
  <div><label>Tilspænding f (mm/omdr.)</label><input id="f" inputmode="decimal" value="${S.f}"></div></div>
  <div class="row"><div><label>Skæredybde ap (mm)</label><input id="ap" inputmode="decimal" value="${S.ap}"></div>
  <div><label>Skærehastighed vc (m/min)</label><input id="vc" inputmode="decimal" value="${S.vc}"></div></div>
  ${nav(true,true,'Vis resultat →')}`;
  for(const id of ['r','f','ap','vc'])$('#'+id).oninput=e=>{S[id]=e.target.value;save()};
  bindNav();
}
function soeg(x){const q=['site:'+x.dom,modelKomplet()?modelKode():(S.shapes.join(' OR ')||'indexable turning inserts'),S.brk,S.kval].filter(Boolean).join(' ');return 'https://www.google.com/search?q='+encodeURIComponent(q)}
const num=v=>parseFloat(String(v).replace(',','.'));
function r5(){
  const g=grp(), R=D.rules, m=D.manufacturers.makers;
  const r=num(S.r), f=num(S.f), ap=num(S.ap), vc=num(S.vc);
  const brk=R.spaanbryder[S.bearb][S.spaan];
  let checks='';
  if(r>0&&f>0){
    const lim=(S.bearb==='skrub'?R.radius.skrubMaxF:R.radius.slutMaxF)*r;
    const Rz=(f*f/(8*r)*1000).toFixed(1);
    checks+= f>lim? `<div class="card warn">⚠️ f = ${f} er højere end vejledende ca. ${lim.toFixed(2)} mm/omdr. for r = ${r}. Overvej større r eller lavere f.<br><span class="mut">Teoretisk Rz ≈ ${Rz} µm (f²/8r)</span></div>`
      : `<div class="card ok">✅ f = ${f} ligger inden for tommelfingerreglen (max ca. ${lim.toFixed(2)}).<br><span class="mut">Teoretisk Rz ≈ ${Rz} µm (f²/8r)</span></div>`;
  }
  if(r>0&&ap>0&&ap<r&&S.bearb!=='slut') checks+=`<div class="card warn">⚠️ ap (${ap}) er mindre end r (${r}). Det giver ofte tryk/vibration i skær. Tjek mod katalog.</div>`;
  const shapes=S.shapes.length?S.shapes.join(', '):'alle typer';
    const resume=[
    `Operation: ${op().navn}`,`Materiale: ${S.sub} ${g.sub.find(s=>s.id===S.sub).navn}`,
    `Plattetype: ${shapes}${modelKomplet()?' ('+modelKode()+')':''}`,S.brk?`Spånbryder: ${S.brk}`:'',S.kval?`Kvalitet: ${S.kval}`:'',
    `Spånform: ${R.spaanform.find(x=>x.id===S.spaan).navn}`,`Bearbejdning: ${S.bearb}`,
    S.r?`r = ${S.r} mm`:'',S.f?`f = ${S.f} mm/omdr.`:'',S.ap?`ap = ${S.ap} mm`:'',S.vc?`vc = ${S.vc} m/min`:''].filter(Boolean).join('\n');
  app.innerHTML=`<h2>Anbefaling</h2>
  <div class="card"><span class="badge" style="background:${g.farve}">${g.id}</span><b>ISO ${S.sub}</b> – ${g.sub.find(s=>s.id===S.sub).navn}<br>
  <span class="mut">Kvalitetsområde: ISO ${g.id} (vælg kvalitet i fabrikantens selektor)</span></div>
  <div class="card"><b>Spånbryder/geometri</b><br>${brk}<br><span class="mut">Plattetype: ${shapes}</span></div>
  <div class="card"><b>Materialenote ${g.id}</b><br>${R.materialeNoter[g.id]}</div>
  ${checks}
  <h3>Søg hos fabrikant</h3>
  <div class="card"><b>Model</b><div class="code">${modelKode()||'alle typer'}</div><div class="row"><div><label>Spånbryder (valgfri)</label><input id="brk" placeholder="fx PM" value="${S.brk||''}"></div><div><label>Kvalitet (valgfri)</label><input id="kval" placeholder="fx 4325" value="${S.kval||''}"></div></div><p class="mut">Spånbryder og kvalitet hedder forskelligt hos hver fabrikant. Skriv dem selv ind.</p></div>
  ${m.map(x=>`<div class="card"><b>${x.navn}</b><br><span class="mut">${x.tip}${x.verificeret?'':' (ikke verificeret)'}</span><br><br><a class="btn primary" target="_blank" rel="noopener" href="${soeg(x)}">🔎 Søg ${modelKode()||'platter'} hos ${x.navn} ↗</a><a class="btn" style="margin-top:.5rem" target="_blank" rel="noopener" href="${x.url}">Åbn forsiden ↗</a>${(x.extra||[]).map(e=>`<a class="btn" style="margin-top:.5rem" target="_blank" rel="noopener" href="${e.url}">${e.label} ↗ <span class="mut">(ikke testet)</span></a>`).join('')}</div>`).join('')}
  <div class="card"><b>Resumé (til indtastning)</b><pre style="white-space:pre-wrap;margin:.4rem 0">${resume}</pre><button id="cp">📋 Kopiér resumé</button></div>
  ${nav(true,null)}<div class="nav"><button data-act="edit">✏️ Ret valg</button><button data-act="reset">↺ Start forfra</button></div>`;
  for(const id of ['brk','kval'])$('#'+id).onchange=e=>{S[id]=e.target.value.trim();save();render()};
  $('#cp').onclick=()=>{navigator.clipboard?.writeText(resume);$('#cp').textContent='✅ Kopieret'};
  bindNav();
}
function bindNav(){
  app.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==='prev')go(S.step-1);else if(a==='next')go(S.step+1);
    else if(a==='edit')go(0);
    else if(a==='reset'){localStorage.removeItem('pg');Object.assign(S,{step:0,op:null,mat:null,sub:null,shapes:[],spaan:null,bearb:null,r:'',ap:'',f:'',vc:'',mdl:{ic:'',tyk:'',rad:''},brk:'',kval:''});render()}
  });
}
load();
