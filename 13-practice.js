/* ============================================================
   PRACTICE — drill library + sessions + launch-monitor data
   ============================================================
   DRILLS is a plain array — add a drill = add a row.
   Sessions hold club "blocks" of TrackMan-style shots (visible
   columns configurable in Settings) plus putting drill rows.
   Practice carries feed stock yardages and the wedge matrix.
   ============================================================ */
/* ---------------- drill library ---------------- */
const DRILLS = [
  {cat:'Wedges', name:'Wedge ladder', how:'Pick one wedge. Hit 3 balls each at ½, ¾ and full. Log carries per block — the medians build your wedge matrix. Goal: three distinct, repeatable numbers per wedge.'},
  {cat:'Wedges', name:'Clock calibration', how:'Hands to 9:00, 10:30, full. Same tempo, same finish. 5 balls per position, one club per session. Chart drift over weeks.'},
  {cat:'Putting', name:'Gate drill', how:'Two tees a putter-head-width apart, 6 ft from the hole. 10 putts through the gate. Log attempts and makes. Under 7/10 means face control, not read, is the issue.'},
  {cat:'Putting', name:'Lag ladder 20/30/40', how:'3 balls from 20, 30, 40 ft. Success = inside 3 ft. Log make + inside-3 count per distance. Directly attacks 3-putt rate.'},
  {cat:'Putting', name:'Around the world', how:'6 balls in a circle 4 ft from the cup. Make all 6 to move to 5 ft, then 6 ft. Log the longest completed circle.'},
  {cat:'Short game', name:'Up-and-down challenge', how:'9 balls, 9 different lies around a green. Chip + putt out every ball. Score = up-and-downs out of 9. Tour average is about 6.'},
  {cat:'Bunker', name:'Dollar-bill splash', how:'Draw a dollar-sized box around the ball in the sand. Take the whole box, not the ball. 10 reps focusing on entry point 2 inches behind.'},
  {cat:'Driver', name:'Fairway windows', how:'Pick two range flags as a fairway. 10 drivers, log hits inside the window and miss side. Feeds the shape heatmap story.'},
  {cat:'Irons', name:'9-shot flight', how:'One mid-iron. Attempt draw/straight/fade at low/mid/high — all nine flights. Log which cells you can actually produce; the gaps are your recovery limits.'}
];

/* ============================================================
   PRACTICE TAB
   ============================================================ */
