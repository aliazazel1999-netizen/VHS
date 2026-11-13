import type { Context } from 'grammy'
import { fill, t } from '../../i18n/index.js'
import { loadUser } from '../../db/users.js'
import { buildDescription } from '../../lib/describe.js'
import { nhentai } from '../../sources/nhentai.js'
import { config } from '../../config.js'
import { searchKeyboard } from './by-ids.js'
import Werror from '../../lib/error.js'

/** /rand — random gallery via the official /galleries/random endpoint. */
export async function handleRand(ctx: Context): Promise<void> {
	if (!ctx.from) return
	const info = await loadUser(ctx.from)
	const strings = t(info.lang)

	try {
		const doujin = await nhentai.random()
		const record = {
			id: doujin.id,
			title: doujin.title.pretty || doujin.title.english,
			pages: doujin.pages,
			thumbnail: doujin.thumbnail,
			url: doujin.url,
			tags: doujin.tags,
			uploadedAt: doujin.uploadedAt,
		}
		await ctx.reply(buildDescription(record, info.lang), {
			parse_mode: 'HTML',
			link_preview_options: { is_disabled: true },
			reply_markup: searchKeyboard(info.lang),
		})
	} catch (err) {
		console.error(new Werror(err, 'Error getting random doujin'))
		await ctx.reply(strings.error_random)
	}
}

/** /help */
export async function handleHelp(ctx: Context): Promise<void> {
	if (!ctx.from) return
	const info = await loadUser(ctx.from)
	const strings = t(info.lang)
	const message = fill(strings.help, {
		bot: ctx.me.username,
		max_mb: Math.floor(config.zipMaxBytes / 1024 / 1024),
	})
	await ctx.reply(message, {
		parse_mode: 'HTML',
		link_preview_options: { is_disabled: true },
	})
}
