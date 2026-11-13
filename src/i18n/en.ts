/** English strings — the reference shape for all dictionaries. */

const en = {
	// /start
	start: [
		'👋 <b>Welcome!</b>',
		'',
		'I search nhentai for you.',
		'',
		'• Send me a gallery code like <code>255700</code>',
		'• Send up to 20 codes in one message',
		'• Or search inline in any chat: <code>@{bot} query</code>',
		'',
		'Commands:',
		'/rand — random gallery',
		'/zip &lt;code&gt; — download pages as ZIP',
		'/settings — language &amp; preferences',
		'/help — full help',
	].join('\n'),

	// /help
	help: [
		'ℹ️ <b>Help</b>',
		'',
		'<b>Commands</b>',
		'/start — welcome message',
		'/rand — random gallery',
		'/id &lt;code&gt; — load gallery by code',
		'/zip &lt;code&gt; — download pages as ZIP',
		'/settings — language &amp; preferences',
		'',
		'<b>Inline search</b>',
		'Type <code>@{bot} query</code> in any chat. Add <code>/p2</code> to jump to page 2 of results.',
		'',
		'<b>Detecting codes</b>',
		'Just send a code like <code>255700</code> or a link like <code>https://nhentai.net/g/255700/</code>. Up to 20 codes per message.',
		'',
		'<b>ZIP limits</b>',
		'Archives up to {max_mb} MB are sent as a file. Larger archives come with a direct download link.',
		'',
		'Based on <a href="https://github.com/sleroq/nhentai-telegram-bot">sleroq/nhentai-telegram-bot</a>, rewritten for Vercel.',
	].join('\n'),

	// ids
	ids_hint: 'Just send me the gallery code — no command needed.',
	too_many_ids: 'Please send at most {n} codes at a time.',
	not_found: 'Gallery <code>{id}</code> not found.',

	// errors
	error_generic: 'Something went wrong. Please try again later.',
	error_random: 'Could not fetch a random gallery.',
	error_zip: 'Could not prepare the ZIP archive.',

	// /zip
	zip_usage: 'Usage: /zip <code>code</code>',
	zip_downloading: '⏳ Downloading archive from nhentai…',
	zip_too_big: 'The archive is about {size} MB — over the {max} MB upload limit. Use the direct download button below instead.',
	zip_link_caption: 'Official nhentai archive for <b>{title}</b> ({pages} pages).\n\nThe link expires in {hours} hours.',
	zip_done_caption: '<b>{title}</b>\n{pages} pages • {size} MB\n#{code}',
	zip_failed: 'nhentai did not return a download link. Please try again later.',
	btn_direct_download: '⬇️ Direct download',

	// settings
	settings_title: '<b>Settings</b>',
	settings_only_private: 'Settings are only available for user accounts.',
	settings_lang: 'Language',
	settings_sort: 'Search sorting',
	settings_view: 'Inline result style',
	sort_date: 'Latest',
	sort_popular: 'Popular',
	view_article: 'Text',
	view_photo: 'Photo',
	btn_lang_fa: '🇮🇷 فارسی',
	btn_lang_en: '🇬🇧 English',
	btn_reset: 'Reset defaults',
	saved: 'Saved ✓',

	// buttons
	btn_search: '🔍 Search',
	btn_load_info: '📖 Load info',
	btn_open: '🌐 Open on nhentai',

	// inline
	inline_not_found: 'Not found',

	// description labels
	desc_pages: 'Pages',
	desc_uploaded: 'Uploaded',
	desc_categories: 'Categories',
	desc_parodies: 'Parodies',
	desc_characters: 'Characters',
	desc_artists: 'Artists',
	desc_groups: 'Groups',
	desc_languages: 'Languages',
	desc_tags: 'Tags',

	// log-only strings (never sent to users)
	err_desc: 'Error',
}

export type LangStrings = typeof en
export default en
