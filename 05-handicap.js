
/* ============================================================
   HANDICAP (WHS-style) + GLOBAL STAT FILTERS
   ============================================================
   Differential = 113 / slope × (adjusted gross − rating)
   Adjusted gross applies net double bogey per hole once an
   index exists (par+5 before that); unplayed holes score net
   par. Index = the standard best-8-of-20 table with the WHS
   reduced-count schedule under 20 rounds.

   DELIBERATE LIMITS (documented, not bugs):
   - 9-hole rounds produce NO differential (needs 9-hole ratings)
   - legacy 18Birdies imports produce NO differential (no tee)
   - the 54.0 cap and exceptional-score reductions aren't modeled
   ============================================================ */
/** WHS course handicap = index × slope/113 + (rating − par). */
function courseHandicap(index, slope, rating, parTotal){
  if(index==null||!slope) return null;
  return Math.round(index * (slope/113) + ((rating||parTotal) - parTotal));
}
/** Handicap strokes received on a hole given course handicap + stroke index. */
function strokesOnHole(ch, si){
  if(ch==null||!si) return 0;
  if(ch<=0) return 0;
  return Math.floor(ch/18) + (si <= (ch%18) ? 1 : 0);
}
/** Net-double-bogey-capped gross for differential math; unplayed holes = net par. */
function adjustedGross(r, indexBefore){
  const tee = teeOf(r);
  const parTotal = r.holes.reduce((s,h)=>s+h.par,0);
  const ch = indexBefore!=null && tee? courseHandicap(indexBefore, tee.slope, tee.rating, parTotal) : null;
  let ags=0, complete=true;
  for(const h of r.holes){
    const d=deriveHole(h);
    if(d.score==null){ complete=false; ags += h.par + (ch!=null? strokesOnHole(ch,h.si||18):0); continue; } // net par for unplayed (WHS hole-not-played)
    const cap = ch!=null ? h.par + 2 + strokesOnHole(ch, h.si||18) : h.par + 5;
    ags += Math.min(d.score, cap);
  }
  return {ags, complete};
}
/** One round → one differential (or null; see DELIBERATE LIMITS above). */
function scoreDifferential(r, indexBefore){
  if(!is18(r)) return null;                     // 9-hole differentials need 9-hole ratings we don't store
  const tee = teeOf(r);
  if(!tee || !tee.slope || !tee.rating) return null;
  const {ags} = adjustedGross(r, indexBefore);
  return Math.round((113/tee.slope) * (ags - tee.rating) * 10)/10;
}
/** WHS index from a window of ≤20 differentials (reduced-count table under 20). */
function handicapIndexFrom(diffs){
  const n = diffs.length;
  if(n<3) return null;
  const s=[...diffs].sort((a,b)=>a-b);
  const avg=(k)=> s.slice(0,k).reduce((a,b)=>a+b,0)/k;
  let idx;
  if(n>=20) idx=avg(8);
  else if(n===19) idx=avg(7);
  else if(n>=17) idx=avg(6);
  else if(n>=15) idx=avg(5);
  else if(n>=12) idx=avg(4);
  else if(n>=9)  idx=avg(3);
  else if(n>=7)  idx=avg(2);
  else if(n===6) idx=avg(2)-1.0;
  else if(n===5) idx=avg(1);
  else if(n===4) idx=avg(1)-1.0;
  else           idx=avg(1)-2.0; // n===3
  return Math.round(idx*10)/10;
}
/** '18' | 'F9' | 'B9' — with a length fallback for rounds saved before spans. */
function roundSpan(r){
  if(r.span) return r.span;                     // '18' | 'F9' | 'B9'
  return (r.holes||[]).length<=10 ? 'F9' : '18';
}
/** Convenience: does this round count as a full 18? */
function is18(r){ return roundSpan(r)==='18'; }

/* global stats filter, applied across the Stats tab */
let STATF = {time:'all', courseId:''};          // time: all | ytd | l90 | l5
/** finishedRounds() narrowed by the STATF chips (time window + course). */
function filteredRounds(){
  let rs = finishedRounds();
  if(STATF.courseId) rs = rs.filter(r=>r.courseId===STATF.courseId);
  if(STATF.time==='ytd'){ const y=new Date().getFullYear(); rs=rs.filter(r=>r.date&&r.date.startsWith(String(y))); }
  else if(STATF.time==='l90'){ const cut=new Date(Date.now()-90*864e5).toISOString().slice(0,10); rs=rs.filter(r=>r.date>=cut); }
  else if(STATF.time==='l5'){ rs=rs.slice(-5); }
  return rs;
}

/** All completed rounds, oldest first — the canonical stats input. */
function finishedRounds(){
  return S.rounds.filter(r=>r.finished).sort((a,b)=> (a.date+a.id) < (b.date+b.id) ? -1:1);
}
/** Walk rounds chronologically computing each differential with the index
 *  known at the time (stamps r._diff), returning [{round,diff,index}]. */
function handicapTimeline(){
  const rs = finishedRounds();
  const out=[]; let idx=null;
  rs.forEach(r=>{
    const d = scoreDifferential(r, idx);
    r._diff = d;
    if(d!=null){
      const recent = out.filter(o=>o.diff!=null).slice(-19).map(o=>o.diff).concat([d]);
      idx = handicapIndexFrom(recent);
    }
    out.push({round:r, diff:d, index:idx});
  });
  return out;
}
/** Latest computed handicap index, or null before 3 rated rounds. */
function currentIndex(){
  const t=handicapTimeline();
  for(let i=t.length-1;i>=0;i--) if(t[i].index!=null) return t[i].index;
  return null;
}

/* ---------------- course helpers ---------------- */
/** The course a round was played at (undefined if course deleted). */
function courseOf(r){ return S.courses.find(c=>c.id===r.courseId); }
/** The tee a round was played from. */
function teeOf(r){ const c=courseOf(r); return c? (c.tees||[]).find(t=>t.id===r.teeId) : null; }

