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
 q('#game-idea').value=' ';submit('#idea-form');assert.equal(route,'home');assert.match(q('#idea-error').textContent,/۲ تا ۶۰۰/);
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

test('week-two presets remain editable, short game names start a path, and both themes survive reload',async t=>{
 const dom=new JSDOM('<main></main>',{url:'https://hplgame.test/'}),w=dom.window;t.after(()=>w.close());
 for(const k of ['document','localStorage','FormData'])globalThis[k]=w[k];
 const mod=await import('../lib/discovery.js?week2='+Date.now()),q=s=>w.document.querySelector(s);let route='home';
 function render(){q('main').innerHTML='<button id="theme-toggle" aria-pressed="'+(w.document.documentElement.dataset.theme==='dark')+'">تغییر تم</button>'+(route==='home'?mod.discoveryHome():mod.discoveryIdea());mod.bindDiscovery({render,navigate:r=>{route=r;render();},toast:()=>{}});}
 const submit=()=>q('#idea-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 mod.initTheme();render();assert.equal(q('label[for=game-idea]').textContent.trim(),'چه بازی‌ای می‌خواهی بسازی؟ ✦');
 const pills=[...w.document.querySelectorAll('[data-example]')];assert.deepEqual(pills.map(b=>b.textContent.trim().replace(/^\S+\s/,'')),['دوز','مار (Snake)','فلپی برد']);
 for(const pill of pills){pill.click();assert.equal(route,'home');assert.equal(q('#game-idea').value,pill.dataset.example);assert.equal(w.document.activeElement,q('#game-idea'));assert.equal(w.document.querySelectorAll('[data-example][aria-pressed=true]').length,1);}
 q('#game-idea').value=' ';submit();assert.equal(route,'home');assert.equal(q('#game-idea').getAttribute('aria-invalid'),'true');
 pills[0].click();assert.equal(q('#game-idea').getAttribute('aria-invalid'),null);assert.equal(q('#idea-error').textContent,'');
 q('#game-idea').value='دوز با دوستم';q('#game-idea').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.document.querySelectorAll('[data-example][aria-pressed=true]').length,0);
 q('#theme-toggle').click();assert.equal(w.document.documentElement.dataset.theme,'dark');assert.equal(q('#game-idea').value,'دوز با دوستم');assert.equal(q('#theme-toggle').getAttribute('aria-pressed'),'true');
 w.document.documentElement.dataset.theme='light';mod.initTheme();assert.equal(w.document.documentElement.dataset.theme,'dark');
 q('#theme-toggle').click();assert.equal(w.localStorage.getItem('hplgame-theme'),'light');assert.equal(q('#theme-toggle').getAttribute('aria-pressed'),'false');
 w.document.documentElement.dataset.theme='dark';mod.initTheme();assert.equal(w.document.documentElement.dataset.theme,'light');
 q('#game-idea').value='x'.repeat(601);submit();assert.equal(route,'home');
 q('#game-idea').value=' دوز ';submit();assert.equal(route,'idea');assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).idea,'دوز');assert.match(q('.idea-summary').textContent,/فکری/);
 q('[name=answer][value="1"]').checked=true;q('#lesson-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 route='home';render();submit();assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).step,1);
 for(const [label,match] of [['مار (Snake)',/بازی مار/],['فلپی برد',/پروازی/]]){route='home';render();[...w.document.querySelectorAll('[data-example]')].find(b=>b.textContent.includes(label)).click();submit();assert.match(q('.idea-summary').textContent,match);assert.equal(JSON.parse(w.localStorage.getItem('hplgame-discovery-v1')).step,0);}
 const reloaded=await import('../lib/discovery.js?week2reload='+Date.now());assert.match(reloaded.discoveryHome(),/فلپی برد/);assert.match(reloaded.discoveryIdea(),/پروازی/);
 globalThis.localStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}};
 mod.initTheme();route='home';render();q('#theme-toggle').click();assert.equal(w.document.documentElement.dataset.theme,'dark');
});
