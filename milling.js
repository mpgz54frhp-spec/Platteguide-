'use strict';
/* ---------- fræsning (Sandvik + Palbit) ---------- */
const isMill=()=>S.op==='mill';
const mtNavn=id=>((D.milling.typer||[]).find(t=>t.id===id)||{}).navn||'';
const subNavn=()=>{const s=grp().sub.find(x=>x.id===S.sub);return s?s.navn:''};
const rng2=v=>String(v).replace('-','–');
const pRange=v=>{const m=String(v).match(/^(\d+(?:,\d+)?)-(\d+(?:,\d+)?)$/);return m?[+m[1].replace(',','.'),+m[2].replace(',','.')]:null};
const inR=(x,v)=>{const r=pRange(v),n=num(x);return r&&n>0?(n>=r[0]&&n<=r[1]?' ✅':' ⚠️'):''};
const p2=n=>String(n).padStart(2,'0');
const HARD={1:'meget hård',2:'hård',3:'medium hård',4:'sej',5:'meget sej'};

function palIso(g){const x=(D.milling.palbit.grader[g]||{}).iso;return x&&x[S.mat]?x[S.mat]:null}
const palIsoTxt=g=>{const i=palIso(g);return i?`${S.mat}${p2(i[0])}–${S.mat}${p2(i[1])}`:''};
const palRank=g=>{const i=palIso(g);return i?(i[0]+i[1])/2:rk(g)};
const palTags=g=>(D.milling.palbit.grader[g]||{}).tags||[];
const svSort=(a,b)=>a.rank-b.rank||((a.hard||3)-(b.hard||3));
const svNum=g=>g.replace(/^(GC|CT)/,'');

/* vælg 1 kvalitet ud fra bearbejdning: slut = hårdeste, skrub = sejeste, medium = midterste */
function pickGrade(arr,rankFn,tagFn){
  const m=arr.filter(x=>tagFn(x).includes(S.bearb)); if(!m.length)return null;
  const s=[...m].sort((a,b)=>rankFn(a)-rankFn(b));
  return S.bearb==='slut'?s[0]:S.bearb==='skrub'?s[s.length-1]:s[Math.floor((s.length-1)/2)];
}

/* ---------- Palbit ---------- */
function palLines(){
  const P=D.milling.palbit, row=P.matRaekke[S.sub]; if(!row)return [];
  return P.linjer.filter(l=>l.type===S.mtype&&Object.values(l.vc).some(v=>v[row])).map(l=>{
    const gs=Object.keys(l.vc).filter(g=>l.vc[g][row]).sort((a,b)=>palRank(a)-palRank(b));
    return {l,gs,match:gs.filter(g=>palTags(g).includes(S.bearb)),row};
  }).sort((a,b)=>b.match.length-a.match.length);
}
function millPalbit(){
  const P=D.milling.palbit, row=P.matRaekke[S.sub];
  if(!row)return `<p class="mut">Palbits fræsekatalog har ingen skæredata for ${S.sub} (${subNavn()}). Jeg gætter ikke. Se kataloget.</p>`;
  const L=palLines();
  if(!L.length)return `<p class="mut">Ingen Palbit-fræserlinje til ${mtNavn(S.mtype).toLowerCase()} i ${P.matNavn[row]} fundet i kataloget.</p>`;
  const cards=L.map(({l,gs,match})=>{
    const chips=gs.map(g=>{const gi=P.grader[g]||{};return `<span class="btn pill${match.includes(g)?' primary':''}${gi.afl?' undoc':''}" title="${palIsoTxt(g)||'ISO-område ikke angivet'}">${match.includes(g)?'⭐ ':''}${g}<br><small>${rng2(l.vc[g][row])} m/min${inR(S.vc,l.vc[g][row])}</small></span>`}).join('');
    const fz=l.fz.filter(f=>f.vals[row]).map(f=>`${f.col} <b>${rng2(f.vals[row])}</b>${inR(S.f,f.vals[row])}`).join(' · ');
    const notes=gs.map(g=>{const gi=P.grader[g]||{};return `<div class="svrow"><b>${g}</b> <span class="mut">${palIsoTxt(g)}${gi.afl?' · ⭐-markering udledt af ISO-område':''}</span><br><span class="mut">${gi.txt||'Ingen beskrivelse af kvaliteten i kataloget.'}</span></div>`}).join('');
    return `<div class="card" style="margin:.4rem 0"><b>${l.id}</b> <span class="mut">· katalog s. ${l.side}</span><div class="chiprow">${chips}</div>${gs.length>1?HINT:''}<div class="sv">fz (mm/tand): ${fz||'<span class="mut">ikke angivet for dette materiale</span>'}</div><details class="noter"><summary class="mut">Om kvaliteterne (${gs.length})</summary>${notes}</details></div>`;
  });
  const vis=cards.slice(0,3).join(''), rest=cards.slice(3);
  return `<div class="mut" style="margin:.4rem 0"><b>Palbits fræserlinjer til ${mtNavn(S.mtype).toLowerCase()}</b> i ${P.matNavn[row]} (${S.sub})</div>${vis}${rest.length?`<details><summary class="mut">Flere linjer (${rest.length})</summary>${rest.join('')}</details>`:''}<p class="mut">vc og fz er Palbits anbefalede skæredata (ae/Dc = 70 %). ⭐ = kvalitet, der passer til ${S.bearb} ifølge Palbits beskrivelse/ISO-område. Linjerne er placeret under ${mtNavn(S.mtype).toLowerCase()} ud fra katalogets inddeling og anvendelseslinje. Kilde: <a style="color:var(--acc)" target="_blank" rel="noopener" href="${P.url}">${P.kilde}</a>. Tjek altid kataloget og din maskines stabilitet (ved vibrationer: sænk ap og vc 30 %, behold fz).</p>`;
}

