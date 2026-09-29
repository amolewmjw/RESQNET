// Run: node phase2.test.cjs [path/to/index.html]
// Executes the actual embedded config/core, without loading the renderer or a DOM.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=require('./helpers/load-app.cjs')(process.argv[2]);
const config=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core=html.match(/<script id="resqnet-core">([\s\S]*?)<\/script>/)[1];
const ctx=vm.createContext({});vm.runInContext(config+'\n'+core,ctx);
const {C,config:c,scene}=vm.runInContext('({C:ResqnetCore,config:CONFIG,scene:SCENE})',ctx);
const fresh=()=>C.createState(c,scene.nodes),near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const route=(g,s,t,expected)=>{const r=C.astar(g,s,t);assert(r);assert.equal(r.path.join('>'),expected);return r;};
const len=(g,a,b)=>Math.hypot(g.nodes[b][0]-g.nodes[a][0],g.nodes[b][1]-g.nodes[a][1]);
const edge=(g,a,b)=>g.roads.find(e=>e.from===a&&e.to===b||e.from===b&&e.to===a);
let passed=0;function test(name,f){f();console.log('PASS '+name);passed++;}
test('data model: 13 patients, 4 ambulances, 4 hospitals; independent reservations and cargo',()=>{
 const g=fresh();assert.equal(C.onSiteCount(g.victimGroups),13);assert.equal(g.ambulances.length,4);assert.equal(g.hospitals.length,4);
 assert.equal(new Set(g.victimGroups.flatMap(x=>x.patientIds)).size,13);
 g.victimGroups[0].status='reserved';assert.equal(C.onSiteCount(g.victimGroups),13);
 g.victimGroups[0].status='loaded';assert.equal(C.onSiteCount(g.victimGroups),9);
 g.victimGroups[0].status='delivered';assert.equal(C.onSiteCount(g.victimGroups),9);
 g.ambulances[0].claimedGroups.push(g.victimGroups[1]);assert.equal(g.ambulances[0].cargo.length,0);assert.equal(g.ambulances[1].claimedGroups.length,0);
 g.hospitals[0].reserved.icu=2;assert.equal(C.availableResources(g.hospitals[0]).icu,1);assert.equal(g.hospitals[0].stock.icu,3);assert.equal(g.hospitals[1].reserved.icu,0);
 g.nodes.H1[0]=0;assert.equal(scene.nodes.H1[0],170);assert.equal(fresh().hospitals[0].reserved.icu,0);
});
test('clear map: H1>J2>J6>INC, independently summed cost',()=>{
 const g=fresh(),r=route(g,'H1','INC','H1>J2>J6>INC');near(r.cost,len(g,'H1','J2')+len(g,'J2','J6')+len(g,'J6','INC'));console.log('  clear cost = '+r.cost.toFixed(6));
});
test('partial road: H1>J2>J3>INC; full road: same valid detour',()=>{
 const g=fresh();edge(g,'J2','J6').blockage=1;
 const r=route(g,'H1','INC','H1>J2>J3>INC');near(r.cost,len(g,'H1','J2')+len(g,'J2','J3')+len(g,'J3','INC'));
 edge(g,'J2','J6').blockage=2;near(route(g,'H1','INC','H1>J2>J3>INC').cost,r.cost);console.log('  detour cost = '+r.cost.toFixed(6));
});
test('partial cost multiplier is 3; blocked single-edge graph returns null',()=>{
 const g={nodes:{a:[0,0],b:[3,4]},roads:[{id:'x',from:'a',to:'b',baseDistance:5,blockage:1}]};near(C.astar(g,'a','b').cost,15);g.roads[0].blockage=2;assert.equal(C.astar(g,'a','b'),null);
});
test('mid-edge: exact interpolated start, remaining cost, completes newly blocked edge',()=>{
 const g=fresh(),start={from:'J2',to:'J6',progress:.4,traversalPenalty:1};edge(g,'J2','J6').blockage=2;
 const r=route(g,start,'INC','J6>INC');near(r.cost,.6*len(g,'J2','J6')+len(g,'J6','INC'));near(r.points[0][0],338.8);near(r.points[0][1],282);
 const reverse=route(g,{from:'J6',to:'J2',progress:.5,traversalPenalty:3},'H1','J2>H1');near(reverse.cost,1.5*len(g,'J2','J6')+len(g,'J2','H1'));
 console.log('  mid-edge cost = '+r.cost.toFixed(6));
});
test('unreachable graph split returns null for node and mid-edge starts',()=>{
 const g=fresh();for(const e of g.roads)if(e.from==='INC'||e.to==='INC')e.blockage=2;
 assert.equal(C.astar(g,'H1','INC'),null);assert.equal(C.astar(g,{from:'J2',to:'J6',progress:.5},'INC'),null);
});
test('position boundaries, same-node path and malformed-input errors',()=>{
 const g=fresh();near(C.astar(g,'H1','H1').cost,0);edge(g,'J2','J6').blockage=2;
 near(C.astar(g,{from:'J2',to:'J6',progress:0},'INC').cost,C.astar(g,'J2','INC').cost);
 near(C.astar(g,{from:'J2',to:'J6',progress:1},'INC').cost,C.astar(g,'J6','INC').cost);
 assert.throws(()=>C.astar(g,{from:'J2',to:'J6',progress:1.1},'INC'),/Invalid mid-edge/);
});
// Independent Floyd-Warshall oracle: validates optimality, not only path plausibility.
test('all 225 node pairs agree with Floyd-Warshall on clear and disrupted maps',()=>{
 for(const disrupted of [false,true]){
  const g=fresh();if(disrupted)g.roads.forEach((e,i)=>{e.blockage=i%5===0?2:i%3===0?1:0;});
  const ids=Object.keys(g.nodes),d=ids.map((_,i)=>ids.map((_,j)=>i===j?0:Infinity));
  for(const e of g.roads){if(e.blockage===2)continue;const i=ids.indexOf(e.from),j=ids.indexOf(e.to);d[i][j]=d[j][i]=e.baseDistance*(e.blockage===1?3:1);}
  for(let k=0;k<ids.length;k++)for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
  const before=JSON.stringify(g);for(let i=0;i<ids.length;i++)for(let j=0;j<ids.length;j++){const r=C.astar(g,ids[i],ids[j]);if(!Number.isFinite(d[i][j]))assert.equal(r,null);else near(r.cost,d[i][j]);}assert.equal(JSON.stringify(g),before);
 }
});
console.log(`${passed}/${passed} tests passed. No DOM, browser or server used.`);
