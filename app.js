const STORAGE_KEY = 'hplgame-state-v1';

const defaultState = {
  page: 'home',
  editor: 'blocks',
  jumpHeight: 4,
  moveSteps: 3,
  score: 0,
  elapsed: '۰۰:۰۰',
  runState: 'idle',
  completed: 2,
  xp: 120,
  badges: 3,
  streak: 2,
  access: 'link',
  published: false,
  coachTone: 'ready',
  toast: ''
};

let state = loadState();
let runTimer;

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function faDigits(value) {
  return String(value).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
}

function icon(name) {
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    route: '<path d="M4 19V5m0 0c4-3 8 3 16 0v10c-8 3-12-3-16 0"/>',
    game: '<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M8 10v4m-2-2h4m7-1h.01m-2 3h.01"/>',
    progress: '<path d="M4 19V5m0 14h16M8 16v-3m4 3V8m4 8V5"/>',
    showcase: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    coach: '<circle cx="12" cy="7" r="3"/><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M9 9h6"/>',
    plus: '<path d="M12 3v18M3 12h18"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    sparkle: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
    code: '<path d="m8 9-4 3 4 3m8-6 4 3-4 3m-3-9-2 12"/>',
    refresh: '<path d="M20 11a8 8 0 1 0 1 5"/><path d="M20 5v6h-6"/>',
    copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sparkle}</svg>`;
}

const navItems = [
  ['home', 'خانه', 'home'], ['route', 'مسیر من', 'route'], ['game', 'بازی من', 'game'],
  ['progress', 'پیشرفت', 'progress'], ['showcase', 'ویترین', 'showcase'],
  ['coach', 'مربی', 'coach'], ['plus', 'اشتراک', 'plus']
];

function shell(content) {
  const current = state.page;
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">✦</span><div><strong>HPLGAME</strong><small>بازی بساز، یاد بگیر</small></div></div>
        <div class="profile-card"><div class="avatar">آ</div><div><b>سلام، آوا</b><small>نسخه رایگان کارگاه</small></div><span class="online-dot"></span></div>
        <nav class="side-nav" aria-label="ناوبری اصلی">
          ${navItems.map(([id, label, ico]) => `<button class="nav-item ${current === id ? 'active' : ''}" data-page="${id}">${icon(ico)}<span>${label}</span>${id === 'game' ? '<em>۱</em>' : ''}</button>`).join('')}
        </nav>
        <div class="sidebar-bottom"><div class="mini-progress"><div class="mini-progress-top"><span>پیشرفت مسیر</span><b>${faDigits(state.completed)} از ۸</b></div><div class="progress-track"><span style="width:${state.completed / 8 * 100}%"></span></div><small>${state.completed >= 3 ? 'یک قدم تا اولین بازی!' : 'اولین پرش را تمرین کن'}</small></div><div class="sidebar-foot">اولین بازی تو رایگان است<br><span>© HPLGAME</span></div></div>
      </aside>
      <main class="main-area">
        <header class="topbar"><button class="mobile-menu" data-action="mobile-menu">${icon('menu')}</button><div class="crumb"><span>کارگاه بازی‌سازی</span><b>/</b><strong>${pageTitle(current)}</strong></div><div class="top-actions"><span class="saved-status">${icon('check')} ذخیره شد</span><button class="round-button" data-action="notifications">♧</button><div class="top-avatar">آ</div></div></header>
        <div class="page-wrap">${content}</div>
      </main>
      <div class="mobile-nav">${navItems.slice(0, 5).map(([id, label, ico]) => `<button class="${current === id ? 'active' : ''}" data-page="${id}">${icon(ico)}<span>${label}</span></button>`).join('')}</div>
    </div>
    <div id="modal-root"></div>
    ${state.toast ? `<div class="toast" role="status">${icon('check')}${state.toast}</div>` : ''}
  `;
}

function pageTitle(page) {
  return ({home:'خانه', route:'مسیر من', game:'بازی من', progress:'پیشرفت', showcase:'ویترین', coach:'مربی', plus:'اشتراک'})[page] || 'خانه';
}

function badge(text, type='mint') { return `<span class="badge ${type}">${text}</span>`; }
function button(label, action, kind='primary', extra='') { return `<button class="btn ${kind}" data-action="${action}" ${extra}>${label}</button>`; }

