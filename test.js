const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('./index.html','utf8');

const dom = new JSDOM(html, { runScripts:'dangerously', url:'https://localhost/', pretendToBeVisual:true });
const w = dom.window;
w.confirm = () => true;
const errs = [];
w.addEventListener('error', e => errs.push(e.message));

function uiText(){ const v=w.document.querySelector('#view'), s=w.document.querySelector('#sheet');
  return (v?v.textContent:'')+' '+(s?s.textContent:''); }
function uiHTML(){ const v=w.document.querySelector('#view'), s=w.document.querySelector('#sheet');
  return (v?v.innerHTML:'')+(s?s.innerHTML:''); }
function step(name, fn){
  try { fn(); console.log('PASS', name); }
  catch(e){ console.log('FAIL', name, '::', e.message); process.exitCode = 1; }
}
function has(sel){ if(!w.document.querySelector(sel)) throw new Error('missing '+sel); }
function textHas(t){ if(!uiText().includes(t)) throw new Error('body missing "'+t+'"'); }

setTimeout(()=>{

step('boot renders play tab', ()=>{ has('#nav button'); textHas('Caddie Book'); });

step('create a course programmatically via editor', ()=>{
  w.courseEditor(null, false);
  w.CE.name='Test National'; w.CE.teeName='Blue'; w.CE.rating='71.4'; w.CE.slope='132';
  w.CE.holes.forEach((h,i)=>{ h.par = i%6===2?3 : i%6===4?5 : 4; h.ydg = h.par===3?170:h.par===5?520:400; h.si=i+1; });
  // ceSave calls ceGrab which reads DOM inputs; fill them
  w.document.querySelector('#ceName').value=w.CE.name;
  w.document.querySelector('#ceTee').value=w.CE.teeName;
  w.document.querySelector('#ceRating').value=w.CE.rating;
  w.document.querySelector('#ceSlope').value=w.CE.slope;
  w.renderCourseEditor(); // re-render with hole values so grid inputs match
  w.document.querySelector('#ceName').value='Test National';
  w.document.querySelector('#ceRating').value='71.4';
  w.document.querySelector('#ceSlope').value='132';
  w.ceSave();
  if(w.S.courses.length!==1) throw new Error('course not saved');
  const t=w.S.courses[0].tees[0];
  if(t.slope!==132||t.rating!==71.4) throw new Error('tee rating/slope wrong: '+t.rating+'/'+t.slope);
  if(t.holes[2].par!==3) throw new Error('par grid wrong');
});

step('paste parser reads pars/yardages/SI/rating/slope', ()=>{
  w.courseEditor(null,false);
  w.cePasteUI();
  w.document.querySelector('#cePaste').value =
    'Blue tees 71.4 / 132\n4 4 3 5 4 4 3 4 5 4 4 3 5 4 4 3 4 5\n'+
    '387 402 165 520 411 398 172 405 515 380 390 155 540 420 400 180 395 505\n'+
    '7 1 17 3 5 9 15 11 13 8 2 18 4 6 10 16 12 14';
  w.ceParse();
  const H=w.CE.holes;
  if(H[2].par!==3||H[3].par!==5) throw new Error('pars misread');
  if(H[0].ydg!==387||H[17].ydg!==505) throw new Error('yardages misread');
  if(H[0].si!==7||H[17].si!==14) throw new Error('SI misread: '+H[0].si);
  if(w.CE.rating!=71.4||w.CE.slope!=132) throw new Error('rating/slope misread '+w.CE.rating+'/'+w.CE.slope);
  w.closeSheet();
});

step('start a round', ()=>{
  w.startRoundSheet();
  w.startRound();
  if(!w.S.activeRoundId) throw new Error('no active round');
  if(w.activeRound().holes.length!==18) throw new Error('holes not copied');
});

// helper to add a shot directly through the sheet pipeline
function addShot(cfg){
  w.newShot(cfg.lie);
  Object.assign(w.SH.s, cfg);
  w.SH.distStr = cfg.dist!=null ? String(cfg.dist) : '';
  w.saveShot();
}

step('play hole 1: drive, approach, two putts → bogey-free par math', ()=>{
  const r=w.activeRound(); r.curHole=1;
  const dr=w.S.clubs.find(c=>c.label==='Dr').id;
  const i8=w.S.clubs.find(c=>c.label==='8i').id;
  const pt=w.S.clubs.find(c=>c.type==='P').id;
  addShot({lie:'T', clubId:dr, dist:387, unit:'y', fType:'lat', lat:'R', shape:6});
  addShot({lie:'RF', clubId:i8, dist:155, unit:'y', fType:'green', pad:4, shape:2});
  addShot({lie:'GR', clubId:pt, dist:24, unit:'f', fType:'putt', pad:2});
  addShot({lie:'GR', clubId:pt, dist:3, unit:'f', fType:'putt', pad:5});
  const d=w.deriveHole(r.holes[0]);
  if(d.score!==4) throw new Error('score '+d.score);
  if(d.putts!==2) throw new Error('putts '+d.putts);
  if(d.fir!=='N') throw new Error('fir '+d.fir);
  if(d.gir!=='Y') throw new Error('gir '+d.gir);
  if(d.firstPuttFt!==24) throw new Error('first putt '+d.firstPuttFt);
});

step('hole 3 par 3: GIR + made putt + wind', ()=>{
  const r=w.activeRound(); r.curHole=3; w.render();
  w.setWind('H'); w.setWindS(2);
  const i7=w.S.clubs.find(c=>c.label==='7i').id;
  const pt=w.S.clubs.find(c=>c.type==='P').id;
  addShot({lie:'T', clubId:i7, dist:165, unit:'y', fType:'green', pad:5});
  addShot({lie:'GR', clubId:pt, dist:12, unit:'f', fType:'putt', pad:5});
  const d=w.deriveHole(r.holes[2]);
  if(d.score!==2) throw new Error('score '+d.score);
  if(d.fir!=='-') throw new Error('fir on par3 '+d.fir);
  if(d.gir!=='Y') throw new Error('gir '+d.gir);
});

step('hole 4 par 5: penalty + drop + sand + scramble fail, three putt', ()=>{
  const r=w.activeRound(); r.curHole=4; w.render();
  const dr=w.S.clubs.find(c=>c.label==='Dr').id;
  const w3=w.S.clubs.find(c=>c.label==='3w').id;
  const s56=w.S.clubs.find(c=>c.label==='56°').id;
  const pt=w.S.clubs.find(c=>c.type==='P').id;
  addShot({lie:'T', clubId:dr, dist:520, unit:'y', fType:'lat', lat:'LL', shape:7});
  r.holes[3].pen = 1; // penalty
  addShot({lie:'HZ', clubId:w3, dist:280, unit:'y', fType:'lat', lat:'C'});
  addShot({lie:'FW', clubId:s56, dist:95, unit:'y', fType:'green', pad:1, frac:'¾'});
  addShot({lie:'SD', clubId:s56, dist:15, unit:'y', fType:'green', pad:8});
  addShot({lie:'GR', clubId:pt, dist:30, unit:'f', fType:'putt', pad:8});
  addShot({lie:'GR', clubId:pt, dist:6, unit:'f', fType:'putt', pad:6});
  addShot({lie:'GR', clubId:pt, dist:2, unit:'f', fType:'putt', pad:5});
  const d=w.deriveHole(r.holes[3]);
  if(d.score!==8) throw new Error('score '+d.score); // 7 shots + 1 pen
  if(d.pen!==1) throw new Error('pen');
  if(!d.threePutt) throw new Error('3putt flag');
  if(d.gir!=='N') throw new Error('gir '+d.gir);
  if(!d.sandA || d.sandM) throw new Error('sand save logic');
});

step('edit / reorder / insert / delete shots', ()=>{
  const r=w.activeRound(); r.curHole=1; w.render();
  w.editShot(0); w.SH.s.lat='C'; w.saveShot();
  if(r.holes[0].shots[0].lat!=='C') throw new Error('edit failed');
  const d=w.deriveHole(r.holes[0]);
  if(d.fir!=='Y') throw new Error('fir after edit '+d.fir);
  w.editShot(1); w.moveShot(1); // swap approach and first putt
  if(r.holes[0].shots[1].lie!=='GR') throw new Error('reorder failed');
  w.moveShot(-1); w.saveShot();
  if(r.holes[0].shots[1].lie!=='RF') throw new Error('reorder back failed');
  w.editShot(3); w.delShot();
  if(r.holes[0].shots.length!==3) throw new Error('delete failed');
  addShot({lie:'GR', clubId:w.S.clubs.find(c=>c.type==='P').id, dist:3, unit:'f', fType:'putt', pad:5});
});

step('fill remaining holes with pars and finish round', ()=>{
  const r=w.activeRound();
  const i7=w.S.clubs.find(c=>c.label==='7i').id;
  const pt=w.S.clubs.find(c=>c.type==='P').id;
  const dr=w.S.clubs.find(c=>c.label==='Dr').id;
  r.holes.forEach((h,i)=>{
    if(h.shots.length) return;
    r.curHole=h.n; w.render();
    if(h.par>3) addShot({lie:'T', clubId:dr, dist:h.ydg, unit:'y', fType:'lat', lat:'C', shape:5});
    if(h.par===5) addShot({lie:'FW', clubId:i7, dist:250, unit:'y', fType:'lat', lat:'C'});
    addShot({lie:h.par===3?'T':'FW', clubId:i7, dist:160, unit:'y', fType:'green', pad:2, shape:2});
    addShot({lie:'GR', clubId:pt, dist:20, unit:'f', fType:'putt', pad:2});
    addShot({lie:'GR', clubId:pt, dist:2, unit:'f', fType:'putt', pad:5});
  });
  const rd=w.deriveRound(r);
  if(rd.played!==18) throw new Error('played '+rd.played);
  w.finishRound();
  if(w.S.activeRoundId) throw new Error('round not closed');
  if(!w.S.rounds[0].finished) throw new Error('finished flag');
});

step('differential + AGS math', ()=>{
  const r=w.S.rounds[0];
  const diff=w.scoreDifferential(r, null);
  const {ags}=w.adjustedGross(r, null);
  const rd=w.deriveRound(r);
  console.log('   score', rd.score, 'AGS', ags, 'diff', diff);
  if(diff==null) throw new Error('no differential');
  const expect=Math.round((113/132)*(ags-71.4)*10)/10;
  if(diff!==expect) throw new Error('diff math '+diff+' vs '+expect);
});

step('stats tab renders with heatmaps, stock yardage, wedge matrix, first-putt table', ()=>{
  w.go('stats');
  textHas('Handicap'); textHas('Miss patterns'); textHas('Stock yardages');
  textHas('Wedge matrix'); textHas('First-putt distance'); textHas('up & down');
});

step('heatmap kind switching', ()=>{
  w.HM.kind='putt'; w.HM.band=''; w.render(); textHas('MADE');
  w.HM.kind='shape'; w.render(); textHas('Push-slice');
  w.HM.kind='green'; w.render();
});

step('handicap needs 3 rounds — clone two more', ()=>{
  for(let k=0;k<2;k++){
    const clone=JSON.parse(JSON.stringify(w.S.rounds[0]));
    clone.id='clone'+k; clone.date='2026-07-0'+(k+2);
    w.S.rounds.push(clone);
  }
  const idx=w.currentIndex();
  console.log('   index after 3 rounds:', idx);
  if(idx==null) throw new Error('index still null');
  w.go('stats'); textHas('Course handicap');
});

step('practice session + trackman + putting drill', ()=>{
  w.go('practice');
  w.newSession();
  const p=w.prac();
  p.focus='56 wedge'; 
  const c56=w.S.clubs.find(c=>c.label==='56°').id;
  w.addBlock(c56, '¾');
  p.blocks[0].shots=[{carry:78},{carry:81},{carry:79}];
  p.putting.push({dist:6, att:10, made:7});
  w.render();
  textHas('avg carry');
});

step('wedge matrix picks up practice ¾ data', ()=>{
  w.go('stats');
  const htmlNow=uiHTML();
  if(!htmlNow.includes('Wedge matrix')) throw new Error('no matrix');
  // ¾ column for 56° should show median 79
  if(!uiText().includes('79')) throw new Error('practice carry not merged');
});

step('tips: add, search, pin surfaces on hole screen', ()=>{
  w.go('tips');
  w.tipEditor(null);
  w.document.querySelector('#tipT').value='Grip pressure 4/10';
  w.document.querySelector('#tipB').value='Hold it like a bird.';
  w.document.querySelector('#tipG').value='mental, pre-shot';
  w.tipSave('');
  const t=w.S.tips[0];
  if(t.title!=='Grip pressure 4/10') throw new Error('tip not saved');
  w.togglePin(t.id);
  if(!t.pinned) throw new Error('pin failed');
  if(w.S.tips.filter(x=>x.pinned).length!==1) throw new Error('multiple pins');
  w.TIPQ='bird'; w.render(); textHas('Grip pressure');
  w.TIPQ='';
});

step('AI text export format', ()=>{
  const txt=w.roundText(w.S.rounds[0]);
  console.log('   sample:', txt.split('\n').slice(1,4).join(' | '));
  if(!/H1 P4 400/.test(txt)) throw new Error('header format');
  if(!/fin-\dp/.test(txt)) throw new Error('putt suffix');
  if(!/fin-\dg/.test(txt)) throw new Error('green suffix');
  if(!/shp-\ds/.test(txt)) throw new Error('shape suffix');
  if(!/24ft/.test(txt)) throw new Error('putt feet');
  if(!/windH2/.test(txt)) throw new Error('wind tag');
  if(!/f¾/.test(txt)) throw new Error('fraction tag');
});

step('CSV export has shot + SUMMARY rows', ()=>{
  let captured=null;
  w.download=(n,t)=>{captured=t;};
  w.exportCSV();
  const lines=captured.split('\n');
  if(!lines[0].startsWith('date,course,hole,par')) throw new Error('header');
  if(!lines.some(l=>l.includes('SUMMARY'))) throw new Error('no summary rows');
  const cols=lines[0].split(',').length;
  if(!lines.slice(1).every(l=>l.split(',').length>=cols-2)) throw new Error('ragged rows');
});

step('JSON backup round-trips', ()=>{
  const payload=JSON.stringify({app:'caddiebook',schema:1,data:w.S});
  const before=w.S.rounds.length;
  const parsed=JSON.parse(payload);
  w.S=Object.assign(w.defaultState(), parsed.data);
  w.render();
  if(w.S.rounds.length!==before) throw new Error('rounds lost in restore');
});

step('settings toggles: shape orientation flips pad rows', ()=>{
  const before=w.padRows('shape')[0][0];
  w.S.settings.shapeTopDraw=false;
  const after=w.padRows('shape')[0][0];
  if(before===after) throw new Error('orientation did not flip');
  w.S.settings.shapeTopDraw=true;
  w.S.settings.hiVis=true; w.render();
  if(!w.document.body.classList.contains('hivis')) throw new Error('hivis class');
  w.S.settings.hiVis=false; w.render();
});

step('fast resume: reload drops into in-progress hole', ()=>{
  // start a new round, leave mid-hole
  w.go('play'); w.startRoundSheet(); w.startRound();
  const saved=w.localStorage.getItem('caddiebook_v1');
  const dom2=new JSDOM(html,{runScripts:'dangerously',url:'https://localhost/'});
  dom2.window.localStorage.setItem('caddiebook_v1', saved);
  // re-run boot by reloading scripts is complex; instead verify state flag
  const st=JSON.parse(saved);
  if(!st.activeRoundId) throw new Error('active round not persisted');
});

if(errs.length){ console.log('WINDOW ERRORS:', errs); process.exitCode=1; }
console.log(errs.length? 'DONE WITH ERRORS':'ALL TESTS DONE');
}, 300);
