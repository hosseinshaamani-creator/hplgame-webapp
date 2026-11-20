import test from 'node:test';
import assert from 'node:assert/strict';
import {createLearningStore} from '../lib/learning-store.js';

test('cloud queue snapshots changes, serializes versions and recovers network failures',async()=>{
  const requests=[],statuses=[];let fail=true;
  const client={rpc:async(name,args)=>{requests.push({...args});if(fail)throw new TypeError('offline');return {data:{version:args.p_version+1}};}};
  const store=createLearningStore({client,userId:'A',onStatus:s=>statuses.push(s)});
  const game={id:'one',idea:'پازل اعداد',step:0,won:false,messages:[]};
  store.enqueue(game);game.step=1;
  assert.equal(await store.flush(),false);assert.equal(store.hasPending(),true);
  assert.equal(requests[0].p_step,0);assert.equal(statuses.at(-1).kind,'error');
  fail=false;assert.equal(await store.flush(),true);assert.equal(store.hasPending(),false);
  store.enqueue(game);assert.equal(await store.flush(),true);assert.equal(requests.at(-1).p_version,1);
  assert.equal(requests.at(-1).p_step,1);store.stop();store.enqueue(game);assert.equal(await store.flush(),false);
});

test('edits while saving survive; version conflicts never silently overwrite',async()=>{
  let release,version=0;const statuses=[];
  const client={rpc:async(_name,args)=>{if(!version)await new Promise(r=>release=r);version++;return {data:{version}};}};
  const store=createLearningStore({client,userId:'A',onStatus:s=>statuses.push(s)});
  const game={id:'one',idea:'مار',step:0,won:false,messages:[]};store.enqueue(game);
  const saving=store.flush();await new Promise(r=>setImmediate(r));assert.equal(store.hasPending(),true);
  game.step=2;store.enqueue(game);release();assert.equal(await saving,true);assert.equal(version,2);
  client.rpc=async()=>({error:{message:'version_conflict'}});store.enqueue({...game,step:3});
  assert.equal(await store.flush(),false);assert.match(statuses.at(-1).text,/پنجرهٔ دیگری/);assert.equal(store.hasPending(),true);
});
