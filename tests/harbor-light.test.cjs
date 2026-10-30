const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Harbor,DANGER,SHORE} = require('../harbor-light.js');

test('the beam saves only ships in its lane at the rescue line, once', () => {
  const g = new Harbor(()=>0); g.start(); g.remaining = 1; g.spawnTimer = 99;
  g.boats = [{id:1,lane:0,y:DANGER-.001},{id:2,lane:2,y:DANGER-.001}]; g.selectLane(0); g.update(.1);
  assert.equal(g.rescued,1); assert.equal(g.boats.length,1); assert.equal(g.boats[0].id,2);
  assert.equal(g.score,10); g.update(.1); assert.equal(g.rescued,1);
  g.selectLane(2); g.update(.1); assert.equal(g.rescued,2); assert.equal(g.score,22);
});
test('three missed boats end the run, reset streak, and never award points', () => {
  const g = new Harbor(); g.start(); g.remaining = 1; g.spawnTimer = 99; g.selectLane(0);
  for(let i=0;i<3;i++) { g.boats=[{id:i,lane:2,y:SHORE-.001}]; g.update(.1); }
  assert.equal(g.state,'gameover'); assert.equal(g.lives,0); assert.equal(g.score,0); assert.equal(g.missed,3);
  g.update(.1); assert.equal(g.missed,3);
});
test('a selected boat is saved at the last instant before shore, but not after', () => {
  const g = new Harbor(); g.start(); g.remaining = 1; g.spawnTimer = 99; g.selectLane(2);
  g.boats = [{id:1,lane:2,y:SHORE-.001}]; g.update(.1);
  assert.equal(g.rescued,1); assert.equal(g.lives,3);
  g.boats = [{id:2,lane:2,y:SHORE}]; g.update(.1);
  assert.equal(g.rescued,1); assert.equal(g.lives,2);
});
test('a boat reaching the rescue line in another lane emits one warning', () => {
  const g=new Harbor(); g.start(); g.takeEvents(); g.remaining=1; g.spawnTimer=99; g.selectLane(0);
  g.boats=[{id:1,lane:2,y:DANGER-.001}]; g.update(.1);
  assert.deepEqual(g.takeEvents(),[{type:'warning',lane:2}]);
  g.update(.1); assert.deepEqual(g.takeEvents(),[]);
});
test('waves end only after last spawned boat is resolved and progress after a break', () => {
  const g = new Harbor(()=>0); g.start(); g.takeEvents(); g.remaining=0; g.boats=[{id:1,lane:0,y:.2}];
  g.selectLane(0); g.update(.1); assert.equal(g.state,'playing');
  g.boats[0].y = DANGER; g.update(.1); assert.equal(g.state,'break'); assert.equal(g.wave,1);
  for(let i=0;i<21;i++) g.update(.1);
  assert.equal(g.state,'playing'); assert.equal(g.wave,2); assert.equal(g.remaining+g.boats.length,7);
});
test('pause freezes waves and boats; resume returns to prior phase', () => {
  const g = new Harbor(); g.start(); g.boats=[{id:1,lane:0,y:.2}]; g.spawnTimer=2; g.pause();
  for(let i=0;i<50;i++) g.update(.1); assert.equal(g.boats[0].y,.2); assert.equal(g.spawnTimer,2);
  g.resume(); g.update(.1); assert.ok(g.boats[0].y>.2);
  g.state='break'; g.breakTimer=1; g.pause(); g.resume(); assert.equal(g.state,'break');
});
test('restart is clean, invalid input is ignored, and big frame delta is capped', () => {
  const g = new Harbor(()=>1); g.start(); g.selectLane(9); assert.equal(g.lane,1);
  g.update(100); assert.equal(g.boats.length,1); assert.equal(g.boats[0].lane,2); assert.ok(g.boats[0].y<.1);
  g.lives=0; g.score=100; g.state='gameover'; g.start();
  assert.equal(g.lives,3); assert.equal(g.score,0); assert.equal(g.wave,1); assert.equal(g.boats.length,0);
});
test('a simple nearest-boat strategy can clear eight waves over 100 seeded watches', () => {
  for(let seed=1; seed<=100; seed++) {
    let n=seed; const random=()=>{ n=(Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; };
    const g=new Harbor(random); g.start(); let ticks=0;
    while(g.wave<=8 && g.state!=='gameover' && ticks++<30000) {
      if(g.boats.length) g.selectLane(g.boats.reduce((a,b)=>a.y>b.y?a:b).lane);
      g.update(.1); g.takeEvents();
    }
    assert.ok(g.wave>=9, `seed ${seed} ended on wave ${g.wave}`);
    assert.equal(g.rescued,75);
  }
});
