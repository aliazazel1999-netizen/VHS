# nhentai-telegram-bot — نسخه Vercel 🚀

بازنویسیِ کاملِ [sleroq/nhentai-telegram-bot](https://github.com/sleroq/nhentai-telegram-bot) برای اجرای **بدون سرور (serverless)** روی **Vercel**، با رابط کاربری **دوزبانه فارسی/انگلیسی** که از داخل `/settings` قابل تغییر است.

---

## ✨ امکانات

- **جستجوی درون‌خطی (inline)** در هر چتی: `@your_bot عبارت` — با پشتیبانی صفحه‌بندی مثل `query /p2`
- **تشخیص خودکار کد**: کافیه کد گالری (`255700`) یا لینک nhentai رو بفرستی — تا ۲۰ کد در یک پیام
- `/rand` — گالری تصادفی (از endpoint رسمی `/galleries/random`)
- `/zip <code>` — دریافت آرشیو ZIP صفحات از **آرشیو رسمی nhentai** (فایل تا ۴۵ مگابایت مستقیم ارسال می‌شه؛ بزرگ‌تر با لینک دانلود مستقیم)
- `/settings` — **انتخاب زبان (فارسی/English)** + مرتب‌سازی جستجو (جدیدترین/محبوب‌ترین) + سبک نتایج inline (متن/عکس)
- `/help` — راهنمای کامل
- **دوزبانه fa/en**: کاربر جدید با زبان کلاینت تلگرامش به‌طور خودکار فارسی یا انگلیسی می‌شه (قابل تنظیم با `DEFAULT_LANGUAGE`)
- **کش دیتابیس**: گالری‌های دیده‌شده در Turso ذخیره می‌شن تا درخواست تکراری سریع جواب بده
- دکمه «بارگذاری اطلاعات» (Load info) و «باز کردن در nhentai» روی کارت‌ها

## 🏗️ تفاوت‌های اصلی با پروژهٔ مبدأ

| مورد | پروژه اصلی | این نسخه |
|---|---|---|
| اجرا | Bun + Long Polling | Node.js 20+ + **Webhook** روی Vercel |
| دیتابیس | SQLite با `bun:sqlite` (فایل محلی) | **Turso** (libSQL ابری، پلن رایگان) با Drizzle ORM |
| API منبع | پکیج `nhentai` (API v1 قدیمی — از کار افتاده) | **nhentai API v2 رسمی** با کلید API |
| ZIP | دانلود تک‌تک صفحات و زیپ‌کردن در حافظه | **endpoint رسمی `download`** + سقف حجم + fallback لینک |
| زبان | انگلیسی | **فارسی + انگلیسی**، انتخاب از `/settings` |
| FlareSolverr | پشتیبانی می‌شد | حفظ شده (اختیاری، با `FLARESOLVERR_URL`) |
| پاسخ‌دهی وب‌هوک | — | پاسخ فوری + پردازش پس‌زمینه با `waitUntil` (مناسب `/zip` طولانی) |

---

## 📋 پیش‌نیازها

1. **توکن ربات**: از [@BotFather](https://t.me/BotFather) بساز (`/newbot`)
2. **کلید API nhentai**: در [nhentai.net/user/settings#apikeys](https://nhentai.net/user/settings#apikeys) یک API Key بساز — الزامی است (API قدیمی که پکیج‌های npm استفاده می‌کردند بسته شده)
3. **دیتابیس Turso رایگان**: ثبت‌نام در [turso.tech](https://turso.tech)
4. اکانت **Vercel** (پلن Hobby کافی است)

## 🚀 استقرار روی Vercel (قدم‌به‌قدم)

### قدم ۱ — کد را آماده کن

```bash
git clone <این مخزن>   # یا دانلود و پوشه را باز کن
cd nhentai-bot-vercel
npm install
```

### قدم ۲ — دیتابیس Turso بساز

```bash
npm i -g @turso/cli
turso auth signup
turso db create nhentai-bot
turso db show --url nhentai-bot        # ← TURSO_DATABASE_URL
turso db tokens create nhentai-bot     # ← TURSO_AUTH_TOKEN
```

### قدم ۳ — روی Vercel دیپلوی کن

```bash
npm i -g vercel
vercel login
vercel            # اولین دیپلوی (preview)
vercel --prod     # دیپلوی پروداکشن — آدرس https://<project>.vercel.app را یادداشت کن
```

> می‌توانی به‌جای CLI، مخزن را در [vercel.com/new](https://vercel.com/new) ایمپورت کنی.

### قدم ۴ — متغیرهای محیطی را در Vercel تنظیم کن

در داشبورد → Project → Settings → Environment Variables (یا با CLI):

```bash
vercel env add BOT_TOKEN
vercel env add NHENTAI_API_KEY
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add WEBHOOK_SECRET        # یک رشته تصادفی بلند، مثلاً خروجی: openssl rand -hex 32
vercel env add APP_URL               # https://<project>.vercel.app
```

بعد از تغییر env ها یک بار redeploy کن: `vercel --prod`

### قدم ۵ — جداول دیتابیس را بساز و وب‌هوک را ثبت کن

```bash
# روی سیستم خودت (env ها را از .env محلی یا به‌صورت inline بده):
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:init

BOT_TOKEN=... APP_URL=https://<project>.vercel.app WEBHOOK_SECRET=... npm run webhook:set
```

خروجی `setWebhook → {"ok":true}` باید باشد. تمام! 🎉

### تست

- آدرس `https://<project>.vercel.app` را در مرورگر باز کن → باید پیام `webhook endpoint is live` ببینی
- در تلگرام به رباتت `/start` بده
- برای تست inline: `@your_bot big` را در هر چتی تایپ کن

---

## ⚙️ متغیرهای محیطی

| متغیر | الزامی | توضیح |
|---|---|---|
| `BOT_TOKEN` | ✅ | توکن ربات از @BotFather |
| `NHENTAI_API_KEY` | ✅ | کلید API v2 از تنظیمات اکانت nhentai |
| `TURSO_DATABASE_URL` | ✅ | مثل `libsql://db-org.turso.io` (برای محلی: `file:local.db`) |
| `TURSO_AUTH_TOKEN` | برای Turso ✅ | توکن ساخته‌شده با `turso db tokens create` |
| `WEBHOOK_SECRET` | توصیه‌می‌شود | راز اعتبارسنجی درخواست‌های تلگرام |
| `APP_URL` | برای webhook:set | آدرس دیپلوی ورسل |
| `DEFAULT_LANGUAGE` | — | `auto` (پیش‌فرض، تشخیص از تلگرام) / `fa` / `en` |
| `ZIP_MAX_MB` | — | سقف آپلود مستقیم ZIP (پیش‌فرض ۴۵ — Bot API سقف ۵۰ دارد) |
| `ZIP_TIMEOUT_MS` | — | سقف زمان دانلود آرشیو (پیش‌فرض ۴۵۰۰۰) |
| `FLARESOLVERR_URL` | — | آدرس FlareSolverr اگر Cloudflare جلوی سرور ورسل را گرفت |
| `SOURCE_MAX_TIMEOUT_MS` | — | سقف زمان FlareSolverr (پیش‌فرض ۶۰۰۰۰) |
| `NHENTAI_USER_AGENT` | — | User-Agent ارسالی به nhentai (توصیفی، طبق مستندات API) |

## 💻 اجرای محلی (بدون ورسل)

برای توسعه، ربات به‌جای وب‌هوک با Long Polling اجرا می‌شود:

```bash
cp .env.example .env    # مقادیر BOT_TOKEN و NHENTAI_API_KEY را پر کن
# برای دیتابیس محلی این را در .env بگذار:  TURSO_DATABASE_URL=file:local.db
npm run db:init
npm run dev
```

> ⚠️ اگر وب‌هوک قبلاً روی تلگرام ثبت شده، اول `npm run webhook:delete` بزن وگرنه پیام‌ها به ورسل می‌روند نه به سیستم تو.

## 🛡️ FlareSolverr (اختیاری)

اگر nhentai درخواست‌های سرور ورسل را با Cloudflare مسدود کرد (خطای 403 در لاگ‌ها)، یک FlareSolverr روی یک VPS یا سرویس داکری جدا اجرا کن و آدرسش را در `FLARESOLVERR_URL` بگذار:

```bash
docker run -d --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
# سپس در ورسل:  FLARESOLVERR_URL=http://<vps-ip>:8191
```

ربات از FlareSolverr فقط برای گرفتن کوکی `cf_clearance` استفاده می‌کند و بقیه درخواست‌ها مستقیم زده می‌شوند.

## 📁 ساختار پروژه

```
├── api/
│   └── bot.ts              # نقطه ورود ورسل: اعتبارسنجی راز + waitUntil(bot.handleUpdate)
├── scripts/
│   ├── db-init.mjs         # ساخت جداول (users, manga)
│   ├── set-webhook.mjs     # ثبت وب‌هوک با secret و allowed_updates
│   ├── delete-webhook.mjs
│   └── smoke.ts            # تست دود محلی (i18n، دیتابیس، توضیحات)
├── src/
│   ├── bot/
│   │   ├── index.ts        # فکتوری ربات (webhook + polling برای dev)
│   │   ├── search.ts       # هندلر inline query (دوزبانه)
│   │   ├── keyboard.ts
│   │   ├── cmds/           # start / help / rand / settings / zip / by-ids
│   │   └── buttons/open.ts # دکمه «بارگذاری اطلاعات»
│   ├── i18n/               # en.ts، fa.ts، index (تشخیص زبان)
│   ├── db/                 # Drizzle + libSQL: schema، client، users
│   ├── sources/            # کلاینت nhentai API v2 + FlareSolverr
│   ├── lib/                # کش گالری، تولید توضیحات، دانلود آرشیو
│   ├── config.ts
│   └── dev.ts              # اجرای محلی با polling
├── vercel.json             # maxDuration = 60
└── .env.example
```

## ⚠️ محدودیت‌ها و نکات

- **سقف زمان تابع**: در پلن Hobby ورسل حداکثر ۶۰ ثانیه (`vercel.json` روی ۶۰ تنظیم شده). اگر پلن Pro داری می‌توانی تا ۳۰۰ ثانیه بالا ببری تا ZIPهای حجیم‌تر هم دانلود شوند.
- **سقف آپلود Bot API تلگرام ۵۰ مگابایت** است؛ ZIPهای بزرگ‌تر خودکار با **لینک دانلود مستقیم** جایگزین می‌شوند.
- نرخ درخواست nhentai محدودیت سخاوتمندانه دارد؛ خطای `429` در لاگ یعنی باید سرعت را کم کنی — ربات پیام خطا نشان می‌دهد.
- **کلید API nhentai شخصی توست**؛ آن را اشتراک نکن. اگر لو رفت، از پنل nhentai باطل و جدیدش کن.
- کش دیتابیس توضیحات را **به‌صورت ساختاریافته** نگه می‌دارد و کارت متن **در لحظه با زبان کاربر** ساخته می‌شود؛ پس کش بین کاربران فارسی و انگلیسی مشترک است بدون تداخل زبان.
- ترتیب گروه‌بندی برچسب‌ها در کارت: دسته‌ها، پارودی‌ها، شخصیت‌ها، هنرمندان، گروه‌ها، زبان‌ها، برچسب‌ها.

## 🙏 منبع

این پروژه بازنویسیِ [sleroq/nhentai-telegram-bot](https://github.com/sleroq/nhentai-telegram-bot) (GPL-3.0) است. این نسخه هم تحت GPL-3.0 منتشر می‌شود.

---

## English quick start

1. `npm install`
2. Get a bot token from [@BotFather](https://t.me/BotFather) and an API key from nhentai account settings
3. Create a free database: `turso db create nhentai-bot` → collect URL + token
4. Deploy to Vercel (`vercel --prod`) and set env vars: `BOT_TOKEN`, `NHENTAI_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `WEBHOOK_SECRET`, `APP_URL`
5. `npm run db:init && npm run webhook:set`
6. Bilingual (fa/en): users get Persian or English automatically based on their Telegram client language; switch anytime via `/settings`
