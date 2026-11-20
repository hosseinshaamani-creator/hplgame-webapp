import {cp, mkdir, readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dist=resolve(import.meta.dirname,'../dist');
// Copy a snapshot of the production files, excluding the staging directory itself.
const entries=(await readdir(dist)).filter(name=>name!=='staging');
await mkdir(resolve(dist,'staging'),{recursive:true});
for(const name of entries)await cp(resolve(dist,name),resolve(dist,'staging',name),{recursive:true});
console.log('Pages artifact ready, including /staging/ (same backend; use test accounts).');
