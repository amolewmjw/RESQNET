const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const html=require('./helpers/load-app.cjs')(),ctx=vm.createContext({});
for(const id of ['', 'resqnet-core','resqnet-layout'])vm.runInContext(html.match(id?new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`):/<script>([\s\S]*?)<\/script>/)[1],ctx);
const {C,L,config,scene}=vm.runInContext('({C:ResqnetCore,L:ResqnetLayout,config:CONFIG,scene:SCENE})',ctx);
let max=0,frames=0,samples=0,collisions=0,stable=0,maxUnchangedStep=0;const covered=new Set();
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],sq=dx*dx+dy*dy;const t=sq?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/sq)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function check(items){const boxes=L.place(items);boxes.forEach((b,i)=>{const a=items[i],distance=segmentDistance(b.point,a.from,a.to);assert(distance<=6+1e-9,`${a.id}: ${distance}`);max=Math.max(max,distance);samples++;for(let k=0;k<2;k++)assert(Math.abs(b.core[k]-(a.from[k]+(a.to[k]-a.from[k])*a.progress))<1e-9);if(b.offset)collisions++;});return boxes;}
for(const dwell of [.7,12]){
 const s=C.createState(config,scene.nodes),an=C.createAnimation(s,{dwell});C.startSimulation(s);let previous=null,n=0;
 while(s.status==='running'&&n<7000){C.advanceAnimation(an,1/60);const items=L.items(an),boxes=check(items);frames++;n++;
  items.forEach((item,i)=>{assert(Math.hypot(item.position[0]-an.vehicles[item.id].position[0],item.position[1]-an.vehicles[item.id].position[1])<1e-8,'core diverged from physical position');covered.add([item.edge.from,item.edge.to].sort().join(':'));if(previous){const old=previous[i];if(old.offset===boxes[i].offset&&old.edge===JSON.stringify(item.edge.from+':'+item.edge.to)){const step=Math.hypot(boxes[i].point[0]-old.point[0],boxes[i].point[1]-old.point[1]);assert(step<=70/60+1e-8);maxUnchangedStep=Math.max(maxUnchangedStep,step);stable++;}}});
  previous=boxes.map((b,i)=>({...b,edge:JSON.stringify(items[i].edge.from+':'+items[i].edge.to)}));
 }
 assert.equal(s.deliveredCount,13);console.log(`PASS full run dwell=${dwell}: ${n} frames, every vehicle within 6px of its actual segment`);
}
const fullFrames=frames,fullMax=max;
for(const [a,b]of config.edges)for(const reverse of [false,true]){
 const from=scene.nodes[reverse?b:a],to=scene.nodes[reverse?a:b];for(let f=0;f<=600;f++){const progress=f/600,position=from.map((x,k)=>x+(to[k]-x)*progress);check(Array.from({length:4},(_,i)=>({id:'A'+(i+1),position,from,to,progress,active:true})));frames++;}covered.add([a,b].sort().join(':'));
}
for(const [from,to]of [[[0,0],[.15,.2]],[[5,5],[5,5]]])for(let f=0;f<=600;f++){const progress=f/600,position=from.map((x,k)=>x+(to[k]-x)*progress);check(Array.from({length:4},(_,i)=>({id:'A'+(i+1),position,from,to,progress,active:true})));frames++;}
const shortest=Math.min(...config.edges.map(([a,b])=>Math.hypot(scene.nodes[a][0]-scene.nodes[b][0],scene.nodes[a][1]-scene.nodes[b][1])));
console.log(`PASS all ${config.edges.length} graph edges, both directions, 601 samples/direction; shortest=${shortest.toFixed(6)}px`);
console.log('PASS synthetic 0.25px stub and zero-length segment');
for(let f=0;f<200;f++){const x=62+(f%2?.001:-.001);const items=[{id:'A1',position:[0,0],from:[0,0],to:[100,0],progress:0,active:true},{id:'A2',position:[x,0],from:[0,0],to:[100,0],progress:x/100,active:true}];const b=check(items);assert(b.every(x=>x.offset===0));}
const same=Array.from({length:4},(_,i)=>({id:'A'+(i+1),position:[50,0],from:[0,0],to:[100,0],progress:.5,active:true}));const once=check(same);for(let i=0;i<200;i++){const r=check([...same].reverse());for(const a of once){const b=r.find(b=>b.id===a.id);assert.equal(a.offset,b.offset);assert.deepEqual(a.point,b.point);}}
console.log(`PASS fixed sides under repeated/reordered co-location; no old proximity-threshold jitter; ${stable} stable-edge motion checks, max step=${maxUnchangedStep.toFixed(6)}px`);
console.log(`RESULT full-run frames=${fullFrames}, full-run maximum=${fullMax.toFixed(9)}px; total frames=${frames}, checked positions=${samples}, all-edge maximum=${max.toFixed(9)}px; violations=0`);
