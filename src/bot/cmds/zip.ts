import type { Context } from 'grammy'
import { InlineKeyboard, InputFile } from 'grammy'
import { fill, t } from '../../i18n/index.js'
import { loadUser } from '../../db/users.js'
import { escapeHtml } from '../../lib/describe.js'
import getDoujinRecord from '../../lib/get-doujin.js'
import { fetchArchive } from '../../lib/archive.js'
import { nhentai } from '../../sources/nhentai.js'
import { config } from '../../config.js'
import Werror from '../../lib/error.js'

/** /zip <code> — sends the official nhentai archive as a document, or a link when too big. */
export async function handleZip(ctx: Context): Promise<void> {
        if (!ctx.from || !ctx.msg) return
        const info = await loadUser(ctx.from)
        const strings = t(info.lang)

        const id = ctx.msg.text?.split(' ')[1]?.trim()
        if (!id || !/^\d+$/.test(id)) {
                await ctx.reply(strings.zip_usage, { parse_mode: 'HTML' })
                return
        }

        let record
        try {
                record = await getDoujinRecord(id)
        } catch (err) {
                if (err instanceof Error && err.name === 'NotFoundError') {
                        await ctx.reply(fill(strings.not_found, { id }), { parse_mode: 'HTML' })
                        return
                }
                console.error(new Werror(err, 'Fetching doujin for zip'))
                await ctx.reply(strings.error_zip)
                return
        }

        let archive
        try {
                archive = await nhentai.archiveUrl(id)
        } catch (err) {
                console.error(new Werror(err, 'Requesting archive URL'))
                await ctx.reply(strings.error_zip)
                return
        }

        await ctx.replyWithChatAction('upload_document')
        await ctx.reply(strings.zip_downloading)

        const result = await fetchArchive(archive.url)

        if (result.ok) {
                const sizeMb = (result.sizeBytes / 1024 / 1024).toFixed(1)
                const caption = fill(strings.zip_done_caption, {
                        title: escapeHtml(record.title).slice(0, 200),
                        pages: record.pages,
                        size: sizeMb,
                        code: record.id,
                })
                try {
                        await ctx.replyWithDocument(new InputFile(result.buffer, `${id}.zip`), {
                                caption,
                                parse_mode: 'HTML',
                        })
                        return
                } catch (err) {
                        console.error(new Werror(err, 'Uploading archive to Telegram'))
                        // Upload failed (e.g. still too large for the Bot API) — fall through to the link.
                }
        } else if (result.reason === 'too_big') {
                const sizeMb = Math.round(result.sizeBytes / 1024 / 1024)
                await ctx.reply(
                        fill(strings.zip_too_big, {
                                size: sizeMb,
                                max: Math.floor(config.zipMaxBytes / 1024 / 1024),
                        }),
                        { parse_mode: 'HTML', reply_markup: buildLinkKeyboard(strings.btn_direct_download, archive.url) }
                )
                return
        } else {
                console.error(new Werror(result.error, 'Downloading archive'))
        }

        // Last resort: give the user the direct link.
        await ctx.reply(
                fill(strings.zip_link_caption, {
                        title: escapeHtml(record.title).slice(0, 200),
                        pages: record.pages,
                        hours: Math.max(1, Math.round((archive.expires_at - Date.now() / 1000) / 3600)),
                }),
                { parse_mode: 'HTML', reply_markup: buildLinkKeyboard(strings.btn_direct_download, archive.url) }
        )
}

function buildLinkKeyboard(label: string, url: string): InlineKeyboard {
        return new InlineKeyboard().url(label, url)
}
