/* ============================================================
   PLAY TAB — home hub, round history, course pages
   ============================================================
   vRoundsHome  the dashboard the Play tab lands on: resume card
                for an in-progress round, recent course chips,
                quick start, link to full history
   vRoundsList  every finished round, newest first
   vCoursePage  one course: location + Maps link, tee data,
                per-hole history table, rounds played there
   ============================================================ */
function lastRoundAt(cid){ const rs=finishedRounds().filter(r=>r.courseId===cid); return rs.length? rs[rs.length-1]:null; }

/** The Play hub: resume hero, quick start, recent course chips, history link. */
function vRoundsHome(){
  const idx = currentIndex();
  const act = activeRound();
  const rs = finishedRounds();
  // recent courses by last played
  const recent = [...S.courses].map(c=>({c, last:lastRoundAt(c.id)}))
    .sort((a,b)=> (b.last?b.last.date:'') > (a.last?a.last.date:'') ? 1:-1).slice(0,8);
  let hero;
  if(act){
    const d=deriveRound(act);
    const h=act.holes[act.curHole-1];
    hero = `<div class="hero">
      <div class="k">Round in progress · ${esc(courseOf(act)?courseOf(act).name:'')}</div>
      <div class="big">${d.played? d.score:'–'} <span style="font-size:20px;opacity:.85">${d.played? (d.toPar===0?'E':(d.toPar>0?'+':'')+d.toPar):''}</span></div>
      <div class="sub">${d.played}/${act.holes.length} holes · ${d.putts} putts · next up: hole ${h?h.n:'–'}</div>
      <div class="row" style="gap:8px">
        <button class="btn" onclick="PLAYVIEW='hole';render()">Resume ▸</button>
        <button class="btn" style="background:rgba(255,255,255,.16);color:#fff" onclick="PLAYVIEW='overview';render()">Scorecard</button>
      </div></div>`;
  } else {
    const last = rs[rs.length-1];
    hero = `<div class="hero">
      <div class="k">Caddie Book${idx!=null? ' · HCP '+r1(idx):''}</div>
      <div class="big">${last? deriveRound(last).score : '—'}</div>
      <div class="sub">${last? 'Last round · '+esc(courseOf(last)?courseOf(last).name:'')+' · '+fmtDate(last.date) : 'No rounds yet — everything works offline.'}</div>
      <button class="btn" onclick="startRoundSheet()" style="min-height:56px;font-size:17px">⛳ Start a round</button>
    </div>`;
  }
  return `${hero}
  <div class="row" style="justify-content:space-between;align-items:baseline;margin:2px 2px 8px">
    <span class="eyebrow">Recent courses</span>
    <button class="btn sm ghost" onclick="mgoCourses()">All courses ›</button></div>
  <div class="hscroll">${recent.map(x=>{
      const t=(x.c.tees||[])[0];
      return `<div class="crsCard" onclick="CID='${x.c.id}';PLAYVIEW='course';render()">
        <div class="nm">${esc(x.c.name)}</div>
        <div class="loc">${esc([x.c.info&&x.c.info.city, x.c.info&&x.c.info.state].filter(Boolean).join(', ')||'add location')}</div>
        <div class="meta">${x.last? fmtDate(x.last.date)+' · '+deriveRound(x.last).score : (t&&t.rating? t.rating+' / '+t.slope : 'no rounds yet')}</div>
      </div>`;}).join('') || '<div class="muted small" style="padding:8px">Add a course to get started.</div>'}
  </div>
  <div class="grid2" style="margin-top:6px">
    <button class="btn" onclick="PLAYVIEW='rounds';render()">📋 All rounds</button>
    <button class="btn" onclick="courseEditor(null,false)">＋ New course</button>
  </div>`;
}
/** Jump to the course page for a course id. */
function mgoCourses(){ TAB='more'; MOREVIEW='courses'; render(); }

/** Full round history, newest first, with 18B / nine badges. */
function vRoundsList(){
  const past=[...S.rounds].filter(r=>r.finished).sort((a,b)=> a.date<b.date?1:-1);
  return `<button class="btn sm ghost" onclick="PLAYVIEW='home';render()" style="margin-bottom:10px">‹ Play</button>
  <div class="pageTitle"><h1>All rounds</h1><span class="eyebrow num">${past.length}</span></div>
  <div class="card"><div class="bd tight">${past.map(r=>{
    const d=deriveRound(r); const c=courseOf(r); const sp=roundSpan(r);
    return `<div class="listRow" onclick="VIEWROUND='${r.id}';PLAYVIEW='roundDetail';render()">
      <div class="main"><div class="ti">${esc(c?c.name:'Course')}${r.legacy?' <span class="tag" style="background:var(--sand);color:var(--amber)">18B</span>':''}${sp!=='18'?' <span class="tag">'+(sp==='B9'?'Back 9':'9')+'</span>':''}</div>
      <div class="sub">${fmtDate(r.date)} · ${d.putts} putts · GIR ${pct(d.girY,d.girD)}</div></div>
      <div class="num" style="font-size:21px;font-weight:800">${d.score}<span class="muted" style="font-size:13px"> ${d.toPar===0?'E':(d.toPar>0?'+':'')+d.toPar}</span></div>
      <span class="arr">›</span></div>`;}).join('')||'<div style="padding:14px" class="muted">No rounds yet.</div>'}</div></div>`;
}

