import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../lib/game.js';import {defaults} from '../lib/model.js';
function ticks(g,count,input){for(let i=0;i<count;i++)g.tick(1/60,input);}
function win(g){g.start();while(g.x<280)g.tick(1/60,{right:true});ticks(g,260,{right:true,jump:true});}
test('run does not award a star or XP',()=>{const g=new Game(defaults);g.start();ticks(g,60,{});assert.equal(g.status,'running');assert.equal(g.score,0);assert.equal(g.collected,false);assert.ok(g.elapsed>.9);});
test('speed changes travel; jump setting changes maximum altitude',()=>{
  const slow=new Game({...defaults,speed:1}),fast=new Game({...defaults,speed:9});slow.start();fast.start();ticks(slow,60,{right:true});ticks(fast,60,{right:true});assert.ok(fast.x>slow.x);
  const low=new Game({...defaults,jump:1}),high=new Game({...defaults,jump:9});low.start();high.start();let lowTop=310,highTop=310;for(let i=0;i<90;i++){low.tick(1/60,{jump:true});high.tick(1/60,{jump:true});lowTop=Math.min(lowTop,low.y);highTop=Math.min(highTop,high.y);}assert.ok(highTop<lowTop-100);
});
test('star and flag require collision; both lessons can be won',()=>{
  for(const lesson of ['first-star','careful-jump']){const g=new Game({...defaults,starScore:17},lesson);win(g);assert.equal(g.collected,true);assert.equal(g.score,17);assert.equal(g.status,'success');}
});
test('stop retains state, resume continues, reset clears all',()=>{
  const g=new Game(defaults);g.start();ticks(g,60,{right:true});g.stop();const x=g.x,time=g.elapsed;ticks(g,60,{right:true});assert.equal(g.x,x);assert.equal(g.elapsed,time);g.start();ticks(g,30,{right:true});assert.ok(g.x>x);g.reset();assert.equal(g.x,50);assert.equal(g.y,310);assert.equal(g.score,0);assert.equal(g.elapsed,0);assert.equal(g.status,'ready');assert.equal(g.collected,false);
});
test('insufficient jump fails to collect; timeout permits reset',()=>{
  const g=new Game({...defaults,jump:1});win(g);assert.equal(g.collected,false);assert.notEqual(g.status,'success');ticks(g,11000,{});assert.equal(g.status,'error');g.reset();assert.equal(g.status,'ready');
});
