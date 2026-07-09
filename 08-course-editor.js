/* ============================================================
   COURSE EDITOR — three ways in, one verification grid out
   ============================================================
   1. Manual: 18-row grid, par defaults to 4, done in <60s.
   2. Paste parser: iPhone Live Text copies the scorecard
      (on-device OCR); ceParse() classifies the numbers —
      3-5 = pars, 100-650 = yardages, leftover 1-18 = stroke
      index, decimal 60-80 = rating with its neighbor as slope.
   3. Online (optional): golfcourseapi.com with a free key from
      Settings — fills name, location, rating, slope, 18 holes.
   All three land in the same editable CE draft before saving.
   ============================================================ */
let CE=null; // {courseId|null, name, teeName, rating, slope, holes[], startAfter}
/** Open the editor: blank 18×par-4 draft, or prefilled from an existing course. */
function courseEditor(courseId, startAfter){
  CE={courseId, startAfter:!!startAfter, name:'', teeName:'White', rating:'', slope:'',
      info:{address:'',city:'',state:''},
      holes:Array.from({length:18},(_,i)=>({n:i+1,par:4,ydg:'',si:''}))};
  if(courseId){ const c=S.courses.find(x=>x.id===courseId); CE.name=c.name; CE.info=Object.assign({address:'',city:'',state:''}, c.info||{});
    const t=c.tees[0]; if(t){CE.teeName=t.name;CE.rating=t.rating;CE.slope=t.slope;CE.holes=t.holes.map(h=>({...h}));} }
  renderCourseEditor();
}
/** Draw the editor sheet: name/location/tee fields + the 18-row grid. */
function renderCourseEditor(){
  const rows = CE.holes.map((h,i)=>`<tr>
    <td class="hn">${h.n}</td>
    <td><div class="parBtns">${[3,4,5].map(p=>`<button class="${h.par===p?'on':''}" onclick="cePar(${i},${p})">${p}</button>`).join('')}</div></td>
    <td><input inputmode="numeric" value="${h.ydg||''}" placeholder="yds" onchange="ceSet(${i},'ydg',this.value)"></td>
    <td><input class="si" inputmode="numeric" value="${h.si||''}" placeholder="SI" onchange="ceSet(${i},'si',this.value)"></td>
  </tr>` + (h.n===9?`<tr><td colspan="4" style="border-top:2px solid var(--ink)"></td></tr>`:'')).join('');
  openSheet(`<div class="sheetHd"><span class="t">${CE.courseId?'Edit course':'New course'}</span><button class="btn sm ghost" onclick="closeSheet()">Cancel</button></div>
    <label class="f">Course name</label><input class="f" id="ceName" value="${esc(CE.name)}" placeholder="Fossil Trace">
    ${S.settings.gcApiKey? `<div style="margin-top:8px"><button class="btn sm wide" onclick="gcSearch()">🔎 Look up online (fills everything)</button></div>`:''}
    <div class="grid2">
      <div><label class="f">City</label><input class="f" id="ceCity" value="${esc(CE.info.city||'')}"></div>
      <div><label class="f">State</label><input class="f" id="ceState" value="${esc(CE.info.state||'')}"></div>
    </div>
    <div class="grid3">
      <div><label class="f">Tee</label><input class="f" id="ceTee" value="${esc(CE.teeName)}"></div>
      <div><label class="f">Rating</label><input class="f num" id="ceRating" inputmode="decimal" value="${CE.rating||''}" placeholder="71.2"></div>
      <div><label class="f">Slope</label><input class="f num" id="ceSlope" inputmode="numeric" value="${CE.slope||''}" placeholder="135"></div>
    </div>
    <div class="sec">Holes</div>
    <div class="row small muted" style="margin-bottom:6px">Par defaults to 4 — tap to change. Enter yardage, then SI.</div>
    <table class="crsGrid"><tr><th>#</th><th>Par</th><th>Yardage</th><th>SI</th></tr>${rows}</table>
    <div style="height:10px"></div>
    <button class="btn wide" onclick="cePasteUI()">📷 Paste from scorecard photo</button>
    <div class="small muted" style="margin:8px 2px">Point the iPhone camera at the scorecard, use Live Text to <b>Select All → Copy</b> (fully on-device), then paste here. The parser pulls out pars, yardages and stroke indexes for you to verify.</div>
    <div style="height:6px"></div>
    <button class="btn primary wide" onclick="ceSave()">Save course</button>`);
}
/** Par button tap for row i (grabs live inputs first so nothing is lost). */
function cePar(i,p){ CE.holes[i].par=p; ceGrab(); renderCourseEditor(); }
/** Store a yardage/SI cell as it changes. */
function ceSet(i,k,v){ CE.holes[i][k]=parseInt(v)||''; }
/** Pull every live input into the CE draft before re-rendering or saving. */
function ceGrab(){ CE.name=$('#ceName').value; CE.teeName=$('#ceTee').value; CE.rating=$('#ceRating').value; CE.slope=$('#ceSlope').value;
  if($('#ceCity')) CE.info.city=$('#ceCity').value.trim();
  if($('#ceState')) CE.info.state=$('#ceState').value.trim();
  document.querySelectorAll('.crsGrid input').forEach((inp,j)=>{ const i=Math.floor(j/2); if(j%2===0)CE.holes[i].ydg=parseInt(inp.value)||''; else CE.holes[i].si=parseInt(inp.value)||''; }); }
