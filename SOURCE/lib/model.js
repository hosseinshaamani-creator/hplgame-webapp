export const fa = value => String(value).replace(/[0-9]/g, n => '۰۱۲۳۴۵۶۷۸۹'[+n]);
export const english = value => String(value ?? '').replace(/[۰-۹]/g, n => '۰۱۲۳۴۵۶۷۸۹'.indexOf(n)).replace(/[٠-٩]/g, n => '٠١٢٣٤٥٦٧٨٩'.indexOf(n));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, n => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[n]));
export const defaults = Object.freeze({ speed: 3, jump: 4, starScore: 10 });
export const fields = Object.freeze({
  speed: { title: 'سرعت حرکت', unit: 'گام در ثانیه', min: 1, max: 9, hint: 'با سرعت بیشتر، مسیر را زودتر طی می‌کنی.' },
  jump: { title: 'ارتفاع پرش', unit: 'واحد ارتفاع', min: 1, max: 9, hint: 'ارتفاع ۴ برای رسیدن به ستاره کافی است.' },
  starScore: { title: 'امتیاز ستاره', unit: 'امتیاز', min: 1, max: 100, hint: 'این مقدار امتیاز بازی است؛ XP مرحله همیشه ثابت است.' }
});
// Published lessons are playable. Future lessons stay visibly unavailable.
export const lessons = Object.freeze([
  { id:'first-star', title:'اولین ستاره', description:'سرعت و پرش را تنظیم کن؛ ستاره را بگیر و به پرچم برس.', difficulty:'آسان', prerequisite:null, published:true, xp:50, defaults },
  { id:'careful-jump', title:'پرش دقیق', description:'از روی مانع بپر و ستاره دوم را پیدا کن.', difficulty:'متوسط', prerequisite:'first-star', published:true, xp:75, defaults:{speed:3,jump:5,starScore:15} },
  { id:'world-builder', title:'دنیای من', description:'نمونه توسعه: ساخت زمین و طراحی دنیای شخصی.', difficulty:'متوسط', prerequisite:'careful-jump', published:false, xp:0, defaults }
]);
export function normalizePhone(value) {
  let phone = english(value).replace(/[\s()\-]/g, '');
  if (!phone) return '';
  if (/^09\d{9}$/.test(phone)) phone = '+98'+phone.slice(1);
  if (/^00989\d{9}$/.test(phone)) phone = '+'+phone.slice(2);
  return /^\+989\d{9}$/.test(phone) ? phone : null;
}
export function validateValue(key, raw) {
  const f = fields[key], input = english(raw).trim(), n = Number(input);
  if (!f || !input || !Number.isInteger(n) || n < f.min || n > f.max) return { error: f ? `یک عدد صحیح از ${fa(f.min)} تا ${fa(f.max)} وارد کن.` : 'تنظیم ناشناخته است.' };
  return { value:n };
}
export function cleanSettings(data, fallback = defaults) {
  return Object.fromEntries(Object.keys(fields).map(key => [key, validateValue(key, data?.[key]).error ? fallback[key] : Number(english(data[key]))]));
}
export function validateSignup(data) {
  const errors = {}, email = english(data.email).trim().toLowerCase(), phone = normalizePhone(data.phone);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) errors.email = 'یک ایمیل معتبر وارد کن.';
  if (phone === null) errors.phone = 'شماره ایران را مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کن.';
  if (String(data.password).length < 12 || String(data.password).length > 128) errors.password = 'رمز باید بین ۱۲ تا ۱۲۸ نویسه باشد.';
  if (data.password !== data.confirm) errors.confirm = 'تکرار رمز با رمز برابر نیست.';
  if (!data.terms) errors.terms = 'پذیرش قوانین و حریم خصوصی لازم است.';
  if (!['adult','guardian'].includes(data.accountKind)) errors.accountKind = 'فعلاً حساب آنلاین فقط برای بزرگسال یا والد در دسترس است.';
  return { errors, email, phone };
}
export function passwordStrength(password) {
  return [password.length >= 12, /[a-z]/.test(password)&&/[A-Z]/.test(password), /\d/.test(password), /[^a-zA-Z\d]/.test(password)].filter(Boolean).length;
}
export function lessonStatus(lesson, progress) {
  if (!lesson.published || lesson.prerequisite && progress[lesson.prerequisite]?.status !== 'completed') return 'locked';
  return progress[lesson.id]?.status || 'not_started';
}
export function stats(progress) {
  const done = lessons.filter(l => l.published && progress[l.id]?.status === 'completed');
  return { completed:done.length, xp:done.reduce((n,l)=>n+l.xp,0), percent:Math.round(done.length/lessons.filter(l=>l.published).length*100) };
}
export function safeProject(project) {
  const lesson = lessons.find(l => l.id === project?.project_data?.lesson_id && l.published) || lessons[0];
  return { ...project, title:String(project?.title || 'سفر ستاره').slice(0,80), project_data:{lesson_id:lesson.id,settings:cleanSettings(project?.project_data?.settings,lesson.defaults)} };
}
export function csvCell(value) {
  const text = String(value ?? '');
  // Stop spreadsheet formula injection, including whitespace before formula characters.
  return '"'+(/^[\s]*[=+@\-\t\r]/.test(text) ? "'"+text : text).replace(/"/g,'""')+'"';
}
export function formatTime(seconds) { return fa(`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`); }
