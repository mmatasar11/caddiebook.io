/* ============================================================
   ROUND OVERVIEW + FINISH + PAST-ROUND DETAIL
   ============================================================
   vOverview      the 18-cell at-a-glance grid (color = vs par)
                  + finish/discard for live rounds
   vRoundDetail   a finished round hole-by-hole, reopenable
   vLegacyDetail  read-only view for 18Birdies imports
   ============================================================ */
function vOverview(r){
  const rd=deriveRound(r);
  const cells = r.holes.map((h,i)=>{
    const d=rd.perHole[i];
    let cls=''; if(d.score!=null){ const tp=d.score-h.par; cls = tp<0?'under': tp===1?'over1': tp>=2?'overX':''; }
    return `<div class="ovCell ${cls}" onclick="jumpHole(${h.n})">
      <div class="hn">${h.n}·P${h.par}</div><div class="sc">${d.score!=null?d.score:'–'}</div>
      <div class="dots">${d.gir==='Y'?'🟢':''}${d.fir==='Y'?'⚪':''}${d.putts?d.putts+'p':''}</div></div>`;
  }).join('');
  const active = !r.finished;
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
      <button class="btn sm ghost" onclick="${active? `PLAYVIEW='hole'`:`PLAYVIEW='roundDetail'`};render()">‹ Back</button>
      <span class="eyebrow">${esc(courseOf(r)?courseOf(r).name:'')} · ${fmtDate(r.date)}</span></div>
    <div class="card"><div class="hd"><span class="t">Round overview</span>
      <span class="num" style="font-weight:800;font-size:18px">${rd.score} (${rd.toPar===0?'E':(rd.toPar>0?'+':'')+rd.toPar})</span></div>
    <div class="bd"><div class="ovGrid">${cells}</div>
      <hr class="sep">
      <div class="row small" style="flex-wrap:wrap;gap:12px">
        <span>Out <b class="num">${rd.f9||'–'}</b></span><span>In <b class="num">${rd.b9||'–'}</b></span>
        <span>Putts <b class="num">${rd.putts}</b></span>
        <span>FIR <b class="num">${pct(rd.firY,rd.firD)}</b></span>
        <span>GIR <b class="num">${pct(rd.girY,rd.girD)}</b></span>
        <span>U&D <b class="num">${rd.udA? rd.udM+'/'+rd.udA:'–'}</b></span>
        <span>Pen <b class="num">${rd.pen}</b></span></div>
    </div></div>
    ${active&&r.ctx? `<div class="card"><div class="bd"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px">
      <span class="small">Vibe <span class="stars">${[1,2,3,4,5].map(v=>`<button class="${(r.ctx.vibe||0)>=v?'on':''}" onclick="rVibe('${r.id}',${v})">⭐</button>`).join('')}</span></span>
      <span class="small">🍺 <b class="num">${r.ctx.drinks||0}</b></span>
      ${r.ctx.partners?`<span class="small">👥 ${esc(r.ctx.partners)}</span>`:''}
    </div></div></div>`:''}
    ${active? `<button class="btn primary wide" style="min-height:60px" onclick="finishRound()">Finish round ✔</button>
      <div style="height:8px"></div><button class="btn wide danger" onclick="if(confirm('Discard this round entirely?')){S.rounds=S.rounds.filter(x=>x.id!=='${r.id}');S.activeRoundId=null;PLAYVIEW='home';render();}">Discard round</button>`
    : `<button class="btn wide" onclick="exportRoundText('${r.id}')">Copy AI text export</button>`}`;
}
/** Tap a cell to jump straight to that hole (live rounds only). */
function jumpHole(n){ const r=activeRound()||S.rounds.find(x=>x.id===VIEWROUND); if(!r||r.finished) return;
  const i=r.holes.findIndex(h=>h.n===n); if(i>=0){ r.curHole=i+1; PLAYVIEW='hole'; render(); } }
/** Close out the round, stamp differentials, land on the detail view. */
function finishRound(){
  const r=activeRound(); r.finished=true; S.activeRoundId=null;
  handicapTimeline(); // stamps _diff
  VIEWROUND=r.id; PLAYVIEW='roundDetail'; render();
  toast('Round saved. Stats updated.');
}
/** A finished round hole-by-hole with per-hole shot summaries. */
function vRoundDetail(id){
  const r=S.rounds.find(x=>x.id===id); if(!r){PLAYVIEW='home';return vRoundsHome();}
  if(r.legacy) return vLegacyDetail(r);
  const rd=deriveRound(r);
  handicapTimeline();
  const holes=r.holes.map((h,i)=>{
    const d=rd.perHole[i];
    const shots=h.shots.map((s,j)=>`<span class="num small">${clubLabel(s.clubId)} ${s.lie}${s.dist!=null?' '+s.dist+(s.unit==='f'?'ft':''):''}${s.fType==='lat'?' '+(s.lat||''):s.pad?' '+s.pad+(s.fType==='putt'?'p':'g'):''}</span>`).join(' · ');
    return `<div class="listRow" onclick="reopenHole('${r.id}',${h.n})"><div class="main">
      <div class="ti">H${h.n} · Par ${h.par} <span class="num" style="margin-left:8px">${d.score!=null?d.score:'–'}</span>
        ${d.gir==='Y'?'<span class="tag">GIR</span>':''}${d.threePutt?'<span class="tag" style="background:var(--flag-soft);color:var(--flag)">3-putt</span>':''}</div>
      <div class="sub">${shots||'no shots logged'}</div></div><span class="arr">›</span></div>`;
  }).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
    <button class="btn sm ghost" onclick="PLAYVIEW='home';render()">‹ Rounds</button>
    <button class="btn sm" onclick="VIEWROUND='${r.id}';PLAYVIEW='overview';render()">Overview ▦</button></div>
    <div class="pageTitle"><h1>${esc(courseOf(r)?courseOf(r).name:'Round')}</h1>
      <span class="num" style="font-size:24px;font-weight:800">${rd.score}</span></div>
    <div class="small muted" style="margin:-8px 2px 12px">${fmtDate(r.date)} · ${esc(teeOf(r)?teeOf(r).name:'')} tees${roundSpan(r)!=='18'?' · '+(roundSpan(r)==='B9'?'back 9':'front 9'):''}${r._diff!=null? ' · differential '+r1(r._diff):''}${r.weather? ' · '+esc(r.weather):''}${r.ctx&&r.ctx.partners? ' · with '+esc(r.ctx.partners):''}${r.ctx&&r.ctx.vibe? ' · '+'⭐'.repeat(r.ctx.vibe):''}${r.ctx&&r.ctx.drinks? ' · 🍺'+r.ctx.drinks:''}</div>
    <div class="card"><div class="bd tight">${holes}</div></div>
    <div class="grid2"><button class="btn" onclick="exportRoundText('${r.id}')">Copy AI text</button>
    <button class="btn" onclick="reopenRound('${r.id}')">Reopen to edit</button></div>
    <div style="height:8px"></div>
    <button class="btn wide danger sm" onclick="if(confirm('Delete this round?')){S.rounds=S.rounds.filter(x=>x.id!=='${r.id}');PLAYVIEW='home';render();}">Delete round</button>`;
}
/** Reopen a finished round directly onto one hole for edits. */
function reopenHole(rid,n){ const r=S.rounds.find(x=>x.id===rid); r.finished=false; S.activeRoundId=rid; r.curHole=n; PLAYVIEW='hole'; render(); }
/** Reopen a finished round for editing wherever it was left. */
function reopenRound(rid){ const r=S.rounds.find(x=>x.id===rid); r.finished=false; S.activeRoundId=rid; PLAYVIEW='hole'; render(); }

