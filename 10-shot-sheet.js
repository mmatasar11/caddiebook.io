/* ============================================================
   SHOT SHEET — the tap-first entry surface (optimize this!)
   ============================================================
   Target: 4-6 taps per shot. Smart defaults do the work:
   lie prefills from context (first shot T, after a green
   attempt GR…), typing distance highlights the closest club,
   and the finish control switches automatically — lateral
   buttons for tee balls/layups, green pad for approaches,
   putt pad (in feet) on a GR lie. Shape/effort/strike/note
   stay collapsed and never block saving.
   SH = the open draft {idx: shot index or null-for-new, s: shot,
   more: detail section expanded, distStr: keypad buffer}.
   ============================================================ */
let SH=null; // draft {holeRef, idx|null, s:{...}, more:false}
/** New shot with context-smart defaults: lie from the previous shot,
 *  club from estimated remaining distance, feet on the green. */
function blankShot(prefLie){
  const h=curHole();
  const prev=h.shots[h.shots.length-1];
  let lie = prefLie || 'FW';
  if(!prefLie){
    if(!h.shots.length) lie='T';
    else if(prev.lie==='GR' && prev.pad!==5) lie='GR';
    else if(prev.fType==='green') lie='GR';
    else if(prev.fType==='lat') lie = prev.lat==='C'?'FW':'RF';
  }
  const remain = estRemaining(h);
  return {id:uid(), clubId: lie==='GR'? putterId(): suggestClub(remain), lie,
    dist: null, unit: lie==='GR'?'f':'y', fType:null, lat:null, pad:null,
    shape:null, effort:null, frac:null, strike:null, note:''};
}
/** Rough remaining-distance guess to preselect a club (no GPS needed). */
function estRemaining(h){
  if(!h.shots.length) return h.ydg||null;
  const last=h.shots[h.shots.length-1];
  if(last.unit==='y'&&last.dist&&last.clubId){ const c=club(last.clubId); if(c&&c.stock) return Math.max(0, last.dist - c.stock) || Math.round(last.dist*0.12); }
  return null;
}
/** Open the sheet for a fresh shot (optionally forcing a lie, e.g. HZ). */
function newShot(prefLie){ SH={idx:null, s:blankShot(prefLie), more:false, distStr:''}; renderShotSheet(); }
/** Open the sheet on an existing shot, detail section expanded. */
function editShot(i){ const h=curHole(); SH={idx:i, s:JSON.parse(JSON.stringify(h.shots[i])), more:true, distStr: h.shots[i].dist!=null? String(h.shots[i].dist):''}; renderShotSheet(); }

/** Choose which finish control to show: putt on GR, lateral for driver/tee
 *  balls on par 4/5, green attempt for reachable approaches. */
