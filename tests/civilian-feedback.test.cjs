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
