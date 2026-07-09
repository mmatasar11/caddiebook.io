const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('./index.html','utf8');
const dom = new JSDOM(html,{runScripts:'dangerously',url:'https://localhost/',pretendToBeVisual:true});
const w = dom.window; w.confirm=()=>true;
const errs=[]; w.addEventListener('error',e=>errs.push(e.message));
function uiText(){ const v=w.document.querySelector('#view'), s=w.document.querySelector('#sheet');
  return (v?v.textContent:'')+' '+(s?s.textContent:''); }
function uiHTML(){ const v=w.document.querySelector('#view'), s=w.document.querySelector('#sheet');
  return (v?v.innerHTML:'')+(s?s.innerHTML:''); }
function step(n,f){ try{f();console.log('PASS',n);}catch(e){console.log('FAIL',n,'::',e.message);process.exitCode=1;} }
function textHas(t){ if(!uiText().includes(t)) throw new Error('body missing "'+t+'"'); }

// fixture: verbatim rounds from Mike's real export (18-hole, two 9-hole incl. -1 to par, one with shotEntries)
const fixture = {myData:{activityData:{rounds:[
 {"id":"42461fa1-3ea2-11ee-bbfd-0a202d83cc26","timestamp":1692457710895,"clubId":{"id":"83a12330-86ac-11e4-8c28-020000005b00"},"score":7,"strokes":79,"holeStrokes":[5,4,5,5,4,2,4,5,5,5,4,6,3,5,4,4,3,6],"stats":{"aces":0,"doubleEagleOrBetter":0,"eagles":0,"birdies":2,"pars":9,"bogeys":5,"doubleBogeyOrWorse":2,"fairwayLefts":8,"fairwayMiddles":4,"fairwayRights":2,"fairwayHoleCount":14,"gir":8,"girHoleCount":18,"putts":30},"roundHandicap":"9.4"},
 {"id":"06914d60-a466-11ef-971f-06d15d9e7497","timestamp":1731794357236,"clubId":{"id":"92293af0-86ac-11e4-8c28-020000005b00"},"score":-1,"strokes":34,"holeStrokes":[2,4,3,5,3,4,5,5,3],"stats":{"aces":0,"doubleEagleOrBetter":0,"eagles":1,"birdies":3,"pars":2,"bogeys":2,"doubleBogeyOrWorse":1,"fairwayLefts":1,"fairwayMiddles":4,"fairwayRights":0,"fairwayHoleCount":7,"gir":5,"girHoleCount":9,"putts":13},"roundHandicap":"2.5"},
 {"id":"961377e1-1949-11ef-947c-0a202d83cc26","timestamp":1716498929963,"clubId":{"id":"92814600-86ac-11e4-8c28-020000005b00"},"score":7,"strokes":77,"holeStrokes":[5,5,2,5,5,4,4,3,5,4,4,4,4,6,5,4,3,5],"stats":{"aces":0,"eagles":0,"birdies":2,"pars":7,"bogeys":9,"doubleBogeyOrWorse":0,"fairwayLefts":2,"fairwayMiddles":7,"fairwayRights":4,"fairwayHoleCount":13,"gir":9,"girHoleCount":18,"putts":32},"roundHandicap":"5.5","shotEntries":[{"holeNumber":6,"distanceInYards":308.58}]},
 {"id":"c18f8270-3dc7-11f1-8be3-026cea355d3f","timestamp":1776806356380,"clubId":{"id":"92293af0-86ac-11e4-8c28-020000005b00"},"score":0,"strokes":35,"holeStrokes":[3,5,4,5,2,4,5,3,4],"stats":{"eagles":1,"birdies":1,"pars":4,"bogeys":3,"doubleBogeyOrWorse":0,"fairwayMiddles":6,"fairwayHoleCount":7,"gir":6,"girHoleCount":9,"putts":16},"roundHandicap":"3.3"}
]},clubData:{playedClubs:[
 {"clubId":"83a12330-86ac-11e4-8c28-020000005b00","name":"Prairie Bluff Golf Course"},
 {"clubId":"92293af0-86ac-11e4-8c28-020000005b00","name":"Willis Case Golf Course"},
 {"clubId":"92814600-86ac-11e4-8c28-020000005b00","name":"Indian Tree Golf Club"}
]}}};