/* ---------- Sandvik ---------- */
function svStartLinje(x,famList){
  const SV=D.milling.sandvik;
  for(const f of famList){
    const e=SV.start[f+'|'+svNum(x.g)]; if(!e)continue;
    for(const it of e){
      const ex=it.blocks.find(k=>k.sub.startsWith(S.sub)), b=ex||it.blocks.find(k=>k.letter===S.mat); if(!b)continue;
      const t=(n,a,u)=>a?`${n} <b>${fmt(a[0])}</b>${a[1]!=null?` (${fmt(Math.min(a[1],a[2]))}–${fmt(Math.max(a[1],a[2]))})`:''} ${u}`:'';
      return `<div class="sv">📈 Eksempel (${it.code}, ${ex?'':'nærmeste materiale '}${b.sub}${b.hb?', '+b.hb+' HB':''}): ${[t('vc',b.vc,'m/min'),t('fz',b.fz,'mm/tand')].filter(Boolean).join(' · ')}<br><span class="mut">Sandviks startværdier hører til netop denne plade. Andre geometrier/størrelser afviger.</span></div>`;
    }
  }
  return '';
}
function svGrades(){
  const SV=D.milling.sandvik, list=SV.grader[S.mat]||[];
  return {inType:list.filter(x=>x.fam[S.mtype]).sort(svSort),komp:list.filter(x=>!x.fam[S.mtype]).sort(svSort)};
}
function svFamilies(inType){
  const FAM=D.milling.sandvik.familier[S.mtype]||{};
  return Object.keys(FAM).filter(f=>inType.some(x=>x.fam[S.mtype].includes(f)));
}
function millSandvik(){
  const SV=D.milling.sandvik, FAM=SV.familier[S.mtype]||{}, {inType,komp}=svGrades(), fams=svFamilies(inType);
  if(!(SV.grader[S.mat]||[]).length)return `<p class="mut">Ingen Sandvik-fræsekvaliteter fundet for ISO ${S.mat}.</p>`;
  if(!fams.length)return `<p class="mut">Sandviks kvalitetsside for ${grp().navn.replace(/^. – /,'').toLowerCase()} nævner ingen cutter-serie til ${mtNavn(S.mtype).toLowerCase()}. Jeg gætter ikke. <a style="color:var(--acc)" target="_blank" rel="noopener" href="${SV.kilde}">Sandvik: fræsekvaliteter</a></p>`;
  const famRows=fams.map(f=>{const q=/^\d+$|^M[A-Z]\d+$/.test(f)?svUrl(`PRODFAM:"CoroMill ${f}"`):null;
    return `<div class="svrow"><b>${q?`<a style="color:var(--acc)" target="_blank" rel="noopener" href="${q}">CoroMill ${f} ↗</a>`:'CoroMill '+f}</b><br><span class="mut">${FAM[f]}</span></div>`}).join('');
  const chips=inType.map(x=>{const fs=x.fam[S.mtype].filter(f=>fams.includes(f)), f0=fs[0], hit=x.tags.includes(S.bearb);
    return `<a class="btn${hit?' primary':''}" style="padding:.4rem .6rem" target="_blank" rel="noopener" href="${svUrl(`PRODFAM:"CoroMill ${f0}" GRADE:"${svNum(x.g)}"`)}">${hit?'⭐ ':''}${x.g} ↗<br><small>${HARD[x.hard]||''}${HARD[x.hard]?' · ':''}${fs.join(', ')}</small></a>`}).join('');
  const rows=inType.map(x=>`<div class="svrow"><b>${x.g}</b> <span class="mut">· ${HARD[x.hard]||'hårdhed ikke angivet'} · serier: ${x.fam[S.mtype].join(', ')}</span><br><span class="mut">${x.desc}</span>${svStartLinje(x,x.fam[S.mtype])}</div>`).join('');
  const kRows=komp.map(x=>`<div class="svrow"><b>${x.g}</b> <span class="mut">· ${HARD[x.hard]||''}</span><br><span class="mut">${x.desc}</span></div>`).join('');
  return `<div class="mut" style="margin:.4rem 0"><b>Cutter-serier fra Sandvik</b> til ${mtNavn(S.mtype).toLowerCase()} i ISO ${S.mat}</div><div class="card" style="margin:.4rem 0">${famRows}</div>
  <div class="mut" style="margin:.6rem 0 .2rem"><b>Kvaliteter</b> (hårdest → sejest)</div><div class="card" style="margin:.4rem 0"><div class="chiprow">${chips}</div>${inType.length>1?HINT:''}
  <details class="noter"><summary class="mut">Noter og startværdier (${inType.length})</summary>${rows}</details>${komp.length?`<details class="noter"><summary class="mut">Supplerende kvaliteter uden angivet serie (${komp.length})</summary>${kRows}</details>`:''}</div>
  <p class="mut">⭐ = passer til ${S.bearb} (udledt af Sandviks beskrivelse). Rækkefølgen følger tallet i kvalitetsnavnet, så hård/sej-ordenen er vejledende. Beskrivelser er Sandviks egne (engelsk). Sandvik viser ikke vc/fz pr. materiale på kvalitetssiderne. Eksempler på startværdier stammer fra produktsider og gælder én bestemt plade. <a style="color:var(--acc)" target="_blank" rel="noopener" href="${SV.kilde}">Kilde</a>.</p>`;
}

