import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM,VirtualConsole} from 'jsdom';
const wait=ms=>new Promise(r=>setTimeout(r,ms));

test('static Pages shell connects auth modal, header, ideas, sidebar, tutor and premium without a backend',async t=>{
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<div id="app"></div>',{url:'https://hplgame.test/hplgame-webapp/',pretendToBeVisual:true,virtualConsole:console}),w=dom.window;t.after(()=>w.close());w.scrollTo=()=>{};
 for(const k of ['window','document','localStorage','sessionStorage','location','FormData'])globalThis[k]=k==='window'?w:w[k];
 Object.defineProperty(globalThis,'navigator',{value:w.navigator,configurable:true});globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
 await import('../app.js?demo='+Math.random());await wait(50);const q=s=>w.document.querySelector(s),submit=s=>q(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 q('.proto-entry a').click();assert.ok(q('[role=dialog]'));assert.equal(w.location.hash,'');q('[data-auth-tab=signup]').click();
 q('#proto-name').value='هوپی تست';q('#proto-email').value='shell@example.test';q('#proto-password').value=q('#proto-confirm').value='ShellDemo42!';const form=q('#proto-auth');await form.onsubmit({preventDefault(){},currentTarget:form});await wait(60);
 assert.match(q('.topbar').textContent,/هوپی تست/);assert.equal(q('[role=dialog]'),null);
 w.location.hash='#/';await wait(30);q('[data-example]').click();await wait(40);assert.equal(w.location.hash,'#/studio/coach');assert.ok(q('#proto-canvas'));assert.match(q('[role=log]').textContent,/دوز/);
 q('[data-proto=question]').click();assert.match(q('[role=log]').textContent,/نوبت X و O/);
 q('.side-nav a[href="#/projects"]').click();await wait(60);assert.equal(w.location.hash,'#/studio/games');assert.ok(q('[data-open-game]'));q('[data-proto=new]').click();assert.ok(q('#proto-upgrade'));q('#proto-upgrade').click();assert.match(q('.topbar').textContent,/پرو آزمایشی/);
 q('#proto-new-idea').value='مار';submit('#proto-new-game');await wait(50);assert.match(q('.proto-sandbox h2').textContent,/مار/);assert.equal(q('[role=dialog]'),null);
 q('#theme-toggle').click();assert.equal(w.document.documentElement.dataset.theme,'dark');assert.equal(w.localStorage.getItem('hplgame-theme'),'dark');
 q('.hopi-launch').click();await wait(40);assert.equal(w.location.hash,'#/studio/coach');assert.ok(q('#proto-canvas'));
 q('.topbar [data-proto=logout]').click();assert.doesNotMatch(q('.topbar').textContent,/هوپی تست/);assert.ok(q('[data-proto-auth=login]'));assert.deepEqual(errors,[]);
});
