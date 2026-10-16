# گزارش پیاده‌سازی HPLGAME

تاریخ گزارش: ۱۵ اکتبر ۲۰۲۶

نسخه فعلی بر همان معماری HTML/CSS/JavaScript حفظ شد. هویت فارسی، RTL، فونت Vazirmatn و رنگ‌های برند `#3C041F`، `#872341` و `#BE3144` باقی مانده‌اند.

## مشکلات اصلاح‌شده

- مهمان می‌توانست وارد مسیر، پروژه و کارگاه شود؛ حالا مسیرهای `learn`، `dashboard`، `projects`، `help`، `admin` و `workshop` قفل احراز هویت دارند.
- ورود قبلی با ایمیل و رمز بود؛ حالا ورود با ایمیل و OTP انجام می‌شود و ثبت‌نام نام کامل، موبایل ۱۱ رقمی، ایمیل، رمز قوی، تکرار رمز، نوع حساب و پذیرش قوانین را می‌گیرد.
- نام مربی از آوا به «هوپی» تغییر کرد و پیام شخصی `خوش اومدی [نام کاربر]! 🚀`، آواتار، هایلایت و آموزش اولیه دارد.
- فرم رمز از متن «نمایش» به آیکون چشم تغییر کرد؛ رمز و OTP در LocalStorage، پروژه یا پنل مدیر ذخیره نمی‌شوند.
- مقصد یا اقدام قبل از ورود در حافظه همان نشست نگه‌داری و بعد از OTP ادامه داده می‌شود؛ لغو ورود قفل را باز نمی‌کند.
- هدر، فوتر مدیریت، CTAهای قرمز، نوار ناوبری ثابت موبایل و تب‌های «بوم بازی»/«بلوک‌های کدنویسی» اضافه یا اصلاح شدند.
- کارگاه تفاوت «بلوک‌ها برای قوانین بازی» و «کیبورد/لمس برای حرکت شخصیت» را روشن می‌کند. مقدارهای عددی، محدوده، خطای فارسی، Undo/Redo، reset، توقف، save status و victory modal حفظ/تکمیل شدند.
- migration دوم ستون `full_name`، بررسی verified email، policyهای restrictive و RPC مدیریتی با نام کامل/ایمیل تأییدشده را اضافه می‌کند.
- build اکنون نام‌های `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` را می‌خواند و کلید service role/secret را رد می‌کند.

## فایل‌های مهم تغییرکرده

`app.js` رابط، auth wall، OTP، هوپی، مسیر بازگشت، mobile nav، تب‌های کارگاه و victory را مدیریت می‌کند.

`lib/backend.js` SDK Supabase، verified session، پیام خطا و profile کامل را مدیریت می‌کند.

`styles.css` رنگ برند، آیکون چشم، نوار موبایل، safe-area، تب‌های کارگاه، focus و reduced motion را پوشش می‌دهد.

`scripts/build.mjs` متغیرهای Vite/legacy را می‌خواند و خروجی code-split می‌سازد.

`supabase/migrations/202610150002_email_otp.sql` نام کامل، verified-account policies، trigger پروفایل و RPC امن مدیر را اضافه می‌کند.

`tests/auth-ui.test.mjs` و `tests/dom.test.mjs` جریان OTP، auth wall، validation، آیکون چشم، بازگشت مقصد، onboarding، کارگاه، victory و پروژه‌ها را با شبکه آزمایشی پوشش می‌دهند.

`tests/support/auth-fixture.mjs` fixture قرارداد SDK است و هیچ bypass احراز هویتی در محصول ایجاد نمی‌کند.

`.env.example` و `README.md` نام متغیرها، راه‌اندازی Supabase، قالب ایمیل OTP، SMTP، ساخت مدیر و استقرار را توضیح می‌دهند.

## نتایج واقعی بررسی

- `npm test`: **۱۵ تست موفق، ۰ شکست**.
- migration اول و دوم با PGlite: **موفق**.
- `npm run build`: **موفق**؛ خروجی در `dist/` ساخته شد.
- نسخه production با Chrome روی `http://127.0.0.1:4181/hplgame-webapp/` باز شد؛ محتوای فارسی، CTA، قفل auth، modal ثبت‌نام، دو آیکون چشم، footer مدیریت و نبود خطای Console بررسی شدند.
- در build فعلی Supabase تنظیم نشده است؛ بنابراین دکمه‌های ارسال فرم عمداً غیرفعال‌اند تا URL و anon/public key وارد شوند.

## راه‌اندازی لازم قبل از استفاده آنلاین

۱. پروژه Supabase بسازید.

۲. هر دو migration را به‌ترتیب در SQL Editor اجرا کنید.

۳. Email provider، تأیید ایمیل، SMTP و قالب OTP دارای `{{ .Token }}` را فعال کنید.

۴. `.env.example` را به `.env` کپی و `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` عمومی را وارد کنید؛ service role هرگز در frontend قرار نمی‌گیرد.

۵. `npm ci && npm test && npm run build` را اجرا کنید و `dist` را با GitHub Actions Pages منتشر کنید.

۶. برای مدیر، یک حساب verified بسازید و فقط در SQL Editor مالک پروژه `role='admin'` را روی همان UUID تنظیم کند. هیچ فرم ارتقای نقش در frontend وجود ندارد.

تأیید واقعی ایمیل، OTP، SMTP، موبایل ۳۲۰/۳۷۵/۷۶۸/۱۰۲۴، zoom ۲۰۰٪، screen reader و رضایت قانونی والدین نیازمند تنظیم سرویس و بررسی نهایی صاحب محصول است.
