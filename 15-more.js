/* ============================================================
   MORE TAB — bag, courses, settings, golf-isms
   ============================================================
   MOREVIEW routes the sub-screens. The bag supports brand/
   model and a bench (hidden from pickers, history retained).
   Settings toggles map 1:1 to S.settings keys via setting().
   ============================================================ */
let MOREVIEW='menu';
/** Route the More sub-screens via MOREVIEW. */
function vMore(){
  const views={menu:vMoreMenu,bag:vBag,courses:vCourses,settings:vSettings,data:vData,quips:vQuips};
  return (views[MOREVIEW]||vMoreMenu)();
}
/** Navigate within More. */
function mgo(v){ MOREVIEW=v; render(); }
/** The More menu list. */
function vMoreMenu(){
  // EXAMPLE: a whole screen assembled from ui.* components.
  // Adding a menu entry = one row in this array.
  const items=[
    ['bag','🏌️','My bag','Clubs, brands & stock yardages'],
    ['courses','⛳','Courses','Saved courses & tees'],
    ['settings','⚙︎','Settings','Numpads, labels, outdoor theme'],
    ['data','💾','Backup & export','JSON, CSV, AI text, 18Birdies import'],
    ['quips','😄','Golf-isms','Quips & stories'],
  ];
  const rows = items.map(i=> ui.listRow(i[2], i[3], `mgo('${i[0]}')`,
    {lead:`<span style="font-size:22px">${i[1]}</span>`})).join('');
  return `<div class="pageTitle"><h1>More</h1></div>`
    + ui.card('', rows, {tight:true})
    + `<div class="small muted center">Caddie Book · 100% on-device · nothing leaves your phone</div>`;
}

/** Standard "‹ More" back button used by every sub-screen. */
function backBtn(){
  // EXAMPLE: built with the component library instead of raw HTML.
  return ui.btn('‹ More', "mgo('menu')", {sm:true, kind:'ghost', style:'margin-bottom:10px'});
}

/** Bag editor: label/type/stock + brand/model, reorder, bench, delete. */
function vBag(){
  const active=[...S.clubs].filter(c=>!c.bench).sort((a,b)=>a.sort-b.sort);
  const bench=[...S.clubs].filter(c=>c.bench).sort((a,b)=>a.sort-b.sort);
  const row=(c)=>`<div style="padding:12px 14px;border-bottom:1px solid var(--line)">
    <div class="row">
      <input class="f" style="min-height:42px;width:64px;font-weight:800" value="${esc(c.label)}" onchange="cset('${c.id}','label',this.value)">
      <select class="f grow" style="min-height:42px" onchange="cset('${c.id}','type',this.value)">
        ${[['D','Driver'],['W','Wood/Hy'],['I','Iron'],['Wg','Wedge'],['P','Putter']].map(t=>`<option value="${t[0]}" ${c.type===t[0]?'selected':''}>${t[1]}</option>`).join('')}</select>
      <input class="f num" style="min-height:42px;width:70px" inputmode="numeric" value="${c.stock||''}" placeholder="yds" onchange="cset('${c.id}','stock',parseInt(this.value)||0)">
    </div>
    <div class="row" style="margin-top:7px">
      <input class="f grow" style="min-height:40px" value="${esc(c.brand||'')}" placeholder="Brand (Titleist…)" onchange="cset('${c.id}','brand',this.value)">
      <input class="f grow" style="min-height:40px" value="${esc(c.model||'')}" placeholder="Model (T150…)" onchange="cset('${c.id}','model',this.value)">
    </div>
    <div class="row" style="margin-top:7px;justify-content:flex-end;gap:6px">
      <button class="btn sm ghost" onclick="bagMove('${c.id}',-1)">↑</button>
      <button class="btn sm ghost" onclick="bagMove('${c.id}',1)">↓</button>
      <button class="btn sm ${c.bench?'':'ghost'}" onclick="cset('${c.id}','bench',${c.bench?'false':'true'})">${c.bench?'⬆ Reactivate':'🪑 Bench'}</button>
      <button class="btn sm ghost" onclick="if(confirm('Remove club and its history link?')){S.clubs=S.clubs.filter(x=>x.id!=='${c.id}');render()}">✕</button>
    </div>
  </div>`;
  return backBtn()+`<div class="pageTitle"><h1>My bag</h1><span class="eyebrow num">${active.length} clubs</span></div>
  <div class="card"><div class="hd"><span class="t">In the bag</span></div><div class="bd tight">${active.map(row).join('')}</div></div>
  ${bench.length? `<div class="card"><div class="hd"><span class="t">Bench / archived</span></div><div class="bd tight">${bench.map(row).join('')}</div>
    <div class="small muted" style="padding:8px 14px">Benched clubs keep their shot history in stats but never show in the picker.</div></div>`:''}
  <button class="btn wide" onclick="S.clubs.push({id:uid(),label:'New',type:'I',stock:150,sort:S.clubs.length,brand:'',model:'',bench:false});render()">＋ Add club</button>`;
}
/** Persist one club field as it is edited. */
function cset(id,k,v){ const c=S.clubs.find(x=>x.id===id); c[k]= typeof v==='string'? v : v; if(v==='true')c[k]=true; if(v==='false')c[k]=false; save(); if(k==='bench')render(); }
/** Swap a club up/down in picker order. */
function bagMove(id,d){ const a=[...S.clubs].sort((x,y)=>x.sort-y.sort); const i=a.findIndex(x=>x.id===id); const j=i+d;
  if(j<0||j>=a.length)return; [a[i].sort,a[j].sort]=[a[j].sort,a[i].sort]; render(); }