function defaultFType(s){
  if(s.lie==='GR') return 'putt';
  const c=club(s.clubId);
  if(s.lie==='T' && curHole().par>3) return 'lat';
  if(c && c.type==='D') return 'lat';
  if(s.dist!=null) return s.dist<=240? 'green':'lat';
  if(curHole().par===3 && s.lie==='T') return 'green';
  return c && (c.type==='Wg'||c.type==='I')? 'green':'lat';
}
/** Draw the whole entry sheet from the SH draft (called on every tap). */
function renderShotSheet(){
  const s=SH.s;
  if(s.lie==='GR'){ s.unit='f'; if(!s.clubId) s.clubId=putterId(); }
  else s.unit='y';
  if(!s.fType) s.fType=defaultFType(s);
  if(s.fType==='putt' && s.lie!=='GR') s.fType=defaultFType(s);

  const lieChips = LIES.map(l=>`<button class="chip ${s.lie===l[0]?'on':''}" onclick="shSet('lie','${l[0]}')">${l[0]}<span class="small" style="margin-left:5px;font-weight:600;opacity:.75">${S.settings.showLabels? l[1]:''}</span></button>`).join('');
  const sug = s.lie!=='GR'? suggestClub(parseInt(SH.distStr)||null): putterId();
  const clubChips = S.clubs.map(c=>`<button class="chip ${s.clubId===c.id?'on':(c.id===sug?'hint':'')}" onclick="shSet('clubId','${c.id}')">${esc(c.label)}</button>`).join('');
  const keyp = `
    <div class="row" style="align-items:flex-end;gap:14px;margin-bottom:8px">
      <div class="distShow">${SH.distStr||'<span class="muted">–</span>'}<span class="u"> ${s.unit==='f'?'ft':'yds'}</span></div>
      <div class="small muted">${s.lie==='GR'? 'first-putt distance':'distance to target'}</div>
    </div>
    <div class="keypad">
      ${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="shKey('${n}')">${n}</button>`).join('')}
      <button onclick="shKey('C')" style="font-size:15px">CLR</button><button onclick="shKey('0')">0</button><button onclick="shKey('B')">⌫</button>
    </div>`;
  const fSwitch = s.lie==='GR'? '' :
    `<div class="chips" style="margin-bottom:8px">
       <button class="chip sm ${s.fType==='green'?'on':''}" onclick="shSet('fType','green')">Green attempt</button>
       <button class="chip sm ${s.fType==='lat'?'on':''}" onclick="shSet('fType','lat')">Layup / tee ball</button></div>`;
  let finish='';
  if(s.fType==='lat'){
    finish = `<div class="chips">${LATS.map(L=>`<button class="chip ${s.lat===L?'on':''}" style="min-width:56px" onclick="shSet('lat','${L}')">${L}</button>`).join('')}</div>
      <div class="small muted" style="margin-top:6px">${s.lat? LAT_NAME[s.lat]:'Finish vs. intended line'}</div>`;
  } else {
    finish = padHTML(s.fType==='putt'?'putt':'green', s.pad, "shPad");
  }
  const moreBody = `
    <div class="sec">Shape</div>${padHTML('shape', s.shape, "shShape")}
    <div class="sec">Effort</div>
    <div class="chips">
      ${FRACS.map(f=>`<button class="chip ${s.frac===f?'on':''}" onclick="shSet('frac','${f}')">${f}</button>`).join('')}
      <button class="chip ${s.frac===null&&s.effort===null?'on':''}" onclick="shSet('frac',null);shSet('effort',null)">Full</button>
      <input class="f num" style="width:92px;min-height:44px" inputmode="numeric" placeholder="e80" value="${s.effort||''}" onchange="SH.s.effort=parseInt(this.value)||null;SH.s.frac=null;">
    </div>
    <div class="sec">Strike</div>
    <div class="chips">${STRIKES.map(k=>`<button class="chip ${s.strike===k[0]?'on':''}" onclick="shSet('strike','${k[0]}')">${k[0]} <span class="small" style="opacity:.7;margin-left:4px">${k[1]}</span></button>`).join('')}</div>
    <div class="sec">Note</div>
    <input class="f" value="${esc(s.note)}" onchange="SH.s.note=this.value" placeholder="optional">`;
  openSheet(`
    <div class="sheetHd"><span class="t">${SH.idx==null?'Shot '+(curHole().shots.length+1):'Edit shot '+(SH.idx+1)}</span>
      <button class="btn sm ghost" onclick="closeSheet()">Cancel</button></div>
    <div class="sec">Lie — hit from</div><div class="chips">${lieChips}</div>
    <div class="sec">Distance</div>${keyp}
    ${s.lie==='GR'? `<div style="margin-top:8px"><button class="chip sm" onclick="tapIn()">⛳ Tap-in (2 ft, made)</button></div>`:''}
    <div class="sec">Club</div><div class="chips">${clubChips}</div>
    <div class="sec">Finish — where it ended up</div>${fSwitch}${finish}
    <div style="height:10px"></div>
    <button class="btn wide ghost" onclick="SH.more=!SH.more;renderShotSheet()">${SH.more?'▴ Hide detail':'▾ Shape · effort · strike · note'}</button>
    ${SH.more? moreBody:''}
    <div style="height:14px"></div>
    <div class="grid2">
      ${SH.idx!=null? `<button class="btn danger" onclick="delShot()">Delete</button>`:`<span></span>`}
      <button class="btn primary" style="min-height:60px;font-size:18px" onclick="saveShot()">Save shot</button>
    </div>
    ${SH.idx!=null? `<div style="height:8px"></div><div class="grid2">
      <button class="btn sm" onclick="moveShot(-1)">↑ Move up</button><button class="btn sm" onclick="moveShot(1)">↓ Move down</button>
    </div><div style="height:8px"></div><button class="btn sm wide ghost" onclick="insertBefore()">Insert a missed shot before this one</button>`:''}
  `);
}
/** Render any 3×3 numpad (green/putt/shape) with axis labels; `fn` is the
 *  global click handler name. Shared by entry AND settings preview. */
function padHTML(kind, sel, fn){
  const rows=padRows(kind), lab=PAD_LABELS[kind], ax=PAD_AXES[kind];
  const topAx = (kind==='shape'&&!S.settings.shapeTopDraw)? ['FADE ↑','DRAW ↓'] : ax;
  let b=`<div class="pad"><div class="axis"><span>◀ LEFT</span><span>${topAx[0]}</span><span>RIGHT ▶</span></div>`;
  for(const row of rows) for(const d of row){
    b+=`<button class="${d===5?'pure ':''}${sel===d?'on':''}" onclick="${fn}(${d})">
        <span class="d">${d}</span>${S.settings.showLabels?`<span class="l">${lab[d]}</span>`:''}</button>`;
  }
  b+=`<div class="axis"><span></span><span>${topAx[1]}</span><span></span></div></div>`;
  return b;
}
/** Sheet field setter with the side-effect rules (lie change resets finish,
 *  GR forces putter + feet, fraction clears effort, etc.). */
function shSet(k,v){
  if(k==='lie'){ SH.s.lie=v; SH.s.fType=null; SH.s.pad=null; SH.s.lat=null;
    if(v==='GR'){SH.s.unit='f'; SH.s.clubId=putterId();} else {SH.s.unit='y'; if(SH.s.clubId===putterId()) SH.s.clubId=null;} }
  else if(k==='fType'){ SH.s.fType=v; if(v==='lat')SH.s.pad=null; else SH.s.lat=null; }
  else if(k==='frac'){ SH.s.frac = SH.s.frac===v? null:v; if(SH.s.frac)SH.s.effort=null; }
  else if(k==='strike'){ SH.s.strike = SH.s.strike===v? null:v; }
  else { if(k==='clubId') SH.userPickedClub=true; SH.s[k]=v; }
  renderShotSheet();
}
/** Distance keypad input; re-suggests a club unless the player picked one. */
function shKey(k){
  if(k==='C') SH.distStr='';
  else if(k==='B') SH.distStr=SH.distStr.slice(0,-1);
  else if(SH.distStr.length<3) SH.distStr+=k;
  SH.s.dist = SH.distStr? parseInt(SH.distStr):null;
  if(SH.s.lie!=='GR' && !SH.userPickedClub){ const sg=suggestClub(SH.s.dist); if(sg) SH.s.clubId=sg; }
  renderShotSheet();
}
/** Finish pad tap (toggle). */
function shPad(d){ SH.s.pad = SH.s.pad===d? null:d; renderShotSheet(); }
/** Shape pad tap (toggle). */
function shShape(d){ SH.s.shape = SH.s.shape===d? null:d; renderShotSheet(); }
/** Commit the draft into the hole (append or replace) and close. */
function saveShot(){
  const h=curHole(); const s=SH.s;
  s.dist = SH.distStr? parseInt(SH.distStr) : s.dist;
  if(SH.idx==null) h.shots.push(s); else h.shots[SH.idx]=s;
  closeSheet(); render();
}
/** Delete the shot being edited. */
function delShot(){ curHole().shots.splice(SH.idx,1); closeSheet(); render(); }
/** Reorder the shot up/down within the hole (post-hole reconstruction). */
function moveShot(d){ const a=curHole().shots; const j=SH.idx+d; if(j<0||j>=a.length)return;
  [a[SH.idx],a[j]]=[a[j],a[SH.idx]]; SH.idx=j; renderShotSheet(); render(); }
/** Insert a forgotten shot before the one being edited. */
function insertBefore(){ const h=curHole(); const ins=blankShot(); h.shots.splice(SH.idx,0,ins);
  SH={idx:SH.idx, s:h.shots[SH.idx], more:false, distStr:''}; renderShotSheet(); }

