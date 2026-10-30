const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../parcel-route.html'), 'utf8');
const source = html.slice(html.indexOf('const ParcelEngine'),html.indexOf('/* ENGINE_END */'));
const E = vm.runInNewContext(source+'\nParcelEngine');
const rng = seed => () => ((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);

test('jobs spawn on reachable, distinct pickup squares with meaningful distances',()=>{
 for(let seed=1;seed<=100;seed++){
  const s=E.create(rng(seed)); assert.equal(s.jobs.length,3);
  assert.equal(new Set(s.jobs.map(j=>`${j.pickup.x},${j.pickup.y}`)).size,3);
  assert.equal(new Set(s.jobs.flatMap(j=>[j.pickup,j.drop]).map(p=>`${p.x},${p.y}`)).size,6);
  for(const j of s.jobs){assert.ok(E.dist(j.pickup,j.drop)>=3);assert.ok(j.pickup.x!==s.player.x||j.pickup.y!==s.player.y);assert.equal(j.value,100+30*E.dist(j.pickup,j.drop));}
 }
});
test('invalid moves do not cost fuel or time; traffic charges its visible cost',()=>{
 const s=E.create(rng(5));s.player={x:0,y:0};const fuel=s.fuel;
 assert.equal(E.move(s,-1,0),false);assert.equal(s.turn,0);assert.equal(s.fuel,fuel);
 s.player={x:1,y:0};s.turn=2;s.jobs=[];assert.equal(E.traffic(1,1,2),true);
 assert.equal(E.move(s,0,1),true);assert.equal(s.fuel,fuel-3);assert.equal(s.turn,3);
});
test('pickup and delivery award points and fuel once, including at zero fuel',()=>{
 const s=E.create(rng(12));s.player={x:0,y:0};s.jobs=[{pickup:{x:1,y:0},drop:{x:2,y:0},value:250}];s.fuel=2;
 E.move(s,1,0,rng(3));assert.ok(s.carry);assert.equal(s.fuel,1);
 E.move(s,1,0,rng(3));assert.equal(s.carry,null);assert.equal(s.score,250);assert.equal(s.delivered,1);assert.equal(s.fuel,7);assert.equal(s.done,false);
 E.move(s,-1,0,rng(3));assert.equal(s.score,250);
});
test('out of fuel and the shift limit terminate input',()=>{
 const s=E.create(rng(9));s.player={x:0,y:0};s.jobs=[];s.fuel=1;E.move(s,1,0,rng(3));assert.equal(s.done,true);const turn=s.turn;assert.equal(E.move(s,1,0),false);assert.equal(s.turn,turn);
 const t=E.create(rng(10));t.player={x:0,y:0};t.jobs=[];t.turn=49;t.fuel=20;E.move(t,1,0,rng(3));assert.equal(t.done,true);assert.equal(t.turn,50);
});
test('repeated shifts always finish without generating invalid state',()=>{
 for(let seed=1;seed<=200;seed++){const random=rng(seed),s=E.create(random);while(!s.done){let dx=s.player.x===5?-1:1;E.move(s,dx,0,random);assert.ok(s.fuel>=0);assert.ok(s.player.x>=0&&s.player.x<6);assert.ok(s.turn<=50)}assert.ok(s.done)}
});
test('DOM controls boot, move, reject distant clicks and restart a shift',()=>{
 class Element{constructor(){this.children=[];this.listeners={};this.style={};this.dataset={};this.textContent='';this.innerHTML='';this.hidden=false}addEventListener(n,fn){this.listeners[n]=fn}appendChild(c){this.children.push(c)}setAttribute(k,v){this[k]=v}focus(){}}
 const ids={};for(const id of ['score','fuel','moves','best','board','phase','objective','orders','toast','resultTitle','resultText','result','again','new'])ids[id]=new Element();
 const buttons=['up','down','left','right'].map(move=>{const e=new Element();e.dataset.move=move;return e});const events={};
 const document={getElementById:id=>ids[id],createElement:()=>new Element(),querySelectorAll:()=>buttons,addEventListener:(n,fn)=>{events[n]=fn}};
 const storage={getItem:()=>null,setItem:()=>{}};const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 vm.runInNewContext(script,{document,localStorage:storage});assert.equal(ids.board.children.length,36);assert.equal(ids.fuel.textContent,32);assert.equal(ids.moves.textContent,50);
 const labels=()=>ids.board.children.map(c=>c['aria-label']);
 for(let n=1;n<=3;n++){
  assert.equal(labels().filter(x=>x.includes(', parcel '+n)).length,1,'one pickup for each parcel');
  assert.equal(labels().filter(x=>x.includes(', drop-off preview for parcel '+n)).length,1,'each pickup has a numbered preview');
 }
 ids.board.children[0].listeners.click();assert.equal(ids.moves.textContent,50,'distant square cannot move');
 buttons[0].listeners.click();assert.equal(ids.moves.textContent,49);assert.equal(ids.fuel.textContent,31);
 let prevented=false;events.keydown({key:'ArrowRight',preventDefault(){prevented=true}});assert.ok(prevented);assert.equal(ids.moves.textContent,48);
 ids.new.listeners.click();assert.equal(ids.moves.textContent,50);assert.equal(ids.fuel.textContent,32);assert.equal(ids.result.hidden,true);
 // Route to the closest pickup, then check the chosen destination replaces previews.
 const pickup=labels().map((s,i)=>({s,x:i%6,y:Math.floor(i/6)})).filter(o=>/, parcel \d/.test(o.s)).sort((a,b)=>(Math.abs(a.x-2)+Math.abs(a.y-2))-(Math.abs(b.x-2)+Math.abs(b.y-2)))[0];
 let x=2,y=2;
 while(x!==pickup.x){const d=x<pickup.x?1:-1;x+=d;buttons[d===1?3:2].listeners.click();}
 while(y!==pickup.y){const d=y<pickup.y?1:-1;y+=d;buttons[d===1?1:0].listeners.click();}
 assert.equal(ids.phase.textContent,'Deliver the parcel');
 assert.equal(labels().filter(s=>s.includes('drop-off preview')).length,0,'previews hide while carrying');
 assert.equal(labels().filter(s=>s.includes('active drop-off')).length,1,'chosen drop-off remains visible');
});