/** Saved-course list → tap opens the course page. */
function vCourses(){
  return backBtn()+`<div class="pageTitle"><h1>Courses</h1></div>
  <button class="btn primary wide" onclick="courseEditor(null,false)">＋ New course</button><div style="height:12px"></div>
  <div class="card"><div class="bd tight">${S.courses.map(c=>{const t=c.tees[0]||{};
    return `<div class="listRow" onclick="courseEditor('${c.id}',false)"><div class="main"><div class="ti">${esc(c.name)}</div>
    <div class="sub">${esc(t.name||'')} · ${t.rating||'?'} / ${t.slope||'?'} · ${(t.holes||[]).reduce((s,h)=>s+(h.ydg||0),0)} yds</div></div>
    <button class="btn sm ghost" onclick="event.stopPropagation();if(confirm('Delete course?')){S.courses=S.courses.filter(x=>x.id!=='${c.id}');render()}">✕</button></div>`;}).join('')
    ||'<div style="padding:14px" class="muted">No saved courses yet.</div>'}</div></div>`;
}

/** Every toggle maps 1:1 to an S.settings key; TrackMan column picker;
 *  golfcourseapi key field. Add a setting = one setting() line + a default. */
function vSettings(){
  const st=S.settings;
  const tmChecks=TM_METRICS.map(m=>`<button class="chip sm ${st.tmCols.includes(m[0])?'on':''}" onclick="tmToggle('${m[0]}')">${m[1]}</button>`).join('');
  return backBtn()+`<div class="pageTitle"><h1>Settings</h1></div>
  <div class="card"><div class="bd">
    ${setting('Shape pad: top row = draw','Flip if you picture fades up top. Digits keep the same meaning either way.','shapeTopDraw')}
    ${setting('Show word labels on numpads','Turn off for bare digits once the grids are memorized.','showLabels')}
    ${setting('High-visibility outdoor theme','Pure black on white, bigger targets. For bright sun and gloves.','hiVis')}
    ${setting('Green digit always relative to pin','Even on missed greens the digit reads position vs. the pin; GIR is its own flag.','greenRelPin')}
    <div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
      <div class="grow"><div style="font-weight:700">Default entry style</div><div class="small muted">Shot-by-shot builds heatmaps and yardages; Quick score is 18Birdies-style per-hole entry. Switchable mid-round.</div></div>
      <div class="segs" style="flex:0 0 170px">
        <button ${S.settings.defaultMode!=='basic'?'class="on"':''} onclick="S.settings.defaultMode='advanced';render()">Shots</button>
        <button ${S.settings.defaultMode==='basic'?'class="on"':''} onclick="S.settings.defaultMode='basic';render()">Quick</button></div>
    </div>
    <label class="f">golfcourseapi.com key (optional)</label>
    <input class="f" value="${esc(S.settings.gcApiKey||'')}" placeholder="Paste API key for online course lookup" onchange="S.settings.gcApiKey=this.value.trim();save();render()">
    <div class="small muted" style="margin-top:6px">Free key at golfcourseapi.com — fills rating, slope, address and all 18 holes when you add a course. Everything still works offline without it.</div>
  </div></div>
  <div class="card"><div class="hd"><span class="t">TrackMan columns</span></div><div class="bd"><div class="chips">${tmChecks}</div></div></div>`;
}
/** One labeled ON/OFF row bound to an S.settings boolean. */
function setting(t,sub,key){
  const on=S.settings[key];
  return `<div class="row" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line)">
    <div class="grow"><div style="font-weight:700">${t}</div><div class="small muted">${sub}</div></div>
    <button class="chip ${on?'on':''}" style="min-width:64px" onclick="S.settings['${key}']=!S.settings['${key}'];render()">${on?'ON':'OFF'}</button></div>`;
}
/** Toggle a TrackMan column in/out of practice tables. */
function tmToggle(k){ const a=S.settings.tmCols; const i=a.indexOf(k); if(i>=0)a.splice(i,1); else a.push(k); render(); }