/** Sheet for pasting Live-Text scorecard output into the parser. */
function cePasteUI(){
  ceGrab();
  openSheet(`<div class="sheetHd"><span class="t">Paste scorecard text</span><button class="btn sm ghost" onclick="renderCourseEditor()">Back</button></div>
    <div class="small muted" style="margin-bottom:8px">Paste anything the camera copied — messy is fine. Numbers 3–5 in runs of 18 are read as pars, 100–650 as yardages, 1–18 as stroke index.</div>
    <textarea class="f" id="cePaste" style="min-height:160px" placeholder="4 4 3 5 4 4 3 4 5 …&#10;387 402 165 520 …"></textarea>
    <div style="height:10px"></div>
    <button class="btn primary wide" onclick="ceParse()">Read numbers → verify grid</button>`);
}
/** Heuristic number classifier: pars, yardages, stroke index, rating, slope
 *  (slope is matched next to the decimal rating first so it can\u2019t be eaten
 *  as a yardage). Fills the grid for verification. */
function ceParse(){
  const txt=$('#cePaste').value;
  const nums=(txt.match(/\d+(\.\d+)?/g)||[]).map(Number);
  const ratingIdx = nums.findIndex(n=>n>=60 && n<=80 && !Number.isInteger(n));
  const rating = ratingIdx>=0 ? nums[ratingIdx] : null;
  const tok = nums.map(n=>({v:n,used:!Number.isInteger(n)}));
  let slope = null;
  // slope: an integer 55–155 sitting right next to the rating (e.g. "71.4 / 132")
  if(ratingIdx>=0){
    for(const j of [ratingIdx+1,ratingIdx+2,ratingIdx-1]){
      if(tok[j] && !tok[j].used && tok[j].v>=55 && tok[j].v<=155){ slope=tok[j].v; tok[j].used=true; break; }
    }
  }
  const ints = tok;
  const pars=[], ydgs=[];
  for(const t of ints){
    if(t.used) continue;
    if(t.v>=3&&t.v<=5 && pars.length<18){ pars.push(t.v); t.used=true; }
    else if(t.v>=100&&t.v<=650 && ydgs.length<18){ ydgs.push(t.v); t.used=true; }
  }
  // slope fallback: any leftover int 55–155
  if(slope==null){ for(const t of ints){ if(!t.used && t.v>=55 && t.v<=155){ slope=t.v; t.used=true; break; } } }
  // stroke index: unused ints 1–18, each once
  const sis=[]; const seen=new Set();
  for(const t of ints){ if(!t.used && t.v>=1&&t.v<=18 && !seen.has(t.v) && sis.length<18){ seen.add(t.v); sis.push(t.v); t.used=true; } }
  pars.forEach((p,i)=>{ if(CE.holes[i]) CE.holes[i].par=p; });
  ydgs.forEach((y,i)=>{ if(CE.holes[i]) CE.holes[i].ydg=y; });
  if(sis.length===18) sis.forEach((s,i)=>{ CE.holes[i].si=s; });
  if(rating) CE.rating=rating;
  if(slope) CE.slope=slope;
  renderCourseEditor();
  toast(`Read ${pars.length} pars, ${ydgs.length} yardages${sis.length===18?', 18 stroke indexes':''}${rating?', rating '+rating:''}${slope?', slope '+slope:''}. Verify below.`);
}
/** Validate + persist the course (updating tee in place keeps round links). */
function ceSave(){
  ceGrab();
  if(!CE.name.trim()){ toast('Name the course'); return; }
  const teeObj={id:uid(), name:CE.teeName.trim()||'Tee', rating:parseFloat(CE.rating)||null, slope:parseInt(CE.slope)||null,
    holes:CE.holes.map(h=>({n:h.n,par:h.par,ydg:parseInt(h.ydg)||null,si:parseInt(h.si)||null}))};
  if(CE.courseId){
    const c=S.courses.find(x=>x.id===CE.courseId); c.name=CE.name.trim();
    c.info=Object.assign(c.info||{}, CE.info);
    c.tees[0]=Object.assign(c.tees[0]||{}, teeObj, {id:(c.tees[0]||teeObj).id});
  } else {
    S.courses.push({id:uid(), name:CE.name.trim(), info:{...CE.info}, tees:[teeObj]});
  }
  save(); closeSheet();
  if(CE.startAfter) startRoundSheet(); else render();
}