function render() {
  const page = state.page;
  let content = page === 'home' ? renderHome() : page === 'route' ? renderRoute() : page === 'game' ? renderGame() : page === 'progress' ? renderProgress() : page === 'showcase' ? renderShowcase() : page === 'coach' ? renderCoach() : renderPlus();
  document.getElementById('app').innerHTML = shell(content);
  bindEvents();
}

function renderHome() {
  return `<section class="hero-grid"><div><div class="eyebrow">${icon('sparkle')} فضای امن برای ساختن</div><h1>سلام آوا، امروز<br><span>چه می‌سازی؟</span></h1><p class="hero-copy">از همان‌جایی که بودی ادامه بده؛ بازی تازه‌ات منتظر توست.</p><div class="hero-cta">${button('ادامه ساخت بازی', 'open-game')}${button('مسیر من', 'open-route', 'secondary')}</div><div class="hero-note">${icon('check')} اولین بازی، مسیر اصلی و انتشار عمومی همیشه رایگان است.</div></div><div class="hero-art"><div class="orb orb-a"></div><div class="orb orb-b"></div><div class="art-card"><div class="art-top"><span>${badge('بازی من', 'dark')}</span><span>ذخیره شد</span></div><div class="mini-scene"><div class="mini-star">✦</div><div class="mini-player">●</div><div class="mini-flag">⚑</div><div class="mini-platform"></div></div><div class="art-bottom"><b>سفر ستاره</b><small>اولین پروژه • خصوصی</small></div></div></div></section>
  <section class="section-head"><div><span class="eyebrow muted">داشبورد یادگیری</span><h2>از کجا ادامه بدهی؟</h2></div><button class="text-link" data-page="progress">دیدن پیشرفت ${icon('arrow')}</button></section>
  <section class="card-grid three"><article class="feature-card pink-card"><div class="card-icon">${icon('game')}</div><div>${badge('بازی من')}<h3>سفر ستاره</h3><p>ارتفاع پرش را تنظیم کن و اولین ستاره را بگیر.</p></div><div class="card-foot"><span>قدم سوم</span>${button('ادامه بازی', 'open-game', 'small')}</div></article><article class="feature-card mint-card"><div class="card-icon">${icon('route')}</div><div>${badge('مسیر اصلی', 'green')}<h3>پرش تا ستاره</h3><p>یک مقدار کوچک، یک پرش بزرگ.</p></div><div class="card-foot"><span>رایگان • ۱۵ دقیقه</span>${button('ادامه مسیر', 'open-route', 'small mint')}</div></article><article class="feature-card lavender-card"><div class="card-icon">${icon('coach')}</div><div>${badge('مربی همراه', 'purple')}<h3>اگر گیر کردی</h3><p>راهنمایی خط‌به‌خط برای هر بخشی که می‌سازی.</p></div><div class="card-foot"><span>همیشه در دسترس</span>${button('گفت‌وگو', 'open-coach', 'small ghost')}</div></article></section>
  <section class="split-section"><div class="panel challenge-panel"><div class="panel-head"><div><span class="eyebrow muted">چالش دوستانه</span><h3>با کمترین حرکت به پرچم برس</h3></div>${badge('این هفته', 'orange')}</div><div class="challenge-row"><div class="challenge-icon">⚑</div><div><b>مسیر رسیدن به پرچم</b><p>تمرین اختیاری و رایگان؛ با بازی بیشتر، تجربه و نشان تازه بگیر.</p></div>${button('دیدن چالش', 'show-challenge', 'outline')}</div></div><div class="panel stats-panel"><div class="panel-head"><div><span class="eyebrow muted">دستاوردهای من</span><h3>هر قدم، یک مهارت تازه</h3></div>${icon('sparkle')}</div><div class="stats-row"><div><b>${faDigits(state.xp)}</b><small>تجربه</small></div><div><b>${faDigits(state.badges)}</b><small>نشان</small></div><div><b>${faDigits(state.streak)}</b><small>روز زنجیره</small></div></div></div></section>`;
}

