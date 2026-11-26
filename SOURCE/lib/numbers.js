import {fa} from './model.js';

const TOTAL=6;
const LAYOUT=[4,1,6,3,5,2];
const boards=new WeakMap();

export function numbersLesson(step){
  const n=Math.max(0,Math.min(2,Math.floor(Number(step))||0));
  return [
    'پازل اعداد با شش خانه شروع می‌شود. در هر خانه یک عدد از ۱ تا ۶ هست؛ هنوز هیچ عددی انتخاب نشده.',
    'بعد از اجرا، اعداد را به ترتیب صعودی انتخاب کن. کلیک، لمس یا کلیدهای ۱ تا ۶ هر دو کار می‌کنند.',
    'اگر عدد درست را بزنی، همان خانه سبز می‌شود و عدد بعدی روشن می‌شود. پس از ۶ عدد، پیام برد را نشان بده.'
  ][n];
}

export function numbersCode(step){
  return [
    'const order = [1, 2, 3, 4, 5, 6];\nlet next = 0;',
    'function choose(value) {\n  if (value === order[next]) next += 1;\n  else showHint(order[next]);\n}',
    'if (next === order.length) {\n  showVictory();\n}'
  ][Math.max(0,Math.min(2,Math.floor(Number(step))||0))];
}

export function numbersQuestion(){
  return 'بپرس! دربارهٔ ترتیب اعداد، انتخاب با کلیک، لمس یا کلیدهای ۱ تا ۶ و شرط برد پازل کمکت می‌کنم.';
}

export function numbersBoardMarkup(){
  return `<section class="panel proto-sandbox" id="proto-sandbox" aria-labelledby="proto-board-title"><div class="section-head"><div><h2 id="proto-board-title">بوم پازل اعداد</h2></div><button class="btn secondary" data-proto="restart">شروع دوباره</button></div><canvas id="proto-canvas" width="480" height="320" tabindex="0" role="application" aria-roledescription="بازی تعاملی" aria-label="بوم پازل اعداد؛ با کلیک یا کلیدهای ۱ تا ۶ بازی کن" aria-describedby="proto-instructions"></canvas><p id="proto-game-status" role="status" aria-live="polite"></p><div class="proto-controls"><button class="btn primary" data-proto="run">اجرای بازی</button></div><div class="proto-number-pad" role="group" aria-label="انتخاب عدد پازل">${Array.from({length:TOTAL},(_,i)=>`<button class="btn secondary" type="button" data-number="${i+1}" aria-label="انتخاب عدد ${fa(i+1)}" aria-keyshortcuts="${i+1}">${fa(i+1)}</button>`).join('')}</div><p id="proto-instructions" class="proto-instructions">بعد از اجرا، اعداد را از ۱ تا ۶ به ترتیب انتخاب کن. با کلیک روی خانه، دکمه‌های اعداد یا کلیدهای ۱ تا ۶ بازی کن. انتخاب اشتباه امتیاز را کم نمی‌کند؛ فقط راهنمای عدد بعدی را نشان می‌دهد.</p></section>`;
}

function createBoard(){
  return {running:false,ended:false,next:1,done:[],message:'برای شروع، اجرای بازی را بزن.'};
}

export function bindNumbersBoard(canvas,game,{save,status}){
  let board=boards.get(game);
  const ctx=canvas.getContext('2d');

  function reset(){
    board=createBoard();
    boards.set(game,board);
    draw();
  }

  function finish(){
    board.running=false;
    board.ended=true;
    board.message='آفرین! اعداد ۱ تا ۶ را به ترتیب چیدی و پازل را کامل کردی.';
    game.won=true;
    save();
  }

  function choose(value){
    if(!board.running){
      board.message=board.ended?'پازل کامل شده؛ برای بازی دوباره، اجرای بازی را بزن.':'اول اجرای بازی را بزن.';
      draw();
      return;
    }
    if(value===board.next){
      board.done.push(value);
      board.next+=1;
      if(board.next>TOTAL){finish();}
      else board.message=`عدد ${fa(value)} درست بود. عدد بعدی ${fa(board.next)} است.`;
    }else{
      board.message=`عدد بعدی ${fa(board.next)} است؛ ${fa(value)} زودتر انتخاب شد. دوباره تلاش کن.`;
    }
    draw();
  }

  function draw(){
    if(status)status.textContent=board.message;
    if(!ctx)return;
    ctx.fillStyle='#24151f';
    ctx.fillRect(0,0,480,320);
    const cw=160,ch=160;
    ctx.textAlign='center';
    LAYOUT.forEach((value,index)=>{
      const x=(index%3)*cw,y=Math.floor(index/3)*ch,done=board.done.includes(value),next=board.running&&value===board.next;
      ctx.fillStyle=done?'#5d7d54':next?'#872341':'#3a2030';
      ctx.fillRect(x+8,y+8,cw-16,ch-16);
      ctx.strokeStyle=next?'#ffd58a':'#754052';
      ctx.lineWidth=next?4:2;
      ctx.strokeRect(x+8,y+8,cw-16,ch-16);
      ctx.fillStyle=done?'#e7f6df':'#ffd58a';
      ctx.font='bold 48px Vazirmatn, sans-serif';
      ctx.fillText(done?'✓':fa(value),x+cw/2,y+ch/2+18);
    });
  }

  function start(){
    if(board.ended)reset();
    board.running=true;
    board.message=`پازل شروع شد؛ عدد ${fa(board.next)} را انتخاب کن.`;
    draw();
    canvas.focus();
  }

  document.querySelector('[data-proto=run]').onclick=start;
  document.querySelector('[data-proto=restart]').onclick=reset;
  document.querySelectorAll('[data-number]').forEach(button=>{
    button.onclick=()=>choose(Number(button.dataset.number));
  });

  canvas.onclick=event=>{
    if(!board.running){choose(0);return;}
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const x=Math.floor((event.clientX-rect.left)/rect.width*3);
    const y=Math.floor((event.clientY-rect.top)/rect.height*2);
    if(x<0||x>2||y<0||y>1)return;
    choose(LAYOUT[y*3+x]);
  };

  canvas.onkeydown=event=>{
    const persian='۰۱۲۳۴۵۶۷۸۹';
    const raw=persian.includes(event.key)?String(persian.indexOf(event.key)):event.key;
    if(/^[1-6]$/.test(raw)){
      event.preventDefault();
      choose(Number(raw));
    }
  };

  if(!board)reset();
  else draw();
}
