/** Persian strings — must match the shape of en.ts (compile-time checked). */

import type { LangStrings } from './en.js'

const fa: LangStrings = {
	// /start
	start: [
		'👋 <b>سلام!</b>',
		'',
		'من جستجوگر nhentai هستم.',
		'',
		'• کد گالری رو بفرست، مثل <code>255700</code>',
		'• می‌تونی تا ۲۰ کد رو در یک پیام بفرستی',
		'• یا در هر چتی جستجوی درون‌خطی کن: <code>@{bot} عبارت</code>',
		'',
		'دستورها:',
		'/rand — گالری تصادفی',
		'/zip &lt;کد&gt; — دانلود صفحات به‌صورت ZIP',
		'/settings — زبان و تنظیمات',
		'/help — راهنمای کامل',
	].join('\n'),

	// /help
	help: [
		'ℹ️ <b>راهنما</b>',
		'',
		'<b>دستورها</b>',
		'/start — پیام خوش‌آمد',
		'/rand — گالری تصادفی',
		'/id &lt;کد&gt; — باز کردن گالری با کد',
		'/zip &lt;کد&gt; — دانلود صفحات به‌صورت ZIP',
		'/settings — زبان و تنظیمات',
		'',
		'<b>جستجوی درون‌خطی</b>',
		'در هر چتی بنویس <code>@{bot} عبارت</code>. برای رفتن به صفحه ۲ نتایج، <code>/p2</code> را به عبارت اضافه کن.',
		'',
		'<b>تشخیص کد</b>',
		'کافیه کدی مثل <code>255700</code> یا لینکی مثل <code>https://nhentai.net/g/255700/</code> بفرستی. حداکثر ۲۰ کد در هر پیام.',
		'',
		'<b>محدودیت ZIP</b>',
		'آرشیوهای تا {max_mb} مگابایت به‌صورت فایل ارسال می‌شن. آرشیوهای بزرگ‌تر همراه لینک دانلود مستقیم می‌آیند.',
		'',
		'بر پایهٔ <a href="https://github.com/sleroq/nhentai-telegram-bot">sleroq/nhentai-telegram-bot</a>، بازنویسی‌شده برای Vercel.',
	].join('\n'),

	// ids
	ids_hint: 'کافیه کد گالری رو مستقیم بفرستی — نیازی به دستور نیست.',
	too_many_ids: 'لطفاً حداکثر {n} کد را یک‌جا بفرست.',
	not_found: 'گالری <code>{id}</code> پیدا نشد.',

	// errors
	error_generic: 'مشکلی پیش اومد. لطفاً کمی بعد دوباره امتحان کن.',
	error_random: 'نتونستم گالری تصادفی بگیرم.',
	error_zip: 'نتونستم فایل ZIP رو آماده کنم.',

	// /zip
	zip_usage: 'نحوهٔ استفاده: /zip <code>کد</code>',
	zip_downloading: '⏳ در حال دانلود آرشیو از nhentai…',
	zip_too_big: 'حجم آرشیو حدود {size} مگابایته — بیشتر از سقف {max} مگابایتی که می‌تونم آپلود کنم. به‌جاش از دکمهٔ دانلود مستقیم پایین استفاده کن.',
	zip_link_caption: 'آرشیو رسمی nhentai برای <b>{title}</b> ({pages} صفحه).\n\nلینک {hours} ساعت اعتبار داره.',
	zip_done_caption: '<b>{title}</b>\n{pages} صفحه • {size} مگابایت\n#{code}',
	zip_failed: 'nhentai لینک دانلودی برنگردوند. لطفاً کمی بعد دوباره امتحان کن.',
	btn_direct_download: '⬇️ دانلود مستقیم',

	// settings
	settings_title: '<b>تنظیمات</b>',
	settings_only_private: 'تنظیمات فقط برای حساب‌های کاربری در دسترسه.',
	settings_lang: 'زبان',
	settings_sort: 'مرتب‌سازی جستجو',
	settings_view: 'نمایش نتایج جستجو',
	sort_date: 'جدیدترین',
	sort_popular: 'محبوب‌ترین',
	view_article: 'متن',
	view_photo: 'عکس',
	btn_lang_fa: '🇮🇷 فارسی',
	btn_lang_en: '🇬🇧 English',
	btn_reset: 'بازگشت به پیش‌فرض',
	saved: 'ذخیره شد ✓',

	// buttons
	btn_search: '🔍 جستجو',
	btn_load_info: '📖 بارگذاری اطلاعات',
	btn_open: '🌐 باز کردن در nhentai',

	// inline
	inline_not_found: 'پیدا نشد',

	// description labels
	desc_pages: 'صفحات',
	desc_uploaded: 'انتشار',
	desc_categories: 'دسته‌ها',
	desc_parodies: 'پارودی‌ها',
	desc_characters: 'شخصیت‌ها',
	desc_artists: 'هنرمندان',
	desc_groups: 'گروه‌ها',
	desc_languages: 'زبان‌ها',
	desc_tags: 'برچسب‌ها',

	// log-only strings (never sent to users)
	err_desc: 'خطا',
}

export default fa
