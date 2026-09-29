
/* Pure simulation core. No DOM, clocks, animation or automatic dispatch. */
const ResqnetCore = (() => {
  const GROUP_STATUSES = Object.freeze(['waiting','reserved','loaded','delivered']);
  const AMBULANCE_STATUSES = Object.freeze(['idle','to_incident','loading','to_hospital','delivering','stuck']);
  const NEEDS = Object.freeze({bloodloss:Object.freeze(['blood']),fracture:Object.freeze(['beds']),unconscious:Object.freeze(['icu','vent']),limbloss:Object.freeze(['icu','blood']),respiratory:Object.freeze(['vent'])});
  // Costs are schematic distance units, not minutes or real kilometres.
  // Partial roads cost 3x; fully blocked edges are excluded from new routes.
  const PENALTIES = Object.freeze([1,3,Infinity]);
  const emptyResources = () => ({icu:0,blood:0,vent:0,beds:0});
  const distance = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);
  function createState(config, geometry) {
    const nodes = Object.fromEntries(Object.entries(geometry).map(([id,xy])=>[id,[...xy]]));
    const roads = config.edges.map(([from,to],i)=>({id:`R${i+1}`,from,to,baseDistance:distance(nodes[from],nodes[to]),blockage:0}));
    let nextPatient=1;
    const victimGroups = Object.entries(config.patients).map(([type,count],i)=>({
      id:`G${i+1}`,sequence:i,type,count,status:'waiting',assignedAmbulanceId:null,
      patientIds:Array.from({length:count},()=>`P${String(nextPatient++).padStart(2,'0')}`)
    }));
    const ambulances = Array.from({length:config.fleet.count},(_,i)=>{
      const homeNode=config.fleet.bases[i%config.fleet.bases.length];
      return {id:`A${i+1}`,homeNode,capacity:config.fleet.capacity,status:'idle',
        claimedGroups:[],cargo:[],currentNode:homeNode,currentPath:[],pathProgress:0,
        currentEdge:null,destination:null,stuckReason:null,hospitalReservation:null,
        trips:0,resumeStatus:null,stuckRoadSignature:null};
    });
    const hospitals=config.hospitals.map(h=>({id:h.id,name:h.name,node:h.node,stock:{...h.stock},reserved:emptyResources()}));
    return {status:'idle',tick:0,events:[],deliveredCount:0,underResourcedCount:0,nextGroupId:victimGroups.length,incidentNode:config.incident.node,nodes,roads,victimGroups,ambulances,hospitals};
  }
  function availableResources(hospital) {
    return Object.fromEntries(Object.keys(hospital.stock).map(k=>[k,hospital.stock[k]-hospital.reserved[k]]));
  }
  // Both waiting and reserved groups remain physically at the incident.
  function onSiteCount(groups) {
    return groups.filter(g=>g.status==='waiting'||g.status==='reserved').reduce((sum,g)=>sum+g.count,0);
  }
  /**
   * astar(graph, start, destination)
   * start: node ID OR {from,to,progress,traversalPenalty?} on a directed edge.
   * progress: fraction traversed in [0,1]. Mid-edge starts must finish toward `to`.
   * traversalPenalty captures the cost multiplier on ENTERING the current edge;
   * defaults to 1. Thus a newly blocked edge can still be completed, but is never
   * entered by a new route. Later animation should retain this entry multiplier.
   * Arbitrary off-road coordinates are intentionally not snapped to a road.
   * Returns null when unreachable; malformed arguments throw descriptive errors.
   * path contains remaining graph nodes; points starts at the exact current position.
   */
  function astar(graph,start,destination) {
    const {nodes,roads}=graph;
    if(!Object.hasOwn(nodes,destination))throw new Error(`Unknown destination: ${destination}`);
    const adjacency=new Map(Object.keys(nodes).map(id=>[id,[]]));
    for(const edge of roads){
      if(!adjacency.has(edge.from)||!adjacency.has(edge.to)||!Number.isFinite(edge.baseDistance)||edge.baseDistance<distance(nodes[edge.from],nodes[edge.to])-1e-9||![0,1,2].includes(edge.blockage))throw new Error(`Invalid edge: ${edge.id}`);
      const cost=edge.baseDistance*PENALTIES[edge.blockage];
      if(Number.isFinite(cost)){adjacency.get(edge.from).push({to:edge.to,cost});adjacency.get(edge.to).push({to:edge.from,cost});}
    }
    let origin,position,remainingEdgeCost=0,initialSegment=null;
    if(typeof start==='string'){
      if(!Object.hasOwn(nodes,start))throw new Error(`Unknown start: ${start}`);
      origin=start;position=[...nodes[start]];
    }else{
      if(!start||!Object.hasOwn(nodes,start.from)||!Object.hasOwn(nodes,start.to)||!Number.isFinite(start.progress)||start.progress<0||start.progress>1)throw new Error('Invalid mid-edge position');
      const edge=roads.find(e=>(e.from===start.from&&e.to===start.to)||(e.from===start.to&&e.to===start.from));
      if(!edge)throw new Error('Mid-edge position must reference an existing road');
      const penalty=start.traversalPenalty??1;
      if(!Number.isFinite(penalty)||penalty<1)throw new Error('Invalid traversal penalty');
      position=nodes[start.from].map((v,i)=>v+(nodes[start.to][i]-v)*start.progress);
      if(start.progress===0){origin=start.from;} // At a junction: do not enter a blocked edge.
      else {origin=start.to;remainingEdgeCost=edge.baseDistance*(1-start.progress)*penalty;
        if(start.progress<1)initialSegment={edgeId:edge.id,from:[...position],to:[...nodes[start.to]],cost:remainingEdgeCost};}
    }
    const open=new Set([origin]),gScore=new Map([[origin,0]]),cameFrom=new Map();
    const heuristic=id=>distance(nodes[id],nodes[destination]);
    while(open.size){
      let current=null,best=Infinity;
      for(const id of open){const f=gScore.get(id)+heuristic(id);if(f<best){current=id;best=f;}}
      if(current===destination){
        const path=[current];while(cameFrom.has(path[0]))path.unshift(cameFrom.get(path[0]));
        const points=path.map(id=>[...nodes[id]]);if(initialSegment)points.unshift([...position]);
        return {path,points,cost:gScore.get(current)+remainingEdgeCost,remainingEdgeCost,initialSegment};
      }
      open.delete(current);
      for(const next of adjacency.get(current)){
        const candidate=gScore.get(current)+next.cost;
        if(candidate<(gScore.get(next.to)??Infinity)){
          cameFrom.set(next.to,current);gScore.set(next.to,candidate);open.add(next.to);
        }
      }
    }
    return null;
  }
  const PRIORITY = Object.freeze({unconscious:0,respiratory:0,limbloss:1,bloodloss:1,fracture:2});
  const roadSignature = state => state.roads.map(e=>`${e.id}:${e.blockage}`).join('|');
  function event(state,kind,text,details={}) {
    state.events.push({id:state.events.length+1,tick:state.tick,simSeconds:state.simSeconds||0,kind,text,...details});
  }
  function markStuck(state,a,resumeStatus,reason) {
    a.status='stuck';a.resumeStatus=resumeStatus;a.stuckReason=reason;
    a.stuckRoadSignature=roadSignature(state);
    event(state,'stuck',`${a.id}: ${reason}`,{ambulanceId:a.id});
  }
  function routeFor(state,a,destination) {
    return astar(state,a.currentNode,destination);
  }
  function claim(state,a) {
    const group=state.victimGroups.filter(g=>g.status==='waiting')
      .sort((x,y)=>PRIORITY[x.type]-PRIORITY[y.type]||x.sequence-y.sequence)[0];
    if(!group)return false;
    let batch=group;
    if(group.count>a.capacity){
      const ids=group.patientIds.splice(0,a.capacity);
      group.count-=a.capacity;
      batch={...group,id:`G${++state.nextGroupId}`,count:ids.length,patientIds:ids};
      state.victimGroups.push(batch);
    }
    batch.status='reserved';batch.assignedAmbulanceId=a.id;
    a.claimedGroups=[batch];a.destination=state.incidentNode;a.status='to_incident';
    const route=routeFor(state,a,a.destination);
    a.currentPath=route?route.path:[];
    event(state,'dispatch',`${a.id} claimed ${batch.count} ${batch.type} patients`,{ambulanceId:a.id,groupId:batch.id,patientIds:[...batch.patientIds],route:[...a.currentPath],reassignment:a.trips>0,reason:'Highest-priority waiting group; stable fleet order; capacity-sized batch; A* route'});
    if(!route)markStuck(state,a,'to_incident','No reachable route to incident');
    return true;
  }
  function selectHospital(state,a) {
    // Every batch has one injury type, per the approved homogeneous-group rule.
    const count=a.cargo.reduce((n,g)=>n+g.count,0),needs=NEEDS[a.cargo[0].type];
    const considered=state.hospitals.map(h=>{
      const route=routeFor(state,a,h.node),available=availableResources(h);
      const coverage=Math.max(0,Math.min(...needs.map(k=>available[k])));
      return {hospital:h,route,available,coverage,sufficient:coverage>=count};
    });
    const candidates=considered.filter(c=>c.route!==null);
    if(!candidates.length){
      a.destination=null;a.currentPath=[];
      event(state,'hospital_select',`${a.id}: no reachable hospital`,{ambulanceId:a.id,needs,count,candidates:considered.map(c=>({hospitalId:c.hospital.id,available:{...c.available},coverage:c.coverage,cost:null,sufficient:c.sufficient,reachable:false})),reason:'All hospitals unreachable; holding cargo'});
      markStuck(state,a,'hospital_select','No reachable hospital');return false;
    }
    const sufficient=candidates.filter(c=>c.sufficient);
    // Fully resourced: shortest reachable route. Fallback: most complete resource
    // bundles (min across both resources), then shortest route, then hospital ID.
    const ranked=(sufficient.length?sufficient:candidates).sort((x,y)=>
      (sufficient.length?0:y.coverage-x.coverage)||x.route.cost-y.route.cost||x.hospital.id.localeCompare(y.hospital.id));
    const chosen=ranked[0],h=chosen.hospital,amounts=emptyResources();
    for(const k of needs){amounts[k]=Math.max(0,Math.min(count,chosen.available[k]));h.reserved[k]+=amounts[k];}
    a.hospitalReservation={hospitalId:h.id,amounts,underResourced:!chosen.sufficient};
    a.destination=h.node;a.currentPath=chosen.route.path;a.status='to_hospital';a.stuckReason=null;a.resumeStatus=null;
    event(state,'hospital_select',`${a.id} selected ${h.id}${chosen.sufficient?'':' (under-resourced)'}`,{
      ambulanceId:a.id,hospitalId:h.id,underResourced:!chosen.sufficient,
      reason:chosen.sufficient?'Shortest reachable route with sufficient available resources':'Highest available complete-resource coverage; route cost breaks ties',
      needs:[...needs],count,route:[...chosen.route.path],reserved:{...amounts},candidates:considered.map(c=>({hospitalId:c.hospital.id,available:{...c.available},coverage:c.coverage,cost:c.route?c.route.cost:null,sufficient:c.sufficient,reachable:!!c.route}))
    });return true;
  }
  function deliver(state,a) {
    const reservation=a.hospitalReservation,h=state.hospitals.find(h=>h.id===reservation.hospitalId);
    const before={...h.stock},consumed=emptyResources();
    const needs=NEEDS[a.cargo[0].type],count=a.cargo.reduce((n,g)=>n+g.count,0);
    for(const k of Object.keys(reservation.amounts)){
      const own=reservation.amounts[k],others=h.reserved[k]-own;
      consumed[k]=Math.max(0,Math.min(own,h.stock[k]-others));
      h.stock[k]-=consumed[k];h.reserved[k]-=own;
    }
    const underResourced=needs.some(k=>consumed[k]<count);
    const patientIds=a.cargo.flatMap(g=>g.patientIds);
    for(const group of a.cargo){group.status='delivered';group.deliveredHospitalId=h.id;group.underResourced=underResourced;}
    a.trips++;state.deliveredCount+=count;if(underResourced)state.underResourcedCount+=count;
    event(state,'delivery',`${a.id} delivered ${count} patients to ${h.id}${underResourced?' — under-resourced delivery':''}`,{
      ambulanceId:a.id,hospitalId:h.id,patientIds,count,underResourced,before,after:{...h.stock},consumed
    });
    a.cargo=[];a.claimedGroups=[];a.hospitalReservation=null;a.currentPath=[];a.destination=null;
    a.status='idle';a.stuckReason=null;a.resumeStatus=null;
    claim(state,a); // Reassign immediately; otherwise idle at the delivery node.
  }
  function startSimulation(state) {
    if(state.status==='idle'){state.status='running';event(state,'start','Simulation started');}
    return state;
  }
  function tick(state, hooks={}) {
    if(state.status!=='running')return state;
    state.tick++;
    const signature=roadSignature(state);
    for(const a of state.ambulances){
      if(a.status==='stuck'){
        if(hooks.retryStuck){hooks.retryStuck(a);continue;}
        if(a.stuckRoadSignature===signature)continue;
        const resume=a.resumeStatus;
        if(resume==='hospital_select'){selectHospital(state,a);continue;}
        const route=routeFor(state,a,a.destination);
        if(!route){a.stuckRoadSignature=signature;continue;}
        a.status=resume;a.stuckReason=null;a.resumeStatus=null;a.currentPath=route.path;
        event(state,'reroute',`${a.id} route restored after road change`,{ambulanceId:a.id,route:[...route.path],reason:'Destination reachable again'});
        // Recovery is observable for one tick, before the next instantaneous trip.
        continue;
      }
      if(hooks.canTransition&&!hooks.canTransition(a))continue;
      switch(a.status){
        case 'idle': claim(state,a);break;
        case 'to_incident':
        case 'to_hospital': {
          if(hooks.canArrive&&!hooks.canArrive(a))break;
          const travellingStatus=a.status,route=hooks.arrivalRoute?hooks.arrivalRoute(a):routeFor(state,a,a.destination);
          if(!route){markStuck(state,a,travellingStatus,`No reachable route to ${a.destination}`);break;}
          a.currentPath=route.path;a.currentNode=a.destination;a.pathProgress=0;a.currentEdge=null;
          a.status=travellingStatus==='to_incident'?'loading':'delivering';
          event(state,'arrival',`${a.id} arrived at ${a.currentNode}`,{ambulanceId:a.id});break;
        }
        case 'loading':
          a.cargo=a.claimedGroups;a.claimedGroups=[];
          for(const g of a.cargo)g.status='loaded';
          event(state,'pickup',`${a.id} loaded ${a.cargo.reduce((n,g)=>n+g.count,0)} patients`,{ambulanceId:a.id});
          selectHospital(state,a);break;
        case 'delivering': deliver(state,a);break;
      }
    }
    if(state.victimGroups.every(g=>g.status==='delivered')&&state.ambulances.every(a=>!a.cargo.length&&!a.claimedGroups.length)){
      state.status='resolved';event(state,'resolved','All patients delivered');
    }
    return state;
  }

  // Distance is in schematic map units; elapsed and dwell durations are seconds.
  function interpolatePath(nodes,path,elapsed,speed) {
    if(!path.length||!Number.isFinite(elapsed)||elapsed<0||!Number.isFinite(speed)||speed<=0)throw new Error('Invalid interpolation input');
    let remaining=elapsed*speed;
    for(let i=0;i<path.length-1;i++){
      const from=nodes[path[i]],to=nodes[path[i+1]],length=distance(from,to);
      if(length>0&&remaining<length){const progress=remaining/length;return {position:from.map((v,k)=>v+(to[k]-v)*progress),edgeIndex:i,progress,done:false};}
      remaining-=length;
    }
    return {position:[...nodes[path[path.length-1]]],edgeIndex:Math.max(0,path.length-2),progress:1,done:true};
  }
  function createAnimation(state,{speed=70,dwell=.7}={}) {
    if(!Number.isFinite(speed)||speed<=0||!Number.isFinite(dwell)||dwell<0)throw new Error('Invalid animation settings');
    return {state,speed,dwell,vehicles:Object.fromEntries(state.ambulances.map(a=>[a.id,{position:[...state.nodes[a.currentNode]],motion:null,pause:0}]))};
  }
  function motionEdge(controller,a){
    const v=controller.vehicles[a.id];
    if(!v.motion)return v.frozenEdge||v.lastEdge||null;
    const m=v.motion,s=interpolatePath(controller.state.nodes,m.path,m.elapsed,controller.speed),i=s.edgeIndex;
    return {from:m.path[i],to:m.path[Math.min(i+1,m.path.length-1)],progress:s.progress,index:i};
  }
  function entryPenalty(state,from,to){const road=state.roads.find(r=>(r.from===from&&r.to===to)||(r.from===to&&r.to===from));return road&&road.blockage===1?3:1;}
  function reroute(controller,a,reason){
    const {state}=controller,v=controller.vehicles[a.id],edge=motionEdge(controller,a);
    const oldPath=[...a.currentPath],oldStatus=a.status==='stuck'?a.resumeStatus:a.status;
    const mid=edge&&edge.progress>0&&edge.progress<1;
    const start=mid?{from:edge.from,to:edge.to,progress:edge.progress,traversalPenalty:v.entryPenalty||1}:(edge?(edge.progress===0?edge.from:edge.to):a.currentNode);
    const route=astar(state,start,a.destination);
    const position=[...v.position];
    v.pendingReroute=null;
    if(!route){
      v.frozenEdge=edge?{...edge}:null;v.motion=null;
      markStuck(state,a,oldStatus,`No reachable route to ${a.destination}`);
    }else{
      const path=mid?[edge.from,...route.path]:route.path;
      const elapsed=mid?distance(state.nodes[edge.from],state.nodes[edge.to])*edge.progress/controller.speed:0;
      a.currentPath=path;a.status=oldStatus;a.stuckReason=null;a.resumeStatus=null;a.stuckRoadSignature=null;
      a.currentNode=mid?edge.from:start;
      v.motion={status:a.status,path:[...path],elapsed,done:false};v.frozenEdge=null;
      if(!mid){v.entryPenalty=entryPenalty(state,path[0],path[1]);v.entryEdge=path[0]+":"+path[1];}
    }
    v.position=position;
    event(state,'reroute',`${a.id}: ${route?'route recomputed':'no route; holding position'}`,{ambulanceId:a.id,reason,oldPath,newPath:route?[...a.currentPath]:[],route:route?[...a.currentPath]:[],start:typeof start==='string'?start:{...start},position,cost:route?route.cost:null});
    return route;
  }
  function setRoadBlockage(controller,id,blockage){
    const {state}=controller,road=state.roads.find(r=>r.id===id);
    if(!road||![0,1,2].includes(blockage))throw Error('Invalid road/blockage');
    if(road.blockage===blockage)return;
    road.blockage=blockage;
    event(state,'road_change',`Road ${road.from}–${road.to}: ${['clear','partial','blocked'][blockage]}`,{roadId:id,blockage});
    if(state.status!=='running')return;
    for(const a of state.ambulances){
      const v=controller.vehicles[a.id];if(!v.motion||!['to_incident','to_hospital'].includes(a.status))continue;
      const edge=motionEdge(controller,a),path=v.motion.path;
      const matches=(x,y)=>(x===road.from&&y===road.to)||(x===road.to&&y===road.from);
      const affected=path.slice(edge.index).some((x,i,rest)=>i+1<rest.length&&matches(x,rest[i+1]));
      if(!affected)continue;
      const reason=`Road ${road.from}–${road.to} changed to ${['clear','partial','blocked'][blockage]}`;
      if(v.pendingReroute)continue;
      if(blockage>0&&edge.progress>0&&edge.progress<1&&matches(edge.from,edge.to)){
        v.pendingReroute=reason; // Finish precisely this segment before replanning.
      }else reroute(controller,a,reason);
    }
  }
  function advanceAnimation(controller,seconds) {
    if(!Number.isFinite(seconds)||seconds<0)throw new Error('Invalid elapsed time');
    const {state,vehicles}=controller;if(state.status!=='running')return controller;
    state.simSeconds=(state.simSeconds||0)+seconds;
    // Each call is a discrete dispatch opportunity. A transition starts its next
    // journey at elapsed=0: unused time never teleports through pickup/delivery.
    for(const a of state.ambulances){const v=vehicles[a.id];v.pause=Math.max(0,v.pause-seconds);
      if(v.motion){
        const edge=motionEdge(controller,a),m=v.motion;
        const remaining=distance(state.nodes[edge.from],state.nodes[edge.to])*(1-edge.progress);
        const deferred=v.pendingReroute&&remaining<=seconds*controller.speed+1e-9;
        m.elapsed+=deferred?remaining/controller.speed:seconds;
        const sample=interpolatePath(state.nodes,m.path,m.elapsed,controller.speed);
        v.position=sample.position;v.lastEdge={from:m.path[sample.edgeIndex],to:m.path[Math.min(sample.edgeIndex+1,m.path.length-1)],progress:sample.progress};m.done=sample.done;a.pathProgress=sample.progress;
        const key=v.lastEdge.from+":"+v.lastEdge.to;if(v.entryEdge!==key){v.entryEdge=key;v.entryPenalty=entryPenalty(state,v.lastEdge.from,v.lastEdge.to);}
        if(deferred){
          // Roundoff must not reinterpret an endpoint as still mid-edge.
          v.position=[...state.nodes[edge.to]];v.lastEdge={from:edge.from,to:edge.to,progress:1};
          const reason=v.pendingReroute;v.motion=null;v.frozenEdge={...v.lastEdge};a.currentNode=edge.to;
          reroute(controller,a,reason+'; completed current edge');
        }
      }
    }
    tick(state,{
      retryStuck:a=>{
        if(a.stuckRoadSignature===roadSignature(state))return;
        if(a.resumeStatus==='hospital_select'){selectHospital(state,a);return;}
        reroute(controller,a,'Road state changed; retry from held position');
      },
      arrivalRoute:a=>({path:[...vehicles[a.id].motion.path]}),
      canArrive:a=>!!vehicles[a.id].motion?.done,
      canTransition:a=>!['loading','delivering'].includes(a.status)||vehicles[a.id].pause===0
    });
    for(const a of state.ambulances){const v=vehicles[a.id];
      if(['to_incident','to_hospital'].includes(a.status)){
        if(!v.motion||v.motion.status!==a.status||v.motion.done){v.motion={status:a.status,path:[...a.currentPath],elapsed:0,done:false};v.position=[...state.nodes[a.currentNode]];a.pathProgress=0;v.entryEdge=a.currentPath[0]+":"+a.currentPath[1];v.entryPenalty=entryPenalty(state,a.currentPath[0],a.currentPath[1]);}
      }else{
        if(v.motion&&['loading','delivering'].includes(a.status))v.pause=controller.dwell;
        v.motion=null;if(a.status!=='stuck')v.position=[...state.nodes[a.currentNode]];
      }
    }
    return controller;
  }

  return Object.freeze({GROUP_STATUSES,AMBULANCE_STATUSES,NEEDS,PENALTIES,createState,availableResources,onSiteCount,astar,PRIORITY,startSimulation,tick,interpolatePath,createAnimation,advanceAnimation,setRoadBlockage,motionEdge});
})();
