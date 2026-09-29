// Run: node phase4.test.cjs [path/to/index.html]
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=require('./helpers/load-app.cjs')(process.argv[2]),ctx=vm.createContext({});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1]+'\n'+html.match(/<script id="resqnet-core">([\s\S]*?)<\/script>/)[1],ctx);
const {C,config,scene}=vm.runInContext('({C:ResqnetCore,config:CONFIG,scene:SCENE})',ctx);
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`),point=(p,x,y)=>{near(p[0],x);near(p[1],y);};
let passed=0;function test(name,f){f();passed++;console.log('PASS '+name);}
test('piecewise interpolation: samples at start, mid-edge, junction, next edge and end',()=>{
 const nodes={A:[0,0],B:[3,4],C:[9,4]},path=['A','B','C'];
 for(const [t,x,y,edge,done]of [[0,0,0,0,false],[1,1.2,1.6,0,false],[2.5,3,4,1,false],[3,4,4,1,false],[5.5,9,4,1,true],[20,9,4,1,true]]){
  const s=C.interpolatePath(nodes,path,t,2);point(s.position,x,y);assert.equal(s.edgeIndex,edge);assert.equal(s.done,done);
 }
 console.log('  speed=2: t=1 -> (1.2,1.6); t=2.5 -> (3,4); t=3 -> (4,4); t=5.5 -> (9,4)');
});
test('zero-length edges, single-node paths and invalid elapsed time',()=>{
 const nodes={A:[1,2],B:[1,2],C:[4,6]};point(C.interpolatePath(nodes,['A'],1,2).position,1,2);
 point(C.interpolatePath(nodes,['A','B','C'],1,2).position,2.2,3.6);
 assert.throws(()=>C.interpolatePath(nodes,['A'],-1,2));assert.throws(()=>C.interpolatePath(nodes,['A'],1,0));
});
function fixture(){return C.createState({patients:{fracture:3},fleet:{count:1,capacity:2,bases:['B']},incident:{node:'I'},hospitals:[{id:'H',node:'H',stock:{icu:0,blood:0,vent:0,beds:3}}],edges:[['B','I'],['I','H']]},{B:[0,0],I:[10,0],H:[10,10]});}
test('dispatch -> motion -> loading -> pickup: continuous position and correct on-site timing',()=>{
 const g=fixture(),a=g.ambulances[0],anim=C.createAnimation(g,{speed:10,dwell:.5}),v=anim.vehicles.A1;
 C.advanceAnimation(anim,1);assert.equal(a.status,'idle');C.startSimulation(g);C.advanceAnimation(anim,0);
 assert.equal(a.status,'to_incident');point(v.position,0,0);assert.equal(a.cargo.length,0);assert.equal(C.onSiteCount(g.victimGroups),3);
 C.advanceAnimation(anim,.25);point(v.position,2.5,0);assert.equal(a.status,'to_incident');
 C.advanceAnimation(anim,.75);point(v.position,10,0);assert.equal(a.status,'loading');assert.equal(C.onSiteCount(g.victimGroups),3);
 C.advanceAnimation(anim,.25);assert.equal(a.status,'loading');point(v.position,10,0);
 C.advanceAnimation(anim,.25);assert.equal(a.status,'to_hospital');point(v.position,10,0);assert.equal(C.onSiteCount(g.victimGroups),1);assert.equal(a.cargo[0].count,2);
 C.advanceAnimation(anim,.2);point(v.position,10,2);assert.equal(g.hospitals[0].stock.beds,3);
});
test('arrival -> delivery -> reassignment starts at hospital, never teleports back',()=>{
 const g=fixture(),a=g.ambulances[0],anim=C.createAnimation(g,{speed:10,dwell:.5});C.startSimulation(g);
 for(const dt of [0,1,.5,1])C.advanceAnimation(anim,dt);
 assert.equal(a.status,'delivering');point(anim.vehicles.A1.position,10,10);assert.equal(g.hospitals[0].stock.beds,3);
 C.advanceAnimation(anim,.5);assert.equal(g.hospitals[0].stock.beds,1);assert.equal(a.status,'to_incident');point(anim.vehicles.A1.position,10,10);assert.equal(a.cargo.length,0);
 C.advanceAnimation(anim,.2);point(anim.vehicles.A1.position,10,8);
});
test('frame partition consistency before a transition, and no overshoot after a long frame',()=>{
 function run(parts){const g=fixture(),a=C.createAnimation(g,{speed:10,dwell:.5});C.startSimulation(g);C.advanceAnimation(a,0);for(const dt of parts)C.advanceAnimation(a,dt);return a;}
 const a=run([.2,.2,.2]),b=run([.6]);near(a.vehicles.A1.position[0],b.vehicles.A1.position[0]);
 const long=run([100]);assert.equal(long.state.ambulances[0].status,'loading');point(long.vehicles.A1.position,10,0);assert.equal(C.onSiteCount(long.state.victimGroups),3);
});
test('13-patient animated run completes with per-frame speed bounds and inventory/counter changes',()=>{
 const g=C.createState(config,scene.nodes),anim=C.createAnimation(g,{speed:70,dwell:.7});C.startSimulation(g);
 let frames=0,sawInTransitAfterLastPickup=false;
 while(g.status==='running'&&frames<20000){
  const previous=Object.fromEntries(Object.entries(anim.vehicles).map(([id,v])=>[id,[...v.position]]));
  C.advanceAnimation(anim,1/60);frames++;
  for(const a of g.ambulances){const p=previous[a.id],q=anim.vehicles[a.id].position;assert(Math.hypot(q[0]-p[0],q[1]-p[1])<=70/60+1e-7,'position jumped');}
  if(C.onSiteCount(g.victimGroups)===0&&g.deliveredCount<13)sawInTransitAfterLastPickup=true;
  for(const h of g.hospitals)for(const k of Object.keys(h.stock)){assert(h.stock[k]>=0);assert(h.reserved[k]>=0);assert(h.reserved[k]<=h.stock[k]);}
 }
 assert.equal(g.status,'resolved');assert.equal(g.deliveredCount,13);assert.equal(C.onSiteCount(g.victimGroups),0);assert(sawInTransitAfterLastPickup);
 assert(g.ambulances.every(a=>a.status==='idle'&&!a.cargo.length));
 console.log(`  frames=${frames}; delivered=${g.deliveredCount}; on-site=0; under-resourced=${g.underResourcedCount}; all vehicles idle`);
});
console.log(`${passed}/${passed} animation logic tests passed. Visual smoothness, heartbeat and badges require a human browser check.`);
