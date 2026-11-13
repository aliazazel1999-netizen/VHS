import type { Context } from 'grammy'
import type {
        InlineQueryResult,
        InlineQueryResultArticle,
        InlineQueryResultPhoto,
} from 'grammy/types'
import { t } from '../i18n/index.js'
import { loadUser, fallbackInfo, type UserInfo } from '../db/users.js'
import { buildDescription, escapeHtml, instantViewUrl, truncateHtml } from '../lib/describe.js'
import getDoujinRecord from '../lib/get-doujin.js'
import { nhentai } from '../sources/nhentai.js'
import type { LightDoujin } from '../sources/types.js'
import Werror from '../lib/error.js'

const MAX_INLINE_RESULTS = 20

/** Inline query handler — localized by the querying user's language. */
export async function handleInlineQuery(ctx: Context): Promise<void> {
        const query = ctx.inlineQuery?.query?.trim() ?? ''
        if (!ctx.inlineQuery) return

        // Resolve the user's language; fall back gracefully if the DB hiccups.
        let info: UserInfo
        try {
                info = await loadUser(ctx.inlineQuery.from)
        } catch (err) {
                console.error(new Werror(err, 'loadUser in inline query'))
                info = fallbackInfo(ctx.inlineQuery.from.language_code)
        }
        const strings = t(info.lang)

        // Pure-number query → direct gallery lookup.
        if (/^\d+$/.test(query)) {
                try {
                        const record = await getDoujinRecord(query)
                        const result: InlineQueryResultArticle = {
                                id: record.id,
                                type: 'article',
                                title: record.title.slice(0, 200),
                                description: `${strings.desc_pages}: ${record.pages}`,
                                thumbnail_url: record.thumbnail,
                                input_message_content: {
                                        message_text: buildDescription(record, info.lang),
                                        parse_mode: 'HTML',
                                        link_preview_options: { is_disabled: true },
                                },
                                reply_markup: {
                                        inline_keyboard: [[
                                                { text: strings.btn_open, url: record.url },
                                        ]],
                                },
                        }
                        await ctx.answerInlineQuery([result], { cache_time: 300 })
		return
                } catch (err) {
                        if (err instanceof Error && err.name === 'NotFoundError') {
                                await ctx.answerInlineQuery([notFoundResult(strings.inline_not_found)], { cache_time: 60 })
			return
                        }
                        console.error(new Werror(err, `inline gallery lookup ${query}`))
                        await ctx.answerInlineQuery([], { cache_time: 10 })
			return
                }
        }

        if (query.length < 3) {
		await ctx.answerInlineQuery([])
		return
	}

        // Text search. Optional /pN suffix selects the result page.
        const page = Number(query.match(/\/p(\d+)\s*$/)?.[1] ?? 1) || 1
        const term = query.replace(/\/p\d+\s*$/, '').trim() || query

        try {
                const sort = info.settings.sort
                const search = await nhentai.search(term, page, sort === 'popular' ? 'popular' : 'date')
                const results: InlineQueryResult[] = []

                for (const item of search.results.slice(0, MAX_INLINE_RESULTS)) {
                        results.push(
                                info.settings.view === 'photo'
                                        ? photoResult(item, strings)
                                        : articleResult(item, strings)
                        )
                }

                await ctx.answerInlineQuery(results, { cache_time: 30 })
		return
        } catch (err) {
                console.error(new Werror(err, `inline search "${term}"`))
                await ctx.answerInlineQuery([], { cache_time: 10 })
			return
        }
}

function commonButtons(item: LightDoujin, strings: ReturnType<typeof t>): InlineQueryResult['reply_markup'] {
        return {
                inline_keyboard: [[
                        { text: strings.btn_load_info, callback_data: 'open_' + item.id },
                        { text: strings.btn_open, url: item.url },
                ]],
        }
}

function articleResult(item: LightDoujin, strings: ReturnType<typeof t>): InlineQueryResultArticle {
        const iv = instantViewUrl(item.url)
        const title = escapeHtml(item.title)
        let message = `<a href="${iv}">${title[0]}</a><a href="${item.url}">${escapeHtml(title.slice(1))}</a>\n`
        message += `<b>${strings.desc_pages}:</b> ${item.pages}`

        return {
                id: item.id,
                type: 'article',
                title: item.title.slice(0, 200),
                description: `${strings.desc_pages}: ${item.pages}`,
                thumbnail_url: item.thumbnail,
                input_message_content: {
                        message_text: message,
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                },
                reply_markup: commonButtons(item, strings),
        }
}

function photoResult(item: LightDoujin, strings: ReturnType<typeof t>): InlineQueryResultPhoto {
        const title = escapeHtml(item.title)
        const caption = truncateHtml(
                `<a href="${item.url}">${title}</a>\n<b>${strings.desc_pages}:</b> ${item.pages}`,
                1000
        )

        return {
                id: item.id,
                type: 'photo',
                photo_url: item.thumbnail,
                thumbnail_url: item.thumbnail,
                caption,
                parse_mode: 'HTML',
                reply_markup: commonButtons(item, strings),
        }
}

function notFoundResult(label: string): InlineQueryResultArticle {
        return {
                id: 'not_found',
                type: 'article',
                title: label,
                description: label,
                input_message_content: { message_text: label },
        }
}