let PRACVIEW=null; // session id
/** Practice home: drill library (collapsible, by category) + session list. */
function vPractice(){
  if(PRACVIEW) return vSession(PRACVIEW);
  const list=[...S.practice].sort((a,b)=>a.date<b.date?1:-1).map(p=>{
    const nShots=(p.blocks||[]).reduce((s,b)=>s+(b.shots||[]).length,0);
    const nPutt=(p.putting||[]).reduce((s,x)=>s+(x.att||0),0);
    return `<div class="listRow" onclick="PRACVIEW='${p.id}';render()"><div class="main">
      <div class="ti">${esc(p.focus||'Practice')}</div>
      <div class="sub">${fmtDate(p.date)} · ${esc(p.location||'')} · ${nShots} ball shots${nPutt? ' · '+nPutt+' putts':''}</div></div><span class="arr">›</span></div>`;
  }).join('');
  const cats=[...new Set(DRILLS.map(d=>d.cat))];
  return `<div class="pageTitle"><h1>Practice</h1></div>
    <button class="btn primary wide" onclick="newSession()">＋ New session</button>
    <div style="height:14px"></div>
    <div class="card"><div class="hd"><span class="t">Drill library</span></div><div class="bd">
      ${cats.map(cat=>`<div class="small" style="font-weight:800;margin:8px 0 4px;color:var(--turf)">${cat}</div>
        ${DRILLS.filter(d=>d.cat===cat).map(d=>`<details class="drill"><summary>${esc(d.name)}</summary>
          <div class="db">${esc(d.how)}
          <div style="margin-top:8px"><button class="btn sm" onclick="startDrill('${esc(d.name)}')">Start session with this drill</button></div></div></details>`).join('')}`).join('')}
    </div></div>
    <div class="card"><div class="hd"><span class="t">Sessions</span></div>
    <div class="bd tight">${list||'<div style="padding:14px" class="muted">Log range work, TrackMan numbers, and putting drills here. It all feeds stock yardages and the wedge matrix.</div>'}</div></div>`;
}
/** Create and open an empty session. */
function newSession(){
  const p={id:uid(),date:todayISO(),location:'',focus:'',notes:'',blocks:[],putting:[]};
  S.practice.push(p); PRACVIEW=p.id; render();
}
/** The session currently open. */
function prac(){ return S.practice.find(p=>p.id===PRACVIEW); }
/** Session editor: meta fields, TrackMan blocks with live avg±sd, putting rows. */
function vSession(id){
  const p=S.practice.find(x=>x.id===id); if(!p){PRACVIEW=null;return vPractice();}
  const cols=S.settings.tmCols;
  const blocks=(p.blocks||[]).map((b,bi)=>{
    const stats = b.shots&&b.shots.length? (()=>{ const cs=b.shots.map(s=>Number(s.carry)).filter(x=>x>0);
      return cs.length? `avg carry <b class="num">${r0(mean(cs))}</b> ± <b class="num">${r1(sd(cs))||0}</b> · ${cs.length} shots`:''; })():'';
    const head=cols.map(c=>{const m=TM_METRICS.find(x=>x[0]===c);return `<th class="num">${m[1]}</th>`;}).join('');
    const rows=(b.shots||[]).map((s,si)=> `<tr>${cols.map(c=>`<td class="num"><input inputmode="decimal" style="width:58px;border:1px solid var(--line);border-radius:6px;min-height:34px;text-align:right;font-family:var(--mono)" value="${s[c]!=null?s[c]:''}" onchange="tmSet(${bi},${si},'${c}',this.value)"></td>`).join('')}
      <td><button class="btn sm ghost" onclick="prac().blocks[${bi}].shots.splice(${si},1);render()">✕</button></td></tr>`).join('');
    return `<div class="card"><div class="hd"><span class="t">${esc(clubLabel(b.clubId))}${b.frac? ' · '+b.frac:''}</span>
      <span class="small muted">${stats}</span></div><div class="bd tight" style="overflow-x:auto">
      <table class="data">${head?`<tr>${head}<th></th></tr>`:''}${rows}</table>
      <div style="padding:8px 12px" class="row"><button class="btn sm" onclick="prac().blocks[${bi}].shots.push({});render()">＋ Shot</button>
      <button class="btn sm ghost" onclick="if(confirm('Remove block?')){prac().blocks.splice(${bi},1);render()}">Remove block</button></div>
    </div></div>`;
  }).join('');
  const putts=(p.putting||[]).map((d,i)=>`<tr>
    <td class="num"><input inputmode="numeric" style="width:52px" class="f num" value="${d.dist||''}" placeholder="ft" onchange="prac().putting[${i}].dist=parseInt(this.value)||0"></td>
    <td class="num"><input inputmode="numeric" style="width:52px" class="f num" value="${d.att||''}" onchange="prac().putting[${i}].att=parseInt(this.value)||0;render()"></td>
    <td class="num"><input inputmode="numeric" style="width:52px" class="f num" value="${d.made||''}" onchange="prac().putting[${i}].made=parseInt(this.value)||0;render()"></td>
    <td class="num">${d.att? pct(d.made||0,d.att):'–'}</td>
    <td><button class="btn sm ghost" onclick="prac().putting.splice(${i},1);render()">✕</button></td></tr>`).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:10px">
    <button class="btn sm ghost" onclick="PRACVIEW=null;render()">‹ Sessions</button>
    <button class="btn sm danger" onclick="if(confirm('Delete session?')){S.practice=S.practice.filter(x=>x.id!=='${p.id}');PRACVIEW=null;render()}">Delete</button></div>
  <div class="grid2">
    <div><label class="f">Date</label><input class="f num" type="date" value="${p.date}" onchange="prac().date=this.value"></div>
    <div><label class="f">Location</label><input class="f" value="${esc(p.location)}" onchange="prac().location=this.value" placeholder="Range / sim"></div>
  </div>
  <label class="f">Focus / drill</label>
  <input class="f" list="drillList" value="${esc(p.focus)}" onchange="prac().focus=this.value;save();render()" placeholder="56° distance control">
  <datalist id="drillList">${DRILLS.map(d=>`<option value="${esc(d.name)}">`).join('')}</datalist>
  ${(()=>{const d=DRILLS.find(x=>x.name===p.focus); return d? `<div class="histLine" style="margin-top:8px">📋 <span class="small">${esc(d.how)}</span></div>`:'';})()}
  <label class="f">Notes</label><textarea class="f" onchange="prac().notes=this.value;save()">${esc(p.notes)}</textarea>
  <div class="sec">Ball flight blocks (TrackMan / launch monitor)</div>
  ${blocks}
  <button class="btn wide" onclick="addBlockSheet()">＋ Club block</button>
  <div class="sec">Putting & short game drills</div>
  <div class="card"><div class="bd tight"><table class="data">
    <tr><th class="num">Dist ft</th><th class="num">Att</th><th class="num">Made</th><th class="num">%</th><th></th></tr>${putts}</table>
    <div style="padding:8px 12px"><button class="btn sm" onclick="prac().putting.push({});render()">＋ Drill row</button></div></div></div>
  <div class="small muted">Which TrackMan columns show is configurable in More → Settings.</div>`;
}
/** Store one TrackMan cell as it is typed. */
function tmSet(bi,si,c,v){ prac().blocks[bi].shots[si][c]= v===''? null: Number(v); save(); }
/** Sheet to pick the club (and optional wedge fraction) for a new block. */
function addBlockSheet(){
  openSheet(`<div class="sheetHd"><span class="t">New club block</span><button class="btn sm ghost" onclick="closeSheet()">Cancel</button></div>
    <div class="sec">Club</div><div class="chips">${S.clubs.filter(c=>c.type!=='P').map(c=>`<button class="chip" onclick="addBlock('${c.id}',null)">${esc(c.label)}</button>`).join('')}</div>
    <div class="sec">Wedge fraction (optional)</div>
    <div class="chips">${S.clubs.filter(c=>c.type==='Wg').map(c=>FRACS.map(f=>`<button class="chip sm" onclick="addBlock('${c.id}','${f}')">${esc(c.label)} ${f}</button>`).join('')).join('')}</div>`);
}
/** Append a block and start its first shot row. */
function addBlock(cid,frac){ prac().blocks.push({id:uid(),clubId:cid,frac:frac,shots:[{}]}); closeSheet(); render(); }

/** One tap from the library: new session pre-focused on that drill. */
function startDrill(name){ const p={id:uid(),date:todayISO(),location:'',focus:name,notes:'',blocks:[],putting:[]};
  S.practice.push(p); PRACVIEW=p.id; render(); }
