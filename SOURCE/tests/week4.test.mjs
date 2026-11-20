import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

async function setup(t,stored){
  const w=new JSDOM('<main></main>',{url:'https://hplgame.test/'}).window;
  t.after(()=>w.close());
  for(const k of ['document','localStorage','FormData','location'])globalThis[k]=w[k];
  const draws=[];
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(_,key)=>(...args)=>draws.push([key,...args])});
  if(stored)w.localStorage.setItem('hplgame-prototype-v1',stored);
  const mod=await import('../lib/prototype.js?week4='+Math.random()),q=s=>w.document.querySelector(s);
  let route='studio/coach';
  const ctx={render,navigate(r){route=r;render();},toast(){}};
  function render(){q('main').innerHTML=mod.prototypePage(route);mod.bindPrototype(ctx);}
  function key(value){q('#proto-canvas').dispatchEvent(new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));}
  render();
  return {w,q,mod,ctx,key,draws,stored:()=>w.localStorage.getItem('hplgame-prototype-v1'),saved:()=>JSON.parse(w.localStorage.getItem('hplgame-prototype-v1'))};
}

test('puzzle coach follows idea, exposes contextual replies and keeps keyboard focus',async t=>{
  const {w,q,mod,ctx}=await setup(t);mod.submitPrototypeIdea('پازل اعداد',ctx);
  assert.equal(q('.chat-message.user span').textContent,'پازل اعداد');
  assert.match(q('.chat-messages').textContent,/شش خانه/);
  q('[data-proto=code]').click();assert.match(q('.chat-message:last-child').textContent,/const order/);
  assert.equal(w.document.activeElement,q('[data-proto=code]'));
  q('[data-proto=question]').click();assert.match(q('.chat-message:last-child').textContent,/ترتیب اعداد/);
  assert.equal(w.document.activeElement,q('#proto-message'));
  q('[data-proto=next]').click();assert.match(q('#proto-step').textContent,/گام ۲/);
  assert.equal(w.document.activeElement,q('[data-proto=next]'));
  q('[data-proto=code]').click();assert.match(q('.chat-message:last-child').textContent,/function choose/);
  q('[data-proto=focus-board]').click();assert.equal(w.document.activeElement,q('#proto-canvas'));
  assert.equal(q('#proto-canvas').getAttribute('aria-describedby'),'proto-instructions');
  assert.ok(q('#proto-instructions'));
});

test('puzzle rejects premature and wrong input, draws, wins via buttons and restarts',async t=>{
  const {q,mod,ctx,saved,draws}=await setup(t);mod.submitPrototypeIdea('number puzzle',ctx);
  assert.ok(draws.some(([method])=>method==='fillText'));
  q('[data-number="1"]').click();assert.match(q('#proto-game-status').textContent,/اول اجرای/);
  assert.equal(saved().guestGames[0].won,false);
  q('[data-proto=run]').click();q('[data-number="3"]').click();assert.match(q('#proto-game-status').textContent,/عدد بعدی ۱/);
  for(let i=1;i<=6;i++)q(`[data-number="${i}"]`).click();
  assert.match(q('#proto-game-status').textContent,/کامل کردی/);assert.equal(saved().guestGames[0].won,true);
  q('[data-proto=restart]').click();assert.match(q('#proto-game-status').textContent,/برای شروع/);
  q('[data-proto=run]').click();q('[data-number="1"]').click();assert.match(q('#proto-game-status').textContent,/بعدی ۲/);
});

test('puzzle supports scaled canvas clicks and Persian/Latin keyboard digits; rerender preserves running board',async t=>{
  const {w,q,mod,ctx,key}=await setup(t);mod.submitPrototypeIdea('پازل اعداد',ctx);
  q('[data-proto=run]').click();const c=q('#proto-canvas');c.getBoundingClientRect=()=>({left:10,top:20,width:240,height:160});
  c.dispatchEvent(new w.MouseEvent('click',{clientX:130,clientY:60,bubbles:true}));
  assert.match(q('#proto-game-status').textContent,/بعدی ۲/);
  q('[data-proto=run]').click();assert.match(q('#proto-game-status').textContent,/عدد ۲/);
  q('[data-proto=code]').click();assert.match(q('#proto-game-status').textContent,/عدد ۲/);
  for(const digit of ['۲','3','۴','5','۶'])key(digit);
  assert.match(q('#proto-game-status').textContent,/کامل کردی/);
  q('[data-proto=run]').click();assert.match(q('#proto-game-status').textContent,/عدد ۱/);
});

test('local session reload restores game, coach history, lesson and victory',async t=>{
  const a=await setup(t);a.mod.submitPrototypeIdea('پازل اعداد',a.ctx);
  a.q('[data-proto=next]').click();a.q('[data-proto=run]').click();
  for(let i=1;i<=6;i++)a.key(String(i));
  const b=await setup(t,a.stored());
  assert.match(b.q('.proto-sandbox h2').textContent,/پازل اعداد/);
  assert.match(b.q('#proto-step').textContent,/گام ۲/);
  assert.ok(b.saved().guestGames[0].won);
  assert.match(b.q('.chat-messages').textContent,/گام بعدی/);
  assert.match(b.q('#proto-game-status').textContent,/برای شروع/);
});

test('existing tic board supports keyboard victory and directional boards retain accessible instructions',async t=>{
  const a=await setup(t);a.mod.submitPrototypeIdea('دوز',a.ctx);
  a.q('#proto-canvas').getBoundingClientRect=()=>({left:0,top:0,width:480,height:320});
  a.q('[data-proto=run]').click();for(const k of ['۱','4','۲','5','۳'])a.key(k);
  assert.match(a.q('#proto-game-status').textContent,/X برنده/);
  for(const idea of ['مار','فلپی برد','ستاره']){
    const b=await setup(t);b.mod.submitPrototypeIdea(idea,b.ctx);
    assert.equal(b.q('#proto-canvas').getAttribute('aria-describedby'),'proto-instructions');
    assert.ok(b.q('#proto-instructions'));b.q('[data-proto=run]').click();b.key('ArrowRight');
    assert.match(b.q('#proto-game-status').textContent,/خانه/);
  }
});
