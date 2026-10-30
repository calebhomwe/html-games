const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('idle-empire.html','utf8');
const js=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'))
 .replace('init();\n})();','window.testApi={getState:()=>S,startTrade,logicStep,startGame,doPrestige,getCar:()=>({carEnd,carStake}),save};\ninit();\n})();');
function createWorld(shared,clock){
 const nodes={};
 function node(id){return nodes[id]||(nodes[id]={style:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',offsetWidth:1,children:[],parentNode:null,disabled:false,
 addEventListener(k,fn){this[k]=fn},appendChild(c){this.children.push(c);c.parentNode=this},removeChild(c){c.parentNode=null},querySelector(){return node(id+'-dt')},
 getContext(){return {setTransform(){}}},getBoundingClientRect(){return {left:0,top:0,width:100,height:100}}});}
 const storage={getItem:k=>shared[k]||null,setItem:(k,v)=>{shared[k]=v}};
 const doc={hidden:false,body:node('body'),getElementById:node,querySelectorAll:()=>[],createElement:()=>node('e'+Math.random()),addEventListener(){}};
 const math=Object.create(Math);math.random=()=>0;
 const win={addEventListener(){},innerWidth:500,innerHeight:900,devicePixelRatio:1};
 const context={document:doc,window:win,localStorage:storage,navigator:{},Audio:function(){},Math:math,Date:{now:()=>clock.now},
 requestAnimationFrame(){},setInterval(){},setTimeout(){},clearTimeout(){},confirm:()=>true,console};
 vm.createContext(context);vm.runInContext(js,context);return {api:win.testApi,nodes};
}
test('an active caravan survives reload and pays exactly once',()=>{
 const store={},clock={now:100000},a=createWorld(store,clock);
 a.api.startGame();a.api.getState().coins=4000;a.api.startTrade();
 assert.equal(a.api.getState().coins,3000);
 assert.deepEqual(JSON.parse(JSON.stringify(a.api.getCar())),{carEnd:160000,carStake:1000});
 clock.now+=61000;
 const b=createWorld(store,clock);b.api.startGame();
 assert.deepEqual(JSON.parse(JSON.stringify(b.api.getCar())),{carEnd:160000,carStake:1000});
 clock.now+=100;b.api.logicStep();
 assert.equal(b.api.getState().coins,4500);assert.equal(b.api.getState().trades,1);
 b.api.logicStep();assert.equal(b.api.getState().coins,4500);
 const c=createWorld(store,clock);c.api.startGame();clock.now+=100;c.api.logicStep();
 assert.equal(c.api.getState().coins,4500);assert.equal(c.api.getState().trades,1);
});
test('reset cancels a saved caravan and insufficient prestige does not',()=>{
 const store={},clock={now:100000},a=createWorld(store,clock);
 a.api.startGame();a.api.getState().coins=4000;a.api.startTrade();
 a.api.doPrestige();assert.equal(a.api.getCar().carStake,1000);
 a.nodes.btnReset.click();assert.equal(a.api.getCar().carStake,0);
 const b=createWorld(store,clock);assert.equal(b.api.getCar().carEnd,0);
});