function renderGame() {
  const success = state.runState === 'success';
  const failed = state.runState === 'failed';
  return `<div class="page-heading"><div><span class="eyebrow">کارگاه بازی‌سازی / بازی من</span><h1>سفر ستاره <span class="heading-status">${state.published ? badge('منتشر شده', 'green') : badge('ذخیره شد')}</span></h1><p>با بلوک‌ها به شخصیت کمک کن تا ستاره را بگیرد و به پرچم برسد.</p></div><div class="heading-actions">${button('پیش‌نمایش بزرگ', 'preview-game', 'secondary')}${button('انتخاب دسترسی و انتشار', 'publish', 'primary')}</div></div>
  ${success ? `<div class="callout success">${icon('check')}<div><b>آزمون موفق: ستاره گرفته شد</b><span>ارتفاع پرش ${faDigits(state.jumpHeight)} معتبر است؛ حالا می‌توانی مسیر پرچم را کامل کنی.</span></div><button data-action="dismiss-result">×</button></div>` : failed ? `<div class="callout error">${icon('close')}<div><b>آزمون ناموفق</b><span>ارتفاع پرش باید یک عدد مثبت باشد. مقدار ${faDigits(state.jumpHeight)} را اصلاح کن و دوباره آزمون بگیر.</span></div><button data-action="dismiss-result">×</button></div>` : ''}
  <div class="workbench"><section class="preview-column"><div class="panel preview-panel"><div class="panel-head"><div><span class="eyebrow muted">${success ? 'بازی در حال اجرا' : 'پیش‌نمایش بازی'}</span><h2>سفر ستاره</h2></div><div class="score-pill"><b>${faDigits(state.score)}</b><span>امتیاز</span><i></i><b>${state.elapsed}</b><span>زمان</span></div></div><div class="game-stage ${success ? 'is-running' : ''}" id="game-stage"><div class="stage-sun"></div><div class="cloud cloud-one"></div><div class="cloud cloud-two"></div><div class="scene-label">سفر ستاره</div><div class="star-collect">✦</div><div class="player-sprite">●</div><div class="flag-sprite">⚑</div><div class="stage-platform platform-one"></div><div class="stage-platform platform-two"></div><div class="stage-ground"></div></div><div class="controls-hint"><span>حرکت با جهت‌ها؛ پرش با کلید فاصله</span><span>آزمون ${success ? 'موفق' : 'آماده'}</span></div><div class="preview-actions">${button('اجرا', 'run-game', 'primary')}${button('توقف', 'stop-game', 'outline')}${button('بازنشانی', 'reset-game', 'ghost')}</div></div><div class="panel console-panel"><div class="panel-head"><h3>کنسول اجرا</h3>${badge(state.runState === 'idle' ? 'آماده اجرا' : state.runState === 'success' ? 'ستاره دریافت شد' : 'نیاز به اصلاح', state.runState === 'failed' ? 'red' : 'green')}</div><p>${state.runState === 'idle' ? 'یک بلوک را تغییر بده و اجرا را بزن تا نتیجه را ببینی.' : state.runState === 'success' ? 'کنسول: ستاره با موفقیت دریافت شد. تغییرات به‌صورت خودکار ذخیره شدند.' : 'کنسول: مقدار ارتفاع پرش نمی‌تواند منفی یا صفر باشد.'}</p></div></section><section class="editor-column"><div class="panel editor-panel"><div class="editor-tabs"><button class="${state.editor === 'blocks' ? 'active' : ''}" data-editor="blocks">ویرایشگر بلوکی</button><button class="${state.editor === 'code' ? 'active' : ''}" data-editor="code">${icon('code')} کد JavaScript</button></div>${state.editor === 'blocks' ? blockEditor() : codeEditor()}</div><div class="panel coach-tip"><div class="coach-avatar">✦</div><div><b>مربی: ${success ? 'عالی بود!' : failed ? 'یک اصلاح کوچک لازم است' : 'از یک پرش شروع کنیم'}</b><p>${success ? 'حالا یک بلوک حرکت اضافه کن تا شخصیت به پرچم برسد.' : failed ? 'مقدار مثبت ۴ را امتحان کن و دوباره آزمون بگیر.' : 'بلوک پرش را انتخاب کن. ارتفاع ۴ کمک می‌کند به سکوی ستاره برسی.'}</p></div></div></section></div>`;
}