/* ---------- hård ↔ sej ---------- */
function millGuide(maker){
  const navn=MN[maker];let rows='';
  if(maker==='palbit'){
    const set=new Set();palLines().forEach(x=>x.gs.forEach(g=>set.add(g)));
    const gs=[...set].sort((a,b)=>palRank(a)-palRank(b));
    if(!gs.length)return `<details class="guide"><summary>📘 Hård ↔ sej (Palbit)</summary><p class="mut">Ingen kvaliteter at rangere her.</p></details>`;
    rows=gs.map((g,i)=>`<div class="gr"><div class="n">${i+1}</div><div><b>${g}</b> <span class="mut">${palIsoTxt(g)}</span><br><span class="mut">${(D.milling.palbit.grader[g]||{}).txt||''}</span></div></div>`).join('');
  }else{
    const {inType}=svGrades(); if(!inType.length)return '';
    rows=inType.map((x,i)=>`<div class="gr"><div class="n">${i+1}</div><div><b>${x.g}</b> <span class="mut">${HARD[x.hard]||''}</span><br><span class="mut">${x.desc}</span></div></div>`).join('');
  }
  return `<details class="guide"><summary>📘 Hård ↔ sej (${navn}, ISO ${S.mat})</summary><div class="bar"></div><div class="lbl"><span>Hårdere · mere slidstærk</span><span>Sejere · mere sikker</span></div>${rows}
  <p class="mut"><b>Tommelfingerregel:</b> jo lavere tal, jo hårdere og mere slidstærk. Jo højere tal, jo sejere og mere sikker. ${maker==='palbit'?'Palbit rangeres efter ISO-området i deres katalog (side A-354 ff.).':'Sandvik rangeres efter tallet i navnet og deres egne ord (hård/sej). Cermet/CBN/PCD er særlige.'} Vejledende, tjek kataloget.</p></details>`;
}

