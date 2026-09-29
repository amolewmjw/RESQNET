
'use strict';
const NS = 'http://www.w3.org/2000/svg';
const RESOURCE_LABELS = {icu:'ICU', blood:'Blood', vent:'Vent', beds:'Beds'};
const INJURY_LABELS = {fracture:'Fracture',bloodloss:'Blood loss',unconscious:'Unconscious',limbloss:'Limb loss'};
const ROAD_LABELS = ['clear','partial','blocked'];
const simulation = ResqnetCore.createState(CONFIG, SCENE.nodes);
const roads = simulation.roads;
const ambulanceBases = CONFIG.fleet.bases;
const ambulances = simulation.ambulances;
function svgEl(tag,attrs={},parent,text){const el=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);if(text!==undefined)el.textContent=text;if(parent)parent.appendChild(el);return el;}
function text(x,y,value,parent,attrs={}){return svgEl('text',{x,y,...attrs},parent,value);}
const totalPatients=Object.values(CONFIG.patients).reduce((sum,n)=>sum+n,0);
document.getElementById('scenario').textContent=CONFIG.scenario;
for(const [value,label,unit] of [[totalPatients,'Patients on site',''],[ambulances.length,'Ambulances',`× ${CONFIG.fleet.capacity} seats`],[CONFIG.hospitals.length,'Hospitals','']]){
 const m=document.createElement('div');m.className='metric';m.textContent=value+' ';const u=document.createElement('span');u.textContent=unit;m.append(u);const l=document.createElement('small');l.textContent=label;m.append(l);document.getElementById('summary').append(m);
}
function updateRoad(road,announce=true){
 const g=document.getElementById(road.id);g.dataset.state=road.blockage;
 const label=`Road ${road.from}–${road.to}: ${ROAD_LABELS[road.blockage]}. Activate to set ${ROAD_LABELS[(road.blockage+1)%3]}.`;
 g.setAttribute('aria-label',label);g.querySelector('title').textContent=label;
 g.querySelector('.closure').setAttribute('visibility',road.blockage===2?'visible':'hidden');
 if(announce)document.getElementById('road-status').textContent=`${road.from} ↔ ${road.to} — ${ROAD_LABELS[road.blockage]} — ${roads.filter(r=>r.blockage===1).length} partial / ${roads.filter(r=>r.blockage===2).length} blocked roads.`;
}
for(const road of roads){
 const [x1,y1]=SCENE.nodes[road.from], [x2,y2]=SCENE.nodes[road.to];
 const g=svgEl('g',{id:road.id,class:SCENE.arterials.includes(`${road.from}:${road.to}`)?'road arterial':'road',tabindex:0,role:'button'},document.getElementById('roads'));
 svgEl('title',{},g);for(const cls of ['track','paint','hit'])svgEl('line',{x1,y1,x2,y2,class:cls},g);
 const midX=(x1+x2)/2,midY=(y1+y2)/2;const closure=svgEl('g',{class:'closure', 'pointer-events':'none'},g);
 svgEl('circle',{cx:midX,cy:midY,r:9,class:'block-symbol'},closure);
 svgEl('path',{d:`M${midX-3},${midY-3} l6,6 m0,-6 l-6,6`,stroke:'#B83E32','stroke-width':2,fill:'none'},closure);
 const cycle=()=>{ResqnetCore.setRoadBlockage(animation,road.id,(road.blockage+1)%3);updateRoad(road);auditObserver.drain();renderLiveState();};
 g.addEventListener('click',cycle);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)cycle();}});updateRoad(road,false);
}
const nodesLayer=document.getElementById('nodes');
for(const [id,[x,y]] of Object.entries(SCENE.nodes)){
 if(id.startsWith('H')||id===CONFIG.incident.node)continue;
 svgEl('circle',{cx:x,cy:y,r:5,class:'junction'},nodesLayer);
 if(!ambulanceBases.includes(id))text(x+11,y-10,id,nodesLayer,{class:'junction-label'});
}
const facilities=document.getElementById('facilities');
for(const hospital of CONFIG.hospitals){
 const [x,y]=SCENE.nodes[hospital.node], [cx,cy]=hospital.card;
 const g=svgEl('g',{'data-hospital':hospital.id,role:'group','aria-label':`${hospital.id} ${hospital.name}`},facilities);
 svgEl('line',{x1:x,y1:y,x2:Math.max(cx+12,Math.min(cx+288,x)),y2:cy<y?cy+112:cy,class:'anchor'},g);
 svgEl('rect',{x:x-17,y:y-17,width:34,height:34,rx:2,fill:'#FFFCF5',stroke:'#647F91'},g);
 text(x,y+6,'H',g,{'text-anchor':'middle','font-size':17,'font-weight':750,style:'fill:#263746'});
 svgEl('rect',{x:cx,y:cy,width:300,height:112,rx:2,class:'card'},g);
 text(cx+15,cy+25,hospital.id,g,{class:'hospital-id'});
 text(cx+45,cy+25,hospital.name,g,{class:'hospital-name',...(hospital.name.length>29?{'font-size':11,style:'font-size:11px'}:{})});
 Object.entries(RESOURCE_LABELS).forEach(([key,label],i)=>{
   const rx=cx+17+i*73;
   text(rx,cy+66,hospital.stock[key],g,{class:`resource-value${hospital.stock[key]===0?' zero':''}`,'data-resource':key});
   text(rx,cy+88,label,g,{class:'resource-label'});
 });
}
{
 const [x,y]=SCENE.nodes[CONFIG.incident.node],[cx,cy]=SCENE.incidentCard;
 const g=svgEl('g',{id:'incident',role:'group','aria-label':`Incident: ${totalPatients} patients on site`},facilities);
 svgEl('line',{x1:x,y1:y+25,x2:cx+35,y2:cy,class:'anchor'},g);
 svgEl('circle',{cx:x,cy:y,r:29,class:'heartbeat'},g);
 svgEl('circle',{cx:x,cy:y,r:26,fill:'#F4D7CF',stroke:'#B83E32'},g);
 svgEl('path',{d:`M${x},${y-15} l16,27 h-32 Z`,fill:'#B83E32'},g);
 text(x,y+7,'!',g,{'text-anchor':'middle','font-size':19,'font-weight':800,style:'fill:#FFFCF5'});
 text(x,y-38,'Collapse site',g,{'text-anchor':'middle',class:'incident-label'});
 svgEl('rect',{x:cx,y:cy,width:250,height:106,rx:2,fill:'#FFFCF5',stroke:'#B83E32'},g);
 text(cx+15,cy+25,'Patients on site',g,{class:'incident-label'});
 text(cx+232,cy+27,totalPatients,g,{'text-anchor':'end','font-size':21,'font-weight':750,'data-site-total':'true'});
 Object.entries(CONFIG.patients).forEach(([key,n],i)=>{
   const px=cx+15+(i%2)*125,py=cy+53+Math.floor(i/2)*27;
   text(px,py,INJURY_LABELS[key],g,{class:'patient-row'});
   text(px+105,py,n,g,{'text-anchor':'end',class:'patient-row','font-weight':750,'data-patient-type':key});
 });
}
const baseOccupancy={};
for(const ambulance of ambulances){
 const [baseX,baseY]=SCENE.nodes[ambulance.homeNode];const slot=baseOccupancy[ambulance.homeNode]||0;baseOccupancy[ambulance.homeNode]=slot+1;
 const x=baseX+(slot%3)*36,y=baseY-Math.floor(slot/3)*30;
 const g=svgEl('g',{'data-ambulance':ambulance.id,role:'img','aria-label':`${ambulance.id}, idle at ${ambulance.homeNode}, 0 of ${ambulance.capacity} seats occupied`,transform:`translate(${x},${y})`},document.getElementById('vehicles'));
 svgEl('title',{},g,`${ambulance.id} — idle — capacity ${ambulance.capacity} — base ${ambulance.homeNode}`);
 svgEl('rect',{x:-16,y:-11,width:32,height:20,rx:4,fill:'#FFFCF5',stroke:'#263746','stroke-width':1.5},g);
 svgEl('rect',{x:7,y:-7,width:7,height:10,rx:1,fill:'#647F91'},g);
 svgEl('path',{d:'M-7,-7 v12 M-13,-1 h12',stroke:'#B83E32','stroke-width':3},g);
 const badge=svgEl('g',{class:'cargo-badge',visibility:'hidden'},g);
 svgEl('rect',{x:-29,y:-32,width:58,height:17,rx:3},badge);
 text(0,-20,'',badge,{'data-badge-load':'true','text-anchor':'middle'});
 for(const wheelX of [-10,10])svgEl('circle',{cx:wheelX,cy:11,r:3,fill:'#263746',stroke:'#647F91'},g);
}
const animation=ResqnetCore.createAnimation(simulation);
function renderLiveState(){
 const fleet=document.getElementById('fleet-status');fleet.replaceChildren();
 for(const a of ambulances){const line=document.createElement('p');line.textContent=ResqnetPlayback.status(simulation,a);if(a.status==='stuck')line.className='holding';fleet.append(line);}

 const onSite=ResqnetCore.onSiteCount(simulation.victimGroups);
 document.querySelector('#incident [data-site-total]').textContent=onSite;
 document.getElementById('incident').classList.toggle('pulsing',simulation.status==='running'&&onSite>0);
 document.getElementById('incident').setAttribute('aria-label',`Incident: ${onSite} patients on site`);
 for(const [type]of Object.entries(CONFIG.patients))document.querySelector(`[data-patient-type="${type}"]`).textContent=simulation.victimGroups.filter(g=>g.type===type&&['waiting','reserved'].includes(g.status)).reduce((n,g)=>n+g.count,0);
 document.querySelector('#summary .metric').firstChild.textContent=onSite+' ';
 for(const h of simulation.hospitals)for(const [resource,value]of Object.entries(h.stock)){
  const el=document.querySelector(`[data-hospital="${h.id}"] [data-resource="${resource}"]`);el.textContent=value;el.classList.toggle('zero',value===0);
  el.setAttribute('aria-label',`${resource}: ${value} stock, ${h.reserved[resource]} reserved`);
 }
 const layout=ResqnetLayout.place(ResqnetLayout.items(animation));
 for(const a of ambulances){
  const el=document.querySelector(`[data-ambulance="${a.id}"]`),v=animation.vehicles[a.id],l=layout.find(l=>l.id===a.id),[x,y]=l.point;
  el.setAttribute('transform',`translate(${x},${y})`);
  const badge=el.querySelector('.cargo-badge');badge.setAttribute('visibility',l.badge?'visible':'hidden');
  const count=a.cargo.reduce((n,g)=>n+g.count,0);
  el.querySelector('[data-badge-load]').textContent=`${a.id} ${count}/${a.capacity}`;
  el.setAttribute('aria-label',`${a.id}: ${a.status}, ${count}/${a.capacity}, destination ${a.destination||'none'}`);
 }
 document.querySelector('.state').textContent=simulation.status==='resolved'?'All patients delivered':simulation.status==='running'?'Response in progress':'Awaiting dispatch';
 document.getElementById('run-note').textContent=simulation.status==='idle'?'Ready to start.':`${simulation.status==='resolved'?'Response complete · ':''}Delivered ${simulation.deliveredCount}/${totalPatients} · Under-resourced ${simulation.underResourcedCount} · Elapsed ${ResqnetAudit.time(simulation.simSeconds||0)} · Delivery trips ${ambulances.reduce((n,a)=>n+a.trips,0)}${simulation.status==='resolved'?' · Reload to restart.':''}`;
 document.getElementById('scenario-help').textContent=simulation.status==='resolved'?'Response complete. Review deliveries and verify the decision log.':simulation.status==='running'?'Click roads to change conditions during the response.':'Set road conditions, then start the response.';
 document.getElementById('dev-run').textContent=simulation.status==='idle'?'Start Simulation':simulation.status==='resolved'?'Completed':'Running';
}
const logList=document.getElementById('decision-log'),verifyResult=document.getElementById('verify-result');
let verificationFailed=false;
const decisionLog=ResqnetAudit.create(entry=>{
 const follow=logList.scrollHeight-logList.scrollTop-logList.clientHeight<35;
 const li=document.createElement('li');li.dataset.kind=entry.data.kind;li.dataset.entry=entry.data.id;
 if(entry.data.details?.underResourced)li.className='flagged';
 const stamp=document.createElement('time');stamp.textContent=`T+${entry.data.simTime} `;li.append(stamp,document.createTextNode(entry.data.text));logList.append(li);
 if(follow)logList.scrollTop=logList.scrollHeight;
 if(!verificationFailed)verifyResult.textContent=`${entry.data.id} entries recorded. Verify to check integrity.`;
});
const auditObserver=ResqnetAudit.observer(simulation,decisionLog);
document.getElementById('verify-log').addEventListener('click',async()=>{
 try{const r=await decisionLog.verify();verificationFailed=!r.ok;verifyResult.textContent=r.ok?`✓ ${r.count} entries verified, chain intact`:ResqnetAudit.failureReport(r);}catch(e){verifyResult.textContent=`Verification unavailable: ${e.message}`;}
});
// Demo mode: open index.html#audit-dev to expose the deliberate corruption control.
document.getElementById('audit-dev').hidden=location.hash!=='#audit-dev';
document.getElementById('tamper-log').addEventListener('click',async()=>{
 try{const e=await decisionLog.corrupt(2);const li=logList.querySelector('[data-entry="2"]');if(li)li.textContent=`T+${e.data.simTime} ${e.data.text}`;verifyResult.textContent='Entry 2 deliberately changed. Press Verify Log.';}catch(e){verifyResult.textContent=e.message;}
});
const playback=ResqnetPlayback.create(seconds=>auditObserver.advance(animation,seconds));
document.getElementById('playback-speed').addEventListener('change',e=>{
 playback.setSpeed(e.target.value);
 document.getElementById('playback-note').textContent=playback.rate===0?'Paused · Roads remain interactive.':`Playback ${playback.rate}× · Pause to read decisions.`;
});
let previousFrame=null;
function frame(now){
 if(previousFrame===null)previousFrame=now;
 // Bound foreground frame steps; tab suspension pauses the preview rather than skipping travel.
 const seconds=Math.min((now-previousFrame)/1000,.05);previousFrame=now;
 playback.advance(seconds);renderLiveState();
 decisionLog.flush().catch(e=>{verifyResult.textContent=`Log unavailable: ${e.message}`;});
 if(simulation.status==='running')requestAnimationFrame(frame);
}
document.getElementById('dev-run').addEventListener('click',()=>{
 if(simulation.status!=='idle')return;
 ResqnetCore.startSimulation(simulation);auditObserver.drain();document.getElementById('dev-run').disabled=true;
 document.getElementById('road-status').textContent='Roads remain interactive. Click or press Enter/Space to change conditions during travel.';
 renderLiveState();requestAnimationFrame(frame);
});
document.getElementById('reset').addEventListener('click',()=>{for(const road of roads){ResqnetCore.setRoadBlockage(animation,road.id,0);updateRoad(road,false);}document.getElementById('road-status').textContent='All roads reset to clear.';auditObserver.drain();renderLiveState();});
// Initialize edge-bound rendering before the first visible animation frame.
renderLiveState();