function blockEditor() {
  return `<div class="editor-intro"><div><span class="eyebrow muted">برنامهٔ تو</span><h3>یک بلوک انتخاب کن و مقدار آن را تغییر بده.</h3></div>${badge('ذخیرهٔ خودکار', 'green')}</div><div class="block-stack"><div class="block-row"><span class="block-handle">⋮⋮</span><span class="block-number">۱</span><div class="block-chip flag-chip">⚑ <b>وقتی بازی شروع شد</b></div></div><div class="block-row"><span class="block-handle">⋮⋮</span><span class="block-number">۲</span><div class="block-chip move-chip">↔ <b>حرکت به راست</b><label>گام <input type="number" min="1" max="9" value="${state.moveSteps}" data-field="moveSteps"></label></div></div><div class="block-row selected"><span class="block-handle">⋮⋮</span><span class="block-number">۳</span><div class="block-chip jump-chip">↟ <b>پرش</b><label>ارتفاع <input type="number" min="-9" max="9" value="${state.jumpHeight}" data-field="jumpHeight"></label></div>${badge('انتخاب شده', 'pink')}</div><div class="block-row"><span class="block-handle">⋮⋮</span><span class="block-number">۴</span><div class="block-chip score-chip">✦ <b>اگر ستاره را گرفتی</b><span>افزودن ۱۰ امتیاز</span></div></div><div class="block-row"><span class="block-handle">⋮⋮</span><span class="block-number">۵</span><div class="block-chip flag-chip">⚑ <b>حرکت به پرچم</b></div></div></div><div class="editor-bottom"><p>${icon('sparkle')} راهنمایی: حرکت با جهت‌ها؛ پرش با کلید فاصله</p>${button('آزمون بلوک‌ها', 'run-game', 'primary')}</div>`;
}

function codeEditor() {
  return `<div class="code-editor-head"><div><span class="eyebrow muted">فقط مقدار خط ۳ را کامل کن</span><h3>ویرایشگر نوجوان</h3></div>${badge('JavaScript', 'purple')}</div><div class="code-window"><div class="code-line"><i>1</i><span><em>const</em> { player, star, flag } = game;</span></div><div class="code-line"><i>2</i><span>player.moveRight(<b>${state.moveSteps}</b>);</span></div><div class="code-line active"><i>3</i><span>player.jump(<input type="number" min="-9" max="9" value="${state.jumpHeight}" data-field="jumpHeight" aria-label="ارتفاع پرش" />); <mark>مربی: خط ۳</mark></span></div><div class="code-line"><i>4</i><span><em>if</em> (player.touches(star)) {</span></div><div class="code-line"><i>5</i><span>&nbsp;&nbsp;game.addScore(10);</span></div><div class="code-line"><i>6</i><span>}</span></div><div class="code-line"><i>7</i><span>player.moveTo(flag);</span></div></div><div class="code-actions">${button('اجرا و آزمون', 'run-game', 'primary')}${button('توقف', 'stop-game', 'outline')}${button('بازنشانی خط', 'reset-game', 'ghost')}</div></div>`;
}

function renderRoute() {
  const steps = [['آشنایی با بازی','شخصیت، سکو و کنترل‌ها','done'],['حرکت به راست','اولین دستور حرکت','done'],['پرش تا ستاره','تغییر مقدار و آزمون برنامه','current'],['رسیدن به پرچم','ترکیب حرکت و پرش','next'],['انتشار اولین بازی','انتخاب دسترسی و فرستادن برای بررسی','next']];
  return `<div class="page-heading compact"><div><span class="eyebrow">کارگاه بازی‌سازی / مسیر من</span><h1>مسیر من؛ از حرکت تا اولین بازی</h1><p>مسیر اصلی و تمام تمرین‌های آن رایگان‌اند. با قدم‌های کوچک پیش برو.</p></div>${button('ادامه تمرین فعلی', 'open-game', 'primary')}</div><div class="route-layout"><section class="panel route-panel"><div class="panel-head"><div><span class="eyebrow muted">در حال یادگیری</span><h2>قدم‌های مسیر اصلی</h2></div>${badge(`${faDigits(state.completed)} از ۸`, 'green')}</div><div class="timeline">${steps.map((s,i)=>`<div class="timeline-item ${s[2]}"><div class="timeline-marker">${s[2]==='done'?icon('check'):faDigits(i+1)}</div><div><b>${s[0]}</b><p>${s[1]}</p></div>${s[2]==='current'?button('ادامه', 'open-game', 'small'):s[2]==='done'?'<span class="done-label">کامل شد</span>':''}</div>`).join('')}</div></section><aside class="panel route-side"><div class="route-illustration"><div class="route-star">✦</div><div class="route-path"></div><div class="route-flag">⚑</div></div><h3>پرش تا ستاره</h3><p>ارتفاع پرش را تغییر بده و شخصیت را به سکوی بعدی برسان.</p>${button('ادامه تمرین', 'open-game', 'primary')}</aside></div><div class="callout mint-wide">${icon('check')}<div><b>با خیال راحت یاد بگیر</b><span>برای ادامه مسیر یا انتشار عمومی اولین بازی، اشتراک لازم نیست.</span></div></div>`;
}

