/* ============================================================
   HOLE SCREEN — the on-course surface
   ============================================================
   Two entry modes per round, switchable any time:
     Shots  full shot-by-shot with the notation system
     Quick  Grint-style per-hole summary writing into h.ov
            (score, putts, first-putt ft, fairway, green pad,
             sand, penalties) — derivation reads ov as overrides
   Also here: per-hole wind, the drinks counter, hole history
   ("played 14×, avg 4.5"), derived stat chips (tap to override),
   and prev/next navigation that finishes into the overview.
   ============================================================ */
function vHole(){
  const r=activeRound(); if(!r){PLAYVIEW='home'; return vRoundsHome();}
  const h=r.holes[r.curHole-1];
  const d=deriveHole(h);
  const rd=deriveRound(r);
  const pin = S.tips.find(t=>t.pinned);
  const mode = r.mode||'advanced';
  const hist = holeHistory(r.courseId, h.n, r.id);
  const windChips = WINDS.map(w=>`<button class="chip sm ${h.windD===w[0]?'on':''}" onclick="setWind('${w[0]}')">${w[1]}</button>`).join('')
    + (h.windD? [1,2,3].map(n=>`<button class="chip sm ${h.windS===n?'on':''}" onclick="setWindS(${n})">${n}</button>`).join(''):'');
  return `
  <div class="row" style="justify-content:space-between;margin-bottom:8px">
    <button class="btn sm ghost" onclick="PLAYVIEW='home';render()">‹ Play</button>
    <div class="segs" style="flex:0 0 190px">
      <button ${mode==='advanced'?'class="on"':''} onclick="setMode('advanced')">Shots</button>
      <button ${mode==='basic'?'class="on"':''} onclick="setMode('basic')">Quick</button></div>
    <button class="btn sm" onclick="PLAYVIEW='overview';render()">▦</button>
  </div>
  ${pin? `<div class="banner" onclick="go('tips')">💡 <span><b>${esc(pin.title)}</b></span></div>`:''}
  <div class="holeHd">
    <div class="holeNo"><span class="h">Hole</span><span class="n">${h.n}</span></div>
    <div class="holeMeta">
      <div><div class="k">Par</div><div class="v">${h.par}</div></div>
      <div><div class="k">Yards</div><div class="v">${h.ydg||'–'}</div></div>
      <div><div class="k">SI</div><div class="v">${h.si||'–'}</div></div>
    </div>
  </div>
  ${hist.n? `<div class="histLine">📖 <span>You've played this hole <b>${hist.n}×</b> · avg <b>${r1(hist.avg)}</b> · best <b>${hist.best}</b></span></div>`:''}
  <div class="chips" style="margin-bottom:10px"><span class="small muted" style="align-self:center">Wind</span>${windChips}
    <button class="chip sm" onclick="addDrink()">🍺 ${r.ctx&&r.ctx.drinks? r.ctx.drinks:''}＋</button></div>
  ${mode==='basic'? vBasicPanel(r,h,d) : vShotsPanel(r,h,d)}
  <div class="statChips">
    <span class="stat ${d.fir==='Y'?'good':d.fir==='N'?'bad':''}" onclick="cycleOv('fir')">FIR <b>${d.fir||'–'}</b></span>
    <span class="stat ${d.gir==='Y'?'good':d.gir==='N'?'bad':''}" onclick="cycleOv('gir')">GIR <b>${d.gir||'–'}</b></span>
    <span class="stat">Putts <b>${d.putts}</b></span>
    ${d.threePutt?'<span class="stat bad">3-putt</span>':''}
    ${d.udA?`<span class="stat ${d.udM?'good':'bad'}" onclick="cycleOv('ud')">U&D <b>${d.udM?'✓':'✗'}</b></span>`:''}
  </div>
  <div class="grid3">
    <button class="btn" ${r.curHole===1?'disabled style="opacity:.35"':''} onclick="navHole(-1)">‹</button>
    <div class="center"><div class="small muted">Round</div><div class="num" style="font-size:20px;font-weight:800">${rd.played? rd.score+' · '+(rd.toPar===0?'E':(rd.toPar>0?'+':'')+rd.toPar):'—'}</div></div>
    <button class="btn primary" onclick="navHole(1)">${r.curHole===r.holes.length?'Finish ▸':'›'}</button>
  </div>`;
}
/** Advanced mode: the tappable shot list + Add shot / Penalty+drop. */
function vShotsPanel(r,h,d){
  const shotRows = h.shots.map((s,i)=>{
    const fin = s.fType==='lat'? (s.lat||'') : s.fType==='green'? (s.pad? s.pad+'g':'') : s.fType==='putt'? (s.pad? s.pad+'p':'') : '';
    const extras=[s.shape?('shp'+s.shape):'', s.frac||'', s.effort?('e'+s.effort):'', s.strike||''].filter(Boolean).join(' ');
    return `<div class="shotRow" onclick="editShot(${i})">
      <span class="sn">${i+1}</span><span class="club">${esc(clubLabel(s.clubId))}</span>
      <span class="lie">${s.lie}</span>
      <span class="num grow">${s.dist!=null? s.dist+(s.unit==='f'?'ft':''):''}</span>
      <span class="fin">${fin}${s.pad===5&&s.fType==='putt'?' ✓':''}</span>
      <span class="muted small">${extras}</span></div>`;
  }).join('');
  const penRow = d.pen? `<div class="shotRow penRow" onclick="adjPen(-1)"><span class="sn">＋</span><span class="lie">PEN</span><span class="grow">${d.pen} penalty stroke${d.pen>1?'s':''}</span><span class="muted small">tap to remove</span></div>`:'';
  return `<div class="card"><div class="hd"><span class="t">Shots</span>
      <span class="num" style="font-weight:800">${d.score!=null? d.score+' ('+(d.toPar===0?'E':(d.toPar>0?'+':'')+d.toPar)+')':''}</span></div>
    <div class="bd tight">${shotRows||'<div style="padding:14px" class="muted">No shots yet — tap Add shot.</div>'}${penRow}</div>
  </div>
  <div class="grid2" style="margin-bottom:10px">
    <button class="btn primary" style="min-height:62px;font-size:18px" onclick="newShot()">＋ Add shot</button>
    <button class="btn danger" onclick="penaltyDrop()">Penalty + drop</button>
  </div>`;
}
/* quick-score entry: score, putts, first putt ft, FIR, approach pad, sand, pen */
function vBasicPanel(r,h,d){
  const ov=h.ov=h.ov||{};
  const scores=[]; for(let s=Math.max(1,h.par-2); s<=h.par+4; s++) scores.push(s);
  const scBtns=scores.map(s=>{const rel=s-h.par;
    const lab= rel===0?'par': rel===-1?'birdie': rel===-2?'eagle': rel===1?'bogey': rel===2?'dbl': '+'+rel;
    return `<button class="${ov.score===s?'on':''}" onclick="bset('score',${s})">${s}<span class="sub">${lab}</span></button>`;}).join('');
  const puttBtns=[0,1,2,3,4].map(p=>`<button class="${ov.putts===p?'on':''}" onclick="bset('putts',${p})">${p===4?'4+':p}</button>`).join('');
  const fpChips=[3,5,8,10,15,20,25,30,40,50].map(f=>`<button class="chip sm ${ov.firstPuttFt===f?'on':''}" onclick="bset('firstPuttFt',${f})">${f}</button>`).join('');
  return `<div class="card"><div class="bd">
    <div class="sec" style="margin-top:0">Score</div><div class="qgrid">${scBtns}</div>
    <div class="sec">Putts</div><div class="qgrid">${puttBtns}</div>
    <div class="sec">First putt (ft)</div><div class="chips">${fpChips}</div>
    ${h.par>3? `<div class="sec">Fairway</div><div class="chips">
      <button class="chip ${ov.fir==='Y'?'on':''}" onclick="bset('fir','Y')">✓ Hit</button>
      <button class="chip ${ov.fir==='N'?'on':''}" onclick="bset('fir','N')">✗ Missed</button></div>`:''}
    <div class="sec">Approach vs pin — 5 = on, pin high</div>
    ${padHTML('green', ov.girPad, 'bPad')}
    <div class="sec">Trouble</div>
    <div class="chips">
      <button class="chip sm" onclick="bstep('sand',1)">Sand ${ov.sand||0} ＋</button>
      <button class="chip sm" onclick="bstep('pen',1)">Penalty ${ov.pen||0} ＋</button>
      <button class="chip sm ghost" onclick="bclear()">Reset hole</button>
    </div>
  </div></div>`;
}
/** Quick-mode toggle-set of an ov field (tap again to clear). */
function bset(k,v){ const h=curHole(); h.ov=h.ov||{};
  h.ov[k] = h.ov[k]===v? undefined : v;
  if(h.ov[k]===undefined) delete h.ov[k];
  render(); }
/** Quick-mode counter increment (sand, penalties). */
function bstep(k,dv){ const h=curHole(); h.ov=h.ov||{}; h.ov[k]=Math.max(0,(h.ov[k]||0)+dv); render(); }
/** Wipe every override on the current hole. */
function bclear(){ const h=curHole(); h.ov={}; render(); }
/** Quick-mode green pad: digit sets girPad, and GIR = (digit===5). */
function bPad(dgt){ const h=curHole(); h.ov=h.ov||{};
  if(h.ov.girPad===dgt){ delete h.ov.girPad; delete h.ov.gir; }
  else { h.ov.girPad=dgt; h.ov.gir = dgt===5? 'Y':'N'; }
  render(); }
/** Flip the active round between 'advanced' and 'basic' — any time. */
function setMode(m){ activeRound().mode=m; render(); }
/** The on-course drinks counter. Hydration data is data. */
function addDrink(){ const r=activeRound(); r.ctx=r.ctx||{drinks:0}; r.ctx.drinks=(r.ctx.drinks||0)+1; render(); }
/** Past performance on this exact hole at this course (includes 18B imports):
 *  {n: times played, avg, best}. */
function holeHistory(courseId, holeN, excludeId){
  const scores=[];
  S.rounds.forEach(r=>{ if(!r.finished||r.courseId!==courseId||r.id===excludeId) return;
    (r.holes||[]).forEach(h=>{ if(h.n!==holeN) return;
      const sc=r.legacy? h.strokes : deriveHole(h).score; if(sc!=null) scores.push(sc); }); });
  return {n:scores.length, avg:mean(scores), best:scores.length?Math.min(...scores):null};
}
/** Toggle per-hole wind direction (H/D/L2R/R2L); auto-sets strength 1. */
function setWind(w){ const h=curHole(); h.windD = h.windD===w? '':w; if(!h.windD)h.windS=0; else if(!h.windS)h.windS=1; render(); }
/** Set wind strength 1-3. */
function setWindS(n){ curHole().windS=n; render(); }
/** The hole object currently on screen. */
function curHole(){ const r=activeRound(); return r.holes[r.curHole-1]; }
/** Prev/next hole; next past the last hole opens the finish overview. */
function navHole(dir){
  const r=activeRound(); const nH=r.holes.length;
  if(dir>0 && r.curHole===nH){ PLAYVIEW='overview'; render(); return; }
  r.curHole=Math.min(nH,Math.max(1,r.curHole+dir)); render();
}
/** Adjust the hole\u2019s penalty count (tap the PEN row to remove). */
function adjPen(d){ const h=curHole(); h.pen=Math.max(0,(h.pen||0)+d); render(); }
/** One tap: +1 penalty and open the shot sheet prefilled with an HZ drop. */
function penaltyDrop(){ const h=curHole(); h.pen=(h.pen||0)+1; render(); newShot('HZ'); }
/** Tap a derived chip to override it (FIR/GIR cycle Y↔N, U&D toggles made). */
function cycleOv(k){
  const h=curHole(); h.ov=h.ov||{};
  if(k==='fir'||k==='gir'){ const cur=deriveHole(h)[k]; const seq= k==='fir'&&h.par<=3? ['-']:['Y','N']; 
    const nxt = seq[(seq.indexOf(cur)+1)%seq.length]; h.ov[k]=nxt; }
  if(k==='ud'){ const cur=deriveHole(h).udM; h.ov.udA=true; h.ov.udM=!cur; }
  render();
}

