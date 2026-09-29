
// Display positions only. Routing, arrival and resource state never use these offsets.
const ResqnetLayout = (() => {
 const CAP=6;
 // Geometry for the renderer comes from the current directed edge, never a lane.
 function items(controller){
  return controller.state.ambulances.map(a=>{
   const v=controller.vehicles[a.id],nodes=controller.state.nodes;let edge;
   if(v.motion){const sample=ResqnetCore.interpolatePath(nodes,v.motion.path,v.motion.elapsed,controller.speed);const i=sample.edgeIndex;edge={from:v.motion.path[i],to:v.motion.path[Math.min(i+1,v.motion.path.length-1)],progress:sample.progress};}
   else edge=v.frozenEdge||v.lastEdge;
   if(!edge){const r=controller.state.roads.find(r=>r.from===a.currentNode||r.to===a.currentNode);edge=r?{from:a.currentNode,to:r.from===a.currentNode?r.to:r.from,progress:0}:{from:a.currentNode,to:a.currentNode,progress:0};}
   const from=nodes[edge.from],to=nodes[edge.to],progress=edge.progress;
   const position=from.map((n,i)=>n+(to[i]-n)*progress);
   return {id:a.id,position,from,to,progress,edge,active:a.status!=='idle'};
  });
 }
 function place(items){
  return items.map((item,index)=>{
   const from=item.from||item.position,to=item.to||item.position,t=item.progress??0;
   const core=from.map((n,i)=>n+(to[i]-n)*t);
   const shared=items.some(other=>other.id!==item.id&&Math.hypot(other.position[0]-core[0],other.position[1]-core[1])<1e-7);
   const dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy);
   const number=Number(item.id.replace(/^A/,''))-1,slot=Number.isInteger(number)&&number>=0?number:index;
   // Identity fixes both side and magnitude; never rank/repack nearby vehicles.
   const offset=shared&&length>0?[-6,-2,2,6][slot%4]:0;
   const point=[core[0]+(length?-dy/length*offset:0),core[1]+(length?dx/length*offset:0)];
   const box={x:point[0]-29,y:point[1]-32,w:58,h:47};
   return {...box,id:item.id,core,point,offset,badge:item.active?{x:box.x,y:box.y,w:58,h:17}:null};
  });
 }
 return {place,items,CAP};
})();
