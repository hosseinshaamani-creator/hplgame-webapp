import { build } from 'esbuild';
import { mkdir,copyFile,writeFile,readFile,rm } from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'dist');
// Only delete the known generated build directory inside this project.
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const file of ['index.html','styles.css','discovery.css','manifest.webmanifest','Vazirmatn-Regular.ttf','Vazirmatn-Bold.ttf','.nojekyll'])await copyFile(resolve(root,file),resolve(output,file));
let env={};for(const file of ['.env','.env.local']){try{Object.assign(env,Object.fromEntries((await readFile(resolve(root,file),'utf8')).split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{let i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];})));}catch{}}
const url=process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL||env.VITE_SUPABASE_URL||env.SUPABASE_URL||'',key=process.env.VITE_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY||env.VITE_SUPABASE_ANON_KEY||env.SUPABASE_ANON_KEY||'';
if(key.startsWith('sb_secret_'))throw new Error('A secret key must never enter the frontend.');
if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role==='service_role')throw new Error('service_role is forbidden in frontend');}catch(e){if(e.message.includes('forbidden'))throw e;}}
if(url&&!/^https:\/\/[^/]+\.supabase\.co$/.test(url))throw new Error('Invalid Supabase project URL');
await build({entryPoints:[resolve(root,'app.js')],bundle:true,splitting:true,format:'esm',target:'es2022',outdir:output,chunkNames:'chunks/[name]-[hash]',minify:true,plugins:[{name:'public-config',setup(builder){builder.onLoad({filter:/[\\/]config\.js$/},()=>({contents:`export const config=${JSON.stringify({supabaseUrl:url,supabaseAnonKey:key,basePath:process.env.APP_BASE_PATH||env.APP_BASE_PATH||'/hplgame-webapp/'})};`,loader:'js'}));}}]});
// Stable content versions prevent returning visitors from loading a previous release.
let html=await readFile(resolve(output,'index.html'),'utf8');
for(const file of ['app.js','styles.css','discovery.css']){
  const version=createHash('sha256').update(await readFile(resolve(output,file))).digest('hex').slice(0,12);
  html=html.replace(`"${file}"`,`"${file}?v=${version}"`);
}
await writeFile(resolve(output,'index.html'),html);
console.log(`Production build ready: dist (online accounts: ${!!url&&!!key})`);
