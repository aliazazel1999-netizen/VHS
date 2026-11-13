import { t, type Lang } from '../i18n/index.js'

export interface MangaRecord {
	id: string
	title: string
	pages: number
	thumbnail: string
	url: string
	tags: { type: string; name: string }[]
	uploadedAt: number | null
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

/** Telegram instant-view wrapper for nhentai links (same rhash the original bot used). */
export function instantViewUrl(galleryUrl: string): string {
	const url = new URL('https://t.me/iv')
	url.searchParams.set('rhash', 'cadd02903410b2')
	url.searchParams.set('url', galleryUrl)
	return url.toString()
}

function formatTags(names: string[]): string {
	return names.map((name) => '#' + name.replace(/\s+/g, '_')).join(' ')
}

/**
 * Builds the localized HTML description card for a gallery.
 * Title links: first character → instant view, rest → gallery page (original bot style).
 */
export function buildDescription(record: MangaRecord, lang: Lang): string {
	const strings = t(lang)
	const iv = instantViewUrl(record.url)
	const title = record.title || `#${record.id}`
	const escapedTitle = escapeHtml(title)

	let out = `<a href="${iv}">${escapedTitle[0]}</a>`
	out += `<a href="${record.url}">${escapedTitle.slice(1)}</a>\n`
	out += `<b>${strings.desc_pages}:</b> ${record.pages}\n`

	const byType = (type: string) =>
		record.tags.filter((tag) => tag.type === type).map((tag) => tag.name)

	const uploaded = record.uploadedAt
	if (uploaded) {
		const date = new Date(uploaded * 1000).toISOString().slice(0, 10)
		out += `<b>${strings.desc_uploaded}:</b> ${date}\n`
	}

	const groups: [string, string[]][] = [
		[strings.desc_categories, byType('category')],
		[strings.desc_parodies, byType('parody')],
		[strings.desc_characters, byType('character')],
		[strings.desc_artists, byType('artist')],
		[strings.desc_groups, byType('group')],
		[strings.desc_languages, byType('language')],
		[strings.desc_tags, byType('tag')],
	]

	for (const [label, names] of groups) {
		if (names.length === 0) continue
		const value = label === strings.desc_tags ? formatTags(names) : names.join(', ')
		out += `<b>${label}:</b> ${escapeHtml(value)}\n`
	}

	return out
}

/** Truncates the visible text of an HTML string on the last complete tag boundary. */
export function truncateHtml(html: string, maxChars: number): string {
	if (html.length <= maxChars) return html
	const cut = html.slice(0, maxChars)
	const lastTagEnd = cut.lastIndexOf('>')
	return lastTagEnd > 0 ? cut.slice(0, lastTagEnd + 1) : cut
}
