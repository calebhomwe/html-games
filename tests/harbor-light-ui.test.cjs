const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const {Harbor,DANGER,SHORE}=require('../harbor-light.js');
function launch() {
  const html=fs.readFileSync(path.join(__dirname,'../harbor-light.html'),'utf8');
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
  const source=scripts[scripts.length-1][1];
  const events = {}; const elements={};
  const ids=['sea','sound','pause','saved','wave','lives','score','overlay','eyebrow','heading','message','start','hint','status','best'];
  function element(id){return {id,style:{},hidden:false,disabled:false,textContent:'',attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(k,fn){this.events[k]=fn},getBoundingClientRect(){return {left:0,width:300}}};}
  ids.forEach(id=>elements[id]=element(id));const lanes=[0,1,2].map(i=>element('lane'+i));
  const ctx=new Proxy({createLinearGradient(){return {addColorStop(){}}}}, {get(o,k){return k in o?o[k]:()=>{}},set(o,k,v){o[k]=v;return true}});
  elements.sea.getContext=()=>ctx;
  const document={hidden:false,getElementById:id=>elements[id],querySelectorAll:()=>lanes,addEventListener(k,fn){events[k]=fn}};
  const window={events:{},addEventListener(k,fn){this.events[k]=fn}};
  let instance;class CapturedHarbor extends Harbor {constructor(){super(()=>0);instance=this;}}
  let raf;const local=new Map();
  const context=vm.createContext({document,window,HarborLight:{Harbor:CapturedHarbor,DANGER,SHORE},localStorage:{getItem:k=>local.get(k)||null,setItem:(k,v)=>local.set(k,v)},requestAnimationFrame:fn=>{raf=fn;},console});
  vm.runInContext(source,context);
  return {elements,lanes,document,window,events,game:instance,frame:now=>raf(now)};
}
test('start, lane selection, pause and visibility keep the run safe',()=>{
  const x=launch();assert.equal(x.game.state,'ready');assert.equal(x.elements.pause.disabled,true);
  x.elements.start.events.click();assert.equal(x.game.state,'playing');assert.equal(x.elements.overlay.hidden,true);
  x.lanes[0].events.click();assert.equal(x.game.lane,0);assert.equal(x.lanes[0].attrs['aria-pressed'],'true');
  x.elements.sea.events.pointerdown({clientX:280});assert.equal(x.game.lane,2);
  let prevented=false;x.window.events.keydown({key:'ArrowLeft',preventDefault(){prevented=true}});assert.equal(x.game.lane,1);assert.equal(prevented,true);
  x.document.hidden=true;x.events.visibilitychange();assert.equal(x.game.state,'paused');assert.equal(x.elements.overlay.hidden,false);
  x.document.hidden=false;x.events.visibilitychange();assert.equal(x.game.state,'paused','return does not start the game behind the player');
  x.elements.start.events.click();assert.equal(x.game.state,'playing');assert.equal(x.elements.overlay.hidden,true);
});
