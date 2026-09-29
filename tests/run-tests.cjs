const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const files=['structure.test.cjs','phase2.test.cjs','phase3.test.cjs','phase4.test.cjs','phase45.test.cjs','phase5.test.cjs','road-geometry.test.cjs','jitter-forensics.test.cjs','playback-status.test.cjs','phase6-ui.test.cjs','phase4-collision.test.cjs'];
let failures=0,detail='',summary=[];
const {createHash}=require('node:crypto');
const manifestPath=path.join(__dirname,'../suite-manifest.json');
if(!fs.existsSync(manifestPath)){console.log('FAIL missing suite-manifest.json');failures++;}
else{const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));for(const [file,expected]of Object.entries(manifest.sha256)){const target=path.join(__dirname,'..',file);if(!fs.existsSync(target)||createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==expected){console.log('FAIL version mismatch: '+file);failures++;}}}

for(const file of files){const r=spawnSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8',cwd:__dirname});const pass=r.status===0;failures+=!pass;const line=`${pass?'PASS':'FAIL'} ${file}${file==='phase4-collision.test.cjs'?' (compatibility alias for road-geometry.test.cjs)':''}`;summary.push(line);console.log(line);detail+=`\n${line}\n${r.stdout||''}${r.stderr||''}`;if(!pass)console.log(r.stderr||r.stdout||r.error);}
summary.push(`Files: ${summary.filter(s=>s.startsWith("PASS")).length} PASS, ${summary.filter(s=>s.startsWith("FAIL")).length} FAIL; integrity errors: ${failures-summary.filter(s=>s.startsWith("FAIL")).length}`);console.log(summary.at(-1));fs.writeFileSync(path.join(__dirname,'../docs/test-results.txt'),summary.join('\n')+'\n'+detail);process.exitCode=failures?1:0;
