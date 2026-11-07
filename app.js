'use strict';
const D={}, S={step:0,op:null,mat:null,sub:null,shapes:[],spaan:null,bearb:null,r:'',ap:'',f:'',vc:'',mdl:{ic:'',tyk:'',rad:''},brk:'',kval:''};
const $=s=>document.querySelector(s), app=$('#app');
const STEPS=['Operation','Materiale','Plattetype','Spånform','Data','Resultat'];

async function load(){
  for(const n of ['materials','operations','insert-shapes','manufacturers','rules','grades','palbit','start','guide']){
    D[n]=await (await fetch(`data/${n}.json`)).json();
  }
  try{Object.assign(S,JSON.parse(localStorage.getItem('pg')||'{}'))}catch(e){}
  S.mdl=S.mdl||{ic:'',tyk:'',rad:''};
  if(S.op==='turn_od'||S.op==='turn_id')S.op='turn';
  S.step=(S.op&&S.sub&&S.spaan&&S.bearb)?5:0;
  if('serviceWorker' in navigator)navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  render();
}
const save=()=>localStorage.setItem('pg',JSON.stringify(S));
const op=()=>D.operations.operations.find(o=>o.id===S.op);
const grp=()=>D.materials.groups.find(g=>g.id===S.mat);
let PS=null; const sc=id=>{PS=id};
function doScroll(){if(!PS)return;const el=document.getElementById(PS);PS=null;if(!el)return;
  const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;requestAnimationFrame(()=>el.scrollIntoView({behavior:calm?'auto':'smooth',block:'start'}))}