/** Golf-isms with attribution and context, edit/remove inline. */
function vQuips(){
  return backBtn()+`<div class="pageTitle"><h1>Golf-isms</h1></div>
  <button class="btn wide" onclick="quipAdd()">＋ Add one</button><div style="height:14px"></div>
  ${S.quips.map(q=>`<blockquote class="quip">“${esc(q.text)}”
    ${q.by?`<span class="by">— ${esc(q.by)}</span>`:''}
    ${q.context?`<span class="by" style="font-style:italic">${esc(q.context)}</span>`:''}
    <span class="by"><a href="#" onclick="quipEdit('${q.id}');return false" style="color:var(--turf)">edit</a> · <a href="#" onclick="S.quips=S.quips.filter(x=>x.id!=='${q.id}');render();return false" style="color:var(--ink2)">remove</a></span></blockquote>`).join('')}`;
}
/** New golf-ism (delegates to the editor sheet). */
function quipAdd(){ quipEdit(null); }
/** Editor sheet: the line, who said it, in reference to what. */
function quipEdit(id){
  const q = id? S.quips.find(x=>x.id===id) : {text:'',by:'',context:''};
  openSheet(`<div class="sheetHd"><span class="t">${id?'Edit':'New'} golf-ism</span><button class="btn sm ghost" onclick="closeSheet()">Cancel</button></div>
    <label class="f">The line / story</label><textarea class="f" id="qT">${esc(q.text)}</textarea>
    <label class="f">Who said it</label><input class="f" id="qB" value="${esc(q.by||'')}" placeholder="Uncle Jerry, Lee Trevino…">
    <label class="f">In reference to what</label><input class="f" id="qC" value="${esc(q.context||'')}" placeholder="After the triple on 14 at Willis Case, 2024">
    <div style="height:10px"></div>
    <button class="btn primary wide" onclick="quipSave('${id||''}')">Save</button>`);
}
/** Persist a golf-ism. */
function quipSave(id){
  const t=$('#qT').value.trim(); if(!t){toast('Write the line first');return;}
  if(id){ const q=S.quips.find(x=>x.id===id); q.text=t; q.by=$('#qB').value.trim(); q.context=$('#qC').value.trim(); }
  else S.quips.unshift({id:uid(), text:t, by:$('#qB').value.trim(), context:$('#qC').value.trim()});
  closeSheet(); render();
}