function renderProgress() {
  const bars = [42, 68, 52, 82, 60, 35, 48];
  return `<div class="page-heading compact"><div><span class="eyebrow">کارگاه بازی‌سازی / پیشرفت</span><h1>هر قدم، یک مهارت تازه</h1><p>تمرین‌های تو، نشان‌های تو و مسیر یادگیری تو در یک نگاه.</p></div><div class="streak-card"><span>زنجیره یادگیری</span><b>${faDigits(state.streak)} روز</b>${icon('sparkle')}</div></div><div class="metric-grid"><div class="metric-card"><span>تجربه کسب‌شده</span><b>${faDigits(state.xp)}</b><small>+۳۰ این هفته</small></div><div class="metric-card"><span>نشان دریافت‌شده</span><b>${faDigits(state.badges)}</b><small>از ۸ نشان</small></div><div class="metric-card"><span>تمرین‌های کامل</span><b>${faDigits(state.completed)}</b><small>از ۸ تمرین</small></div><div class="metric-card accent"><span>روزهای زنجیره</span><b>${faDigits(state.streak)}</b><small>ادامه بده!</small></div></div><div class="progress-grid"><section class="panel chart-panel"><div class="panel-head"><div><span class="eyebrow muted">فعالیت این هفته</span><h2>تمرین‌های انجام‌شده</h2></div>${badge('۴ تمرین', 'green')}</div><div class="bar-chart">${bars.map((h,i)=>`<div class="bar-col"><div class="bar" style="height:${h}%"><span>${faDigits(Math.round(h/20))}</span></div><small>${['ش','ی','د','س','چ','پ','ج'][i]}</small></div>`).join('')}</div><p class="chart-note">این هفته ۴ تمرین انجام دادی؛ همین ریتم را ادامه بده.</p></section><section class="panel badges-panel"><div class="panel-head"><div><span class="eyebrow muted">مجموعه نشان‌ها</span><h2>نشان‌های من</h2></div>${icon('showcase')}</div><div class="badge-list"><div class="badge-item earned"><span>✦</span><div><b>اولین بازی‌ساز</b><small>ساخت اولین پروژه</small></div>${icon('check')}</div><div class="badge-item earned"><span>★</span><div><b>شکارچی ستاره</b><small>کامل‌کردن تمرین پرش</small></div>${icon('check')}</div><div class="badge-item earned"><span>✓</span><div><b>حل‌کننده خطا</b><small>اصلاح مقدار خط ۳</small></div>${icon('check')}</div><div class="badge-item locked"><span>⚑</span><div><b>رسیدن به پرچم</b><small>تمرین بعدی مسیر</small></div><small>قفل</small></div></div></section></div>`;
}

function renderShowcase() {
  const cards = [['سفر ستاره','آوا','سکویی','pink'],['پرش در مهتاب','نیما','ماجراجویی','purple'],['راه پرچم','رها','سکویی','orange']];
  return `<div class="page-heading compact"><div><span class="eyebrow">کارگاه بازی‌سازی / ویترین</span><h1>ویترین؛ بازی‌های ساخته‌شده با خیال</h1><p>اینجا فقط بازی‌های عمومیِ بررسی‌شده نمایش داده می‌شوند.</p></div><div class="search-box">⌕<input placeholder="نام بازی یا سازنده را بنویس" /></div></div><div class="showcase-filter"><button class="active">همه بازی‌ها ✓</button><button>سکویی</button><button>ماجراجویی</button><button>تازه‌ها</button></div><div class="showcase-grid">${cards.map(c=>`<article class="showcase-card"><div class="showcase-art ${c[3]}"><span>✦</span><b>⚑</b><i></i></div><div class="showcase-content"><div><b>${c[0]}</b><small>ساخته ${c[1]} • ${c[2]}</small></div>${badge('عمومی • تأییدشده','green')}</div>${button('بازی کن', 'play-showcase', 'small full')}</article>`).join('')}</div><div class="callout mint-wide">${icon('check')}<div><b>اولین بازی آوا در ویترین منتشر شد</b><span>بازی‌های خصوصی و «فقط با پیوند» در این فهرست دیده نمی‌شوند.</span></div></div>`;
}

