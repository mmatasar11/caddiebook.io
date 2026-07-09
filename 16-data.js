/* ============================================================
   DATA — backup, analysis exports, 18Birdies import
   ============================================================
   JSON     full state, restores with one tap (schema in 02-store)
   CSV      one row per shot + a SUMMARY row per hole; legacy
            imports emit summary-only rows
   AI text  compact per-hole blocks with g/p/s digit suffixes
   18B      merge-only, idempotent by source round id
   ============================================================ */
function vData(){
  return backBtn()+`<div class="pageTitle"><h1>Backup & export</h1></div>
  <div class="card"><div class="hd"><span class="t">Full backup</span></div><div class="bd">
    <p class="small muted">Everything — bag, courses, rounds, tips, practice, settings — as one JSON file. Round-trips cleanly and mirrors the relational schema (club, course, tee, hole_template, round, hole_play, shot, tip, practice_session, practice_shot).</p>
    <div class="grid2"><button class="btn primary" onclick="exportJSON()">Export JSON</button>
    <button class="btn" onclick="$('#impFile').click()">Import JSON</button></div>
    <input type="file" id="impFile" accept=".json,application/json" style="display:none" onchange="importJSON(this)">
  </div></div>
  <div class="card"><div class="hd"><span class="t">Analysis exports</span></div><div class="bd">
    <p class="small muted">Flat CSV: one row per shot plus a SUMMARY row per hole. Loads straight into MySQL.</p>
    <button class="btn wide" onclick="exportCSV()">Download shots CSV</button>
    <div style="height:8px"></div>
    <p class="small muted">AI text: the compact per-hole block format, ready to paste into a chat for analysis.</p>
    <button class="btn wide" onclick="exportAllText()">Copy all rounds as AI text</button>
  </div></div>
  <div class="card"><div class="hd"><span class="t">Import from 18Birdies</span></div><div class="bd">
    <p class="small muted">Request your data export from 18Birdies (Settings → Account → Request My Data), then pick the JSON file here. Courses and round history come in as summary rounds: hole strokes, putts, FIR and GIR. Re-importing a newer export is safe — rounds already imported are skipped, so you can top up your history any time.</p>
    <button class="btn primary wide" onclick="$('#imp18b').click()">Import 18Birdies JSON</button>
    <input type="file" id="imp18b" accept=".json,application/json,.txt" style="display:none" onchange="import18B(this)">
  </div></div>`;
}
/** Trigger a client-side file download via a Blob URL. */
function download(name, text, mime){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([text],{type:mime||'text/plain'}));
  a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
/** Full-state backup with schema/version envelope. */
function exportJSON(){
  const payload={app:'caddiebook',schema:1,exported:new Date().toISOString(),data:S};
  download('caddiebook-backup-'+todayISO()+'.json', JSON.stringify(payload,null,1),'application/json');
}
/** Restore a backup: REPLACES state (18B import merges; this doesn\u2019t). */
function importJSON(inp){
  const f=inp.files[0]; if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ const p=JSON.parse(rd.result); const d=p.data||p;
      if(!d.clubs||!d.rounds) throw 0;
      S=Object.assign(defaultState(),d); save(); toast('Backup restored.'); render();
    }catch(e){ toast('That file did not parse as a Caddie Book backup.'); } };
  rd.readAsText(f);
}
/** RFC-4180 quoting for one CSV value. */
function csvEsc(v){ v=v==null?'':String(v); return /[",\n]/.test(v)? '"'+v.replace(/"/g,'""')+'"':v; }
/** Shots CSV: one row per shot + SUMMARY per hole; imports summary-only. */
function exportCSV(){
  const head='date,course,hole,par,yardage,shot,club,lie,distance,unit,finish_type,finish,shape,effort,fraction,strike,note,score,putts,fir,gir,pen,sand,ud,three_putt';
  const rows=[head];
  finishedRounds().forEach(r=>{
    const cn=courseOf(r)? courseOf(r).name:'';
    if(r.legacy){
      r.holes.forEach(h=>{
        rows.push([r.date,cn,h.n,'','','SUMMARY','','','','','','','','','','','18Birdies import',
          h.strokes||'', '', '', '', '', '', '', ''].map(csvEsc).join(','));
      });
      return;
    }
    r.holes.forEach(h=>{
      (h.shots||[]).forEach((s,i)=>{
        const fin = s.fType==='lat'? (s.lat||'') : s.pad? s.pad+(s.fType==='putt'?'p':'g'):'';
        rows.push([r.date,cn,h.n,h.par,h.ydg||'',i+1,clubLabel(s.clubId),s.lie,s.dist!=null?s.dist:'',s.unit==='f'?'feet':'yards',
          s.fType||'',fin,s.shape?s.shape+'s':'',s.effort||'',s.frac||'',s.strike||'',s.note||'','','','','','','','',''].map(csvEsc).join(','));
      });
      const d=deriveHole(h);
      if(d.score!=null) rows.push([r.date,cn,h.n,h.par,h.ydg||'','SUMMARY','','','','','','','','','','','',
        d.score,d.putts,d.fir||'',d.gir||'',d.pen,d.sand,(d.udA? (d.udM?'Y':'N'):'-'),d.threePutt?'Y':'N'].map(csvEsc).join(','));
    });
  });
  download('caddiebook-shots-'+todayISO()+'.csv', rows.join('\n'),'text/csv');
}
/** One round in the compact AI format (fin-4g / fin-2p / shp-6s suffixes). */
function roundText(r){
  const lines=[];
  const cn=courseOf(r)? courseOf(r).name:''; const t=teeOf(r);
  lines.push(`ROUND ${r.date} ${cn}${t? ' ('+t.name+' '+ (t.rating||'?')+'/'+(t.slope||'?')+')':''}`);
  r.holes.forEach(h=>{
    const d=deriveHole(h); if(d.score==null && !(h.shots||[]).length) return;
    const wind=h.windD? ` wind${h.windD}${h.windS||''}`:'';
    lines.push(`H${h.n} P${h.par} ${h.ydg||'?'}${wind} | sc${d.score!=null?d.score:'?'} putts${d.putts} FIR-${d.fir||'?'} GIR-${d.gir||'?'} pen${d.pen} sand${d.sand} ud${d.udA?(d.udM?'Y':'N'):'-'}`);
    (h.shots||[]).forEach((s,i)=>{
      const fin = s.fType==='lat'? `fin-${s.lat||'?'}` : `fin-${s.pad||'?'}${s.fType==='putt'?'p':'g'}`;
      const bits=[`s${i+1}`, clubLabel(s.clubId), s.lie, s.dist!=null? s.dist+(s.unit==='f'?'ft':''):'', fin,
        s.shape?`shp-${s.shape}s`:'', s.frac?`f${s.frac}`:'', s.effort?`e${s.effort}`:'', s.strike||'', s.note?`"${s.note}"`:''].filter(Boolean);
      lines.push(' '+bits.join(' '));
    });
  });
  return lines.join('\n');
}
/** Copy a single round\u2019s AI text. */
function exportRoundText(id){
  const r=S.rounds.find(x=>x.id===id);
  copyText(roundText(r), 'Round copied — paste anywhere.');
}
/** Copy every shot-tracked round\u2019s AI text. */
function exportAllText(){
  copyText(finishedRounds().filter(r=>!r.legacy).map(roundText).join('\n\n'), 'All shot-tracked rounds copied.');
}
/** Clipboard write with an execCommand fallback for older WebKit. */
function copyText(txt,msg){
  const done=()=>toast(msg||'Copied.');
  if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,()=>fallbackCopy(txt,done));
  else fallbackCopy(txt,done);
}
/** Hidden-textarea copy fallback. */
function fallbackCopy(txt,done){
  const ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta);
  ta.select(); try{document.execCommand('copy');}catch(e){} document.body.removeChild(ta); done();
}

