import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

async function setup(t,stored){
 const dom=new JSDOM('<header class="topbar"><button data-proto-auth="login">ورود به کارگاه آزمایشی</button></header><main id="main-content"></main>',{url:'https://hplgame.test/'}),w=dom.window;t.after(()=>w.close());
 for(const k of ['document','localStorage','FormData','location'])globalThis[k]=w[k];
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 if(stored!==undefined)w.localStorage.setItem('hplgame-prototype-v1',stored);
 const mod=await import('../lib/prototype.js?test='+Math.random()),q=s=>w.document.querySelector(s);let route='studio/coach';
 const ctx={render,navigate:r=>{route=r;w.history.replaceState(null,'','#/'+r);render();},toast:()=>{}};
 function render(){q('main').innerHTML=mod.prototypePage(route);mod.bindPrototype(ctx);}
 const submit=s=>q(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const auth=async()=>{const f=q('#proto-auth');await f.onsubmit({preventDefault(){},currentTarget:f});};
 const signup=async(email='tester@example.test',name='آزمایشگر')=>{q('[data-proto-auth]').click();q('[data-auth-tab=signup]').click();q('#proto-name').value=name;q('#proto-email').value=email;q('#proto-password').value='DemoTest42!';q('#proto-confirm').value='DemoTest42!';await auth();};
 render();return {w,q,mod,ctx,render,submit,auth,signup,saved:()=>JSON.parse(w.localStorage.getItem('hplgame-prototype-v1'))};
}

test('auth modal validates email/password, persists a local session, rejects wrong passwords and separates accounts',async t=>{
 const {w,q,mod,ctx,auth,signup,saved}=await setup(t);
 q('[data-proto-auth]').click();assert.equal(q('[role=dialog]').getAttribute('aria-modal'),'true');assert.equal(q('.proto-heading').inert,true);
 q('[data-auth-tab=signup]').click();await auth();assert.match(q('[role=alert]').textContent,/نام/);
 q('#proto-name').value='آزمایشگر';q('#proto-email').value='bad';await auth();assert.match(q('[role=alert]').textContent,/ایمیل معتبر/);
 q('#proto-email').value='tester@example.test';q('#proto-password').value='123';await auth();assert.match(q('[role=alert]').textContent,/۸ تا/);
 q('#proto-password').value='DemoTest42!';q('#proto-confirm').value='other';await auth();assert.match(q('[role=alert]').textContent,/یکسان/);
 q('#proto-confirm').value='DemoTest42!';await auth();assert.equal(q('[role=dialog]'),null);assert.notEqual(q('.proto-heading').inert,true);assert.equal(mod.getDemoUser().name,'آزمایشگر');assert.equal(saved().accounts[0].verifier.length,64);assert.ok(!JSON.stringify(saved()).includes('DemoTest42!'));
 mod.submitPrototypeIdea('مار با غذا',ctx);assert.equal(saved().accounts[0].games.length,1);
 q('[data-proto=logout]').click();assert.equal(mod.getDemoUser(),null);assert.equal(q('#proto-canvas'),null);
 q('[data-proto-auth]').click();q('#proto-email').value='tester@example.test';q('#proto-password').value='WrongPass42';await auth();assert.match(q('[role=alert]').textContent,/درست نیست/);assert.equal(q('[type=submit]').disabled,false);
 q('#proto-password').value='DemoTest42!';await auth();assert.equal(mod.getDemoUser().name,'آزمایشگر');assert.ok(q('#proto-canvas'));
 const reloaded=await import('../lib/prototype.js?reload='+Math.random());assert.equal(reloaded.getDemoUser().name,'آزمایشگر');
 q('[data-proto=logout]').click();await signup('second@example.test','کاربر دوم');assert.equal(q('#proto-canvas'),null);assert.equal(saved().accounts[1].games.length,0);
 w.document.querySelector('[data-proto-auth]').click();q('[data-auth-tab=signup]').click();q('#proto-name').value='تکراری';q('#proto-email').value='second@example.test';q('#proto-password').value=q('#proto-confirm').value='DemoTest42!';await auth();assert.match(q('[role=alert]').textContent,/قبلاً/);
});

test('hero input and all quick pills connect directly to coach, preserve first idea and enforce free quota',async t=>{
 const {w,q,mod,ctx,saved}=await setup(t);const discovery=await import('../lib/discovery.js?integration='+Math.random());
 function home(){q('main').innerHTML=discovery.discoveryHome();discovery.bindDiscovery({...ctx,onSubmitIdea:text=>mod.submitPrototypeIdea(text,ctx)});mod.bindPrototype(ctx);}
 home();q('#game-idea').value='دوز <img src=x onerror=alert(1)>';q('#idea-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(w.location.hash,'#/studio/coach');assert.equal(q('.chat-message.user span').textContent,'دوز <img src=x onerror=alert(1)>');assert.equal(q('img'),null);assert.match(q('.proto-sandbox h2').textContent,/دوز/);
 const firstId=saved().guestGames[0].id;home();q('[data-example]').click();assert.ok(q('[role=dialog]'));assert.equal(saved().guestGames.length,1);assert.equal(saved().guestGames[0].id,firstId);q('#proto-free').click();
 // Each preset is also tested as the first free game in an isolated browser state.
 for(let i=0;i<3;i++){const isolated=await setup(t);const d=await import('../lib/discovery.js?pill='+Math.random());isolated.q('main').innerHTML=d.discoveryHome();d.bindDiscovery({...isolated.ctx,onSubmitIdea:text=>isolated.mod.submitPrototypeIdea(text,isolated.ctx)});isolated.w.document.querySelectorAll('[data-example]')[i].click();assert.equal(isolated.w.location.hash,'#/studio/coach');assert.match(isolated.q('.proto-sandbox h2').textContent,[/دوز/,/مار/,/فلپی/][i]);assert.equal(isolated.saved().guestGames.length,1);}
});

test('contextual tutor actions, chat and snake sandbox survive rerenders and handle win/collision/restart',async t=>{
 const {w,q,mod,ctx,submit,saved}=await setup(t);mod.submitPrototypeIdea('بازی مار',ctx);
 assert.match(q('.chat-messages').textContent,/مار/);q('[data-proto=code]').click();assert.match(q('.chat-messages').textContent,/let snake/);
 q('[data-proto=question]').click();assert.match(q('.chat-messages').textContent,/غذا یا برخورد/);
 q('[data-proto=run]').click();q('#proto-canvas').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.match(q('#proto-game-status').textContent,/۳، ۲/);
 q('#proto-message').value='چطور غذا بخورد؟ <script>bad()</script>';submit('#proto-chat');assert.equal(q('script'),null);assert.match(q('#proto-game-status').textContent,/۳، ۲/);assert.match(q('.chat-message:last-child').textContent,/طول مار/);
 for(let i=0;i<5;i++)q('[data-proto=next]').click();assert.equal(saved().guestGames[0].step,3);
 q('[data-proto=restart]').click();q('[data-proto=run]').click();for(const d of ['right','right','down','down','left','left','left'])q(`[data-move=${d}]`).click();assert.match(q('#proto-game-status').textContent,/برنده/);assert.equal(saved().guestGames[0].won,true);
 q('[data-proto=run]').click();q('[data-move=up]').click();q('[data-move=up]').click();assert.match(q('#proto-game-status').textContent,/برخورد/);q('[data-proto=restart]').click();assert.match(q('#proto-game-status').textContent,/برای شروع/);
});

test('paywall blocks second project, traps focus, activates test premium and creates independent games',async t=>{
 const {w,q,mod,ctx,signup,saved,submit}=await setup(t);mod.submitPrototypeIdea('دوز',ctx);await signup();assert.equal(saved().accounts[0].games.length,1);
 const trigger=q('[data-proto=new]');trigger.focus();trigger.click();assert.ok(q('#proto-upgrade'));assert.equal(q('.topbar').inert,true);assert.equal(saved().accounts[0].games.length,1);
 q('#proto-free').focus();q('#proto-free').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));assert.equal(w.document.activeElement,q('[data-close]'));
 q('[data-close]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q('[role=dialog]'),null);assert.equal(w.document.activeElement,trigger);
 mod.submitPrototypeIdea('فلپی برد',ctx);assert.ok(q('#proto-upgrade'));assert.equal(saved().accounts[0].games.length,1);q('#proto-upgrade').click();assert.equal(mod.getDemoUser().premium,true);assert.equal(saved().accounts[0].games.length,2);assert.match(q('.proto-sandbox h2').textContent,/فلپی/);
 q('[data-proto=new]').click();q('#proto-new-idea').value='بازی ستاره‌ها';submit('#proto-new-game');assert.equal(saved().accounts[0].games.length,3);
 ctx.navigate('studio/games');assert.equal(w.document.querySelectorAll('[data-open-game]').length,3);q('[data-open-game]').click();assert.match(q('.proto-sandbox h2').textContent,/دوز/);
 w.localStorage.setItem('hplgame-discovery-v1','{"idea":"باقی بمان"}');ctx.navigate('studio/games');q('[data-proto=delete]').click();q('#proto-confirm-delete').click();assert.equal(w.localStorage.getItem('hplgame-prototype-v1'),null);assert.ok(w.localStorage.getItem('hplgame-discovery-v1'));
});

test('tic tac toe canvas processes real clicks, occupied cells, victory and restart',async t=>{
 const {w,q,mod,ctx,saved}=await setup(t);mod.submitPrototypeIdea('دوز',ctx);const canvas=q('#proto-canvas');canvas.getBoundingClientRect=()=>({left:0,top:0,width:480,height:320});const click=(x,y)=>canvas.dispatchEvent(new w.MouseEvent('click',{clientX:x*160+80,clientY:y*320/3+40,bubbles:true}));
 click(0,0);assert.match(q('#proto-game-status').textContent,/اول/);q('[data-proto=run]').click();click(0,0);click(0,0);assert.match(q('#proto-game-status').textContent,/پر است/);for(const p of [[0,1],[1,0],[1,1],[2,0]])click(...p);assert.match(q('#proto-game-status').textContent,/X برنده/);assert.equal(saved().guestGames[0].won,true);q('[data-proto=run]').click();assert.match(q('#proto-game-status').textContent,/نوبت X/);
});

test('flappy teaching sandbox handles keyboard, click, collision and completion',async t=>{
 const {w,q,mod,ctx}=await setup(t);mod.submitPrototypeIdea('فلپی برد',ctx);q('[data-proto=run]').click();q('#proto-canvas').click();assert.match(q('#proto-game-status').textContent,/۱، ۲/);q('[data-move=right]').click();q('[data-move=right]').click();q('[data-move=down]').click();q('[data-move=down]').click();assert.match(q('#proto-game-status').textContent,/لوله برخورد/);
 q('[data-proto=run]').click();for(let i=0;i<5;i++)q('[data-move=right]').click();assert.match(q('#proto-game-status').textContent,/برنده/);
});

test('malformed, expired, legacy and blocked storage remain usable without exposing real auth',async t=>{
 for(const stored of ['{broken',JSON.stringify({updatedAt:Date.now()-31*86400000,user:{name:'old'},game:{id:'1',idea:'مار'}})]){const {q,mod}=await setup(t,stored);assert.equal(mod.getDemoUser(),null);assert.ok(q('#proto-first-idea'));}
 const legacy=await setup(t,JSON.stringify({updatedAt:Date.now(),user:{name:'old'},game:{id:'legacy',idea:'مار',step:1,messages:[]}}));assert.ok(legacy.q('#proto-canvas'));assert.equal(legacy.mod.getDemoUser(),null);
 globalThis.localStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};
 const mod=await import('../lib/prototype.js?blocked='+Math.random());let route;const ctx={render(){legacy.q('main').innerHTML=mod.prototypePage('studio/coach');mod.bindPrototype(ctx);},navigate:r=>{route=r;ctx.render();},toast:()=>{}};mod.submitPrototypeIdea('مار',ctx);assert.equal(route,'studio/coach');assert.ok(legacy.q('#proto-canvas'));assert.match(legacy.q('.proto-storage').textContent,/در حافظه/);
});
