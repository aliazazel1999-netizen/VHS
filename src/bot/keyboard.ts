import { InlineKeyboard } from 'grammy'
import { t, type Lang } from '../i18n/index.js'
import type { MangaRecord } from '../lib/describe.js'

export function searchButton(lang: Lang): InlineKeyboard {
	return new InlineKeyboard().text(t(lang).btn_search, 'search_inline')
}

export function openSearchInline(): InlineKeyboard {
	return new InlineKeyboard().switchInlineCurrent(t('en').btn_search, '')
}

/** Keyboard for a gallery card: instant-view button + load-info + open on nhentai. */
export function galleryKeyboard(record: MangaRecord, lang: Lang, withLoadInfo = true): InlineKeyboard {
	const strings = t(lang)
	const keyboard = new InlineKeyboard()
	if (withLoadInfo) keyboard.text(strings.btn_load_info, 'open_' + record.id)
	keyboard.url(strings.btn_open, record.url)
	return keyboard
}
