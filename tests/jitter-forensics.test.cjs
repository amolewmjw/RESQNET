const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),{webcrypto,createHash}=require('node:crypto');
const html=require('./helpers/load-app.cjs')(),ctx=vm.createContext({crypto:webcrypto,TextEncoder});
for(const id of ['', 'resqnet-core','resqnet-audit','resqnet-layout'])vm.runInContext(html.match(id?new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`):/<script>([\s\S]*?)<\/script>/)[1],ctx);
const {C,A,L,config,scene}=vm.runInContext('({C:ResqnetCore,A:ResqnetAudit,L:ResqnetLayout,config:CONFIG,scene:SCENE})',ctx);
const near=(a,b)=>assert(Math.abs(a-b)<1e-8);
(async()=>{
// Geometry and jitter checks run separately in road-geometry.test.cjs.
const log=A.create();for(let i=0;i<4;i++)await log.append({simTime:'00:00',kind:'dispatch',text:`event ${i}`});const original=await log.export();assert((await log.verify()).ok);await log.corrupt(2);const altered=await log.export(),result=await log.verify();assert.equal(result.index,2);assert.equal(result.recordedHash,original[1].hash);const expected=createHash('sha256').update(A.canonical(altered[1].data)+original[0].hash).digest('hex');assert.equal(result.recomputedHash,expected);assert.notEqual(result.recordedHash,result.recomputedHash);const report=A.failureReport(result);assert(report.includes(result.recordedHash)&&report.includes(expected));console.log('PASS entry 2 exposes full recorded hash and independently verified recomputed hash');
const links=JSON.parse(JSON.stringify(original));links[1].previousHash='f'.repeat(64);const lr=await A.verify(links);assert.equal(lr.reason,'Previous-hash link changed');assert(A.failureReport(lr).includes('Expected previous hash:'));console.log('PASS broken-link failure also displays recorded and expected previous hashes');
console.log('2/2 forensic checks passed. Browser verification not claimed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