/* ---------------- course page ---------------- */
function vCoursePage(){
  const c=S.courses.find(x=>x.id===CID); if(!c){PLAYVIEW='home';return vRoundsHome();}
  c.info=c.info||{};
  const t=(c.tees||[])[0];
  const rsAll=[...S.rounds].filter(r=>r.finished&&r.courseId===c.id).sort((a,b)=>a.date<b.date?1:-1);
  const mapsQ=encodeURIComponent([c.name,c.info.city,c.info.state].filter(Boolean).join(' '));
  // hole-by-hole history across every round here, imports included
  const hist={};
  rsAll.forEach(r=>r.holes.forEach(h=>{
    const sc = r.legacy? h.strokes : deriveHole(h).score;
    if(sc==null) return;
    (hist[h.n]=hist[h.n]||[]).push(sc);
  }));
  const histRows=Object.keys(hist).map(Number).sort((a,b)=>a-b).map(n=>{
    const a=hist[n]; const par=t&&t.holes&&t.holes[n-1]? t.holes[n-1].par:null;
    return `<tr><td class="num">${n}</td><td class="num muted">${par||'–'}</td>
      <td class="num"><b>${r1(mean(a))}</b></td><td class="num">${Math.min(...a)}</td><td class="num muted">${a.length}</td></tr>`;
  }).join('');
  return `<button class="btn sm ghost" onclick="PLAYVIEW='home';render()" style="margin-bottom:10px">‹ Play</button>
  <div class="pageTitle"><h1>${esc(c.name)}</h1></div>
  <div class="small muted" style="margin:-8px 2px 12px">${esc([c.info.address,c.info.city,c.info.state].filter(Boolean).join(', ')||'')}
    ${t&&t.rating? ' · '+esc(t.name)+' '+t.rating+' / '+t.slope:''}</div>
  <div class="grid3">
    <button class="btn primary" onclick="startRoundSheet('${c.id}')">Play ▸</button>
    <a class="btn" style="text-decoration:none" href="https://maps.google.com/?q=${mapsQ}" target="_blank">🧭 Maps</a>
    <button class="btn" onclick="courseEditor('${c.id}',false)">Edit</button>
  </div>
  <div style="height:12px"></div>
  <div class="card"><div class="hd"><span class="t">Location</span></div><div class="bd">
    <div class="grid2">
      <div><label class="f">City</label><input class="f" value="${esc(c.info.city||'')}" onchange="cInfo('${c.id}','city',this.value)"></div>
      <div><label class="f">State</label><input class="f" value="${esc(c.info.state||'')}" onchange="cInfo('${c.id}','state',this.value)"></div>
    </div>
    <label class="f">Address</label><input class="f" value="${esc(c.info.address||'')}" onchange="cInfo('${c.id}','address',this.value)">
    ${S.settings.gcApiKey? `<div style="height:8px"></div><button class="btn sm wide" onclick="gcFill('${c.id}')">🔎 Fill from golfcourseapi.com</button>`:
      `<div class="small muted" style="margin-top:8px">Tip: add a free golfcourseapi.com key in Settings and this fills itself, plus rating, slope and every hole.</div>`}
  </div></div>
  ${histRows? `<div class="card"><div class="hd"><span class="t">Hole history</span><span class="small muted num">${rsAll.length} rounds</span></div>
    <div class="bd tight"><table class="data"><tr><th class="num">Hole</th><th class="num">Par</th><th class="num">Avg</th><th class="num">Best</th><th class="num">n</th></tr>${histRows}</table></div></div>`:''}
  <div class="card"><div class="hd"><span class="t">Rounds here</span></div><div class="bd tight">
    ${rsAll.slice(0,10).map(r=>{const d=deriveRound(r);
      return `<div class="listRow" onclick="VIEWROUND='${r.id}';PLAYVIEW='roundDetail';render()">
        <div class="main"><div class="ti num">${d.score} <span class="muted small">${d.toPar===0?'E':(d.toPar>0?'+':'')+d.toPar}</span></div>
        <div class="sub">${fmtDate(r.date)} · ${d.putts} putts${r.legacy?' · 18B':''}</div></div><span class="arr">›</span></div>`;}).join('')||'<div style="padding:14px" class="muted">No rounds here yet.</div>'}
  </div></div>`;
}
/** Persist a course info field (city/state/address) as it is edited. */
function cInfo(cid,k,v){ const c=S.courses.find(x=>x.id===cid); c.info=c.info||{}; c.info[k]=v.trim(); save(); }

