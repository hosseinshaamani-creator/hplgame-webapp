import {JSDOM,VirtualConsole} from 'jsdom';
export const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function createApp(t,{hash='',onboarding=false,role='student'}={}){
 const errors=[],requests=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM('<div id="app"></div>',{url:'https://hplgame.example/hplgame-webapp/#/'+hash,pretendToBeVisual:true,virtualConsole}),w=dom.window;
 t.after(()=>w.close());w.scrollTo=()=>{};
 for(const key of ['window','document','location','localStorage','sessionStorage','FormData'])globalThis[key]=key==='window'?w:w[key];
 Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});globalThis.BroadcastChannel=undefined;
 const frames=new Map();let sequence=0,time=0;globalThis.requestAnimationFrame=callback=>{frames.set(++sequence,callback);return sequence;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 const {config}=await import('../../config.js');config.supabaseUrl='https://hpltest.supabase.co';config.supabaseAnonKey='test-public-key';
 const user={id:'00000000-0000-4000-8000-000000000001',email:'a@example.test',email_confirmed_at:'2026-10-15T10:00:00Z',aud:'authenticated',role:'authenticated',user_metadata:{full_name:'کاربر آزمایشی'}};
 const state={profile:{id:user.id,email:user.email,phone:'+989123456789',full_name:'کاربر آزمایشی',display_name:'کاربر آزمایشی',role,onboarding_completed:onboarding},projects:[],progress:{},duplicate:false,offline:false};
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),jwt=encode({alg:'HS256'})+'.'+encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})+'.test-signature';
 globalThis.fetch=async(url,options={})=>{
  if(state.offline)throw new TypeError('network offline');
  const parsed=new URL(url),body=options.body?JSON.parse(options.body):null,method=options.method||'GET';requests.push({path:parsed.pathname,body,method});await wait(10);let response={},status=200;
  if(parsed.pathname.endsWith('/signup')){if(state.duplicate){response={msg:'User already registered',code:'user_already_exists'};status=422;}else {Object.assign(state.profile,{full_name:body.data.full_name,display_name:body.data.display_name,phone:body.data.phone});response={...user,identities:[{id:user.id}]};}}
  else if(parsed.pathname.endsWith('/verify')){if(body.token!=='123456'){response={msg:'Token has expired or is invalid',code:'otp_expired'};status=403;}else response={access_token:jwt,refresh_token:'test-refresh',expires_in:3600,token_type:'bearer',user};}
  else if(parsed.pathname.endsWith('/user'))response=user;
  else if(parsed.pathname.endsWith('/profiles')){if(method==='PATCH')Object.assign(state.profile,body);response={...state.profile};}
  else if(parsed.pathname.endsWith('/projects')){if(method==='POST'){const saved={...body,version:1,updated_at:new Date().toISOString()};state.projects.push(saved);response=saved;}else if(method==='PATCH'){const id=parsed.searchParams.get('id')?.slice(3),saved=state.projects.find(row=>row.id===id);if(saved)Object.assign(saved,body,{version:(saved.version||1)+1,updated_at:new Date().toISOString()});response={...saved};}else if(method==='DELETE'){const id=parsed.searchParams.get('id')?.slice(3);state.projects=state.projects.filter(row=>row.id!==id);response=null;}else response=state.projects.map(row=>({...row}));}
  else if(parsed.pathname.endsWith('/rpc/record_progress')){response={lesson_id:body.p_lesson,status:body.p_status,score:body.p_score,best_time:body.p_time,xp:body.p_status==='completed'?50:0};state.progress[body.p_lesson]=response;}
  else if(parsed.pathname.endsWith('/progress'))response=Object.values(state.progress);
  return new Response(JSON.stringify(response),{status,headers:{'Content-Type':'application/json'}});
 };
 await import('../../app.js?fixture='+Math.random());await wait(100);
 const q=selector=>w.document.querySelector(selector),click=action=>{const node=q('#modal-root [data-action="'+action+'"]')||q('[data-action="'+action+'"]');if(!node)throw new Error('Missing action '+action);node.click();};
 const fill=(name,value)=>{const node=q('[name="'+name+'"]');if(!node)throw new Error('Missing field '+name);node.value=value;node.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const submit=()=>q('#auth-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const navigate=async path=>{w.location.hash='#/'+path;await wait(50);};
 const login=async()=>{if(!q('#auth-form'))await navigate('login');fill('email','a@example.test');submit();await wait(70);fill('otp','123456');submit();await wait(180);};
 const tick=n=>{for(let i=0;i<n;i++){time+=1000/60;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(time));}};
 const db=(await import('../../lib/backend.js')).getClient;t.after(async()=>{(await db()).auth.stopAutoRefresh();});
 return {w,q,click,fill,submit,navigate,login,tick,state,requests,errors};
}
