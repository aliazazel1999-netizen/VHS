import type { LangStrings } from './en.js'
import en from './en.js'
import fa from './fa.js'
import { config } from '../config.js'

export type Lang = 'fa' | 'en'

const dictionaries: Record<Lang, LangStrings> = { en, fa }

/** Replace {placeholder} tokens in a string. */
export function fill(template: string, params: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
	)
}

/** Translation accessor: t(lang).start */
export function t(lang: Lang): LangStrings {
	return dictionaries[lang]
}

export function isLang(value: unknown): value is Lang {
	return value === 'fa' || value === 'en'
}

/** Decide the language for a brand-new user. */
export function detectLanguage(telegramLanguageCode?: string | null): Lang {
	const fallback = config.defaultLanguage
	const forced: Lang | null = fallback === 'fa' ? 'fa' : fallback === 'en' ? 'en' : null
	if (forced) return forced
	return telegramLanguageCode?.toLowerCase().startsWith('fa') ? 'fa' : 'en'
}

export { en, fa }
export type { LangStrings }