function go(n){S.step=n;save();render();scrollTo(0,0)}
function nav(prev,nextOk,nextLabel='Næste →'){
  return `<div class="nav" id="sec-nav">${prev?'<button data-act="prev">← Tilbage</button>':''}${nextOk!==null?`<button class="primary" data-act="next" ${nextOk?'':'disabled'}>${nextLabel}</button>`:''}</div>`;
}
function shapesList(){
  if(op()?.drejning) return D['insert-shapes'].turning;
  return D['insert-shapes'].andre[S.op]||[];
}
function render(){
  $('#trin').textContent=`Trin ${S.step+1}/${STEPS.length}: ${STEPS[S.step]}`;
  ({0:r0,1:r1,2:r2,3:r3,4:r4,5:r5})[S.step]();
  doScroll();
}
function r0(){
  app.innerHTML=`<h2>Hvad skal du lave?</h2><div class="grid">${D.operations.operations.map(o=>`<button data-op="${o.id}" class="op ${S.op===o.id?'sel':''}"><img class="opimg" src="${o.billede}" alt=""><b>${o.navn}</b></button>`).join('')}</div>${nav(false,!!S.op)}`;
  app.querySelectorAll('[data-op]').forEach(b=>b.onclick=()=>{if(S.op!==b.dataset.op){S.shapes=[]}S.op=b.dataset.op;sc('sec-nav');save();render()});
  bindNav();
}
function r1(){
  const g=grp();
  app.innerHTML=`<h2>Materiale (ISO)</h2><div class="grid">${D.materials.groups.map(x=>`<button data-m="${x.id}" class="${S.mat===x.id?'sel':''}"><span class="badge" style="background:${x.farve}">${x.id}</span>${x.navn.replace(/^. – /,'')}</button>`).join('')}</div>
  ${g?`<h3 id="sec-sub">Undergruppe</h3><div class="grid">${g.sub.map(s=>`<button data-s="${s.id}" class="${S.sub===s.id?'sel':''}">${s.id} ${s.navn}</button>`).join('')}</div><p class="mut">${g.spaan}</p>`:''}
  ${nav(true,!!S.sub)}`;
  app.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{S.mat=b.dataset.m;S.sub=null;sc('sec-sub');if(S.mat!=='K'){S.shapes=S.shapes.filter(k=>!(D['insert-shapes'].turning.find(t=>t.kode===k)||{}).uspaanbryder);S.mdl={ic:'',tyk:'',rad:''}}save();render()});
  app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{S.sub=b.dataset.s;sc('sec-nav');save();render()});
  bindNav();
}
function baseKode(){return S.shapes.length===1&&/^[A-Z]{4}$/.test(S.shapes[0])?S.shapes[0]:null}
function modelKode(){
  const b=baseKode(); if(!b)return S.shapes.length?S.shapes.join(', '):'';
  const m=S.mdl||{}; return b+(m.ic||'__')+(m.tyk||'__')+(m.rad||'__');
}
const utenBryder=()=>{const b=baseKode();return !!b&&b[3]==='A'};
const modelKomplet=()=>{const b=baseKode(),m=S.mdl||{};return !!(b&&m.ic&&m.tyk&&m.rad)};
function r2(){
  const L=shapesList(), I=D['insert-shapes'].iso1832;
  app.innerHTML=`<h2>Plattetype</h2><p class="mut">Vælg én type for at vælge præcis model. Vælger du ingen, gælder alle typer.</p>
  ${(()=>{const btn=s=>`<button data-sh="${s.kode}" class="${S.shapes.includes(s.kode)?'sel':''}"><b>${s.kode}</b><br><span class="mut">${s.info}</span></button>`;
    const med=L.filter(s=>!s.uspaanbryder),uden=S.mat==='K'?L.filter(s=>s.uspaanbryder):[];
    return `${uden.length?'<h3>Med spånbryder</h3>':''}<div class="grid">${med.map(btn).join('')}</div>${!uden.length&&op()?.drejning?'<p class="mut">Platter uden spånbryder (DNMA, WNMA m.fl.) vises kun ved støbejern (K).</p>':''}${uden.length?`<h3>Uden spånbryder (…A)</h3><div class="grid">${uden.map(btn).join('')}</div>`:''}`})()}
  ${op()?.drejning?modelBygger(I):''}${nav(true,true)}`;
  app.querySelectorAll('[data-sh]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.sh;S.shapes=S.shapes.includes(k)?S.shapes.filter(x=>x!==k):[...S.shapes,k];S.mdl={ic:'',tyk:'',rad:''};sc(op()?.drejning&&S.shapes.length===1?'sec-model':'sec-nav');save();render()});
  app.querySelectorAll('[data-k]').forEach(el=>el.onchange=()=>{S.mdl[el.dataset.k]=el.value;
    if(el.dataset.k==='rad'){const v=I.radius[el.value];if(v!==undefined)S.r=String(v)}
    if(modelKomplet())sc('sec-nav');save();render()});
  bindNav();
}
function opts(obj,sel,fmt){return `<option value="">–</option>`+Object.entries(obj).map(([k,v])=>`<option value="${k}" ${sel===k?'selected':''}>${fmt?fmt(k,v):k+' – '+v}</option>`).join('')}
function modelBygger(I){
  const b=baseKode(); if(!b)return `<p class="mut">Vælg præcis én plattetype (fx WNMG) for at vælge størrelse, tykkelse og radius.</p>`;
  const st=D['insert-shapes'].storrelser[b[0]]; const m=S.mdl;
  if(!st)return `<p class="mut">Ingen størrelsestabel for form ${b[0]} endnu.</p>`;
  return `<div class="card" id="sec-model"><h3>Vælg model</h3><div class="code">${modelKode()}</div>
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
  <h3 id="sec-bearb">Bearbejdning</h3><div class="grid">${D.operations.bearbejdning.map(b=>`<button data-b="${b.id}" class="${S.bearb===b.id?'sel':''}"><b>${b.navn}</b><br><span class="mut">${b.ap}</span></button>`).join('')}</div>
  ${nav(true,!!(S.spaan&&S.bearb))}`;
  app.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>{S.spaan=b.dataset.sp;sc(S.bearb?'sec-nav':'sec-bearb');save();render()});
  app.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>{S.bearb=b.dataset.b;if(S.spaan)sc('sec-nav');save();render()});
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
const sandvikKode=(br,kv)=>{const m=S.mdl||{},b=baseKode();return b?`${b} ${m.ic} ${m.tyk} ${m.rad}${br?'-'+br:''}${kv?' '+kv:''}`:''};
function soeg(x){
  if(x.soegUrl){const q=modelKomplet()?sandvikKode(utenBryder()?'':S.brk,S.kval):(S.shapes[0]||'')+(S.kval?' '+S.kval:'');if(q)return x.soegUrl.replace('{q}',encodeURIComponent(q))}
const q=['site:'+x.dom,modelKomplet()?modelKode():(S.shapes.join(' OR ')||'indexable turning inserts'),utenBryder()?'':S.brk,S.kval].filter(Boolean).join(' ');return 'https://www.google.com/search?q='+encodeURIComponent(q)}
function subOk(f){return !f.sub||f.sub.includes(S.sub)}
const svUrl=q=>D.manufacturers.makers.find(x=>x.id==='sandvik').soegUrl.replace('{q}',encodeURIComponent(q));
function sandvikList(){
  const F=D.start.sandvik.forslag, own=((F[S.mat]||{})[S.bearb]||[]).filter(f=>!f.sub||f.sub.includes(S.sub));
  const ov=(D.start.overlap||{})[S.mat]||[], extra=[];
  for(const g of ov)for(const f of ((F[g]||{})[S.bearb]||[])){
    if(own.some(o=>o.brk===f.brk&&o.kval===f.kval)||extra.some(o=>o.brk===f.brk&&o.kval===f.kval))continue;
    extra.push({...f,rolle:'alt',fra:g,note:'Stålplatte, kan også bruges i støbejern. '+f.note})}
  return own.concat(extra)}
