const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{webcrypto}=require('node:crypto');
const html=require('./helpers/load-app.cjs')(),ctx=vm.createContext({crypto:webcrypto,TextEncoder});
for(const id of ['', 'resqnet-core','resqnet-audit','resqnet-playback'])vm.runInContext(html.match(id?new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`):/<script>([\s\S]*?)<\/script>/)[1],ctx);
const {C,A,P,config,scene}=vm.runInContext('({C:ResqnetCore,A:ResqnetAudit,P:ResqnetPlayback,config:CONFIG,scene:SCENE})',ctx);
(async()=>{
async function run(speed){const s=C.createState(config,scene.nodes),an=C.createAnimation(s),log=A.create(),o=A.observer(s,log),p=P.create(dt=>o.advance(an,dt));p.setSpeed(speed);C.startSimulation(s);let real=0;while(s.status==='running'&&real<1000){p.advance(1/60);real+=1/60;}assert.equal(s.deliveredCount,13);assert((await log.verify()).ok);return {entries:JSON.stringify(await log.export()),real};}
const demo=await run('demo'),normal=await run('normal'),fast=await run('fast');assert.equal(demo.entries,normal.entries);assert.equal(normal.entries,fast.entries);console.log(`PASS identical timestamps, entry data and every hash at Demo/Normal/Fast; durations ${demo.real.toFixed(2)}/${normal.real.toFixed(2)}/${fast.real.toFixed(2)} real seconds`);
let steps=0;const p=P.create(()=>steps++);p.advance(1);assert.equal(steps,60);p.setSpeed('paused');p.advance(100);assert.equal(steps,60);p.setSpeed('fast');p.advance(1);assert.equal(steps,300);console.log('PASS default Normal (original 1×), pause, resume and speed changes');
const s=C.createState(config,scene.nodes),a=s.ambulances[0];a.status='stuck';a.stuckReason='No reachable route to H1';assert(P.status(s,a).includes('No reachable route to H1'));assert(P.status(s,a).includes('retry is automatic'));a.status='loading';assert(P.status(s,a).includes('Loading'));a.status='idle';s.status='resolved';assert(P.status(s,a).includes('all patients delivered'));console.log('PASS persistent holding/loading/idle explanations');
console.log('3/3 playback/status tests passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
