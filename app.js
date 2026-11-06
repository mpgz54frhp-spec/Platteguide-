'use strict';
const D={}, S={step:0,op:null,mat:null,sub:null,shapes:[],spaan:null,bearb:null,r:'',ap:'',f:'',vc:'',kode:{}};
const $=s=>document.querySelector(s), app=$('#app');
const STEPS=['Operation','Materiale','Plattetype','Spånform','Data','Resultat'];

async function load(){
  for(const n of ['materials','operations','insert-shapes','manufacturers','rules']){
    D[n]=await (await fetch(`data/${n}.json`)).json();
  }
  try{Object.assign(S,JSON.parse(localStorage.getItem('pg')||'{}'),{step:0})}catch(e){}
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
function r2(){
  const L=shapesList(), isT=op()?.drejning, I=D['insert-shapes'].iso1832;
  app.innerHTML=`<h2>Plattetype</h2><p class="mut">Vælg én eller flere. Vælg ingen = alle typer.</p>
  <div class="grid">${L.map(s=>`<button data-sh="${s.kode}" class="${S.shapes.includes(s.kode)?'sel':''}"><b>${s.kode}</b><br><span class="mut">${s.info}</span></button>`).join('')}</div>
  ${isT?kodeBygger(I):''}${nav(true,true)}`;
  app.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.sh;S.shapes=S.shapes.includes(k)?S.shapes.filter(x=>x!==k):[...S.shapes,k];save();render()});
  if(isT){
    app.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{S.kode[el.dataset.k]=el.value;
      if(el.dataset.k==='rad'){const v=I.radius[el.value];if(v!==undefined)S.r=String(v)}
      save();render()});
  }
  bindNav();
}
function opts(obj,sel,fmt){return `<option value="">–</option>`+Object.entries(obj).map(([k,v])=>`<option value="${k}" ${sel===k?'selected':''}>${fmt?fmt(k,v):k+' – '+v}</option>`).join('')}
function kodeBygger(I){
  const k=S.kode, code=bygKode();
  return `<div class="card"><h3>ISO 1832-kodebygger</h3>
  <div class="code">${code}</div><p class="mut">Rækkefølge: form · frivinkel · tolerance · type · størrelse (IC) · tykkelse · næseradius</p>
  <div class="row"><div><label>Form</label><select data-k="form">${opts(I.form,k.form)}</select></div>
  <div><label>Frivinkel</label><select data-k="friv">${opts(I.frivinkel,k.friv)}</select></div></div>
  <div class="row"><div><label>Tolerance</label><select data-k="tol">${opts(I.tolerance,k.tol,(a,b)=>a+' – '+b.slice(0,24))}</select></div>
  <div><label>Type/hul/spånbryder</label><select data-k="type">${opts(I.type,k.type)}</select></div></div>
  <div class="row"><div><label>Størrelse (IC)</label><select data-k="ic">${opts(I.ic,k.ic,(a,b)=>a+' – '+b+' mm')}</select></div>
  <div><label>Tykkelse</label><select data-k="tyk">${opts(I.tykkelse,k.tyk,(a,b)=>a+' – '+b+' mm')}</select></div></div>
  <label>Næseradius</label><select data-k="rad">${opts(I.radius,k.rad,(a,b)=>a+' – r '+b+' mm')}</select>
  <p class="mut">Obs: for trekanter (T) angiver størrelsen skærelængden, ikke IC. Tjek mod katalog.</p></div>`;
}
function bygKode(){const k=S.kode;return [k.form||'_',k.friv||'_',k.tol||'_',k.type||'_',k.ic||'__',k.tyk||'__',k.rad||'__'].join('')}
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
  const kode=bygKode();
  const resume=[
    `Operation: ${op().navn}`,`Materiale: ${S.sub} ${g.sub.find(s=>s.id===S.sub).navn}`,
    `Plattetype: ${shapes}${/_/.test(kode)?'':' ('+kode+')'}`,
    `Spånform: ${R.spaanform.find(x=>x.id===S.spaan).navn}`,`Bearbejdning: ${S.bearb}`,
    S.r?`r = ${S.r} mm`:'',S.f?`f = ${S.f} mm/omdr.`:'',S.ap?`ap = ${S.ap} mm`:'',S.vc?`vc = ${S.vc} m/min`:''].filter(Boolean).join('\n');
  app.innerHTML=`<h2>Anbefaling</h2>
  <div class="card"><span class="badge" style="background:${g.farve}">${g.id}</span><b>ISO ${S.sub}</b> – ${g.sub.find(s=>s.id===S.sub).navn}<br>
  <span class="mut">Kvalitetsområde: ISO ${g.id} (vælg kvalitet i fabrikantens selektor)</span></div>
  <div class="card"><b>Spånbryder/geometri</b><br>${brk}<br><span class="mut">Plattetype: ${shapes}</span></div>
  <div class="card"><b>Materialenote ${g.id}</b><br>${R.materialeNoter[g.id]}</div>
  ${checks}
  <h3>Gå videre til fabrikant</h3>
  ${m.map(x=>`<div class="card"><b>${x.navn}</b><br><span class="mut">${x.tip}${x.verificeret?'':' (ikke verificeret)'}</span><br><br><a class="btn primary" target="_blank" rel="noopener" href="${x.url}">Åbn ${x.navn} ↗</a>${(x.extra||[]).map(e=>`<a class="btn" style="margin-top:.5rem" target="_blank" rel="noopener" href="${e.url}">${e.label} ↗ <span class="mut">(ikke testet)</span></a>`).join('')}</div>`).join('')}
  <div class="card"><b>Resumé (til indtastning)</b><pre style="white-space:pre-wrap;margin:.4rem 0">${resume}</pre><button id="cp">📋 Kopiér resumé</button></div>
  ${nav(true,null)}<div class="nav"><button data-act="reset">↺ Start forfra</button></div>`;
  $('#cp').onclick=()=>{navigator.clipboard?.writeText(resume);$('#cp').textContent='✅ Kopieret'};
  bindNav();
}
function bindNav(){
  app.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>{
    const a=b.dataset.act;
    if(a==='prev')go(S.step-1);else if(a==='next')go(S.step+1);
    else if(a==='reset'){localStorage.removeItem('pg');Object.assign(S,{step:0,op:null,mat:null,sub:null,shapes:[],spaan:null,bearb:null,r:'',ap:'',f:'',vc:'',kode:{}});render()}
  });
}
load();