function sandvikForslag(){
  const lst=sandvikList(); if(!lst.length)return `<p class="mut">Ingen Sandvik-forslag lagt ind for ISO ${S.mat} / ${S.bearb}.</p>`;
  const st=D.start.sandvik;
  return `<div class="mut" style="margin:.4rem 0"><b>Startforslag fra Sandvik</b></div>`+lst.map(f=>{
    const brk=utenBryder()?'':(f.brk||''); const gk=S.mat==='N'||S.mat==='H'; const kode=modelKomplet()&&!gk?sandvikKode(brk,f.kval):'';
    const navn=(f.brk&&!utenBryder()?f.brk+' ':'')+(/^\d/.test(f.kval)?'GC'+f.kval:f.kval);
    return `<div class="card" style="margin:.4rem 0"><b>${navn}</b>${f.rolle==='foerst'?' ⭐ førstevalg':' · alternativ'}${f.fra?` <span class="badge" style="background:#2f6fdb">fra stål</span>`:''}${kode?`<div class="code" style="font-size:1.05rem">${kode}</div>`:''}<span class="mut">${f.note}</span><div style="margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap">${kode?`<a class="btn primary" style="flex:1" target="_blank" rel="noopener" href="${svUrl(kode)}">🔎 ${utenBryder()?'Søg':'Åbn'} ${kode}</a>`:`<a class="btn primary" style="flex:1" target="_blank" rel="noopener" href="${svUrl('GRADE:"'+f.kval.replace(/^GC/,'')+'"')}">🔎 Alle platter i ${navn}</a>`}<button data-use="${f.kval}" data-brk="${brk}" style="flex:0 0 auto">Brug som valg</button></div></div>`}).join('')
    +`<p class="mut">Spånbryderens anvendelse (PF/MF = slut, PM/MM/KM/SM = medium, PR/MR/KR = skrub) stammer fra Sandviks eget katalog. ${st.verificeret} <a style="color:var(--acc)" target="_blank" rel="noopener" href="${st.kilde_grades}">Kvaliteter: Sandvik</a>. Tjek altid dit eget katalog.</p>`;
}
const rk=k=>{const m=String(k).match(/(\d\d)\D*$/);return m?parseInt(m[1]):0};
const MN={sandvik:'Sandvik',palbit:'Palbit',ceratizit:'Ceratizit',kennametal:'Kennametal'};
function guideBox(maker){
  const G=(D.guide[maker]||{})[S.mat]; const navn=MN[maker]||maker;
  if(!G)return `<details class="guide"><summary>📘 Hård ↔ sej (${navn})</summary><p class="mut">Ingen hård/sej-rangering for ISO ${S.mat} fundet hos ${navn}. Jeg gætter ikke.</p></details>`;
  const cur=new Set([S.kval, ...(maker==='sandvik'?sandvikList().map(f=>f.kval):[]), ...(maker==='palbit'?((palbitRec()||{}).kval||[]):[]),...((maker==='ceratizit'||maker==='kennametal')?gList(maker).map(f=>f.kval):[])].filter(Boolean));
  const hit=k=>cur.has(k)||cur.has(k.replace(/^GC/,''));
  return `<details class="guide"><summary>📘 Hård ↔ sej (${navn}, ISO ${S.mat})</summary>
  <div class="bar"></div><div class="lbl"><span>Hårdere · mere slidstærk</span><span>Sejere · mere sikker</span></div>
  ${[...G.raekke].sort((a,b)=>rk(a.kval)-rk(b.kval)).map((r,i)=>`<div class="gr${hit(r.kval)?' cur':''}"><div class="n">${i+1}</div><div><b>${r.navn}</b>${hit(r.kval)?' <span class="mut">(foreslået her)</span>':''}<br><span class="mut">${r.txt}</span></div></div>`).join('')}
  <p class="mut"><b>Tommelfingerregel:</b> jo lavere tal (de to sidste cifre), jo hårdere og mere slidstærk. Jo højere tal, jo sejere og mere sikker.${G.regel?' '+G.regel:''}</p>
  <p class="mut">Vejledende. Udledt af ${navn}s egne beskrivelser (<a style="color:var(--acc)" target="_blank" rel="noopener" href="${G.kilde}">kilde</a>). Tjek altid kataloget.</p></details>`;
}
function startKort(){
  if(!D.start)return '';
  const sv=sandvikList().filter(f=>f.rolle==='foerst')[0], pa=palbitAvail(), pr=pa.rec, mk=modelKomplet()?modelKode():'';
  const rows=[];
  if(sv){const brk=utenBryder()?'':(sv.brk||'');rows.push(`<div><b>Sandvik:</b> ${modelKomplet()&&S.mat!=='N'&&S.mat!=='H'?'<span class="code" style="font-size:1rem">'+sandvikKode(brk,sv.kval)+'</span>':(brk?brk+' ':'')+sv.kval}</div>`)}
  if(pr&&!mk)rows.push(`<div><b>Palbit:</b> ${pr.brk[0]}${pr.kval?' '+pr.kval[0]:''}</div>`);
  else if(pr&&pa.b)rows.push(`<div><b>Palbit:</b> <span class="code" style="font-size:1rem">${mk.slice(0,4)} ${mk.slice(4)}-${pa.b}${pa.g?' '+pa.g:''}</span>${pa.g?'':' · vælg kvalitet i listen'}${pr.status==='kilde'?'':' <span class="mut">(ikke bekræftet)</span>'}</div>`);
  else if(pr&&mk)rows.push(`<div><b>Palbit:</b> <span class="mut">ingen af de foreslåede spånbrydere (${pr.brk.join('/')}) findes til ${mk} – se listen nedenfor</span></div>`)
  for(const x of D.manufacturers.makers.filter(m=>m.id==='ceratizit'||m.id==='kennametal')){
    if(utenBryder()||S.mat==='N'||S.mat==='H'||!D.start[x.id])continue;
    const f=gList(x.id).find(f=>f.rolle==='foerst'); if(!f)continue; const kode=gKode(x.id,f.brk,f.kval);
    rows.push(`<div><b>${x.navn}:</b> ${kode?'<span class="code" style="font-size:1rem">'+kode+'</span>':(f.brk?f.brk+' ':'')+f.kval}${D.start[x.id].status==='ikke-bekraeftet'?' <span class="mut">(ikke bekræftet)</span>':''}</div>`)}
  if(!rows.length)return '';
  return `<div class="card ok"><b>🚀 Start her</b> <span class="mut">(til ${S.sub} · ${S.bearb})</span>${rows.join('')}<p class="mut" style="margin:.4rem 0 0">Udgangspunkt, ikke facit. Tjek i fabrikantens katalog, og ret ud fra dine forhold.</p></div>`;
}
function gList(id){
  const st=D.start[id]; if(!st)return [];
  const F=st.forslag, own=((F[S.mat]||{})[S.bearb]||[]).filter(f=>!f.sub||f.sub.includes(S.sub));
  const ov=(D.start.overlap||{})[S.mat]||[], extra=[];
  for(const g of ov)for(const f of ((F[g]||{})[S.bearb]||[])){
    if(own.some(o=>o.brk===f.brk&&o.kval===f.kval)||extra.some(o=>o.brk===f.brk&&o.kval===f.kval))continue;
    extra.push({...f,rolle:'alt',fra:g,note:'Stålplatte, kan også bruges i støbejern. '+f.note})}
  return own.concat(extra)}