/* ---------- Start her ---------- */
function startKortM(){
  const rows=[], row=D.milling.palbit.matRaekke[S.sub];
  const {inType}=svGrades(), fams=svFamilies(inType);
  if(fams.length){
    const g=pickGrade(inType,x=>x.rank,x=>x.tags);
    rows.push(`<div><b>Sandvik:</b> CoroMill ${g?g.fam[S.mtype].find(z=>fams.includes(z))||fams[0]:fams[0]}${g?' · '+g.g:''}</div>`);
  }
  const L=palLines();
  if(L.length){
    const best=L.find(x=>x.match.length)||L[0], g=pickGrade(best.gs,palRank,palTags)||best.gs[0];
    rows.push(`<div><b>Palbit:</b> ${best.l.id} · ${g} <span class="mut">(vc ${rng2(best.l.vc[g][row])} m/min)</span></div>`);
  }
  if(!rows.length)return '';
  return `<div class="card ok"><b>🚀 Start her</b> <span class="mut">(til ${S.sub} · ${S.bearb} · ${mtNavn(S.mtype).toLowerCase()})</span>${rows.join('')}<p class="mut" style="margin:.4rem 0 0">Udgangspunkt, ikke facit. Kvalitet er valgt efter ${S.bearb} (slut = hårdest, skrub = sejest). Tjek i fabrikantens katalog.</p></div>`;
}

/* ---------- trin 3: fræsertype ---------- */
function r2m(){
  app.innerHTML=`<h2>Fræsertype</h2><div class="grid">${D.milling.typer.map(t=>`<button data-mt="${t.id}" class="${S.mtype===t.id?'sel':''}"><b>${t.navn}</b><br><span class="mut">${t.info}</span></button>`).join('')}</div><p class="mut">Profilfræsning kommer senere.</p>${nav(true,!!S.mtype)}`;
  app.querySelectorAll('[data-mt]').forEach(b=>b.onclick=()=>{S.mtype=b.dataset.mt;sc('sec-nav');save();render()});
  bindNav();
}

/* ---------- trin 5: skæredata ---------- */
function r4m(){
  app.innerHTML=`<h2>Skæredata (valgfrit)</h2><p class="mut">Indtast dine egne værdier. Appen markerer dem med ✅ eller ⚠️ mod Palbits anbefalede områder.</p>
  <div class="row"><div><label>Tilspænding fz (mm/tand)</label><input id="f" inputmode="decimal" value="${fmt(S.f)}"></div>
  <div><label>Skærehastighed vc (m/min)</label><input id="vc" inputmode="decimal" value="${fmt(S.vc)}"></div></div>
  <div class="row"><div><label>Skæredybde ap (mm)</label><input id="ap" inputmode="decimal" value="${fmt(S.ap)}"></div><div></div></div>
  ${nav(true,true,'Vis resultat →')}`;
  for(const id of ['f','ap','vc'])$('#'+id).oninput=e=>{S[id]=e.target.value.trim();save()};
  bindNav();
}

