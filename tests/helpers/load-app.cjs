// Load production assets in the exact order declared by index.html.
// Reconstruct inline tags only in memory for the existing VM-based tests.
const fs=require('node:fs'),path=require('node:path');
module.exports=function(file=path.resolve(__dirname,'../../index.html')){
 const dir=path.dirname(file);
 return fs.readFileSync(file,'utf8').replace(/<script([^>]*?) src="([^"]+)"><\/script>/g,(_,attrs,src)=>`<script${attrs}>${fs.readFileSync(path.resolve(dir,src),'utf8')}</script>`);
};
