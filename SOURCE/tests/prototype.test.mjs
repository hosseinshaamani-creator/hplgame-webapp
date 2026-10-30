import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('week-three auth, idea, coach, playable board, free first game and paywall flow',async t=>{
 const dom=new JSDOM('<header class="topbar"></header><main id="main-content"></main>',{url:'https://hplgame.test/'}),w=dom.window;t.after(()=>w.close());
 for(const k of ['document','localStorage','FormData','location'])globalThis[k]=w[k];
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 w.localStorage.setItem('hplgame-discovery-v1',JSON.stringify({idea:'دوز با دوستان <img src=x onerror=alert(1)>'}));
 const mod=await import('../lib/prototype.js?flow='+Date.now());let route='studio/signup';const q=s=>w.document.querySelector(s);
 function render(){q('main').innerHTML=mod.prototypePage(route);mod.bindPrototype({render,navigate:r=>{route=r;render();},toast:()=>{}});}
 const submit=s=>q(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 render();assert.match(q('h1').textContent,/پروفایل/);q('#proto-name').value='x';submit('#proto-auth');assert.match(q('#proto-auth-error').textContent,/۲ تا ۴۰/);
 q('#proto-name').value='آزمایشگر';submit('#proto-auth');assert.equal(route,'studio/coach');assert.equal(q('img'),null);assert.match(q('.proto-heading').textContent,/دوز/);
 q('[name=answer][value="1"]').checked=true;submit('#proto-lesson');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-prototype-v1')).game.step,0);assert.match(q('#proto-feedback').textContent,/دوباره/);
 q('#proto-message').value='<script>alert(1)</script> راهنمایی';submit('#proto-chat');assert.equal(q('script'),null);assert.match(q('.chat-message.user').textContent,/<script>/);assert.match(q('.chat-message.coach').textContent,/هدف کوچک/);
 for(const a of [0,1,1]){q(`[name=answer][value="${a}"]`).checked=true;submit('#proto-lesson');}
 assert.equal(q('#proto-lesson'),null);assert.equal(JSON.parse(w.localStorage.getItem('hplgame-prototype-v1')).game.step,3);
 route='studio/preview';render();q('[data-move=right]').click();assert.match(q('#proto-game-status').textContent,/اول/);q('[data-proto=run]').click();assert.equal(JSON.parse(w.localStorage.getItem('hplgame-prototype-v1')).game.won,false);
 for(let i=0;i<5;i++)q('[data-move=right]').click();for(let i=0;i<3;i++)q('[data-move=down]').click();for(let i=0;i<5;i++)q('[data-move=left]').click();assert.match(q('#proto-game-status').textContent,/برنده/);assert.equal(JSON.parse(w.localStorage.getItem('hplgame-prototype-v1')).game.won,true);
 q('[data-proto=restart]').click();assert.match(q('#proto-game-status').textContent,/برای شروع/);
 route='studio/games';render();const before=w.localStorage.getItem('hplgame-prototype-v1');q('[data-proto=new]').focus();q('[data-proto=new]').click();assert.ok(q('[role=dialog]'));assert.equal(q('.topbar').inert,true);q('#proto-plan').click();assert.match(q('#proto-plan-status').textContent,/هیچ پرداختی/);assert.equal(w.localStorage.getItem('hplgame-prototype-v1'),before);
 q('#proto-modal-root').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(q('[role=dialog]'),null);assert.equal(q('.topbar').inert,false);assert.equal(w.document.activeElement,q('[data-proto=new]'));
 const restored=await import('../lib/prototype.js?restore='+Date.now());assert.match(restored.prototypePage('studio/games'),/موفقیت/);
 q('[data-proto=logout]').click();assert.equal(route,'studio/login');q('#proto-name').value='بازگشت';submit('#proto-auth');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-prototype-v1')).game.step,3);
 route='studio/games';render();q('[data-proto=delete]').click();q('#proto-confirm-delete').click();assert.equal(w.localStorage.getItem('hplgame-prototype-v1'),null);assert.ok(w.localStorage.getItem('hplgame-discovery-v1'));assert.equal(w.location.hash,'#/studio/login');
});

test('prototype handles deep links, corrupt/expired data and storage failures without claiming authentication',async t=>{
 const dom=new JSDOM('<main id="main-content"></main>',{url:'https://hplgame.test/'}),w=dom.window;t.after(()=>w.close());for(const k of ['document','localStorage','FormData','location'])globalThis[k]=w[k];
 for(const data of ['{broken',JSON.stringify({updatedAt:Date.now()-31*86400000,user:{name:'old'},game:{id:'1',idea:'old'}})]){w.localStorage.setItem('hplgame-prototype-v1',data);const mod=await import('../lib/prototype.js?bad='+Math.random());assert.match(mod.prototypePage('studio/preview'),/ورود به تجربه/);}
 globalThis.localStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};const mod=await import('../lib/prototype.js?blocked='+Date.now());w.document.querySelector('main').innerHTML=mod.prototypePage('studio/login');let route;mod.bindPrototype({render:()=>{},navigate:r=>route=r,toast:()=>{}});w.document.querySelector('#proto-name').value='مهمان';w.document.querySelector('#proto-auth').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(route,'');
});
