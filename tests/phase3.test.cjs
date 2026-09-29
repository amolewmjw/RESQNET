// Run: node phase3.test.cjs [path/to/index.html]
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=require('./helpers/load-app.cjs')(process.argv[2]),ctx=vm.createContext({});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1]+'\n'+html.match(/<script id="resqnet-core">([\s\S]*?)<\/script>/)[1],ctx);
const {C,config,scene}=vm.runInContext('({C:ResqnetCore,config:CONFIG,scene:SCENE})',ctx);
const plain=x=>JSON.parse(JSON.stringify(x));
const resources=(blood=0,icu=0,vent=0,beds=0)=>({icu,blood,vent,beds});
const fixture=({patients={bloodloss:2},fleet=2,capacity=1,stocks=[resources(1),resources(1)]}={})=>{
 const nodes={I:[0,0],H1:[10,0],H2:[0,20],H3:[-30,0]};
 const c={patients,fleet:{count:fleet,capacity,bases:['I']},incident:{node:'I'},hospitals:stocks.map((stock,i)=>({id:`H${i+1}`,node:`H${i+1}`,name:`Hospital ${i+1}`,stock})),edges:stocks.map((_,i)=>['I',`H${i+1}`])};
 return C.createState(c,nodes);
};
function invariants(g){
 const ids=g.victimGroups.flatMap(x=>x.patientIds);assert.equal(new Set(ids).size,ids.length,'duplicate patients');
 for(const group of g.victimGroups){assert.equal(group.count,group.patientIds.length);assert(C.GROUP_STATUSES.includes(group.status));
  const claims=g.ambulances.filter(a=>a.claimedGroups.includes(group)),cargo=g.ambulances.filter(a=>a.cargo.includes(group));
  assert.equal(claims.length,group.status==='reserved'?1:0);assert.equal(cargo.length,group.status==='loaded'?1:0);
 }
 for(const a of g.ambulances){assert(a.cargo.reduce((n,x)=>n+x.count,0)<=a.capacity);assert(a.claimedGroups.reduce((n,x)=>n+x.count,0)<=a.capacity);assert(!(a.cargo.length&&a.claimedGroups.length));}
 for(const h of g.hospitals)for(const k of Object.keys(h.stock)){
  assert(h.stock[k]>=0);assert(h.reserved[k]>=0);assert(h.reserved[k]<=h.stock[k]);
  assert.equal(h.reserved[k],g.ambulances.reduce((n,a)=>n+(a.hospitalReservation?.hospitalId===h.id?a.hospitalReservation.amounts[k]:0),0));
 }
 assert.equal(g.deliveredCount,g.victimGroups.filter(g=>g.status==='delivered').reduce((n,g)=>n+g.count,0));
}
function step(g,n=1){for(let i=0;i<n;i++){C.tick(g);invariants(g);}}
function finish(g){C.startSimulation(g);for(let i=0;i<100&&g.status!=='resolved';i++)step(g);assert.equal(g.status,'resolved');assert(g.victimGroups.every(x=>x.status==='delivered'));assert.equal(C.onSiteCount(g.victimGroups),0);assert(g.hospitals.every(h=>Object.values(h.reserved).every(n=>n===0)));return g;}
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('13-patient run: exact final stocks, 7 trips, no waiting/reserved patients',()=>{
 const g=finish(C.createState(config,scene.nodes));
 assert.equal(g.tick,9);assert.equal(g.deliveredCount,13);assert.equal(g.ambulances.reduce((n,a)=>n+a.trips,0),7);assert.equal(g.underResourcedCount,2);
 const expected={H1:resources(0,1,0,1),H2:resources(2,0,0,4),H3:resources(1,0,0,0),H4:resources(0,0,1,2)};
 for(const h of g.hospitals)assert.deepEqual(plain(h.stock),expected[h.id]);
 // Independently reconcile patient IDs and each resource consumed per delivery.
 const delivered=g.events.filter(e=>e.kind==='delivery');assert.equal(new Set(delivered.flatMap(e=>e.patientIds)).size,13);
 for(const h of config.hospitals)for(const k of Object.keys(h.stock))assert.equal(h.stock[k]-g.hospitals.find(x=>x.id===h.id).stock[k],delivered.filter(e=>e.hospitalId===h.id).reduce((n,e)=>n+e.consumed[k],0));
 assert(!g.events.some(e=>/treated|saved/i.test(e.text)));
 const again=finish(C.createState(config,scene.nodes));assert.deepEqual(plain(g),plain(again));
 console.log('  tick=9; delivered=13; trips=7; flagged under-resourced patients=2');
 console.log('  final [ICU,blood,vent,beds]: H1=[1,0,0,1] H2=[0,2,0,4] H3=[0,1,0,0] H4=[0,0,1,2]');
});
test('last-unit race: second ambulance selects another hospital before any delivery',()=>{
 const g=fixture();C.startSimulation(g);step(g,3);
 assert.equal(g.ambulances[0].destination,'H1');assert.equal(g.ambulances[1].destination,'H2');
 assert.deepEqual(g.hospitals.map(h=>h.stock.blood),[1,1]);assert.deepEqual(g.hospitals.map(h=>h.reserved.blood),[1,1]);
 finish(g);assert.equal(g.underResourcedCount,0);
});
test('blocked resource hospital: zero-capacity fallback delivers and flags without negative stock',()=>{
 const g=fixture({fleet:1,capacity:2,stocks:[resources(2),resources(0)]});g.roads[0].blockage=2;finish(g);
 assert.equal(g.hospitals[0].stock.blood,2);assert.equal(g.hospitals[1].stock.blood,0);assert.equal(g.underResourcedCount,2);
 assert(g.events.some(e=>e.kind==='hospital_select'&&e.underResourced));assert(g.events.some(e=>e.kind==='delivery'&&e.underResourced&&e.consumed.blood===0));
});
test('dual-resource fallback: complete pairs outrank abundant single resource; ties use route cost',()=>{
 const g=fixture({patients:{limbloss:2},fleet:1,capacity:2,stocks:[resources(0,5),resources(1,1),resources(1,4)]});
 finish(g);const e=g.events.find(e=>e.kind==='delivery');assert.equal(e.hospitalId,'H2');assert.equal(e.consumed.icu,1);assert.equal(e.consumed.blood,1);assert.equal(e.underResourced,true);
});
test('oversized group: 5 patients split into 2+2+1, counters drop only on pickup',()=>{
 const g=fixture({patients:{fracture:5},fleet:2,capacity:2,stocks:[resources(0,0,0,5)]});
 const before=JSON.stringify(g);step(g);assert.equal(JSON.stringify(g),before,'idle tick must not start');C.startSimulation(g);step(g);
 assert.equal(C.onSiteCount(g.victimGroups),5);assert.equal(g.victimGroups.filter(x=>x.status==='reserved').reduce((n,x)=>n+x.count,0),4);assert(g.ambulances.every(a=>a.cargo.length===0));
 step(g);assert.equal(C.onSiteCount(g.victimGroups),5);step(g);assert.equal(C.onSiteCount(g.victimGroups),1);finish(g);
 assert.deepEqual(plain(g.events.filter(e=>e.kind==='delivery').map(e=>e.count)),[2,2,1]);assert.equal(g.hospitals[0].stock.beds,0);
});
test('all hospital roads blocked after selection: stuck retains cargo/reservation, road change retries',()=>{
 const g=fixture({patients:{bloodloss:1},fleet:1,stocks:[resources(1)]});C.startSimulation(g);step(g,3);
 g.roads[0].blockage=2;step(g);assert.equal(g.ambulances[0].status,'stuck');assert.match(g.ambulances[0].stuckReason,/No reachable route/);
 assert.equal(g.ambulances[0].cargo.length,1);assert.equal(g.hospitals[0].reserved.blood,1);step(g,3);assert.equal(g.ambulances[0].status,'stuck');
 g.roads[0].blockage=0;step(g);assert.equal(g.ambulances[0].status,'to_hospital');assert.equal(g.ambulances[0].stuckReason,null);finish(g);assert.equal(g.ambulances[0].currentNode,'H1');assert.equal(g.ambulances[0].status,'idle');
});
test('no hospital reachable at pickup: selection retries after road change',()=>{
 const g=fixture({patients:{bloodloss:1},fleet:1,stocks:[resources(1)]});g.roads[0].blockage=2;C.startSimulation(g);step(g,3);
 assert.equal(g.ambulances[0].status,'stuck');assert.equal(g.ambulances[0].resumeStatus,'hospital_select');assert.equal(g.hospitals[0].reserved.blood,0);
 g.roads[0].blockage=1;step(g);assert.equal(g.ambulances[0].status,'to_hospital');finish(g);
});
test('unreachable incident: claims remain reserved until route restoration and physical pickup',()=>{
 const g=C.createState(config,scene.nodes);for(const e of g.roads)if(e.from==='INC'||e.to==='INC')e.blockage=2;
 C.startSimulation(g);step(g);assert(g.ambulances.every(a=>a.status==='stuck'));assert.equal(C.onSiteCount(g.victimGroups),13);
 for(const e of g.roads)e.blockage=0;step(g);assert(g.ambulances.every(a=>a.status==='to_incident'));finish(g);
});
console.log(`${passed}/${passed} dispatch tests passed. Invariants checked after every tick. No DOM, browser or server used.`);
