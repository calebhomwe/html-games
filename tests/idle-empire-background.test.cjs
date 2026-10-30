const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('idle-empire.html','utf8');
const logic=html.slice(html.indexOf('function logicStep('),html.indexOf('function updateHudFrame()'));
const hooks=html.slice(html.indexOf('  // Do not overwrite the hidden-time checkpoint'),html.indexOf("  window.addEventListener('resize'"));
function setup(){
  let time=100000, checkpoint, interval; const events={}, win={};
  const context={document:{hidden:false,addEventListener:(n,f)=>events[n]=f},
    window:{addEventListener:(n,f)=>win[n]=f}, Date:{now:()=>time},
    setInterval:f=>{interval=f}, lastTick:time, inGame:true,
    S:{coins:0,lifetime:0,alltime:0}, incomePerSec:()=>10,
    rushT:0,rushNext:Infinity,carEnd:0,carDue:0,tribDay:1,dayIdx:()=>1,
    checkDeeds(){},save(){checkpoint={time,coins:context.S.coins}},updateHud(){},
    toast(){},fmt:n=>n,sfx(){},vib(){},confetti(){},floater(){},refreshTrib(){},
    $:()=>({classList:{remove(){},add(){}},style:{}})
  };
  vm.createContext(context);vm.runInContext(logic+hooks,context);
  return {context,events,win,interval,advance(ms){time+=ms}, checkpoint:()=>checkpoint};
}
test('background autosave keeps the checkpoint and resume pays once at offline rate',()=>{
  const h=setup(),c=h.context;
  h.advance(5000);c.document.hidden=true;h.events.visibilitychange();
  assert.equal(c.S.coins,50);assert.equal(h.checkpoint().coins,50);
  const savedTime=h.checkpoint().time;
  h.advance(120000);c.logicStep();h.interval();h.win.beforeunload();
  assert.equal(c.S.coins,50);assert.equal(h.checkpoint().time,savedTime);
  c.document.hidden=false;h.events.visibilitychange();
  assert.equal(c.S.coins,650);assert.equal(h.checkpoint().coins,650);
  c.logicStep();assert.equal(c.S.coins,650);
});
test('offline gain remains capped at eight hours',()=>{
  const h=setup(),c=h.context;c.document.hidden=true;h.events.visibilitychange();
  h.advance(12*3600*1000);c.document.hidden=false;h.events.visibilitychange();
  assert.equal(c.S.coins,10*.5*8*3600);
});
