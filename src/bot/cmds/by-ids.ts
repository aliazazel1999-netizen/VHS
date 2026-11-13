import { InlineKeyboard, type Api, type Context } from 'grammy'
import { fill, t, type Lang } from '../../i18n/index.js'
import { loadUser } from '../../db/users.js'
import { buildDescription } from '../../lib/describe.js'
import getDoujinRecord from '../../lib/get-doujin.js'
import { galleryKeyboard } from '../keyboard.js'
import Werror from '../../lib/error.js'

export const MAX_IDS_PER_MESSAGE = 20

export function searchKeyboard(lang: Lang): InlineKeyboard {
        return new InlineKeyboard().text(t(lang).btn_search, 'search_inline')
}

/** Sends the localized gallery card for one code. */
export async function sendGalleryCard(
        api: Api,
        chatId: number,
        id: string,
        lang: Lang
): Promise<void> {
        const strings = t(lang)
        try {
                const record = await getDoujinRecord(id)
                await api.sendMessage(chatId, buildDescription(record, lang), {
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                        reply_markup: galleryKeyboard(record, lang),
                })
        } catch (err) {
                if (err instanceof Error && err.name === 'NotFoundError') {
                        await api.sendMessage(chatId, fill(strings.not_found, { id }), { parse_mode: 'HTML' })
                        return
                }
                console.error(new Werror(err, `Error getting doujin ${id}`))
                await api.sendMessage(chatId, strings.error_generic)
        }
}

/** /id <code> */
export async function handleIdCommand(ctx: Context): Promise<void> {
        if (!ctx.from || !ctx.msg || !ctx.chat) return
        const info = await loadUser(ctx.from)
        await ctx.reply(t(info.lang).ids_hint)

        const id = ctx.msg.text?.split(' ')[1]?.trim()
        if (!id || !/^\d+$/.test(id)) return
        await sendGalleryCard(ctx.api, ctx.chat.id, id, info.lang)
}

/** /start */
export async function handleStart(ctx: Context): Promise<void> {
        if (!ctx.from) return
        const info = await loadUser(ctx.from)
        const strings = t(info.lang)
        await ctx.reply(fill(strings.start, { bot: ctx.me.username }), {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
                reply_markup: searchKeyboard(info.lang),
        })
}

/** Plain text messages: gallery codes and nhentai links. */
export async function handleTextMessage(ctx: Context): Promise<void> {
        if (!ctx.msg || !ctx.from || !ctx.chat) return
        if (ctx.msg.via_bot?.id === ctx.me.id) return

        const info = await loadUser(ctx.from)
        const text = ctx.msg.text ?? ''

        const urlIds = [...text.matchAll(/nhentai\.net\/g\/(\d+)/g)].map((m) => m[1]!)
        const bareIds = text.match(/\d+/gm) ?? []
        const ids = [...new Set([...urlIds, ...bareIds])]
        if (ids.length === 0) return

        if (ids.length > MAX_IDS_PER_MESSAGE) {
                await ctx.reply(fill(t(info.lang).too_many_ids, { n: MAX_IDS_PER_MESSAGE }))
                return
        }

        for (const id of ids) {
                await sendGalleryCard(ctx.api, ctx.chat.id, id, info.lang)
        }
}

/** 'search_inline' callback → hint about inline mode. */
export async function handleSearchButton(ctx: Context): Promise<void> {
        if (!ctx.from) return
        const info = await loadUser(ctx.from)
        await ctx.answerCallbackQuery()
        await ctx.reply(fill(t(info.lang).start, { bot: ctx.me.username }), {
                parse_mode: 'HTML',
                link_preview_options: { is_disabled: true },
                reply_markup: searchKeyboard(info.lang),
        })
}
