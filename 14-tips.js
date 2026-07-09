/* ============================================================
   TIPS — searchable, taggable swing-thought library
   ============================================================
   One tip may be pinned as "today's thought" and surfaces on
   the hole screen. Tips can carry a link and a photo (photos
   are canvas-compressed to ~100 KB before storing — they share
   the ~5 MB localStorage budget, hence the compression).
   ============================================================ */
let TIPQ='', TIPTAG='';
/** Search + tag-filtered tip list, pinned first. */
function vTips(){
  const tags=[...new Set(S.tips.flatMap(t=>t.tags||[]))].sort();
  const list=S.tips.filter(t=>{
    if(TIPTAG && !(t.tags||[]).includes(TIPTAG)) return false;
    if(TIPQ){ const q=TIPQ.toLowerCase(); return (t.title+' '+t.body+' '+(t.tags||[]).join(' ')).toLowerCase().includes(q);} return true;
  }).sort((a,b)=> (b.pinned?1:0)-(a.pinned?1:0));
  return `<div class="pageTitle"><h1>Tips & thoughts</h1></div>
  <button class="btn primary wide" onclick="tipEditor(null)">＋ Quick capture</button>
  <div style="height:10px"></div>
  <input class="f" placeholder="Search tips…" value="${esc(TIPQ)}" oninput="TIPQ=this.value;render();this.focus();this.setSelectionRange(this.value.length,this.value.length)">
  <div class="chips" style="margin:10px 0">${tags.map(t=>`<button class="chip sm ${TIPTAG===t?'on':''}" onclick="TIPTAG=TIPTAG==='${t}'?'':'${t}';render()">${esc(t)}</button>`).join('')}</div>
  ${list.map(t=>`<div class="tipCard">
    <div class="tt"><span>${t.pinned?'<span class="pinBadge">★ </span>':''}${esc(t.title)}</span>
      <span class="row"><button class="btn sm ghost" onclick="togglePin('${t.id}')">${t.pinned?'Unpin':'Pin'}</button>
      <button class="btn sm ghost" onclick="tipEditor('${t.id}')">Edit</button></span></div>
    ${t.body?`<div class="tb">${esc(t.body)}</div>`:''}
    ${t.photo?`<img src="${t.photo}" alt="">`:''}
    ${t.url?`<div style="margin-top:6px"><a href="${esc(t.url)}" target="_blank" rel="noopener">🔗 ${esc(t.url.replace(/^https?:\/\//,'').slice(0,42))}</a></div>`:''}
    <div>${(t.tags||[]).map(g=>`<span class="tag">${esc(g)}</span>`).join('')}</div>
  </div>`).join('') || '<p class="muted">Nothing matches.</p>'}`;
}
/** Pin as "today\u2019s thought" (only one at a time) — surfaces on the hole screen. */
function togglePin(id){ const t=S.tips.find(x=>x.id===id);
  if(!t.pinned) S.tips.forEach(x=>x.pinned=false); // one "today's thought" at a time
  t.pinned=!t.pinned; render(); }
/** Create/edit sheet: title, body, link, photo, tags with suggestions. */
function tipEditor(id){
  TIPPHOTO=null;
  const t=id? S.tips.find(x=>x.id===id) : {title:'',body:'',tags:[]};
  const sugg=['driver','irons','wedges','chipping','bunker','putting','mental','pre-shot','drill'];
  openSheet(`<div class="sheetHd"><span class="t">${id?'Edit tip':'New tip'}</span><button class="btn sm ghost" onclick="closeSheet()">Cancel</button></div>
    <label class="f">Title</label><input class="f" id="tipT" value="${esc(t.title)}" placeholder="Swing thought…">
    <label class="f">Body</label><textarea class="f" id="tipB">${esc(t.body)}</textarea>
    <label class="f">Link (optional)</label><input class="f" id="tipU" value="${esc(t.url||'')}" placeholder="https://youtube.com/…">
    <label class="f">Photo (optional)</label>
    <div class="row"><button class="btn sm" onclick="$('#tipP').click()">${t.photo?'Replace photo':'＋ Attach photo'}</button>
      ${t.photo?`<button class="btn sm ghost" onclick="TIPPHOTO='';this.previousElementSibling.textContent='＋ Attach photo';toast('Photo will be removed on save')">Remove</button>`:''}</div>
    <input type="file" id="tipP" accept="image/*" style="display:none" onchange="tipPhoto(this)">
    <label class="f">Tags (comma separated)</label><input class="f" id="tipG" value="${esc((t.tags||[]).join(', '))}">
    <div class="chips" style="margin-top:8px">${sugg.map(g=>`<button class="chip sm" onclick="tipTagAdd('${g}')">${g}</button>`).join('')}</div>
    <div style="height:12px"></div>
    <button class="btn primary wide" onclick="tipSave('${id||''}')">Save</button>
    ${id?`<div style="height:8px"></div><button class="btn wide danger sm" onclick="S.tips=S.tips.filter(x=>x.id!=='${id}');closeSheet();render()">Delete</button>`:''}`);
}
/** Append a suggested tag chip into the tags input. */
function tipTagAdd(g){ const el=$('#tipG'); const cur=el.value.split(',').map(s=>s.trim()).filter(Boolean);
  if(!cur.includes(g))cur.push(g); el.value=cur.join(', '); }
let TIPPHOTO=null;   // pending compressed photo for the open editor; ''=remove, null=unchanged
/** Compress a chosen image on-device (≤900px JPEG ~100 KB) before storing. */
function tipPhoto(inp){
  const f=inp.files[0]; if(!f) return;
  const img=new Image(); const rd=new FileReader();
  rd.onload=()=>{ img.onload=()=>{
      const max=900, sc=Math.min(1, max/Math.max(img.width,img.height));
      const cv=document.createElement('canvas'); cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc);
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      TIPPHOTO=cv.toDataURL('image/jpeg',0.72);
      toast('Photo attached ('+Math.round(TIPPHOTO.length/1024)+' KB, stored on-device)');
    }; img.src=rd.result; };
  rd.readAsDataURL(f);
}
/** Validate + persist the tip (photo applied/removed via TIPPHOTO). */
function tipSave(id){
  const title=$('#tipT').value.trim(); if(!title){toast('Give it a title');return;}
  const tags=$('#tipG').value.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  const url=$('#tipU').value.trim();
  if(id){ const t=S.tips.find(x=>x.id===id); t.title=title;t.body=$('#tipB').value;t.tags=tags;t.url=url;
    if(TIPPHOTO!==null) t.photo = TIPPHOTO||undefined; }
  else S.tips.unshift({id:uid(),title,body:$('#tipB').value,tags,url,photo:TIPPHOTO||undefined,pinned:false,created:todayISO()});
  TIPPHOTO=null; closeSheet(); render();
}