/* ============================================================
   18BIRDIES IMPORT — merge, never replace; idempotent by source id
   ============================================================ */
function import18B(inp){
  const f=inp.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{ try{ const res=convert18B(JSON.parse(rd.result));
      toast(`Imported ${res.rounds} rounds and ${res.courses} new courses.` + (res.skipped? ` Skipped ${res.skipped} already imported.`:''));
      MOREVIEW='menu'; TAB='play'; PLAYVIEW='home'; render();
    }catch(e){ toast('Could not read that as an 18Birdies export.'); }
    inp.value=''; };
  rd.readAsText(f);
}
/** Pure converter: 18Birdies export JSON → legacy rounds + stub courses.
 *  Merge-only and idempotent (dedupes on the source round id). */
function convert18B(json){
  const md = json.myData||json;
  const act = (md.activityData&&md.activityData.rounds)||[];
  const clubs = ((md.clubData&&md.clubData.playedClubs)||[]);
  const nameById = {}; clubs.forEach(c=>{ nameById[c.clubId]=c.name; });
  // course per 18Birdies club: reuse by name, else create a stub (tees added later by hand)
  const courseIdByName = {};
  S.courses.forEach(c=>{ courseIdByName[c.name.toLowerCase()]=c.id; });
  let newCourses=0;
  function courseFor(name){
    if(!name) name='Imported course';
    const key=name.toLowerCase();
    if(!courseIdByName[key]){
      const c={id:uid(), name, tees:[]};
      S.courses.push(c); courseIdByName[key]=c.id; newCourses++;
    }
    return courseIdByName[key];
  }
  const have=new Set(S.rounds.map(r=>r.srcId).filter(Boolean));
  let added=0, skipped=0;
  for(const r of act){
    if(!r || !Array.isArray(r.holeStrokes) || !r.holeStrokes.length) continue;
    if(have.has(r.id)){ skipped++; continue; }
    const st=r.stats||{};
    const d=new Date(r.timestamp||Date.now());
    const date=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    S.rounds.push({
      id:uid(), legacy:true, source:'18birdies', srcId:r.id, finished:true,
      courseId: courseFor(nameById[(r.clubId&&r.clubId.id)||''] ), teeId:null, date,
      holes: r.holeStrokes.map((s,i)=>({n:i+1, strokes:s})),
      agg:{
        strokes:r.strokes, toPar:(typeof r.score==='number'? r.score : null),
        putts:st.putts||0,
        firY:st.fairwayMiddles||0, firD:st.fairwayHoleCount||0,
        girY:st.gir||0, girD:st.girHoleCount||0,
        eagles:(st.eagles||0)+(st.doubleEagleOrBetter||0)+(st.aces||0),
        birdies:st.birdies||0, pars:st.pars||0, bogeys:st.bogeys||0,
        dblOrWorse:st.doubleBogeyOrWorse||0
      }
    });
    have.add(r.id); added++;
  }
  save();
  return {rounds:added, courses:newCourses, skipped};
}