/* ---------- resultat ---------- */
function chipsM(){
  const c=(t,v,step)=>`<button class="chip" data-edit="${step}"><span class="mut">${t}</span> <b>${v}</b> ✏️</button>`;
  return `<div class="chips">${c('Materiale',S.sub,1)}${c('Fræsertype',mtNavn(S.mtype),2)}${c('Bearbejdning',S.bearb,3)}${c('Skæredata',[S.f&&'fz '+fmt(S.f),S.vc&&'vc '+fmt(S.vc),S.ap&&'ap '+fmt(S.ap)].filter(Boolean).join(' · ')||'ikke angivet',4)}</div><p class="mut" style="margin:.2rem 0 .8rem">Tryk på et valg for at ændre det og vende direkte tilbage hertil.</p>`;
}
function statusM(id){
  if(id==='sandvik'){const {inType}=svGrades(),f=svFamilies(inType);return f.length?`${f.length} ${f.length===1?'serie':'serier'}, ${inType.length} ${inType.length===1?'kvalitet':'kvaliteter'} til ISO ${S.mat}`:'ingen serie fundet'}
  const n=palLines().length;return n?`${n} ${n===1?'linje':'linjer'} med skæredata`:'ingen data fundet';
}
function r5m(){
  pushRecent();
  const g=grp(), R=D.rules, m=D.manufacturers.makers;
  const resume=[`Operation: Fræsning (${mtNavn(S.mtype).toLowerCase()})`,`Materiale: ${S.sub} ${subNavn()}`,`Bearbejdning: ${S.bearb}`,S.f?`fz = ${fmt(S.f)} mm/tand`:'',S.ap?`ap = ${fmt(S.ap)} mm`:'',S.vc?`vc = ${fmt(S.vc)} m/min`:''].filter(Boolean).join('\n');
  const body=x=>x.id==='sandvik'?millSandvik()+millGuide('sandvik'):x.id==='palbit'?millPalbit()+millGuide('palbit'):'';
  const links=x=>x.id==='sandvik'?`<a class="btn primary" target="_blank" rel="noopener" href="${svUrl('CoroMill')}">🔎 Søg CoroMill ↗</a><a class="btn" target="_blank" rel="noopener" href="${x.url}">Forside ↗</a>`:`<a class="btn primary" target="_blank" rel="noopener" href="${D.milling.palbit.url}">📖 Palbit e-katalog ↗</a><a class="btn" target="_blank" rel="noopener" href="${x.url}">Forside ↗</a>`;
  app.innerHTML=`<div class="rhead"><h2>Anbefaling</h2><button class="mini" id="fav">${isFav()?'⭐ Gemt':'☆ Gem som favorit'}</button></div>
  ${chipsM()}
  ${startKortM()}
  <div class="card"><span class="badge" style="background:${g.farve}">${g.id}</span><b>ISO ${S.sub}</b> – ${subNavn()}<br><span class="mut">${R.materialeNoter[g.id]}</span></div>
  <h3>Forslag pr. fabrikant</h3>
  ${m.map(x=>`<details class="maker card" data-fold="${x.id}" ${S.fold[x.id]===false?'':'open'}><summary><b>${x.navn}</b> <span class="mut">· ${statusM(x.id)}</span></summary><div class="srow">${links(x)}</div>${body(x)}</details>`).join('')}
  <div class="card"><b>Resumé (til indtastning)</b><pre style="white-space:pre-wrap;margin:.4rem 0">${resume}</pre><div class="nav" style="margin-top:.4rem"><button id="cp">📋 Kopiér</button><button id="sh">📤 Del</button></div></div>
  ${nav(true,null)}<div class="nav"><button data-act="reset">↺ Start forfra</button></div>`;
  app.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{S.back=true;go(+b.dataset.edit)});
  $('#fav').onclick=()=>{toggleFav();render()};
  $('#cp').onclick=()=>{navigator.clipboard?.writeText(resume);$('#cp').textContent='✅ Kopieret'};
  $('#sh').onclick=()=>{if(navigator.share)navigator.share({title:'Platteguide',text:resume}).catch(()=>{});else{navigator.clipboard?.writeText(resume);$('#sh').textContent='✅ Kopieret'}};
  app.querySelectorAll('details[data-fold]').forEach(d=>d.addEventListener('toggle',()=>{S.fold[d.dataset.fold]=d.open;save()}));
  bindNav();
}
