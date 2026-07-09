/* ============================================================
   NOTATION SYSTEM — the conceptual core
   ============================================================
   One rule governs every 3×3 pad: 5 is pure, the ring is the
   miss, horizontal = left/right, vertical = more/less.
   Digits are stored raw (1-9); which pad they came from is
   carried separately (shot.fType / shot.shape), so a green-4,
   putt-4 and shape-4 can never be confused in analysis.

   EXTENSION POINT: a new lie code, strike tag, wind direction
   or TrackMan metric is one row in the arrays below — pickers,
   exports and stats all read from here.
   ============================================================ */
const LIES = [['T','Tee'],['FW','Fairway'],['RF','Rough'],['FR','Fringe'],['SD','Sand'],['GR','Green'],['RC','Recovery'],['HZ','Drop']];
const LIE_NAME = Object.fromEntries(LIES);
const LATS = ['LL','L','C','R','RR'];
const LAT_NAME = {LL:'Far left',L:'Left',C:'On line',R:'Right',RR:'Far right'};

const PAD_LABELS = {
  green:{7:'Long-L',8:'Long',9:'Long-R',4:'Left',5:'PIN HIGH',6:'Right',1:'Short-L',2:'Short',3:'Short-R'},
  putt: {7:'Long-L',8:'Long',9:'Long-R',4:'Left',5:'MADE',6:'Right',1:'Short-L',2:'Short',3:'Short-R'},
  shape:{7:'Pull-draw',8:'Draw',9:'Push-draw',4:'Pull',5:'STRAIGHT',6:'Push',1:'Pull-fade',2:'Fade',3:'Push-slice'}
};
const PAD_AXES = {
  green:['LONG ↑','SHORT ↓'], putt:['LONG ↑','SHORT ↓'], shape:['DRAW ↑','FADE ↓']
};
// display order top→bottom for the standard orientation (top = long / draw)
/** Row order for rendering a pad top→bottom; the shape pad can flip via settings
 *  (display only — digit meaning never changes). */
function padRows(kind){
  let rows = [[7,8,9],[4,5,6],[1,2,3]];
  if(kind==='shape' && !S.settings.shapeTopDraw) rows = [[1,2,3],[4,5,6],[7,8,9]];
  return rows;
}

const STRIKES = [['t','Thin'],['h','Heavy'],['to','Toe'],['hl','Heel']];
const WINDS = [['H','Into'],['D','Down'],['L2R','L→R'],['R2L','R→L']];
const FRACS = ['½','¾'];

const TM_METRICS = [
  ['carry','Carry','yd'],['total','Total','yd'],['bs','Ball spd','mph'],['cs','Club spd','mph'],
  ['sm','Smash',''],['la','Launch','°'],['spin','Spin','rpm'],['axis','Spin axis','°'],
  ['apex','Apex','ft'],['side','Side','yd'],['sideT','Side total','yd'],['aa','Attack','°'],
  ['path','Path','°'],['face','Face','°']
];

/* ---------------- club helpers ---------------- */
/** Look up a club object by id (undefined if deleted). */
function club(id){ return S.clubs.find(c=>c.id===id); }
/** Display label for a club id; '?' survives deleted clubs in old rounds. */
function clubLabel(id){ const c=club(id); return c? c.label : '?'; }
/** The active putter (falls back to a benched one so putts never lose a club). */
function putterId(){ const c=S.clubs.find(c=>c.type==='P'&&!c.bench)||S.clubs.find(c=>c.type==='P'); return c? c.id : null; }
/** Clubs shown in pickers: benched ones are hidden but keep their history. */
function activeClubs(){ return [...S.clubs].filter(c=>!c.bench).sort((a,b)=>a.sort-b.sort); }
/** Closest active club to a target distance — powers the highlighted suggestion. */
function suggestClub(dist){
  if(!dist) return null;
  let best=null, bd=1e9;
  for(const c of activeClubs()){ if(c.type==='P') continue;
    const d=Math.abs((c.stock||0)-dist); if(d<bd){bd=d;best=c;} }
  return best? best.id : null;
}