/** Authenticated GET against api.golfcourseapi.com (optional online path). */
async function gcApi(path){
  const res = await fetch('https://api.golfcourseapi.com/v1/'+path, {headers:{'Authorization':'Key '+S.settings.gcApiKey}});
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}
/** Search courses by the typed name; user picks a result to apply. */
async function gcSearch(){
  ceGrab();
  const q = CE.name.trim(); if(!q){ toast('Type the course name first.'); return; }
  toast('Searching…');
  try{
    const data = await gcApi('search?search_query='+encodeURIComponent(q));
    GCRES = (data.courses||[]).slice(0,5);
    if(!GCRES.length){ toast('No matches. Paste or type it instead.'); return; }
    openSheet(`<div class="sheetHd"><span class="t">Pick your course</span><button class="btn sm ghost" onclick="renderCourseEditor()">Back</button></div>
      ${GCRES.map((c,i)=>{
        const tees=((c.tees&&c.tees.male)||[]).concat((c.tees&&c.tees.female)||[]);
        return `<div class="card"><div class="bd">
          <div style="font-weight:800">${esc(c.club_name||'')}${c.course_name&&c.course_name!==c.club_name? ' — '+esc(c.course_name):''}</div>
          <div class="small muted">${esc([c.location&&c.location.city, c.location&&c.location.state].filter(Boolean).join(', '))}</div>
          <div class="chips" style="margin-top:8px">${tees.map((t,j)=>`<button class="chip sm" onclick="gcApply(${i},${j})">${esc(t.tee_name)} · ${t.course_rating||'?'} / ${t.slope_rating||'?'}</button>`).join('')||'<span class="small muted">no tee data</span>'}</div>
        </div></div>`;}).join('')}`);
  }catch(e){
    toast('Lookup failed ('+e.message+'). If this keeps happening the API may block browser requests — the paste import always works.');
  }
}
/** Map an API course onto the CE draft: location, tee rating/slope, 18 holes. */
function gcApply(ci,ti){
  const c=GCRES[ci];
  const tees=((c.tees&&c.tees.male)||[]).concat((c.tees&&c.tees.female)||[]);
  const t=tees[ti]; if(!t) return;
  CE.name = CE.name || c.club_name || '';
  if(!CE.name.trim()) CE.name = c.club_name||c.course_name||'';
  CE.teeName = t.tee_name||'Tee';
  CE.rating = t.course_rating||''; CE.slope = t.slope_rating||'';
  CE.info = {address:(c.location&&c.location.address)||'', city:(c.location&&c.location.city)||'', state:(c.location&&c.location.state)||''};
  (t.holes||[]).slice(0,18).forEach((hh,i)=>{ CE.holes[i]={n:i+1, par:hh.par||4, ydg:hh.yardage||'', si:hh.handicap||''}; });
  renderCourseEditor();
  toast('Filled from golfcourseapi.com — verify the grid.');
}
/** From a course page: fetch and fill location fields for an existing course. */
function gcFill(courseId){ courseEditor(courseId,false); setTimeout(gcSearch, 50); }

