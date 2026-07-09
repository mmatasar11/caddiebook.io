
/* ============================================================
   DERIVATION ENGINE
   ============================================================
   Nothing about a hole is stored twice: score, putts, FIR, GIR,
   penalties, scrambling, sand saves and 3-putts are all DERIVED
   from the shot list on demand. Two escape hatches:

     h.ov{}     per-hole overrides — any derived field the player
                taps to correct wins over derivation. Quick-score
                mode writes ONLY into ov (no shots at all).
     h.basic{}  reserved (see deriveBasicHole) for a fully
                separate quick store if ov ever gets crowded.

   deriveHole(h) returns:
     {score, putts, fir:'Y'|'N'|'-', gir:'Y'|'N', pen, threePutt,
      udA, udM,              // scramble attempted / made
      sand, sandA, sandM,    // sand shot count / save attempt / made
      firstPuttFt, firstPuttMade, toPar}

   RULES ENCODED (change here, changes everywhere):
     FIR   par 3 → '-' ; tee shot lateral 'C' → Y ; green attempt
           from the tee → '-' (fairway irrelevant)
     GIR   strokes to reach the green (shots before first putt
           + penalties) ≤ par−2 ; hole-outs count if ≤ par−2
     U&D   attempt = every missed GIR ; made = par or better
     SAND  save attempt = greenside sand (≤50y or no distance)
           on a missed GIR ; made = par or better
   ============================================================ */
/** The first shot taken from the green — its distance IS first-putt distance. */
function firstPuttShot(h){
  return (h.shots||[]).find(s=>s.lie==='GR') || null;
}
function deriveHole(h){
  const shots = h.shots||[];
  const ov = h.ov||{};
  const pen = ov.pen!=null? ov.pen : (h.pen||0);
  const score = ov.score!=null? ov.score : (shots.length? shots.length + pen : null);
  const putts = ov.putts!=null? ov.putts : shots.filter(s=>s.lie==='GR').length;

  // FIR: par 3 => '-', else first tee shot lateral === 'C'
  let fir = ov.fir!=null? ov.fir : null;
  if(fir==null){
    if(h.par<=3) fir='-';
    else{
      const tee = shots.find(s=>s.lie==='T');
      if(!tee) fir=null;
      else if(tee.fType==='lat') fir = tee.lat==='C' ? 'Y' : 'N';
      else if(tee.fType==='green') fir = '-';   // went for the green from the tee
      else fir = null;
    }
  }

  // GIR: strokes to reach green <= par-2
  let gir = ov.gir!=null? ov.gir : null;
  if(gir==null && shots.length){
    const fpIdx = shots.findIndex(s=>s.lie==='GR');
    if(fpIdx>=0){
      const strokesToGreen = fpIdx + pen;              // shots before first putt + penalties
      gir = strokesToGreen <= h.par-2 ? 'Y':'N';
    } else if(score!=null){
      // holed out from off the green: GIR only if it dropped within regulation strokes
      gir = score <= h.par-2 ? 'Y' : 'N';
    }
  }

  const threePutt = putts>=3;

  // scrambling: missed GIR → attempt; made if par or better
  let udA = ov.udA!=null? ov.udA : (gir==='N' && score!=null);
  let udM = ov.udM!=null? ov.udM : (udA && score!=null && score<=h.par);

  // sand
  const sandShots = ov.sand!=null? ov.sand : shots.filter(s=>s.lie==='SD').length;
  const greensideSand = shots.some(s=>s.lie==='SD' && (s.unit==='y'? (s.dist==null||s.dist<=50):true));
  const sandA = greensideSand && gir==='N';
  const sandM = sandA && score!=null && score<=h.par;

  const fp = firstPuttShot(h);
  let fpFt = fp? fp.dist : null, fpMade = fp? fp.pad===5 : null;
  if(fpFt==null && ov.firstPuttFt!=null){ fpFt=ov.firstPuttFt; fpMade = putts>=1? putts===1 : null; }
  return {score, putts, fir, gir, pen, threePutt, udA, udM,
          sand:sandShots, sandA, sandM,
          firstPuttFt: fpFt, firstPuttMade: fpMade,
          toPar: score!=null? score-h.par : null};
}
/** Sum a round: totals, nine splits, and rate-stat numerators/denominators.
 *  Returns {perHole[], played, score, par, toPar, putts, pen, f9, b9,
 *  firY, firD, girY, girD, tp, udA, udM, sA, sM}. Legacy rounds branch. */
function deriveRound(r){
  if(r.legacy) return deriveLegacyRound(r);
  const holes = r.holes||[];
  let sc=0,par=0,putts=0,pen=0,played=0, firY=0,firN=0, girY=0,girN=0, tp=0, udA=0,udM=0, sA=0,sM=0, f9=0,b9=0;
  const perHole=[];
  holes.forEach(h=>{
    const d = deriveHole(h); perHole.push(d);
    if(d.score!=null){ played++; sc+=d.score; par+=h.par; putts+=d.putts; pen+=d.pen;
      if(h.n<=9) f9+=d.score; else b9+=d.score;
      if(d.fir==='Y') firY++; else if(d.fir==='N') firN++;
      if(d.gir==='Y') girY++; else if(d.gir==='N') girN++;
      if(d.threePutt) tp++;
      if(d.udA){ udA++; if(d.udM) udM++; }
      if(d.sandA){ sA++; if(d.sandM) sM++; }
    }
  });
  return {perHole, played, score:sc, par, toPar:sc-par, putts, pen, f9, b9,
          firY, firD:firY+firN, girY, girD:girY+girN, tp, udA, udM, sA, sM};
}

/* ---------------- legacy (imported) rounds ----------------
   Imported from 18Birdies: hole strokes + round aggregates only.
   No per-shot data, no hole pars, no rating/slope. */
function deriveLegacyRound(r){
  const a = r.agg||{};
  const hs = (r.holes||[]).map(h=>h.strokes||0);
  const f9 = hs.slice(0,9).reduce((s,x)=>s+x,0);
  const b9 = hs.slice(9).reduce((s,x)=>s+x,0);
  return {legacy:true, perHole:hs.map(s=>({score:s})), played:hs.length,
    score:a.strokes||f9+b9, par:(a.strokes||0)-(a.toPar||0), toPar:a.toPar||0,
    putts:a.putts||0, pen:0, f9, b9,
    firY:a.firY||0, firD:a.firD||0, girY:a.girY||0, girD:a.girD||0,
    tp:0, udA:0, udM:0, sA:0, sM:0,
    eagles:a.eagles||0, birdies:a.birdies||0, pars:a.pars||0, bogeys:a.bogeys||0, dblOrWorse:a.dblOrWorse||0};
}
