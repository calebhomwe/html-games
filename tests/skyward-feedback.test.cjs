const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../skyward-run.html'),'utf8');
const start=html.indexOf('const SkywardFeedback='),end=html.indexOf('\n(()=>{',start);
assert.ok(start>=0&&end>start,'feedback module is present');
const ctx=vm.createContext({});vm.runInContext(html.slice(start,end)+'\nglobalThis.fx=SkywardFeedback',ctx);
const fx=ctx.fx;
test('landing, dash, light and fall produce short differentiated bursts',()=>{for(const kind of ['land','dash','light','fall']){const state=fx.create();fx.burst(state,kind,20,30);assert.ok(state.particles.length>0);const p=state.particles[0];assert.equal(p.x,20);assert.equal(p.y,30);fx.step(state,.16);assert.ok(p.life>0);assert.notEqual(p.x,20);fx.step(state,.17);assert.equal(state.particles.length,0)}});
test('bursts remain bounded under repeated events',()=>{const state=fx.create();for(let i=0;i<100;i++)fx.burst(state,'light',0,0);assert.equal(state.particles.length,60);fx.step(state,1);assert.equal(state.particles.length,0)});
test('reduced motion disables all particle bursts',()=>{const state=fx.create(true);for(const kind of ['land','dash','light','fall'])fx.burst(state,kind,0,0);assert.equal(state.particles.length,0)});
function bootGame(reduced){
 const listeners={},els={},draw={createLinearGradient(){return {addColorStop(){}}},fillRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},save(){},restore(){},translate(){},rotate(){}};
 function element(id){return els[id]||(els[id]={id,hidden:false,dataset:{},events:{},addEventListener(n,f){this.events[n]=f},setAttribute(){},removeAttribute(){},getContext(){return draw}})}
 const document={hidden:false,getElementById:element,querySelectorAll(){return []},addEventListener(n,f){listeners[n]=f}};
 const window={matchMedia:()=>({matches:reduced}),addEventListener(){}};
 let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 script=script.replace(' requestAnimationFrame(frame);\n})();',' globalThis.__check={get game(){return game},get effects(){return effects},frame}; requestAnimationFrame(frame);\n})();');
 const c=vm.createContext({document,window,localStorage:{getItem(){return null},setItem(){}},requestAnimationFrame(){},console});vm.runInContext(script,c);
 return {c,els};
}
test('real game loop emits feedback for a collected light and reduced motion suppresses it',()=>{
 for(const reduced of [false,true]){const {c,els}=bootGame(reduced);els.start.events.click();const p=c.__check.game.p;p.x=148;p.y=465;p.vy=0;c.__check.frame(1000);c.__check.frame(1020);assert.equal(c.__check.game.collected,1);assert.equal(c.__check.effects.particles.length,reduced?0:9)}
});
