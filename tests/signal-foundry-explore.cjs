const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/../signal-foundry.html','utf8');
const model=html.split('/* ENGINE_START: pure, self-contained simulation. */')[1].split('/* ENGINE_END */')[0];
const ctx=vm.createContext({}); vm.runInContext(model+';globalThis.E=Foundry',ctx); const E=ctx.E;
const acts=['mine','refine','build','charge','dispatch'];
const key=s=>JSON.stringify([s.phase,s.stage,s.turns,s.ore,s.alloy,s.beacons,s.power,s.capacity,s.credits,s.delivered,s.drill,s.battery,s.hold,s.upgraded]);
let current=new Map([[key(E.create()),E.create()]]),finished=0,wins=0,losses=0,transitions=0,everStuck=0;
for(let depth=0;depth<30&&current.size;depth++){
 const next=new Map();
 for(const s of current.values()){
  assert.ok(E.restore(JSON.parse(JSON.stringify(s))),`valid reachable state rejected at depth ${depth}`);
  if(s.phase==='won'){wins++;finished++;continue} if(s.phase==='lost'){losses++;finished++;continue}
  const candidates=[];
  if(s.phase==='play') { for(const a of acts) if(E.can(s,a)){const n=JSON.parse(JSON.stringify(s));assert.ok(E.act(n,a));candidates.push(n)} }
  else if(s.phase==='upgrade'){
   {const n=JSON.parse(JSON.stringify(s));assert.ok(E.next(n));candidates.push(n)}
   for(const u of ['drill','battery','hold']){const n=JSON.parse(JSON.stringify(s));if(E.upgrade(n,u))candidates.push(n)}
  }
  if(!candidates.length)everStuck++;
  for(const n of candidates){next.set(key(n),n);transitions++;}
 }
 console.log('depth',depth,'states',current.size,'next',next.size,'wins',wins,'losses',losses,'stuck',everStuck);
 if(next.size>1000000){console.log('Exploration bounded at one million states');break}
 current=next;
}
assert.equal(everStuck,0); assert.ok(wins>0); console.log({wins,losses,finished,transitions,everStuck});