/* ---------------- start round ---------------- */
function startRoundSheet(prefCourse){
  if(!S.courses.length) return courseEditor(null, true);
  const opts = S.courses.map(c=>`<option value="${c.id}" ${prefCourse===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
  openSheet(`<div class="sheetHd"><span class="t">Start a round</span><button class="btn sm ghost" onclick="closeSheet()">Close</button></div>
    <label class="f">Course</label>
    <select class="f" id="srCourse" onchange="srTees()">${opts}</select>
    <label class="f">Tee</label>
    <select class="f" id="srTee"></select>
    <label class="f">Holes</label>
    <div class="segs" id="srSpan">
      <button class="on" data-v="18" onclick="srSeg(this)">Full 18</button>
      <button data-v="F9" onclick="srSeg(this)">Front 9</button>
      <button data-v="B9" onclick="srSeg(this)">Back 9</button></div>
    <label class="f">Entry style</label>
    <div class="segs" id="srMode">
      <button ${S.settings.defaultMode!=='basic'?'class="on"':''} data-v="advanced" onclick="srSeg(this)">Shot-by-shot</button>
      <button ${S.settings.defaultMode==='basic'?'class="on"':''} data-v="basic" onclick="srSeg(this)">Quick score</button></div>
    <div class="grid2">
      <div><label class="f">Date</label><input class="f num" type="date" id="srDate" value="${todayISO()}"></div>
      <div><label class="f">Weather</label><input class="f" id="srWx" placeholder="Sunny, 78°"></div>
    </div>
    <label class="f">Playing with</label>
    <input class="f" id="srWith" placeholder="Rachel, Jack…">
    <div style="height:14px"></div>
    <button class="btn primary wide" onclick="startRound()">Tee off</button>
    <div style="height:8px"></div>
    <button class="btn wide ghost" onclick="courseEditor(null,true)">＋ New course instead</button>`);
  srTees();
}
/** Segmented-control click handler: move the .on class to the tapped button. */
function srSeg(btn){ [...btn.parentElement.children].forEach(b=>b.classList.remove('on')); btn.classList.add('on'); }
/** Read a segmented control\u2019s selected data-v value. */
function srSegVal(id){ const b=document.querySelector('#'+id+' button.on'); return b? b.dataset.v : null; }
/** Repopulate the tee dropdown after a course change (stub courses get a hint). */
function srTees(){
  const c=S.courses.find(c=>c.id===$('#srCourse').value);
  const ts=(c.tees||[]);
  $('#srTee').innerHTML = ts.length? ts.map(t=>`<option value="${t.id}">${esc(t.name)} · ${t.rating||'?'} / ${t.slope||'?'}</option>`).join('')
    : `<option value="">No tee data yet — pick to set up</option>`;
}
/** Build the round object (slicing F9/B9 holes) and enter play. Guards
 *  imported stub courses by opening the editor prefilled instead. */
function startRound(){
  const c=S.courses.find(c=>c.id===$('#srCourse').value);
  const t=(c.tees||[]).find(t=>t.id===$('#srTee').value);
  if(!t){ toast('Add tee details for this course first.'); courseEditor(c.id, true); return; }
  const span=srSegVal('srSpan')||'18';
  const src9 = span==='F9'? t.holes.slice(0,9) : span==='B9'? t.holes.slice(9,18) : t.holes;
  const r={id:uid(), courseId:c.id, teeId:t.id, date:$('#srDate').value||todayISO(),
    weather:$('#srWx').value.trim(), notes:'', finished:false, curHole:1,
    span, mode:srSegVal('srMode')||S.settings.defaultMode,
    ctx:{partners:$('#srWith').value.trim(), drinks:0, vibe:0},
    holes:src9.map(h=>({n:h.n,par:h.par,ydg:h.ydg,si:h.si,windD:'',windS:0,shots:[],pen:0,ov:{}}))};
  S.rounds.push(r); S.activeRoundId=r.id; PLAYVIEW='hole'; closeSheet(); render();
}

