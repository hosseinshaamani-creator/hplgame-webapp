import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {readFile} from 'node:fs/promises';
test('frontend refuses service-role and new secret keys',()=>{
  for(const key of ['sb_secret_should_never_be_public',`e30.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`]){
    const r=spawnSync(process.execPath,['scripts/build.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,SUPABASE_ANON_KEY:key},encoding:'utf8'});assert.notEqual(r.status,0);assert.match(r.stderr,/secret|forbidden/);
  }
});
test('GitHub Pages paths use relative module, font and style references',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/type="module" src="app.js"/);assert.match(html,/href="styles.css"/);assert.doesNotMatch(html,/src="\//);
  const css=await readFile(new URL('../styles.css',import.meta.url),'utf8');assert.match(css,/prefers-reduced-motion/);assert.match(css,/min-height:44px/);
});
