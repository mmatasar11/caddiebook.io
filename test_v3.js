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
function textHas(t){ if(!uiText().includes(t)) throw new Error('missing "'+t+'"'); }

function mkCourse(name){
  w.courseEditor(null,false);
  w.CE.holes.forEach((h,i)=>{ h.par = i%9===3?3 : i%9===7?5 : 4; h.ydg = h.par===3?170:h.par===5?520:400; h.si=i+1; });
  w.document.querySelector('#ceName').value=name;
  w.document.querySelector('#ceTee').value='Blue';
  w.document.querySelector('#ceRating').value='70.5';
  w.document.querySelector('#ceSlope').value='128';
  w.ceSave();
  return w.S.courses.find(c=>c.name===name);
}
function quickHole(score,putts,fp){
  const h=w.curHole(); h.ov=h.ov||{};
  h.ov.score=score; h.ov.putts=putts; if(fp!=null)h.ov.firstPuttFt=fp;
}

setTimeout(()=>{

step('safe area padding present in CSS', ()=>{
  if(!html.includes('safe-area-inset-top')) throw new Error('no top safe area');
  if(!html.includes('safe-area-inset-bottom')) throw new Error('no bottom safe area');
});

step('back 9 round: holes numbered 10-18, quick score mode', ()=>{
  const c=mkCourse('Split National');
  w.startRoundSheet();
  w.document.querySelector('#srCourse').value=c.id; w.srTees();
  // choose Back 9 + basic mode via segments
  const spanBtn=[...w.document.querySelectorAll('#srSpan button')].find(b=>b.dataset.v==='B9');
  w.srSeg(spanBtn);
  const modeBtn=[...w.document.querySelectorAll('#srMode button')].find(b=>b.dataset.v==='basic');
  w.srSeg(modeBtn);
  w.document.querySelector('#srWith').value='Rachel, Jack';
  w.startRound();
  const r=w.activeRound();
  if(r.holes.length!==9) throw new Error('holes '+r.holes.length);
  if(r.holes[0].n!==10||r.holes[8].n!==18) throw new Error('numbering '+r.holes[0].n);
  if(r.span!=='B9') throw new Error('span');
  if(r.mode!=='basic') throw new Error('mode');
  if(r.ctx.partners!=='Rachel, Jack') throw new Error('partners');
});

step('basic mode: quick panel renders and derives score/putts/first-putt/GIR pad', ()=>{
  w.render();
  textHas('Quick'); textHas('First putt');
  quickHole(5,2,20);
  w.bPad(3); // short-right miss => GIR N
  const d=w.deriveHole(w.curHole());
  if(d.score!==5||d.putts!==2) throw new Error('score/putts');
  if(d.firstPuttFt!==20) throw new Error('first putt '+d.firstPuttFt);
  if(d.gir!=='N') throw new Error('gir from pad '+d.gir);
  if(d.udA!==true) throw new Error('scramble attempt');
});

step('drinks counter increments from hole screen', ()=>{
  w.addDrink(); w.addDrink();
  if(w.activeRound().ctx.drinks!==2) throw new Error('drinks '+w.activeRound().ctx.drinks);
});

step('finish back 9: no differential (9 holes), normalized stats', ()=>{
  const r=w.activeRound();
  r.holes.forEach((h,i)=>{ r.curHole=i+1; w.render(); if(w.deriveHole(h).score==null) quickHole(h.par+1,2,15); });
  w.finishRound();
  if(w.scoreDifferential(r,null)!==null) throw new Error('9-hole made a differential');
  const d=w.deriveRound(r);
  console.log('   back9 score', d.score, 'toPar', d.toPar);
});

step('18-hole shot round + per-18 normalization blends 9s correctly', ()=>{
  const c=w.S.courses.find(x=>x.name==='Split National');
  w.startRoundSheet();
  w.document.querySelector('#srCourse').value=c.id; w.srTees(); w.startRound();
  const r=w.activeRound();
  if(r.holes.length!==18) throw new Error('should be full 18');
  r.holes.forEach((h,i)=>{ r.curHole=i+1; const hh=w.curHole(); hh.ov={score:h.par, putts:2, firstPuttFt:12}; });
  w.finishRound();
  w.go('stats');
  // rounds: one 9-hole (all bogeys => +9 over 9) and one 18 (even). par9 back nine: pars sum
  const rs=w.finishedRounds();
  const holes = rs.reduce((s,r)=>s+w.deriveRound(r).played,0);
  const strokes = rs.reduce((s,r)=>s+w.deriveRound(r).score,0);
  const expect18 = (strokes/holes*18).toFixed(1);
  if(!uiText().includes(expect18)) throw new Error('normalized avg '+expect18+' not shown');
  textHas('/18');
});

step('stats filters: course + time chips render and filter', ()=>{
  w.STATF.time='l5'; w.render();
  w.STATF.courseId=w.S.courses[0].id; w.render();
  textHas('Stats');
  w.STATF={time:'all',courseId:''}; w.render();
});

step('hole history line appears on replayed hole', ()=>{
  const c=w.S.courses.find(x=>x.name==='Split National');
  w.startRoundSheet(); w.document.querySelector('#srCourse').value=c.id; w.srTees();
  const spanBtn=[...w.document.querySelectorAll('#srSpan button')].find(b=>b.dataset.v==='B9');
  w.srSeg(spanBtn); w.startRound();
  w.go('play');                 // Play tab lands on the hub by design
  w.PLAYVIEW='hole'; w.render(); // simulate tapping Resume
  // hole 10 played twice before
  textHas("You've played this hole");
  // clean up active round
  w.S.rounds=w.S.rounds.filter(x=>x.id!==w.S.activeRoundId); w.S.activeRoundId=null; w.PLAYVIEW='home'; w.render();
});

step('play hub: hero/resume layout + recent courses chips', ()=>{
  w.go('play');
  textHas('Recent courses'); textHas('Split National');
});

step('course page: location, maps link, rounds here, edit', ()=>{
  w.CID=w.S.courses.find(x=>x.name==='Split National').id;
  w.PLAYVIEW='course'; w.render();
  textHas('Location'); textHas('Rounds here');
  if(!uiHTML().includes('maps')) throw new Error('no maps link');
});

step('bench club excluded from suggestions and picker', ()=>{
  const i7=w.S.clubs.find(c=>c.label==='7i'); i7.bench=true;
  const sug=w.suggestClub(166);
  if(sug===i7.id) throw new Error('benched club suggested');
  if(w.activeClubs().some(c=>c.id===i7.id)) throw new Error('benched in active list');
  i7.bench=false;
});

step('drill library renders with instructions dropdowns', ()=>{
  w.go('practice');
  textHas('Gate drill'); textHas('Wedge ladder');
  if(!w.document.querySelector('details.drill')) throw new Error('no collapsible drills');
});

step('tip with link saves and renders', ()=>{
  w.go('tips');
  w.tipEditor(null);
  w.document.querySelector('#tipT').value='Tempo video';
  w.document.querySelector('#tipB').value='3:1 ratio.';
  w.document.querySelector('#tipU').value='https://youtube.com/watch?v=abc';
  w.document.querySelector('#tipG').value='mental';
  w.tipSave('');
  const t=w.S.tips[0];
  if(t.url!=='https://youtube.com/watch?v=abc') throw new Error('url not saved');
  w.render(); textHas('youtube.com');
});

step('quip with attribution and context', ()=>{
  w.go('more'); w.mgo('quips');
  w.quipEdit(null);
  w.document.querySelector('#qT').value='That tree was 90% air.';
  w.document.querySelector('#qB').value='Jack';
  w.document.querySelector('#qC').value='Punch-out on 6 at City Park';
  w.quipSave('');
  const q=w.S.quips[0];
  if(q.by!=='Jack'||q.context!=='Punch-out on 6 at City Park') throw new Error('fields');
  w.render(); textHas('Punch-out on 6');
});

step('gc api key gates the online lookup button', ()=>{
  w.courseEditor(null,false);
  if(uiHTML().includes('Look up online')) throw new Error('button visible without key');
  w.closeSheet();
  w.S.settings.gcApiKey='test-key';
  w.courseEditor(null,false);
  if(!uiHTML().includes('Look up online')) throw new Error('button missing with key');
  w.closeSheet(); w.S.settings.gcApiKey='';
});

step('basic-mode girPads feed the green heatmap', ()=>{
  w.go('stats');
  w.HM.kind='green'; w.HM.clubId=''; w.HM.span='all'; w.HM.band=''; w.render();
  const t=w.document.body.textContent;
  if(!t.includes('Miss patterns')) throw new Error('no heatmap card');
});

if(errs.length){console.log('WINDOW ERRORS:',errs);process.exitCode=1;}
console.log('V3 TESTS DONE');
},300);
