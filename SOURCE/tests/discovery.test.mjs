import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

test('idea, quiz, chat, research consent, export, theme and restored progress',async t=>{
 const dom=new JSDOM('<main></main>',{url:'https://hplgame.test/'}),w=dom.window;
 t.after(()=>w.close());
 for(const k of ['document','localStorage','FormData'])globalThis[k]=w[k];
 const mod=await import('../lib/discovery.js?test='+Date.now());
 const q=s=>w.document.querySelector(s);let route='home',notifications=[];
 function render(){q('main').innerHTML=route==='home'?mod.discoveryHome():route==='idea'?mod.discoveryIdea():mod.discoveryResearch();mod.bindDiscovery({render,navigate:r=>{route=r;render();},toast:m=>notifications.push(m)});}
 const submit=s=>q(s).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 mod.initTheme();render();
 q('#game-idea').value='short';submit('#idea-form');assert.equal(route,'home');assert.match(q('#idea-error').textContent,/۱۲/);
 q('#game-idea').value='<img src=x onerror=alert(1)> یک بازی فضایی با ستاره';q('#idea-level').value='کمی تجربه دارم';q('#idea-minutes').value='20';submit('#idea-form');
 assert.equal(route,'idea');assert.equal(q('img'),null);assert.match(q('.idea-summary').textContent,/فضایی/);assert.match(q('.idea-summary').textContent,/۲۰ دقیقه/);
 q('[name=answer][value="0"]').checked=true;submit('#lesson-form');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).step,0);assert.match(q('#quiz-feedback').textContent,/دوباره|دیگه/);
 q('[name=answer][value="1"]').checked=true;submit('#lesson-form');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).step,1);assert.match(q('.lesson-panel h2').textContent,/دنیای بازی/);
 q('#coach-message').value='<script>alert(1)</script> یک مثال بزن';submit('#coach-form');assert.equal(q('script'),null);assert.equal(q('.chat-message.user').textContent,'تو<script>alert(1)</script> یک مثال بزن');assert.match(q('.chat-message.coach').textContent,/بازیکن/);
 const restored=await import('../lib/discovery.js?restored='+Date.now());assert.match(restored.discoveryIdea(),/value="1"/);assert.match(restored.discoveryHome(),/کمی تجربه دارم/);
 route='research';render();submit('#research-form');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).answers.length,0);
 q('#research-attempt').value='یک آموزش ویدئویی دیدم و در حرکت بازیکن گیر کردم';q('#research-success').value='بتوانم حرکت بازیکن را تغییر بدهم و نتیجه را ببینم';q('[name=consent]').checked=true;submit('#research-form');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).answers.length,1);assert.match(q('.research-status').textContent,/۱/);
 const originalURL=globalThis.URL;let blob,filename;globalThis.URL={createObjectURL:b=>{blob=b;return 'blob:test';},revokeObjectURL:()=>{}};const originalClick=w.HTMLAnchorElement.prototype.click;w.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
 q('#export-research').click();assert.equal(filename,'hplgame-week-1-research.json');const output=JSON.parse(await blob.text());assert.equal(output.answers.length,1);assert.equal(output.verifiedInterviews,null);assert.equal(output.frequencies.reduce((n,x)=>n+x.count,0),1);globalThis.URL=originalURL;w.HTMLAnchorElement.prototype.click=originalClick;
 q('main').insertAdjacentHTML('beforeend','<button id="theme-toggle"></button>');mod.bindDiscovery({render,navigate:()=>{},toast:()=>{}});q('#theme-toggle').click();assert.equal(w.document.documentElement.dataset.theme,'dark');assert.equal(w.localStorage.getItem('hplgame-theme'),'dark');
 for(const [i,answer] of [[1,2],[2,0],[3,1],[4,2]]){route='idea';render();q(`[name=answer][value="${answer}"]`).checked=true;submit('#lesson-form');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).step,i+1);}
 assert.match(q('.lesson-panel h2').textContent,/پنج قدم/);assert.equal(q('#lesson-form'),null);
});

test('malformed stored data and unavailable storage do not break the public prototype',async t=>{
 const dom=new JSDOM('<main></main>',{url:'https://hplgame.test/'}),w=dom.window;t.after(()=>w.close());globalThis.document=w.document;globalThis.FormData=w.FormData;
 globalThis.localStorage={getItem:()=>'{broken',setItem:()=>{throw Error('quota');}};
 const mod=await import('../lib/discovery.js?broken='+Date.now());mod.initTheme();assert.doesNotThrow(()=>mod.discoveryResearch());w.document.querySelector('main').innerHTML=mod.discoveryHome();let destination;
 mod.bindDiscovery({navigate:r=>destination=r,render:()=>{},toast:()=>{}});w.document.querySelector('#game-idea').value='یک بازی ماشین‌سواری برای شروع ساده';w.document.querySelector('#idea-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(destination,'idea');assert.match(mod.discoveryIdea(),/ذخیرهٔ مرورگر در دسترس نیست/);
});