function gKode(id,brk,kval){
  const st=D.start[id]; if(!st||!st.format||!modelKomplet())return '';
  const b=baseKode(), m=S.mdl;
  return st.format.replace('{shape4}',b).replace('{size}',m.ic+m.tyk+m.rad).replace('-{brk}',brk?'-'+brk:'').replace('{kval}',kval)}
function gUrl(x,q){return 'https://www.google.com/search?q='+encodeURIComponent('site:'+x.dom+' '+q)}
function genericForslag(x){
  const id=x.id, st=D.start[id]; if(!st)return '';
  if(utenBryder())return `<p class="mut">Ingen platter uden spånbryder (…A) fundet hos ${x.navn}.</p>`;
  if(S.mat==='N'||S.mat==='H')return `<p class="mut">Ingen forslag til ISO ${S.mat} fundet hos ${x.navn} til negative drejeplatter. Jeg gætter ikke.</p>`;
  const lst=gList(id); if(!lst.length)return `<p class="mut">Ingen ${x.navn}-forslag fundet for ISO ${S.mat} / ${S.bearb}. Jeg gætter ikke.</p>`;
  const bad=st.status==='ikke-bekraeftet';
  return `<div class="mut" style="margin:.4rem 0"><b>Startforslag fra ${x.navn}</b>${bad?' · <b>ikke bekræftet</b> (tredjepart)':''}</div>`+lst.map(f=>{
    const kode=gKode(id,f.brk,f.kval); const q=kode||((modelKomplet()?modelKode()+' ':'')+(f.brk?f.brk+' ':'')+f.kval);
    return `<div class="card" style="margin:.4rem 0"><b>${f.brk?f.brk+' ':''}${f.kval}</b>${f.rolle==='foerst'?' ⭐ førstevalg':' · alternativ'}${f.fra?` <span class="badge" style="background:#2f6fdb">fra stål</span>`:''}${kode?`<div class="code" style="font-size:1.05rem">${kode}</div>`:''}<span class="mut">${f.note}</span><div style="margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn primary" style="flex:1" target="_blank" rel="noopener" href="${gUrl(x,q)}">🔎 Søg ${kode||f.kval}</a><button data-use="${f.kval}" data-brk="${f.brk||''}" style="flex:0 0 auto">Brug som valg</button></div></div>`}).join('')
    +`<p class="mut">${st.verificeret} <a style="color:var(--acc)" target="_blank" rel="noopener" href="${st.kilde.startsWith('http')?st.kilde:x.url}">Kilde</a>${st.kilde.startsWith('http')?'':': '+st.kilde}. Tjek altid dit eget katalog.</p>`;
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
  const chip=(b,l)=>`<div class="card" style="margin:.4rem 0"><b>${mk.slice(0,4)} ${mk.slice(4)}${b==='(ingen)'?'':'-'+b}</b><div style="margin-top:.4rem;display:flex;gap:.4rem;flex-wrap:wrap">${l.map(([bb,g,a])=>`<a class="btn${rec&&rec.kval&&rec.kval.includes(g)?' primary':''}" style="padding:.4rem .6rem" target="_blank" rel="noopener" href="${link(bb,g,a)}">${g} ↗</a>`).join('')}</div><button data-use="${l[0][1]}" data-brk="${b==='(ingen)'?'':b}" style="margin-top:.4rem">Brug ${b==='(ingen)'?'':b+' '}som valg</button></div>`;
  const recB=rec?rec.brk.filter(b=>byB[b]):[]; const rest=Object.entries(byB).filter(([b])=>!recB.includes(b)&&(!utenBryder()||b==='(ingen)'));
  let h='';
  if(rec){
    const st=rec.status==='kilde'?'Kilde: Palbits PDF om spånbrydere (rustfrit og HRSA)':'Ikke bekræftet. Stammer ikke fra Palbits egen side';
    h+=`<div class="mut" style="margin:.4rem 0"><b>Startforslag fra Palbit</b> · ${st}</div>`;
    h+=recB.length?recB.map(b=>chip(b,byB[b])).join('')+`<p class="mut">${rec.note}${rec.kval?` Anbefalede kvaliteter (fremhævet): ${rec.kval.join(', ')}.`:''}</p>`
       :`<p class="mut">Den foreslåede spånbryder (${rec.brk.join('/')}) findes ikke til ${mk} i Palbits katalog.</p>`;
  } else h+=`<p class="mut">Ingen Palbit-anbefaling for ISO ${S.mat} / ${S.bearb} fundet.</p>`;
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
    `Operation: ${op().drejning?'Drejning (udvendig/indvendig)':op().navn}`,`Materiale: ${S.sub} ${g.sub.find(s=>s.id===S.sub).navn}`,
    `Plattetype: ${shapes}${modelKomplet()?' ('+modelKode()+')':''}`,S.brk&&!utenBryder()?`Spånbryder: ${S.brk}`:'',S.kval?`Kvalitet: ${S.kval}`:'',
    `Spånform: ${R.spaanform.find(x=>x.id===S.spaan).navn}`,`Bearbejdning: ${S.bearb}`,
    S.r?`r = ${S.r} mm`:'',S.f?`f = ${S.f} mm/omdr.`:'',S.ap?`ap = ${S.ap} mm`:'',S.vc?`vc = ${S.vc} m/min`:''].filter(Boolean).join('\n');
  app.innerHTML=`<h2>Anbefaling</h2>
  <div class="card"><span class="badge" style="background:${g.farve}">${g.id}</span><b>ISO ${S.sub}</b> – ${g.sub.find(s=>s.id===S.sub).navn}<br>
  <span class="mut">Kvalitetsområde: ISO ${g.id} (vælg kvalitet i fabrikantens selektor)</span></div>
  <div class="card"><b>Spånbryder/geometri</b><br>${utenBryder()?'Ingen spånbryder (type A). Spånkontrol sker via ap/f og evt. kølemiddel.':brk}<br><span class="mut">Plattetype: ${shapes}</span></div>
  <div class="card"><b>Materialenote ${g.id}</b><br>${R.materialeNoter[g.id]}</div>
  ${checks}
  ${startKort()}
  <h3>Søg hos fabrikant</h3>
  <div class="card"><b>Model</b><div class="code">${modelKode()||'alle typer'}</div><div class="row">${utenBryder()?'':`<div><label>Spånbryder (valgfri)</label><input id="brk" placeholder="fx PM" value="${S.brk||''}"></div>`}<div><label>Kvalitet (valgfri)</label><input id="kval" placeholder="fx 4325" value="${S.kval||''}"></div></div><p class="mut">Spånbryder og kvalitet hedder forskelligt hos hver fabrikant. Skriv dem selv ind.</p></div>
  ${m.map(x=>`<div class="card"><b>${x.navn}</b><br><span class="mut">${x.tip}${x.verificeret?'':' (ikke verificeret)'}</span><br><br><a class="btn primary" target="_blank" rel="noopener" href="${soeg(x)}">🔎 Søg ${modelKode()||'platter'} hos ${x.navn} ↗</a><a class="btn" style="margin-top:.5rem" target="_blank" rel="noopener" href="${x.url}">Åbn forsiden ↗</a>${x.id==='sandvik'?sandvikForslag()+guideBox('sandvik'):x.id==='palbit'?palbitForslag()+guideBox('palbit'):genericForslag(x)+guideBox(x.id)}${(x.extra||[]).map(e=>`<a class="btn" style="margin-top:.5rem" target="_blank" rel="noopener" href="${e.url}">${e.label} ↗ <span class="mut">(ikke testet)</span></a>`).join('')}</div>`).join('')}
  <div class="card"><b>Resumé (til indtastning)</b><pre style="white-space:pre-wrap;margin:.4rem 0">${resume}</pre><button id="cp">📋 Kopiér resumé</button></div>
  ${nav(true,null)}<div class="nav"><button data-act="edit">✏️ Ret valg</button><button data-act="reset">↺ Start forfra</button></div>`;
  app.querySelectorAll('[data-use]').forEach(b=>b.onclick=()=>{S.kval=b.dataset.use;if(b.dataset.brk!==undefined)S.brk=b.dataset.brk;save();render();scrollTo(0,0)});
  for(const id of ['brk','kval']){const el=$('#'+id);if(el)el.onchange=e=>{S[id]=e.target.value.trim();save();render()}}
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
