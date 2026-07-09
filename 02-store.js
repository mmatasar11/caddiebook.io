/* ============================================================
   STATE — the single source of truth (schema + seeds)
   ============================================================
   The whole app is one plain object `S`, autosaved as JSON on
   every render(). It intentionally mirrors a relational schema
   so the JSON backup maps table-for-table into MySQL.

   SCHEMA (JSON path → relational table)
   -------------------------------------
   S.settings                 app preferences (see defaultState)
   S.clubs[]                  club:   {id,label,type,stock,sort,brand,model,bench}
                              type: D driver | W wood/hybrid | I iron | Wg wedge | P putter
                              bench:true hides from pickers, keeps history
   S.courses[]                course: {id,name,info:{address,city,state},tees[]}
   S.courses[].tees[]         tee:    {id,name,rating,slope,holes[]}
   ...tees[].holes[]          hole_template: {n,par,ydg,si}
   S.rounds[]                 round:  {id,courseId,teeId,date,weather,notes,
                                       finished,curHole,span:'18'|'F9'|'B9',
                                       mode:'advanced'|'basic',
                                       ctx:{partners,drinks,vibe}, holes[]}
       legacy import rounds instead carry: {legacy:true,source,srcId,agg{…}}
   S.rounds[].holes[]         hole_play: {n,par,ydg,si,windD,windS,pen,shots[],ov{}}
                              ov{} = per-hole overrides AND the Quick-mode store:
                                     score, putts, fir, gir, girPad, firstPuttFt,
                                     sand, pen, udA, udM
   ...holes[].shots[]         shot:  {id,clubId,lie,dist,unit:'y'|'f',
                                      fType:'lat'|'green'|'putt',lat,pad,
                                      shape,effort,frac,strike,note}
   S.tips[]                   tip:   {id,title,body,tags[],url,photo,pinned,created}
   S.quips[]                  golfism: {id,text,by,context}
   S.practice[]               practice_session: {id,date,location,focus,notes,
                                                 blocks[],putting[]}
   ...blocks[]                {id,clubId,frac,shots:[{carry,total,bs,cs,sm,la,
                                spin,axis,apex,side,sideT,aa,path,face}]}
   ...putting[]               {dist,att,made}

   MIGRATION RULE: loadState() merges saved settings over the
   defaults and backfills any missing top-level arrays, so adding
   a new field here is always safe for existing users — give it a
   default and old saves pick it up on next load.

   EXTENSION POINT: new persistent feature? Add its array/object
   to defaultState(), list it in loadState()'s backfill loop, and
   it is automatically saved, restored, and included in backups.
   ============================================================ */
/** Seed bag matching the player's actual set. Edited freely in More → My bag. */
function defaultBag(){
  const rows = [
    ['Dr','D',270],['3w','W',240],['5i','I',190],['6i','I',178],['7i','I',166],
    ['8i','I',154],['9i','I',142],['PW','Wg',130],['52°','Wg',115],['56°','Wg',100],['60°','Wg',82],['Pt','P',0]
  ];
  return rows.map((r,i)=>({id:uid()+i, label:r[0], type:r[1], stock:r[2], sort:i, brand:'', model:'', bench:false}));
}
/** A few starter tips so the Tips tab demonstrates itself. */
function seedTips(){
  return [
    {id:uid()+'t1', title:'Wedge clock system', body:'½ = hands to 9 o’clock, ¾ = 10:30, full = normal. Same tempo for all three. Log carry for each and trust the matrix, not the feel of the day.', tags:['wedges','pre-shot'], pinned:true, created:todayISO()},
    {id:uid()+'t2', title:'Lag putt: look at the hole', body:'On putts over 25 ft, take two rehearsal strokes while looking at the hole, then match that energy. Goal is a 3-ft circle, not the cup.', tags:['putting'], pinned:false, created:todayISO()},
    {id:uid()+'t3', title:'Bunker: hit the sand, not the ball', body:'Pick a spot 2 inches behind the ball and splash the sand out. Speed is your friend. Finish the swing.', tags:['bunker'], pinned:false, created:todayISO()}
  ];
}
/** Starter golf-isms; fully editable in More → Golf-isms. */
function seedQuips(){
  return [
    {id:uid()+'q1', text:'Drive for show, putt for dough.', by:'Old saying'},
    {id:uid()+'q2', text:'The shortest distance between any two points on a golf course is a straight line that passes directly through the center of a very large tree.', by:'Old saying'},
    {id:uid()+'q3', text:'A three-putt from 24 feet is one bad read and one lie you told yourself.', by:''},
    {id:uid()+'q4', text:'Nobody has ever regretted taking one more club.', by:''}
  ];
}
/** Everything a fresh install starts with. THE schema reference. */
function defaultState(){
  return {
    ver:1,
    settings:{
      shapeTopDraw:true,      // shape pad orientation: top row = draw family
      showLabels:true,        // words on numpads vs bare digits
      hiVis:false,            // outdoor high-visibility theme
      greenRelPin:true,       // green pad digit is always relative to pin, GIR separate
      defaultMode:'advanced',  // 'basic' (score+putts+flags per hole) or 'advanced' (shot-by-shot)
      gcApiKey:'',             // optional golfcourseapi.com key for online course lookup
      tmCols:['carry','total','bs','cs','sm','la','spin']
    },
    clubs: defaultBag(),
    courses: [],              // {id,name,tees:[{id,name,rating,slope,holes:[{n,par,ydg,si}]}]}
    rounds: [],               // see newRound()
    activeRoundId: null,
    tips: seedTips(),
    quips: seedQuips(),
    practice: []              // sessions
  };
}
/** Parse the saved blob, merge over defaults (see MIGRATION RULE above). */
function loadState(){
  const raw = storeGet();
  if(!raw) return defaultState();
  try{
    const s = JSON.parse(raw);
    const d = defaultState();
    s.settings = Object.assign(d.settings, s.settings||{});
    for(const k of ['clubs','courses','rounds','tips','quips','practice']) if(!Array.isArray(s[k])) s[k]=d[k];
    return s;
  }catch(e){ return defaultState(); }
}
let S = loadState();
/** Persist S. Called by render() after every interaction — autosave is structural. */
function save(){ storeSet(JSON.stringify(S)); }

