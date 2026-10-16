import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..',process.argv[2]||'dist'),port=Number(process.env.PORT||4181);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.ttf':'font/ttf'};
createServer(async(req,res)=>{try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/hplgame-webapp(?=\/|$)/,'');if(pathname.endsWith('/'))pathname+='index.html';let file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw new Error('Forbidden');if(!(await stat(file)).isFile())throw new Error('Missing');res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`HPLGAME: http://127.0.0.1:${port}/hplgame-webapp/`));
