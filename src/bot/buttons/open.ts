import type { Context } from 'grammy'
import { t } from '../../i18n/index.js'
import { loadUser } from '../../db/users.js'
import { buildDescription } from '../../lib/describe.js'
import getDoujinRecord from '../../lib/get-doujin.js'
import { galleryKeyboard } from '../keyboard.js'
import Werror from '../../lib/error.js'

/** 'open_<id>' callback — load full gallery info into the message. */
export async function handleOpenButton(ctx: Context): Promise<void> {
        const data = ctx.callbackQuery?.data
        if (!ctx.from || !data?.startsWith('open_')) return
        const id = data.slice('open_'.length)
        if (!id || !/^\d+$/.test(id)) {
                await ctx.answerCallbackQuery()
                return
        }

        const info = await loadUser(ctx.from)
        await ctx.answerCallbackQuery()

        try {
                const record = await getDoujinRecord(id)
                await ctx.editMessageText(buildDescription(record, info.lang), {
                        parse_mode: 'HTML',
                        link_preview_options: { is_disabled: true },
                        reply_markup: galleryKeyboard(record, info.lang, false),
                })
        } catch (err) {
                if (err instanceof Error && err.name === 'NotFoundError') {
                        await ctx.editMessageText(t(info.lang).inline_not_found)
                        return
                }
                console.error(new Werror(err, `open button for ${id}`))
                await ctx.answerCallbackQuery({ text: t(info.lang).error_generic }).catch(() => undefined)
        }
}
