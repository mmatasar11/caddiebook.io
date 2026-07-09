'use strict';
/* ============================================================
   CADDIE BOOK — personal golf scoring, data & practice
   ============================================================
   Single-user, offline-first. One HTML file at runtime; this
   modular source tree is assembled by build.js (see the
   manifest there for load order — it matters, later modules
   call things defined in earlier ones).

   MODULE MAP
   ----------
   01-core        storage primitives + tiny utilities (this file)
   02-store       the state object S: schema, seeds, load/save
   03-notation    the 1-9 notation system constants
   04-engine      per-hole and per-round derivation
   05-handicap    WHS handicap math + stat filters
   theme          THEME override object (restyle in one place)
   components     ui.* reusable HTML builders
   06-router      bottom nav registry + render()
   07-play-home   Play hub, history, course pages
   08-course-editor  manual grid, paste parser, online lookup
   09-hole        the on-course hole screen (Shots + Quick modes)
   10-shot-sheet  the tap-first shot entry sheet
   11-round-views overview grid, finish, past-round detail
   12-stats       stats dashboard, heatmaps, yardages, insights
   13-practice    drill library + sessions + TrackMan logging
   14-tips        tips/swing-thought library
   15-more        bag, courses list, settings, golf-isms
   16-data        JSON backup, CSV, AI text, 18Birdies import
   17-init        sheet/toast plumbing, boot, console bridge
   ============================================================ */

/* ---------- persistence primitives ----------
   Everything lives under ONE localStorage key as a JSON blob.
   If localStorage is unavailable (private mode edge cases) we
   fall back to memory and render() shows a warning banner. */
const DBKEY = 'caddiebook_v1';
let MEMSTORE = null;       // in-memory fallback when localStorage fails
let STORAGE_OK = true;     // flips false on the first storage error

/** Read the raw JSON blob (or null on first run). */
function storeGet(){
  try { return localStorage.getItem(DBKEY); }
  catch(e){ STORAGE_OK = false; return MEMSTORE; }
}
/** Write the raw JSON blob; always mirrors to memory first so a
 *  storage failure never loses the in-session state. */
function storeSet(v){
  MEMSTORE = v;
  try { localStorage.setItem(DBKEY, v); }
  catch(e){ STORAGE_OK = false; }
}

/* ---------- tiny utilities used everywhere ---------- */
/** Unique-enough id: time base36 + 6 random chars. */
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
/** HTML-escape user text before interpolation into templates. */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/** querySelector shorthand. */
const $ = s => document.querySelector(s);
/** Local date as YYYY-MM-DD (round dates, backups). */
function todayISO(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
/** YYYY-MM-DD → M/D/YY for display. */
function fmtDate(iso){ if(!iso) return ''; const [y,m,d]=iso.split('-'); return `${m}/${d}/${String(y).slice(2)}`; }

/* ---------- small stats helpers ---------- */
/** Median of a numeric array (null if empty). */
function median(a){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=Math.floor(s.length/2); return s.length%2? s[m] : (s[m-1]+s[m])/2; }
/** Linear-interpolated quantile, q in [0,1]. */
function quantile(a,q){ if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const p=(s.length-1)*q; const b=Math.floor(p); return s[b] + (s[Math.min(b+1,s.length-1)]-s[b])*(p-b); }
/** Arithmetic mean (null if empty). */
function mean(a){ return a.length? a.reduce((x,y)=>x+y,0)/a.length : null; }
/** Sample standard deviation (null if n<2). */
function sd(a){ if(a.length<2) return null; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1)); }
/** Format helpers: one decimal / whole number / percentage, all '–' safe. */
function r1(x){ return x==null? '–' : (Math.round(x*10)/10).toFixed(1); }
function r0(x){ return x==null? '–' : String(Math.round(x)); }
function pct(n,d){ return d? Math.round(100*n/d)+'%' : '–'; }
