import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('week 5 PostgreSQL: verified ownership, quota, version conflicts and message validation',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.role() returns text language sql stable as $$select current_setting('request.jwt.claim.role',true)$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid(),auth.role() to anon,authenticated;`);
  for(const file of ['202610090001_hplgame.sql','202610150002_email_otp.sql','202611200003_learning_accounts.sql','202611200004_supervised_signup.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',P='10000000-0000-4000-8000-000000000001';
  for(const [id,email,phone]of [[A,'a@example.test','+989123456789'],[B,'b@example.test','+989123456780']])await db.query(`insert into auth.users values($1,$2,$3::jsonb,now())`,[id,email,JSON.stringify({phone,full_name:'کاربر تست',account_kind:'adult',terms_version:'2026-10-15'})]);
  const minorId='00000000-0000-4000-8000-000000000003';
  const minorMeta={phone:'+989123456781',full_name:'هنرجوی تست',account_kind:'minor',terms_version:'2026-11-20'};
  await assert.rejects(db.query('insert into auth.users values($1,$2,$3::jsonb,now())',[minorId,'minor@example.test',JSON.stringify(minorMeta)]),/Guardian declaration/);
  await db.query('insert into auth.users values($1,$2,$3::jsonb,now())',[minorId,'minor@example.test',JSON.stringify({...minorMeta,guardian_name:'سرپرست تست',guardian_consent:true})]);
  const declaration=(await db.query('select account_kind,guardian_name,guardian_consent_at from public.profiles where id=$1',[minorId])).rows[0];
  assert.equal(declaration.account_kind,'minor');assert.equal(declaration.guardian_name,'سرپرست تست');assert.ok(declaration.guardian_consent_at);
  async function as(id,role='authenticated'){await db.exec('reset role');await db.query(`select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)`,[id,role]);await db.exec('set role '+role);}
  async function save(id=P,step=0,version=0,messages=[]){return db.query(`select * from public.save_learning_project($1,'پازل اعداد',$2,false,$3::jsonb,$4)`,[id,step,JSON.stringify(messages),version]);}
  await as(minorId);await assert.rejects(db.query("update public.profiles set account_kind='adult' where id=$1",[minorId]));
  await as(A);await save();assert.equal((await db.query('select version from public.learning_projects')).rows[0].version,1);
  await assert.rejects(save('10000000-0000-4000-8000-000000000002'),/project_limit/);
  await save(P,2,1,[{role:'user',text:'سؤالم'}]);await assert.rejects(save(P,1,1),/version_conflict/);
  await assert.rejects(save(P,2,2,[{role:'system',text:'bad'}]),/Invalid message/);
  await assert.rejects(save(P,2,2,[{role:'user',text:'x'.repeat(3001)}]),/Invalid message/);
  await assert.rejects(db.query(`update public.learning_projects set won=true where id=$1`,[P]));
  await assert.rejects(db.query(`insert into public.learning_entitlements values($1,100)`,[A]));
  await as(B);assert.equal((await db.query('select * from public.learning_projects')).rows.length,0);await assert.rejects(save(P,1,2),/Access denied/);
  await db.exec('reset role');await db.query('update auth.users set email_confirmed_at=null where id=$1',[A]);
  await as(A);assert.equal((await db.query('select * from public.learning_projects')).rows.length,0);await assert.rejects(save(),/Verified account/);
  await as('','anon');await assert.rejects(db.query('select * from public.learning_projects'));await assert.rejects(save());
});