function renderCoach() {
  return `<div class="page-heading compact"><div><span class="eyebrow">کارگاه بازی‌سازی / مربی</span><h1>مربی کنار خط توست</h1><p>اگر در یک خط گیر کردی، راهنمایی بگیر و همان‌جا ادامه بده.</p></div>${badge('آنلاین', 'green')}</div><div class="coach-layout"><section class="panel coach-chat"><div class="chat-head"><div class="coach-avatar large">✦</div><div><b>مربی HPLGAME</b><small>پاسخ‌گوی تمرین‌های تو</small></div><span class="online-pill">آنلاین</span></div><div class="chat-body"><div class="chat-bubble assistant">سلام آوا! برای پرش تا ستاره آماده‌ای؟ مقدار ارتفاع باید یک عدد مثبت باشد؛ ۴ انتخاب خوبی است.</div><div class="chat-bubble user">من خط ۳ را اصلاح کردم. حالا چه کار کنم؟</div><div class="chat-bubble assistant">عالیه! بازی را اجرا کن. اگر ستاره را گرفتی، یک بلوک حرکت اضافه کن تا به پرچم برسی.</div></div><div class="chat-input"><input placeholder="پیامت را برای مربی بنویس..." /><button data-action="send-coach">ارسال ${icon('arrow')}</button></div></section><aside class="panel coach-side"><span class="eyebrow muted">راهنمای آماده</span><h3>ارتفاع پرش را چک کن</h3><div class="tip-code"><span>۳</span><code>player.jump( <b>${faDigits(state.jumpHeight)}</b> );</code></div><p>مقدار مثبت، بازی را به سکوی ستاره می‌رساند.</p>${button('رفتن به ویرایشگر', 'open-game', 'primary')}</aside></div>`;
}

function renderPlus() {
  return `<div class="page-heading compact"><div><span class="eyebrow">کارگاه بازی‌سازی / اشتراک</span><h1>اولین بازی رایگان؛ امکانات بیشتر با پلاس</h1><p>برای یادگیری مسیر اصلی نیازی به خرید اشتراک نیست.</p></div>${badge('پایه یادگیری همیشه رایگان', 'green')}</div><div class="pricing-grid"><article class="pricing-card free"><div class="pricing-top"><span class="plan-icon">♡</span><h2>رایگان</h2><p>همه چیز برای ساخت و انتشار اولین بازی</p></div><div class="price">۰ <small>تومان</small></div><ul><li>${icon('check')} ساخت اولین بازی</li><li>${icon('check')} مسیر اصلی و همه تمرین‌ها</li><li>${icon('check')} انتشار عمومی اولین بازی</li><li>${icon('check')} راهنمایی پایه مربی</li></ul>${button('پلن فعلی تو ✓', 'free-plan', 'outline full')}</article><article class="pricing-card plus-plan"><div class="pricing-ribbon">پیشنهاد برای سازنده‌ها</div><div class="pricing-top"><span class="plan-icon">✦</span><h2>پلاس</h2><p>برای پروژه‌های بیشتر و ایده‌های تازه</p></div><div class="price">۲۹۴٬۰۰۰ <small>تومان در ماه</small></div><ul><li>${icon('check')} پروژه‌های بیشتر</li><li>${icon('check')} ابزار پیشرفته ویرایش بازی</li><li>${icon('check')} راهنمایی بیشتر از مربی</li><li>${icon('check')} مدیریت پروژه‌ها</li></ul>${button('درخواست پلاس از سرپرست', 'request-plus', 'primary full')}</article></div><div class="callout yellow-wide">${icon('sparkle')}<div><b>خرید اختیاری است</b><span>اولین بازی، مسیر اصلی، تمرین‌ها و انتشار عمومی اولین بازی در هر دو پلن در دسترس‌اند.</span></div></div>`;
}

function showToast(message) {
  state.toast = message; render(); setTimeout(() => { state.toast = ''; render(); }, 2600);
}

