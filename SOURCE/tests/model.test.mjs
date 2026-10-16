import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,validateValue,validateSignup,stats,lessons,lessonStatus,cleanSettings,escapeHTML,csvCell,formatTime} from '../lib/model.js';
test('Iran phone accepts Persian, Arabic and international digits',()=>{
  for(const raw of ['۰۹۱۲۳۴۵۶۷۸۹','٠٩١٢٣٤٥٦٧٨٩','09123456789','+98 912 345 6789','00989123456789'])assert.equal(normalizePhone(raw),'+989123456789');
  for(const raw of ['123','091234567890','+12125551234','0912<script>'])assert.equal(normalizePhone(raw),null);
  assert.equal(normalizePhone(''),'');
});
test('block boundaries and invalid values',()=>{
  for(const key of ['speed','jump','starScore'])for(const val of ['','NaN','Infinity','-1','0','1.1','989890','<script>'])assert.ok(validateValue(key,val).error);
  assert.equal(validateValue('jump','۴').value,4);assert.equal(validateValue('jump',9).value,9);assert.ok(validateValue('jump',10).error);
  assert.deepEqual(cleanSettings({jump:989890,speed:3,starScore:0}),{speed:3,jump:4,starScore:10});
});
const valid={email:'Adult@example.com',phone:'۰۹۱۲۳۴۵۶۷۸۹',password:'A-long-secret-123!',confirm:'A-long-secret-123!',terms:true,accountKind:'guardian'};
test('valid registration and individual Persian errors',()=>{
  assert.deepEqual(validateSignup(valid).errors,{});assert.equal(validateSignup(valid).email,'adult@example.com');
  for(const [key,value]of Object.entries({email:'broken',phone:'12',password:'short',confirm:'different',terms:false,accountKind:'child'}))assert.ok(validateSignup({...valid,[key]:value}).errors[key]);
});
test('real zero progress, prerequisite, sample lock, repeat XP',()=>{
  assert.deepEqual(stats({}),{completed:0,xp:0,percent:0});assert.equal(lessonStatus(lessons[1],{}),'locked');
  const p={'first-star':{status:'completed',xp:99999}};
  assert.equal(lessonStatus(lessons[1],p),'not_started');assert.equal(stats(p).xp,50);assert.equal(lessonStatus(lessons[2],p),'locked');
});
test('HTML escaping and formula-safe CSV',()=>{
  assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
  for(const val of ['=cmd()','+SUM(1)',' @attack','-1'])assert.ok(csvCell(val).startsWith('"\''));
  assert.equal(csvCell('a"b'),'"a""b"');assert.equal(formatTime(65),'۰۱:۰۵');
});
