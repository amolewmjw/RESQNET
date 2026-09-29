
const ResqnetAudit = (() => {
 const clone=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 const time=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
 async function hash(data,previousHash){
  if(!globalThis.crypto?.subtle)throw Error('SHA-256 unavailable. Open in a secure browser context (HTTPS or localhost).');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(data)+previousHash))),n=>n.toString(16).padStart(2,'0')).join('');
 }
 async function verify(entries,expectedHead){
  let previous='0'.repeat(64);
  for(let i=0;i<entries.length;i++){
   const e=entries[i];
   const recomputedHash=await hash(e.data,previous);
   if(e.data.id!==i+1||e.previousHash!==previous||recomputedHash!==e.hash)return {
    ok:false,index:i+1,count:entries.length,
    reason:e.data.id!==i+1?'Entry sequence changed':e.previousHash!==previous?'Previous-hash link changed':'Entry hash mismatch',
    recordedHash:e.hash,recomputedHash,recordedPreviousHash:e.previousHash,expectedPreviousHash:previous
   };
   previous=e.hash;
  }
  if(expectedHead!==undefined&&previous!==expectedHead)return {ok:false,index:entries.length+1,count:entries.length,reason:'Chain tail changed',recordedHash:expectedHead,recomputedHash:previous};
  return {ok:true,count:entries.length};
 }
 function failureReport(r){
  let result=`✗ Tampering detected at entry ${r.index}: ${r.reason}\nRecorded hash:\n${r.recordedHash}\nRecomputed hash:\n${r.recomputedHash}`;
  if(r.recordedPreviousHash!==undefined&&r.recordedPreviousHash!==r.expectedPreviousHash)result+=`\nRecorded previous hash:\n${r.recordedPreviousHash}\nExpected previous hash:\n${r.expectedPreviousHash}`;
  return result;
 }
 function create(onAppend=()=>{}){
  const entries=[];let queue=Promise.resolve(),issued=0,head='0'.repeat(64);
  return {
   append(data){const copy=clone({...data,id:++issued});queue=queue.then(async()=>{const entry={data:copy,previousHash:head,hash:await hash(copy,head)};entries.push(entry);head=entry.hash;onAppend(clone(entry));return clone(entry);});return queue;},
   async verify(){await queue;return verify(clone(entries),head);},
   async export(){await queue;return clone(entries);},
   async corrupt(index=2){await queue;if(!entries[index-1])throw Error(`Entry ${index} does not exist yet`);entries[index-1].data.text+=' [DEMO ALTERATION]';return clone(entries[index-1]);},
   flush:()=>queue
  };
 }
 function describe(e){
  if(e.kind==='dispatch')return `${e.ambulanceId} ${e.reassignment?'reassigned':'dispatched'}: ${e.patientIds.join(', ')}. ${e.text}. Route ${e.route.join(' → ')||'unreachable'}. ${e.reason}.`;
  if(e.kind==='hospital_select')return `${e.text}. ${e.reason}. ${e.candidates.map(c=>`${c.hospitalId}: ${!c.reachable?'unreachable':c.sufficient?'eligible':'insufficient'} (${e.needs.map(k=>`${k} ${c.available[k]}/${e.count}`).join(', ')}${c.reachable?`; cost ${c.cost.toFixed(1)}`:''})`).join('; ')}.`;
  if(e.kind==='delivery')return `${e.text}; ${e.patientIds.join(', ')}; stock ${Object.keys(e.before).map(k=>`${k} ${e.before[k]} → ${e.after[k]}`).join(', ')}.`;
  if(e.kind==='reroute')return `${e.text}. Old: ${e.oldPath?.join(' → ')||'none'}. New: ${(e.newPath||e.route)?.join(' → ')||'unreachable'}. ${e.reason||''}`;
  return e.text;
 }
 function observer(state,log){
  let cursor=0,nextMinute=60;
  function drain(){while(cursor<state.events.length){const e=state.events[cursor++];log.append({simTime:time(e.simSeconds||0),kind:e.kind==='dispatch'&&e.reassignment?'reassignment':e.kind,text:describe(e),details:clone(e)}).catch(()=>{});}}
  function snapshot(at){const types=[...new Set(state.victimGroups.map(g=>g.type))];const counts=types.map(t=>`${t}: ${state.victimGroups.filter(g=>g.type===t&&['waiting','reserved'].includes(g.status)).reduce((n,g)=>n+g.count,0)}`);log.append({simTime:time(at),kind:'snapshot',text:`On site (${counts.join(', ')}). ${state.ambulances.map(a=>`${a.id} ${a.status}${a.destination?' → '+a.destination:''}`).join('; ')}.`,details:{simSeconds:at}}).catch(()=>{});}
  return {drain,advance(controller,seconds){
   // Split only at minute boundaries so snapshot state and timestamps match.
   let left=seconds;drain();
   do{const now=state.simSeconds||0,step=Math.min(left,Math.max(0,nextMinute-now));ResqnetCore.advanceAnimation(controller,step);left-=step;drain();
    if((state.simSeconds||0)>=nextMinute-1e-8){snapshot(nextMinute);nextMinute+=60;}
    if(state.status!=='running')break;
   }while(left>1e-9);
  }};
 }
 return {create,verify,hash,canonical,time,describe,observer,failureReport};
})();
