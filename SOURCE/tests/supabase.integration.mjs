// Use ONLY disposable accounts in a separate test Supabase project.
// Does not use an administrator or service_role credential.
import test from 'node:test';import assert from 'node:assert/strict';import {createClient} from '@supabase/supabase-js';
const required=['HPL_TEST_SUPABASE_URL','HPL_TEST_ANON_KEY','HPL_TEST_A_EMAIL','HPL_TEST_A_PASSWORD','HPL_TEST_B_EMAIL','HPL_TEST_B_PASSWORD'];
const enabled=required.every(key=>process.env[key]);
test('LIVE: login, account isolation, role protection, cloud save/recovery, conflicts and logout',{skip:!enabled},async t=>{
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const a=createClient(process.env.HPL_TEST_SUPABASE_URL,process.env.HPL_TEST_ANON_KEY,options),b=createClient(process.env.HPL_TEST_SUPABASE_URL,process.env.HPL_TEST_ANON_KEY,options);
  const loginA=await a.auth.signInWithPassword({email:process.env.HPL_TEST_A_EMAIL,password:process.env.HPL_TEST_A_PASSWORD}),loginB=await b.auth.signInWithPassword({email:process.env.HPL_TEST_B_EMAIL,password:process.env.HPL_TEST_B_PASSWORD});
  assert.ifError(loginA.error);assert.ifError(loginB.error);assert.notEqual(loginA.data.user.id,loginB.data.user.id);
  const own=loginA.data.user.id,id=crypto.randomUUID();
  t.after(async()=>{await a.from('projects').delete().eq('id',id);await a.auth.signOut();await b.auth.signOut();});
  const created=await a.from('projects').insert({id,user_id:own,title:'Disposable integration project',project_data:{lesson_id:'first-star',settings:{speed:3,jump:4,starScore:10}}}).select().single();assert.ifError(created.error);
  const forbidden=await b.from('projects').select('*').eq('id',id);assert.ifError(forbidden.error);assert.equal(forbidden.data.length,0);
  const profile=await b.from('profiles').select('*').eq('id',own);assert.equal(profile.data.length,0);
  const escalation=await a.from('profiles').update({role:'admin'}).eq('id',own);assert.ok(escalation.error);
  const admin=await a.rpc('admin_users');assert.ok(admin.error);
  const changed=await a.from('projects').update({title:'Saved again'}).eq('id',id).eq('version',1).select().single();assert.ifError(changed.error);assert.equal(changed.data.version,2);
  const stale=await a.from('projects').update({title:'stale'}).eq('id',id).eq('version',1).select();assert.equal(stale.data.length,0);
  const other=createClient(process.env.HPL_TEST_SUPABASE_URL,process.env.HPL_TEST_ANON_KEY,options);
  assert.ifError((await other.auth.signInWithPassword({email:process.env.HPL_TEST_A_EMAIL,password:process.env.HPL_TEST_A_PASSWORD})).error);
  const recovered=await other.from('projects').select('*').eq('id',id).single();assert.ifError(recovered.error);assert.equal(recovered.data.title,'Saved again');await other.auth.signOut();
});
test('LIVE: signup and invalid/duplicate signup; email delivery needs manual verification',{skip:!enabled||!process.env.HPL_TEST_SIGNUP_EMAIL},async()=>{
  const db=createClient(process.env.HPL_TEST_SUPABASE_URL,process.env.HPL_TEST_ANON_KEY,{auth:{persistSession:false}});
  const payload={email:process.env.HPL_TEST_SIGNUP_EMAIL,password:process.env.HPL_TEST_A_PASSWORD,options:{data:{phone:process.env.HPL_TEST_SIGNUP_PHONE||null,account_kind:'adult',terms_version:'2026-10-09'}}};
  const invalid=await db.auth.signUp({...payload,email:'invalid'});assert.ok(invalid.error);
  const valid=await db.auth.signUp(payload);assert.ifError(valid.error);
  const duplicate=await db.auth.signUp(payload);
  // Auth may deliberately mask an existing account; DB unique constraints enforce uniqueness.
  assert.ok(duplicate.error||duplicate.data.user?.identities?.length===0||duplicate.data.user?.id===valid.data.user?.id);
});
