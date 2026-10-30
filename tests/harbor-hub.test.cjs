const {test}=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
test('the actual arcade hub exposes Harbor Light and Parcel Route and search finds each',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].pop()[1];
  function element(){return {children:[],value:'',textContent:'',listeners:{},set innerHTML(v){this._html=v;this.children=[]},get innerHTML(){return this._html||''},appendChild(c){this.children.push(c)},addEventListener(k,f){this.listeners[k]=f}}}
  const ids={grid:element(),search:element(),filters:element(),random:element()};
  const document={getElementById:id=>ids[id],createElement:()=>element()};
  vm.runInNewContext(script,{document,location:{href:''},Math,Set,encodeURI});
  let links=ids.grid.children.map(e=>e.href);
  assert.ok(links.includes('harbor-light.html'));assert.ok(links.includes('parcel-route.html'));
  ids.search.value='harbor';ids.search.listeners.input();links=ids.grid.children.map(e=>e.href);assert.deepEqual(links,['harbor-light.html']);
  ids.search.value='parcel';ids.search.listeners.input();links=ids.grid.children.map(e=>e.href);assert.deepEqual(links,['parcel-route.html']);
});
