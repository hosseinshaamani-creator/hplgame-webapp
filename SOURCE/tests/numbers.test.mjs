import test from 'node:test';
import assert from 'node:assert/strict';
import {numbersLesson,numbersCode,numbersQuestion} from '../lib/numbers.js';

test('number curriculum covers setup, input, and victory with bounded steps',()=>{
  assert.match(numbersLesson(0),/شش خانه/);
  assert.match(numbersLesson(1),/ترتیب صعودی/);
  assert.match(numbersLesson(2),/برد/);
  assert.equal(numbersLesson(-1),numbersLesson(0));
  assert.equal(numbersCode(99),numbersCode(2));
  assert.match(numbersCode(0),/order = \[1, 2, 3, 4, 5, 6\]/);
  assert.match(numbersCode(1),/next \+= 1/);
  assert.match(numbersCode(2),/showVictory/);
  assert.match(numbersQuestion(),/ترتیب اعداد/);
});