/** Read-only detail for an 18Birdies import: strokes grid + aggregates. */
function vLegacyDetail(r){
  const rd=deriveRound(r);
  const c=courseOf(r);
  const cells=r.holes.map((h,i)=>`<div class="ovCell"><div class="hn">${h.n}</div><div class="sc">${h.strokes||'–'}</div></div>`).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
    <button class="btn sm ghost" onclick="PLAYVIEW='home';render()">‹ Rounds</button>
    <span class="tag" style="background:var(--sand);color:var(--amber)">Imported from 18Birdies</span></div>
  <div class="pageTitle"><h1>${esc(c?c.name:'Round')}</h1>
    <span class="num" style="font-size:24px;font-weight:800">${rd.score}</span></div>
  <div class="small muted" style="margin:-8px 2px 12px">${fmtDate(r.date)} · ${rd.toPar===0?'E':(rd.toPar>0?'+':'')+rd.toPar} · ${rd.played} holes</div>
  <div class="card"><div class="hd"><span class="t">Hole strokes</span></div><div class="bd"><div class="ovGrid">${cells}</div></div></div>
  <div class="card"><div class="hd"><span class="t">Round stats</span></div><div class="bd">
    <div class="grid4 center">
      ${bignum(rd.putts||'–','putts')}
      ${bignum(pct(rd.firY,rd.firD),'FIR')}
      ${bignum(pct(rd.girY,rd.girD),'GIR')}
      ${bignum((rd.birdies||0)+'','birdies')}
    </div>
    <div class="small muted" style="margin-top:8px">Summary-level import: hole strokes and round totals only. No shot detail, so this round feeds scoring, putts, FIR and GIR averages, but not heatmaps, first-putt stats, yardages or handicap.</div>
  </div></div>
  <button class="btn wide danger sm" onclick="if(confirm('Delete this imported round?')){S.rounds=S.rounds.filter(x=>x.id!=='${r.id}');PLAYVIEW='home';render();}">Delete round</button>`;
}

/** Set the round vibe rating from the detail view. */
function rVibe(id,v){ const r=S.rounds.find(x=>x.id===id); r.ctx=r.ctx||{}; r.ctx.vibe=v; render(); }

/** Quick-finish helper: append a gimme putt to the current hole. */
function tapIn(){ SH.distStr='2'; SH.s.dist=2; SH.s.pad=5; SH.s.fType='putt'; saveShot(); }

/* Online course lookup via golfcourseapi.com — optional; offline paths stand alone. */
let GCRES=null;
