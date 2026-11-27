import {escapeHTML as esc,fa} from './model.js';

export const learningPaths=[
  {id:'tic',title:'دوز',description:'نوبت‌ها و شرط برد را یاد بگیر.',idea:'یک بازی دوز با دو بازیکن X و O می‌خواهم.'},
  {id:'snake',title:'مار',description:'حرکت، غذا و برخورد را تمرین کن.',idea:'یک بازی مار می‌خواهم که با خوردن غذا بزرگ شود.'},
  {id:'flappy',title:'فلپی برد',description:'کنترل پرنده و عبور از مانع را بساز.',idea:'یک بازی فلپی برد با پرنده و لوله‌ها می‌خواهم.'},
  {id:'numbers',title:'پازل اعداد',description:'ترتیب اعداد و انتخاب درست را تمرین کن.',idea:'یک پازل اعداد می‌خواهم که اعداد ۱ تا ۶ را به ترتیب انتخاب کنم.'},
  {id:'stars',title:'جمع‌آوری ستاره',description:'بازیکن را حرکت بده و سه ستاره جمع کن.',idea:'یک بازی جمع‌آوری سه ستاره با کلیدهای جهت می‌خواهم.'}
];

export function learningOverview(games){
  const current=games.find(game=>!game.won||game.step<3)||games[0]||null;
  const steps=games.reduce((total,game)=>total+Math.max(0,Math.min(3,game.step||0)),0);
  return {current,steps,total:games.length*3,completed:games.filter(game=>game.step===3&&game.won).length};
}

export function personalHome({name,games,composer,syncStatus='',exercise=null}){
  const {current,steps,total,completed}=learningOverview(games);
  const next=current?(current.step===3?'آموزش را مرور کن و بازی‌ات را آزمایش کن.':['صحنهٔ بازی را بشناس و اولین اجرای آن را امتحان کن.','کنترل‌ها و قانون بازی را تمرین کن.','شرط برد را بررسی کن و بازی را آزمایش کن.'][current.step]):exercise?'تمرین ذخیره‌شده‌ات را باز کن و حرکت و پرش را ادامه بده.':'یک ایده بنویس یا یکی از مسیرهای آماده را انتخاب کن.';
  return `<section class="home-welcome"><h1>${esc(name)}، خوش برگشتی.</h1><p>امروز فقط یک قدم به بازی خودت نزدیک‌تر شو.</p></section><section class="panel next-action" aria-labelledby="next-title"><div><h2 id="next-title">${current||exercise?'قدم بعدی تو':'اولین بازی‌ات را شروع کن'}</h2>${current?`<h3>${esc(current.idea)}</h3>`:exercise?`<h3>${esc(exercise.title)}</h3>`:''}<p>${next}</p>${current?`<button class="btn primary" data-open-game="${esc(current.id)}">${current.step===3?'باز کردن بازی من':'ادامه با هوپی'} ←</button><button class="btn ghost" data-edit-idea="${esc(current.id)}">ویرایش ایده</button>`:exercise?`<button class="btn primary" data-action="open-project" data-id="${esc(exercise.id)}">ادامهٔ تمرین ←</button>`:''}</div><div class="home-hopi" aria-hidden="true"><div class="hopi-bot"><div class="bot-antenna"></div><div class="bot-face"><i></i><i></i><b></b></div><div class="bot-foot"></div></div></div></section><p class="proto-storage" role="status">${esc(syncStatus)}</p><button class="btn secondary" id="home-save-retry" data-proto="sync" ${/نشد|تغییر کرده|پر شده/.test(syncStatus)?'':'hidden'}>ذخیره دوباره</button>${current?`<section class="home-progress" aria-label="وضعیت یادگیری"><p><strong>${fa(steps)} از ${fa(total)}</strong> گام آموزشی مرور شده</p><progress value="${steps}" max="${Math.max(1,total)}" aria-label="گام‌های آموزشی مرورشده"></progress><p>${fa(games.length)} بازی · ${fa(completed)} مسیر با آموزش کامل و برد ثبت‌شده</p></section><details class="panel home-new"><summary>ایدهٔ بازی دیگری داری؟</summary><p>اولین بازی رایگان است؛ بازی‌های بیشتر به دسترسی پرو نیاز دارند.</p>${composer}</details>`:`<section class="home-composer">${composer}</section><a class="text-link" href="#/learn">برای شروع ایده می‌خواهم ←</a>`}`;
}

export function pathPicker(){return `<section class="path-picker" aria-labelledby="paths-title"><h2 id="paths-title">از کدام بازی شروع می‌کنی؟</h2><p>انتخاب مسیر فقط ایده را در فرم می‌نویسد؛ پیش از شروع می‌توانی آن را تغییر بدهی.</p><div class="learning-path-grid">${learningPaths.map(path=>`<article class="panel learning-path"><h3>${path.title}</h3><p>${path.description}</p><button class="btn secondary" data-learning-path="${path.id}">انتخاب ${path.title}</button></article>`).join('')}</div></section>`;}

export function bindLearningHome({navigate,prepareIdea}){
  document.querySelectorAll('[data-learning-path]').forEach(button=>button.addEventListener('click',()=>{
    const path=learningPaths.find(path=>path.id===button.dataset.learningPath);
    if(!path)return;
    prepareIdea(path.idea);
    navigate('','#game-idea');
  }));
}
