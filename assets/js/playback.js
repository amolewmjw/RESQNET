
// Playback changes only how often the identical 1/60-second simulation step runs.
const ResqnetPlayback=(()=>{
 const STEP=1/60,RATES=Object.freeze({demo:.1,normal:1,fast:4,paused:0});
 function create(advance){let remainder=0,rate=RATES.normal;return {
  setSpeed(name){if(!Object.hasOwn(RATES,name))throw Error('Unknown playback speed');rate=RATES[name];},
  advance(realSeconds){if(!Number.isFinite(realSeconds)||realSeconds<0)throw Error('Invalid playback time');remainder+=realSeconds*rate;while(remainder+1e-12>=STEP){advance(STEP);remainder=Math.max(0,remainder-STEP);}},
  get rate(){return rate;}
 };}
 function status(state,a){
  if(a.status==='stuck')return `${a.id}: Holding — ${a.stuckReason||'No reachable route'}. Waiting for road changes; retry is automatic. ${a.cargo.reduce((n,g)=>n+g.count,0)} patients aboard.`;
  if(a.status==='idle')return `${a.id}: Idle at ${a.currentNode} — ${state.status==='idle'?'awaiting start':state.status==='resolved'?'all patients delivered':state.victimGroups.some(g=>g.status==='waiting')?'available for assignment':'no unassigned patients to collect'}.`;
  if(a.status==='loading')return `${a.id}: Loading at ${a.currentNode}.`;
  if(a.status==='delivering')return `${a.id}: Unloading at ${a.currentNode}.`;
  return `${a.id}: Travelling to ${a.destination}.`;
 }
 return {create,RATES,STEP,status};
})();
