/* ============================================================
   PLUMBING + BOOT
   ============================================================
   The bottom sheet (#sheetWrap/#sheet), toast notifications,
   fast-resume boot (reopen mid-round → straight back to the
   hole), aggressive save-on-hide, and a console bridge that
   exposes top-level state (S, HM, …) on window for debugging
   from Safari's Web Inspector.
   ============================================================ */
function openSheet(html){ $('#sheet').innerHTML=html; $('#sheetWrap').classList.add('open'); }
/** Hide the sheet, drop any shot draft, save. */
function closeSheet(){ $('#sheetWrap').classList.remove('open'); SH=null; save(); }
let toastT=null;
/** Transient pill notification above the tab bar. */
function toast(msg){
  let el=$('#toast');
  if(!el){ el=document.createElement('div'); el.id='toast';
    el.style.cssText='position:fixed;left:50%;transform:translateX(-50%);bottom:96px;background:var(--ink);color:#fff;padding:10px 18px;border-radius:999px;font-weight:700;font-size:14px;z-index:99;max-width:88%;text-align:center';
    document.body.appendChild(el); }
  el.textContent=msg; el.style.display='block';
  clearTimeout(toastT); toastT=setTimeout(()=>el.style.display='none',2600);
}
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme();                                   // THEME overrides from theme.js
  $('#sheetWrap').addEventListener('click',e=>{ if(e.target.id==='sheetWrap') closeSheet(); });
  if(S.activeRoundId && activeRound()) { TAB='play'; PLAYVIEW='home'; }  // land on the round summary; Resume is one tap
  render();
});
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) save(); });

/* debug/console bridge: expose top-level lexical state on window
   (lets you inspect S from Safari's console; harmless otherwise) */
try{
  Object.defineProperties(window,{
    S:{get:()=>S,set:v=>{S=v}}, CE:{get:()=>CE,set:v=>{CE=v}},
    HM:{get:()=>HM,set:v=>{HM=v}}, SH:{get:()=>SH,set:v=>{SH=v}},
    TIPQ:{get:()=>TIPQ,set:v=>{TIPQ=v}}, TIPTAG:{get:()=>TIPTAG,set:v=>{TIPTAG=v}},
    PLAYVIEW:{get:()=>PLAYVIEW,set:v=>{PLAYVIEW=v}}, VIEWROUND:{get:()=>VIEWROUND,set:v=>{VIEWROUND=v}},
    PRACVIEW:{get:()=>PRACVIEW,set:v=>{PRACVIEW=v}}, MOREVIEW:{get:()=>MOREVIEW,set:v=>{MOREVIEW=v}},
    TAB:{get:()=>TAB,set:v=>{TAB=v}}, CID:{get:()=>typeof CID!=='undefined'?CID:null,set:v=>{try{CID=v}catch(e){}}}, STATF:{get:()=>STATF,set:v=>{STATF=v}}
  });
}catch(e){}