function openModal(type) {
  const root = document.getElementById('modal-root');
  if (type === 'publish') root.innerHTML = `<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="modal-close" data-action="close-modal">${icon('close')}</button><span class="eyebrow">بازی من / انتشار</span><h2>بازی‌ات را با دیگران به اشتراک بگذار</h2><p>دسترسی را خودت انتخاب کن؛ انتشار عمومی اولین بازی رایگان است.</p><div class="access-options">${[['private','خصوصی','فقط کودک و سرپرست می‌توانند بازی را ببینند و بازی کنند.'],['link','فقط با پیوند','هر کسی پیوند را داشته باشد، می‌تواند بازی کند.'],['public','عمومی','پس از بررسی در ویترین قرار می‌گیرد.']].map(o=>`<label class="access-option ${state.access===o[0]?'selected':''}"><input type="radio" name="access" value="${o[0]}" ${state.access===o[0]?'checked':''}><span><b>${o[1]}</b><small>${o[2]}</small></span><i>${state.access===o[0]?icon('check'):''}</i></label>`).join('')}</div><div class="modal-actions">${button('لغو', 'close-modal', 'ghost')}${button('ذخیره و دریافت پیوند', 'confirm-publish', 'primary')}</div></div></div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => { state.page = el.dataset.page; state.toast = ''; saveState(); render(); }));
  document.querySelectorAll('[data-editor]').forEach(el => el.addEventListener('click', () => { state.editor = el.dataset.editor; render(); }));
  document.querySelectorAll('[data-field]').forEach(el => el.addEventListener('input', () => { state[el.dataset.field] = Number(el.value); saveState(); }));
  document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => handleAction(el.dataset.action)));
  document.querySelectorAll('input[name="access"]').forEach(el => el.addEventListener('change', () => { state.access = el.value; openModal('publish'); }));
}

function handleAction(action) {
  if (action === 'open-game') { state.page = 'game'; state.toast=''; saveState(); render(); }
  else if (action === 'open-route') { state.page = 'route'; saveState(); render(); }
  else if (action === 'open-coach') { state.page = 'coach'; saveState(); render(); }
  else if (action === 'publish') openModal('publish');
  else if (action === 'close-modal') { document.getElementById('modal-root').innerHTML = ''; }
  else if (action === 'confirm-publish') { state.published = true; state.toast = state.access === 'public' ? 'درخواست انتشار عمومی ثبت شد؛ بازی پس از بررسی در ویترین قرار می‌گیرد.' : 'دسترسی بازی ذخیره شد و پیوند آماده است.'; saveState(); document.getElementById('modal-root').innerHTML = ''; render(); }
  else if (action === 'run-game') runGame();
  else if (action === 'stop-game') { stopGame(); state.runState='idle'; state.score=0; state.elapsed='۰۰:۰۰'; saveState(); render(); }
  else if (action === 'reset-game' || action === 'dismiss-result') { stopGame(); state.runState='idle'; state.score=0; state.elapsed='۰۰:۰۰'; saveState(); render(); }
  else if (action === 'preview-game') { state.page='game'; saveState(); render(); setTimeout(runGame, 150); }
  else if (action === 'show-challenge') { showToast('چالش این هفته آماده است؛ با کمترین حرکت به پرچم برس!'); }
  else if (action === 'play-showcase') { showToast('بازی نمونه در حالت پیش‌نمایش اجرا شد.'); }
  else if (action === 'send-coach') { showToast('پیامت برای مربی فرستاده شد.'); }
  else if (action === 'request-plus') { showToast('درخواست پلاس برای سرپرست فرستاده شد؛ هیچ پرداختی انجام نشده است.'); }
  else if (action === 'free-plan') { showToast('پلن رایگان فعال است و اولین بازی همیشه در دسترس توست.'); }
  else if (action === 'notifications') { showToast('اعلان تازه‌ای نداری.'); }
  else if (action === 'mobile-menu') { document.querySelector('.sidebar')?.classList.toggle('open'); }
}

function runGame() {
  clearTimeout(runTimer);
  state.runState = Number(state.jumpHeight) > 0 ? 'success' : 'failed';
  state.score = state.runState === 'success' ? 10 : 0;
  state.elapsed = state.runState === 'success' ? '۰۰:۳۰' : '۰۰:۰۰';
  if (state.runState === 'success') { state.completed = Math.max(state.completed, 3); state.xp = Math.max(state.xp, 150); }
  saveState(); render();
  if (state.runState === 'success') { runTimer = setTimeout(() => { document.querySelector('.game-stage')?.classList.add('is-running'); }, 80); }
}

function stopGame() { clearTimeout(runTimer); document.querySelector('.game-stage')?.classList.remove('is-running'); }

render();
