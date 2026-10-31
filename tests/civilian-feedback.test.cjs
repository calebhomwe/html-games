const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(require('node:path').join(__dirname,'../stand-firm.html'),'utf8');
const code=html.slice(html.indexOf('const StandFirm='),html.indexOf('/* RULES_END */'));
const ctx=vm.createContext({});vm.runInContext(code+'\nglobalThis.game=StandFirm',ctx);
const G=ctx.game;
test('civilian feedback gives the actual current escort blockers without changing the state',()=>{
 const s=G.createStage(),c=s.civilians[0],u=s.units[0];const before=JSON.stringify(s);
 assert.match(G.civilianStatus(s,c),/Route blocked/);assert.equal(JSON.stringify(s),before);
 u.x=0;u.y=5;assert.match(G.civilianStatus(s,c),/Needs an escort/);
 u.x=0;u.y=4;assert.match(G.civilianStatus(s,c),/Ready to follow/);
 s.raiders[0].x=1;s.raiders[0].y=3;assert.match(G.civilianStatus(s,c),/Threatened/);
 s.raiders[0].hp=0;c.y=5;u.x=0;u.y=5;assert.match(G.civilianStatus(s,c),/Ready to cross/);
 c.hp=0;assert.match(G.civilianStatus(s,c),/no longer/);
});
test('blocked feedback describes current state when an earlier civilian later clears the route',()=>{
 const s=G.createStage(); s.raiders.forEach(e=>e.hp=0); s.civilians[2].hp=0;
 const [front,back]=s.civilians; Object.assign(front,{x:2,y:4}); Object.assign(back,{x:2,y:3});
 Object.assign(s.units[0],{x:1,y:4});Object.assign(s.units[1],{x:1,y:3});Object.assign(s.units[2],{x:5,y:5});
 const before=JSON.stringify(s);
 assert.match(G.civilianStatus(s,front),/Ready to follow/);
 assert.match(G.civilianStatus(s,back),/Route blocked.*Earlier civilian moves may also clear it/);
 assert.equal(JSON.stringify(s),before,'inspection never changes state');
 assert.equal(G.endTurn(s),true);assert.equal(front.y,5);assert.equal(back.y,4,'later civilian follows after front moves');
});
test('a civilian blocked by a later civilian stays put during the current turn',()=>{
 const s=G.createStage();s.raiders.forEach(e=>e.hp=0);s.civilians[2].hp=0;
 const [back,front]=s.civilians;Object.assign(back,{x:2,y:3});Object.assign(front,{x:2,y:4});
 Object.assign(s.units[0],{x:1,y:4});Object.assign(s.units[1],{x:1,y:3});Object.assign(s.units[2],{x:5,y:5});
 assert.match(G.civilianStatus(s,back),/Route blocked/);assert.equal(G.endTurn(s),true);
 assert.equal(back.y,3);assert.equal(front.y,5,'later civilian cannot retroactively move the earlier one');
});
