/* ============================================================
   STATS TAB — the payoff
   ============================================================
   Order on screen: filter chips → handicap → scoring (all
   normalized to per-18 so nines don't distort) → tee-to-green
   → putting + first-putt table → hot/best clubs → the three
   miss-pattern heatmaps → stock yardages → wedge matrix.

   HM = heatmap filter state {kind, clubId, span, band}.
   Quick-mode holes contribute their green pad (ov.girPad) to
   the green heatmap; shot-tracked holes feed everything.

   EXTENSION POINT — adding a stat card is: compute inside
   vStats() from `rds`/`agg`, append one ui.card()/template to
   the returned string. See hotClubsCard() as the model.
   ============================================================ */
let HM = {kind:'green', clubId:'', span:'all', band:''};   // heatmap filters

/** Flatten rounds → [{r,h,s}] for every shot (heatmaps, yardages). */
function allShots(spanRounds){
  const rs = spanRounds || finishedRounds();
  const out=[];
  rs.forEach(r=> r.holes.forEach(h=> (h.shots||[]).forEach(s=> out.push({r,h,s}))));
  return out;
}


/** The global filter chips (time window) + course dropdown driving STATF. */
function statFilterBar(){
  const times=[['all','All time'],['ytd','This year'],['l90','90 days'],['l5','Last 5']];
  const courses=[...new Set(finishedRounds().map(r=>r.courseId))].map(id=>S.courses.find(c=>c.id===id)).filter(Boolean);
  return `<div class="chips" style="margin-bottom:10px">
    ${times.map(t=>`<button class="chip sm ${STATF.time===t[0]?'on':''}" onclick="STATF.time='${t[0]}';render()">${t[1]}</button>`).join('')}
  </div>
  ${courses.length>1? `<select class="f" style="min-height:44px;margin-bottom:12px" onchange="STATF.courseId=this.value;render()">
    <option value="">All courses</option>
    ${courses.map(c=>`<option value="${c.id}" ${STATF.courseId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>`:''}`;
}
/** The dashboard. Composed of cards top-to-bottom; see module header for
 *  the extension recipe. All scoring uses per-18 normalization. */
function vStats(){
  const rs=filteredRounds();
  if(!rs.length) return `<div class="pageTitle"><h1>Stats</h1></div>${statFilterBar()}
    <div class="card"><div class="bd"><p class="muted">No rounds match this filter yet. Finish a round and this page fills itself in: handicap, scoring, putting, heatmaps, stock yardages, the wedge matrix.</p></div></div>`;
  const tl=handicapTimeline();
  const idx=currentIndex();
  const rds=rs.map(r=>deriveRound(r));
  const n=rs.length;
  const r18=rs.filter(is18), r9=rs.filter(r=>!is18(r));
  const d18=r18.map(deriveRound), d9=r9.map(deriveRound);
  const scores18=d18.map(d=>d.score), scores9=d9.map(d=>d.score);
  const totHoles=rds.reduce((s,d)=>s+d.played,0);
  const per18=(tot)=> totHoles? tot/totHoles*18 : null;

  const shotRs = rs.filter(r=>!r.legacy);             // rounds with full shot detail
  const nShot = shotRs.length, nLegacy = n-nShot;
  // scoring by par (shot-tracked only: legacy holes carry no par)
  const byPar={3:[],4:[],5:[]};
  shotRs.forEach(r=>r.holes.forEach(h=>{const d=deriveHole(h); if(d.score!=null&&byPar[h.par]) byPar[h.par].push(d.score);}));
  // score distribution — Dbl+ bucket so 18Birdies aggregates merge cleanly
  const dist={eagle:0,birdie:0,par:0,bogey:0,dbl:0};
  shotRs.forEach(r=>r.holes.forEach(h=>{const d=deriveHole(h); if(d.score==null)return; const t=d.score-h.par;
    if(t<=-2)dist.eagle++; else if(t===-1)dist.birdie++; else if(t===0)dist.par++; else if(t===1)dist.bogey++; else dist.dbl++;}));
  rds.filter(d=>d.legacy).forEach(d=>{dist.eagle+=d.eagles;dist.birdie+=d.birdies;dist.par+=d.pars;dist.bogey+=d.bogeys;dist.dbl+=d.dblOrWorse;});
  // aggregates: FIR/GIR/putts blend legacy; scrambling/3-putt need shot detail
  const agg=rds.reduce((a,d)=>{a.firY+=d.firY;a.firD+=d.firD;a.girY+=d.girY;a.girD+=d.girD;a.pen+=d.pen;a.putts+=d.putts;
    if(!d.legacy){a.tp+=d.tp;a.udA+=d.udA;a.udM+=d.udM;a.sA+=d.sA;a.sM+=d.sM;a.holes+=d.played;} return a;},
    {firY:0,firD:0,girY:0,girD:0,tp:0,udA:0,udM:0,sA:0,sM:0,pen:0,putts:0,holes:0});
  // putts per GIR + first-putt detail (shot-tracked only)
  let pGIR=[],fp=[];
  shotRs.forEach(r=>r.holes.forEach(h=>{const d=deriveHole(h);
    if(d.gir==='Y') pGIR.push(d.putts);
    if(d.firstPuttFt!=null) fp.push({ft:d.firstPuttFt, made:d.firstPuttMade, putts:d.putts});}));
  // first-putt buckets
  const buckets=[[0,3],[4,6],[7,10],[11,20],[21,30],[31,999]];
  const bRows=buckets.map(b=>{
    const g=fp.filter(x=>x.ft>=b[0]&&x.ft<=b[1]);
    return `<tr><td class="num">${b[1]===999? b[0]+'+':b[0]+'–'+b[1]} ft</td>
      <td class="num">${g.length}</td>
      <td class="num">${pct(g.filter(x=>x.made).length,g.length)}</td>
      <td class="num">${g.length? r1(mean(g.map(x=>x.putts))):'–'}</td>
      <td class="num">${pct(g.filter(x=>x.putts>=3).length,g.length)}</td></tr>`;
  }).join('');

  return `<div class="pageTitle"><h1>Stats</h1><span class="eyebrow">${r18.length}×18 ${r9.length?'· '+r9.length+'×9 ':''}${nLegacy?'· '+nLegacy+' imported':''}</span></div>
  ${statFilterBar()}

  <div class="card"><div class="hd"><span class="t">Handicap</span>
      <span class="num" style="font-size:20px;font-weight:800">${idx!=null? r1(idx):'–'}</span></div>
    <div class="bd">
      ${idx==null? `<p class="small muted">A WHS-style index appears after 3 rounds with a rated tee. ${n} of 3 so far.</p>`:''}
      ${spark(tl.filter(t=>t.index!=null).map(t=>t.index))}
      <div class="small muted" style="margin-top:6px">Differential = 113 ÷ slope × (adjusted gross − rating). Index = best 8 of last 20 (reduced table under 20). Last: ${tl.length&&tl[tl.length-1].diff!=null? r1(tl[tl.length-1].diff):'–'}</div>
      ${idx!=null && rs.length? courseHcpLine(idx):''}
    </div></div>

  <div class="card"><div class="hd"><span class="t">Scoring</span></div><div class="bd">
    <div class="grid4 center">
      ${bignum(r1(per18(rds.reduce((s,d)=>s+d.score,0))),'avg /18')}
      ${bignum((()=>{const v=per18(rds.reduce((s,d)=>s+d.toPar,0));return v==null?'–':(v>=0?'+':'')+r1(v);})(),'to par /18')}
      ${bignum(scores18.length? Math.min(...scores18):'–','best 18')}
      ${bignum(r1(per18(agg.pen)),'pen /18')}
    </div><hr class="sep">
    ${spark(rds.map(d=>d.played? d.score/d.played*18 : null).filter(x=>x!=null))}
    <div class="small muted">Every round normalized to 18 holes${r9.length? ' — nines count as half a round, not a sub-70 miracle':''}.</div>
    <hr class="sep">
    <div class="row small" style="flex-wrap:wrap;gap:12px">
      <span>Par 3 <b class="num">${r1(mean(byPar[3]))}</b></span>
      <span>Par 4 <b class="num">${r1(mean(byPar[4]))}</b></span>
      <span>Par 5 <b class="num">${r1(mean(byPar[5]))}</b></span></div>
    <hr class="sep">
    <div class="row small" style="flex-wrap:wrap;gap:10px">
      <span class="stat">Eag <b>${dist.eagle}</b></span><span class="stat good">Bird <b>${dist.birdie}</b></span>
      <span class="stat">Par <b>${dist.par}</b></span><span class="stat">Bog <b>${dist.bogey}</b></span>
      <span class="stat bad">Dbl+ <b>${dist.dbl}</b></span></div>
  </div></div>

  <div class="card"><div class="hd"><span class="t">Tee to green</span></div><div class="bd">
    <div class="grid3 center">
      ${bignum(pct(agg.firY,agg.firD),'FIR')}
      ${bignum(pct(agg.girY,agg.girD),'GIR')}
      ${bignum(pct(agg.udM,agg.udA),'up & down')}
    </div>
    <div class="small muted center" style="margin-top:6px">Sand saves ${agg.sA? agg.sM+'/'+agg.sA+' ('+pct(agg.sM,agg.sA)+')':'–'}</div>
  </div></div>

  <div class="card"><div class="hd"><span class="t">Putting</span></div><div class="bd">
    <div class="grid3 center">
      ${bignum(r1(per18(agg.putts)),'putts /18')}
      ${bignum(r1(mean(pGIR)),'putts/GIR')}
      ${bignum(pct(agg.tp,agg.holes),'3-putt')}
    </div><hr class="sep">
    <div class="small" style="font-weight:800;margin-bottom:4px">First-putt distance${nLegacy?' <span class="muted" style="font-weight:600">(shot-tracked rounds only)</span>':''}</div>
    <table class="data"><tr><th class="num">Dist</th><th class="num">n</th><th class="num">Make</th><th class="num">Avg putts</th><th class="num">3-putt</th></tr>${bRows}</table>
  </div></div>

  ${hotClubsCard(rs)}
  ${heatmapCard()}
  ${stockYardCard()}
  ${wedgeMatrixCard()}`;
}

/* ---------------- club form: best clubs + hot streaks ---------------- */
function hotClubsCard(rs){
  const shotRs = rs.filter(r=>!r.legacy);
  if(!shotRs.length) return '';
  const recent = new Set(shotRs.slice(-5).map(r=>r.id));
  const byClub = {};
  shotRs.forEach(r=>r.holes.forEach(h=>(h.shots||[]).forEach(s=>{
    if(s.fType!=='green'||!s.pad||!s.clubId) return;
    const b = byClub[s.clubId]=byClub[s.clubId]||{n:0,pure:0,rn:0,rp:0};
    b.n++; if(s.pad===5) b.pure++;
    if(recent.has(r.id)){ b.rn++; if(s.pad===5) b.rp++; }
  })));
  const rows = Object.entries(byClub).filter(([,b])=>b.n>=5)
    .map(([cid,b])=>({cid, n:b.n, pure:b.pure/b.n, rPure:b.rn>=3? b.rp/b.rn:null}))
    .sort((a,b)=>b.pure-a.pure).slice(0,6);
  if(!rows.length) return '';
  return `<div class="card"><div class="hd"><span class="t">Club form — green attempts</span></div><div class="bd tight">
    <table class="data"><tr><th>Club</th><th class="num">Attempts</th><th class="num">Pin-high %</th><th class="num">Last 5 rds</th></tr>
    ${rows.map(x=>{
      const hot = x.rPure!=null && x.rPure > x.pure+0.10;
      const cold = x.rPure!=null && x.rPure < x.pure-0.10;
      return `<tr><td><b>${esc(clubLabel(x.cid))}</b>${hot?' <span class="flame">🔥</span>':cold?' ❄️':''}</td>
        <td class="num">${x.n}</td><td class="num"><b>${Math.round(x.pure*100)}%</b></td>
        <td class="num">${x.rPure!=null? Math.round(x.rPure*100)+'%':'–'}</td></tr>`;}).join('')}
    </table>
    <div class="small muted" style="padding:8px 12px">Pin-high = finished 5 on the green pad. 🔥 running 10+ points above baseline over the last five rounds; ❄️ the opposite. Minimum 5 attempts.</div>
  </div></div>`;
}
/** Big-number + small-label cell used inside stat grids. */
function bignum(v,l){ return `<div><div class="num" style="font-size:24px;font-weight:800">${v}</div><div class="small muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:700">${l}</div></div>`; }
/** "Course handicap at <last course>" line under the index. */
function courseHcpLine(idx){
  const last=finishedRounds().slice(-1)[0]; const tee=teeOf(last);
  if(!tee||!tee.slope) return '';
  const parT=last.holes.reduce((s,h)=>s+h.par,0);
  const ch=courseHandicap(idx,tee.slope,tee.rating,parT);
  return `<div class="small" style="margin-top:6px">Course handicap at ${esc(courseOf(last).name)} (${esc(tee.name)}): <b class="num">${ch}</b></div>`;
}
/** Minimal inline SVG sparkline (last point flagged red). */
function spark(vals){
  if(vals.length<2) return '';
  const w=300,ht=54,pad=4;
  const mn=Math.min(...vals),mx=Math.max(...vals),rg=(mx-mn)||1;
  const pts=vals.map((v,i)=>[pad+i*(w-2*pad)/(vals.length-1), ht-pad-(v-mn)*(ht-2*pad)/rg]);
  const last=pts[pts.length-1];
  return `<svg class="spark" viewBox="0 0 ${w} ${ht}" width="100%" height="${ht}">
    <polyline points="${pts.map(p=>p.map(x=>Math.round(x*10)/10).join(',')).join(' ')}"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="3.5"/></svg>`;
}

/* ---------------- heatmaps ---------------- */
function heatmapCard(){
  const kinds=[['green','Green'],['putt','Putt'],['shape','Shape']];
  const spanRs = filteredRounds();
  const rows = allShots(spanRs);
  let counts={},total=0, latCounts=null;
  if(HM.kind==='shape'){
    rows.forEach(x=>{ if(!x.s.shape) return; if(HM.clubId&&x.s.clubId!==HM.clubId)return; if(!bandOK(x.s))return;
      counts[x.s.shape]=(counts[x.s.shape]||0)+1; total++; });
  } else if(HM.kind==='green'){
    rows.forEach(x=>{ if(x.s.fType!=='green'||!x.s.pad)return; if(HM.clubId&&x.s.clubId!==HM.clubId)return; if(!bandOK(x.s))return;
      counts[x.s.pad]=(counts[x.s.pad]||0)+1; total++; });
    if(!HM.clubId && !HM.band) spanRs.forEach(r=>!r.legacy&&r.holes.forEach(h=>{   // quick-score rounds contribute too
      if(h.ov&&h.ov.girPad){ counts[h.ov.girPad]=(counts[h.ov.girPad]||0)+1; total++; }}));
  } else {
    rows.forEach(x=>{ if(x.s.fType!=='putt'||!x.s.pad)return; if(!bandOKputt(x.s))return;
      counts[x.s.pad]=(counts[x.s.pad]||0)+1; total++; });
  }
  const max=Math.max(1,...Object.values(counts));
  const rowsHTML = padRows(HM.kind==='shape'?'shape':'green');
  const lab=PAD_LABELS[HM.kind];
  let padB=`<div class="pad heat">`;
  for(const row of rowsHTML) for(const d of row){
    const c=counts[d]||0; const op=c? 0.14+0.86*(c/max):0;
    const col = d===5? `rgba(24,92,55,${op})` : `rgba(210,46,46,${op})`;
    padB+=`<button class="${d===5?'pure':''}" style="background:${c? col:'var(--card)'};color:${op>0.55?'#fff':'var(--ink)'}">
      <span class="pct">${total? Math.round(100*c/total)+'%':'–'}</span>
      <span class="n">${lab[d]} · ${c}</span></button>`;
  }
  padB+='</div>';
  const clubOpts = `<option value="">All clubs</option>`+S.clubs.filter(c=>c.type!=='P').map(c=>`<option value="${c.id}" ${HM.clubId===c.id?'selected':''}>${esc(c.label)}</option>`).join('');
  const bands = HM.kind==='putt'? [['','All'],['0-6','0–6ft'],['7-20','7–20ft'],['21-99','21+ft']] : [['','All dist'],['0-100','≤100'],['101-150','101–150'],['151-200','151–200'],['201-999','200+']];
  return `<div class="card"><div class="hd"><span class="t">Miss patterns</span><span class="small muted num">${total} shots</span></div><div class="bd">
    <div class="chips" style="margin-bottom:8px">${kinds.map(k=>`<button class="chip sm ${HM.kind===k[0]?'on':''}" onclick="HM.kind='${k[0]}';HM.band='';render()">${k[1]}</button>`).join('')}</div>
    ${HM.kind!=='putt'? `<div class="row" style="margin-bottom:8px"><select class="f" style="min-height:42px" onchange="HM.clubId=this.value;render()">${clubOpts}</select></div>`:''}
    <div class="chips" style="margin-bottom:10px">${bands.map(b=>`<button class="chip sm ${HM.band===b[0]?'on':''}" onclick="HM.band='${b[0]}';render()">${b[1]}</button>`).join('')}</div>
    ${padB}
    <div class="small muted" style="margin-top:8px">${heatRead()}</div>
  </div></div>`;
}
/** Distance-band filter for full shots (yards). */
function bandOK(s){ if(!HM.band)return true; const [a,b]=HM.band.split('-').map(Number); return s.unit==='y'&&s.dist!=null&&s.dist>=a&&s.dist<=b; }
/** Distance-band filter for putts (feet). */
function bandOKputt(s){ if(!HM.band)return true; const [a,b]=HM.band.split('-').map(Number); return s.dist!=null&&s.dist>=a&&s.dist<=b; }
/** One-line interpretation hint per heatmap kind. */
function heatRead(){
  return {green:'Hot bottom row (1·2·3) = chronic short miss — take more club. Hot right column = right-miss pattern.',
    putt:'Hot 2 = dying it short-center (pace). Hot 6 = sliding by right (read or face). 5 is holed.',
    shape:'A corner that stays lit names the fault: 7-corner = hook family, 3-corner = slice family.'}[HM.kind];
}

/* ---------------- stock yardages ---------------- */
function clubShotDists(cid){
  const round=[], prac=[];
  allShots().forEach(x=>{ const s=x.s;
    if(s.clubId!==cid||s.unit!=='y'||s.dist==null)return;
    if(!['T','FW','RF'].includes(s.lie))return;
    if(s.strike||s.frac||(s.effort&&s.effort<95))return;      // mishits & partials don't pollute stock
    round.push(s.dist); });
  S.practice.forEach(p=>(p.blocks||[]).forEach(b=>{ if(b.clubId!==cid||b.frac)return;
    (b.shots||[]).forEach(sh=>{ if(sh.carry) prac.push(Number(sh.carry)); }); }));
  return {round, prac, all:round.concat(prac)};
}
/** Median + 25-75% band per club, Δ-flag when reality drifts ≥8y from the
 *  set number — the missing-zone detector. */
function stockYardCard(){
  const rows=S.clubs.filter(c=>c.type!=='P').map(c=>{
    const d=clubShotDists(c.id);
    if(!d.all.length) return `<tr><td>${esc(c.label)}</td><td class="num muted">${c.stock||'–'}</td><td class="num muted" colspan="3">no data yet</td></tr>`;
    const med=median(d.all), lo=quantile(d.all,0.25), hi=quantile(d.all,0.75);
    const flag = c.stock && Math.abs(med-c.stock)>=8 ? ` <span class="tag" style="background:var(--sand);color:var(--amber)">Δ${Math.round(med-c.stock)}</span>`:'';
    return `<tr><td><b>${esc(c.label)}</b></td><td class="num muted">${c.stock||'–'}</td>
      <td class="num"><b>${r0(med)}</b>${flag}</td><td class="num">${r0(lo)}–${r0(hi)}</td>
      <td class="num small muted">${d.round.length}r+${d.prac.length}p</td></tr>`;
  }).join('');
  return `<div class="card"><div class="hd"><span class="t">Stock yardages</span></div><div class="bd tight">
    <table class="data"><tr><th>Club</th><th class="num">Set</th><th class="num">Median</th><th class="num">25–75%</th><th class="num">n</th></tr>${rows}</table>
    <div class="small muted" style="padding:8px 12px">Median from clean full swings (round + practice carry). Thin/heavy tags and partials are excluded. Δ flags where reality drifted 8+ yds from the set number — a missing-zone or club-up signal.</div>
  </div></div>`;
}

/* ---------------- wedge matrix ---------------- */
function wedgeMatrixCard(){
  const wedges=S.clubs.filter(c=>c.type==='Wg');
  if(!wedges.length) return '';
  const cell=(cid,frac)=>{
    const v=[];
    allShots().forEach(x=>{ const s=x.s; if(s.clubId!==cid||s.unit!=='y'||s.dist==null)return;
      const f = s.frac|| (s.effort&&s.effort<95? 'e':null) || 'full';
      if(frac==='full'&&f!=='full')return; if(frac!=='full'&&f!==frac)return; if(s.strike)return; v.push(s.dist); });
    S.practice.forEach(p=>(p.blocks||[]).forEach(b=>{ if(b.clubId!==cid)return;
      const f=b.frac||'full'; if(f!==frac)return; (b.shots||[]).forEach(sh=>{if(sh.carry)v.push(Number(sh.carry));}); }));
    return v.length? `<b>${r0(median(v))}</b><span class="small muted"> ·${v.length}</span>` : '<span class="muted">–</span>';
  };
  const rows=wedges.map(w=>`<tr><td><b>${esc(w.label)}</b></td>
    <td class="num">${cell(w.id,'½')}</td><td class="num">${cell(w.id,'¾')}</td><td class="num">${cell(w.id,'full')}</td></tr>`).join('');
  return `<div class="card"><div class="hd"><span class="t">Wedge matrix</span></div><div class="bd tight">
    <table class="data"><tr><th>Wedge</th><th class="num">½</th><th class="num">¾</th><th class="num">Full</th></tr>${rows}</table>
    <div class="small muted" style="padding:8px 12px">Median carry by swing length, from rounds and practice. Tag ½ / ¾ at entry and this table builds itself.</div>
  </div></div>`;
}