setTimeout(()=>{

step('import 4 real rounds, 3 new courses', ()=>{
  const res = w.convert18B(fixture);
  if(res.rounds!==4) throw new Error('rounds '+res.rounds);
  if(res.courses!==3) throw new Error('courses '+res.courses);
  if(res.skipped!==0) throw new Error('skipped '+res.skipped);
});

step('re-import is idempotent', ()=>{
  const res = w.convert18B(fixture);
  if(res.rounds!==0 || res.skipped!==4) throw new Error(JSON.stringify(res));
  if(w.S.courses.length!==3) throw new Error('courses duplicated');
});

step('legacy derivation: 79 at Prairie Bluff = +7, putts 30, GIR 8/18', ()=>{
  const r = w.S.rounds.find(x=>x.srcId==='42461fa1-3ea2-11ee-bbfd-0a202d83cc26');
  const d = w.deriveRound(r);
  if(d.score!==79||d.toPar!==7) throw new Error('score '+d.score+' toPar '+d.toPar);
  if(d.putts!==30) throw new Error('putts');
  if(d.girY!==8||d.girD!==18) throw new Error('gir');
  if(d.firY!==4||d.firD!==14) throw new Error('fir');   // fairwayMiddles = hits
  if(d.f9!==39||d.b9!==40) throw new Error('nine splits '+d.f9+'/'+d.b9);
});

step('the -1 nine at Willis Case derives clean', ()=>{
  const r = w.S.rounds.find(x=>x.srcId==='06914d60-a466-11ef-971f-06d15d9e7497');
  const d = w.deriveRound(r);
  if(d.score!==34||d.toPar!==-1||d.played!==9) throw new Error(JSON.stringify({s:d.score,tp:d.toPar,p:d.played}));
  if(d.eagles!==1||d.birdies!==3) throw new Error('dist counts');
});

step('play dashboard shows recent courses; rounds list shows 18B badge', ()=>{
  w.go('play'); textHas('Willis Case'); textHas('Prairie Bluff');
  w.PLAYVIEW='rounds'; w.render(); textHas('18B');
});

step('legacy round detail renders', ()=>{
  const r = w.S.rounds.find(x=>x.srcId==='961377e1-1949-11ef-947c-0a202d83cc26');
  w.VIEWROUND=r.id; w.PLAYVIEW='roundDetail'; w.render();
  textHas('Imported from 18Birdies'); textHas('Indian Tree'); textHas('Hole strokes');
});

step('stats blends legacy: 4 rounds, avg score, GIR%, no handicap', ()=>{
  w.go('stats');
  textHas('2×18'); textHas('2×9'); textHas('4 imported');
  // 18-hole avg (79+77)/2, 9-hole avg (34+35)/2
  textHas('75.0'); // pooled per-18: 225 strokes / 54 holes * 18
  // dist: eagles 2, birdies 6+... birdies 2+3+2+1=8
  const t=w.document.body.textContent;
  if(!/Bird\s*8/.test(t.replace(/\u00a0/g,' '))) throw new Error('birdie count');
  if(w.currentIndex()!==null) throw new Error('handicap should be null without slope/rating');
});

step('mix in a shot-tracked round: handicap path unaffected, stats still render', ()=>{
  // minimal course + round through the normal pipeline
  w.courseEditor(null,false);
  w.CE.name='Fossil Trace'; w.CE.holes.forEach(h=>{h.ydg=380;h.si=h.n;});
  w.document.querySelector('#ceName').value='Fossil Trace';
  w.document.querySelector('#ceTee').value='Blue';
  w.document.querySelector('#ceRating').value='70.1';
  w.document.querySelector('#ceSlope').value='129';
  w.ceSave();
  w.startRoundSheet();
  w.document.querySelector('#srCourse').value = w.S.courses.find(c=>c.name==='Fossil Trace').id;
  w.srTees(); w.startRound();
  const dr=w.S.clubs.find(c=>c.label==='Dr').id, i7=w.S.clubs.find(c=>c.label==='7i').id, pt=w.S.clubs.find(c=>c.type==='P').id;
  w.activeRound().holes.forEach(h=>{
    w.activeRound().curHole=h.n; w.render();
    w.newShot(); Object.assign(w.SH.s,{lie:'T',clubId:dr,fType:'lat',lat:'C'}); w.SH.distStr='380'; w.saveShot();
    w.newShot(); Object.assign(w.SH.s,{lie:'FW',clubId:i7,fType:'green',pad:2}); w.SH.distStr='150'; w.saveShot();
    w.newShot(); Object.assign(w.SH.s,{lie:'GR',clubId:pt,fType:'putt',pad:2}); w.SH.distStr='20'; w.saveShot();
    w.newShot(); Object.assign(w.SH.s,{lie:'GR',clubId:pt,fType:'putt',pad:5}); w.SH.distStr='3'; w.saveShot();
  });
  w.finishRound();
  w.go('stats');
  textHas('3×18');
  textHas('First-putt distance');
  textHas('shot-tracked rounds only');
});

step('stub course guard: starting a round on an imported course opens the editor', ()=>{
  w.go('play'); w.startRoundSheet();
  const stub=w.S.courses.find(c=>c.name==='Willis Case Golf Course');
  w.document.querySelector('#srCourse').value=stub.id; w.srTees();
  w.startRound();
  if(!w.document.querySelector('#ceName')) throw new Error('editor did not open');
  if(w.document.querySelector('#ceName').value!=='Willis Case Golf Course') throw new Error('name not prefilled');
  w.closeSheet();
});

step('CSV includes imported summary rows, AI text excludes them', ()=>{
  let cap=null; w.download=(n,t)=>{cap=t;};
  w.exportCSV();
  if(!cap.includes('18Birdies import')) throw new Error('no import rows in CSV');
  let txt=null; w.copyText=(t)=>{txt=t;};
  w.exportAllText();
  if(txt.includes('18Birdies')) throw new Error('legacy leaked into AI text');
  if(!txt.includes('Fossil Trace')) throw new Error('shot round missing from AI text');
});

step('JSON backup round-trips imports', ()=>{
  const payload=JSON.stringify({app:'caddiebook',schema:1,data:w.S});
  const before=w.S.rounds.length;
  w.S=Object.assign(w.defaultState(), JSON.parse(payload).data);
  w.render();
  if(w.S.rounds.length!==before) throw new Error('lost rounds');
  if(!w.S.rounds.some(r=>r.legacy)) throw new Error('lost legacy flag');
});

if(errs.length){console.log('WINDOW ERRORS:',errs);process.exitCode=1;}
console.log('IMPORT TESTS DONE');
},300);
