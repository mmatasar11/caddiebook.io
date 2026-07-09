/* ============================================================
   ROUTER + TAB REGISTRY
   ============================================================
   Navigation model:
     TAB       which bottom-nav tab is active
     PLAYVIEW  sub-screen inside the Play tab
               ('home' hub | 'hole' | 'overview' | 'roundDetail'
                | 'rounds' history list | 'course' course page)
     MOREVIEW  sub-screen inside the More tab (see more module)

   render() is the single draw call: it paints the nav from the
   TABS registry and the body from the active tab's view fn,
   then autosaves. Every user action ends by calling render().

   EXTENSION POINT — adding a whole new tab is one entry here:
     TABS.push({id:'goals', ic:'🎯', label:'Goals', view: vGoals});
   …then define vGoals() returning an HTML string in a new module
   and add that module to build.js's manifest. Nothing else.
   ============================================================ */
let TAB='play';
let PLAYVIEW='home';
let VIEWROUND=null;   // round id being viewed in roundDetail/overview
let CID=null;         // course id for the course page

/** Bottom-nav registry. Order here = order on screen. */
const TABS = [
  {id:'play',     ic:'⛳', label:'Play',     view: ()=>vPlay()},
  {id:'stats',    ic:'📊', label:'Stats',    view: ()=>vStats()},
  {id:'practice', ic:'🎯', label:'Practice', view: ()=>vPractice()},
  {id:'tips',     ic:'💡', label:'Tips',     view: ()=>vTips()},
  {id:'more',     ic:'⚙︎', label:'More',    view: ()=>vMore()},
];

/** Switch tabs. Play always lands on the hub (the "pick up where
 *  you left off" dashboard) — resuming a hole is an explicit tap. */
function go(tab){ TAB=tab; if(tab==='play') PLAYVIEW='home'; render(); window.scrollTo(0,0); }

/** The one and only draw call. Nav from registry, body from the
 *  active tab, storage-warning banner when localStorage is dead,
 *  then persist. Views are pure string builders — no side effects. */
function render(){
  document.body.classList.toggle('hivis', !!S.settings.hiVis);
  $('#nav').innerHTML = TABS.map(t=>
    `<button class="${TAB===t.id?'on':''}" onclick="go('${t.id}')"><span class="ic">${t.ic}</span>${t.label}</button>`).join('');
  const tab = TABS.find(t=>t.id===TAB) || TABS[0];
  $('#view').innerHTML =
    (STORAGE_OK? '' : `<div class="banner">⚠️ Device storage is unavailable in this browser. Data will only last this session. Export a JSON backup before closing.</div>`)
    + tab.view();
  save();
}

/* ============================================================
   PLAY TAB — sub-router
   ============================================================ */
/** Dispatch inside the Play tab based on PLAYVIEW. */
function vPlay(){
  if(PLAYVIEW==='hole' && S.activeRoundId) return vHole();
  if(PLAYVIEW==='overview'){ const r=activeRound()||S.rounds.find(x=>x.id===VIEWROUND); if(r) return vOverview(r); }
  if(PLAYVIEW==='roundDetail' && VIEWROUND) return vRoundDetail(VIEWROUND);
  if(PLAYVIEW==='rounds') return vRoundsList();
  if(PLAYVIEW==='course' && CID) return vCoursePage();
  return vRoundsHome();
}
/** The in-progress round, or undefined when none is active. */
function activeRound(){ return S.rounds.find(r=>r.id===S.activeRoundId); }
