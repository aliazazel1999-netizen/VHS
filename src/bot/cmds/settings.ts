import { InlineKeyboard, type Context } from 'grammy'
import { t, type Lang } from '../../i18n/index.js'
import { loadUser, updateUserSettings, type UserSettings } from '../../db/users.js'

/** /settings — language, search sorting, inline style. */
export async function handleSettings(ctx: Context): Promise<void> {
        if (!ctx.from) return
        const info = await loadUser(ctx.from)
        await ctx.reply(buildMessage(info.lang, info.settings), {
                parse_mode: 'HTML',
                reply_markup: buildKeyboard(info.lang, info.settings),
        })
}

export async function handleSettingsCallback(ctx: Context): Promise<void> {
        const data = ctx.callbackQuery?.data
        if (!ctx.from || !data?.startsWith('settings:')) return
        const info = await loadUser(ctx.from)
        const parts = data.split(':')
        const key = parts[1]
        const value = parts[2]

        let settings: UserSettings = info.settings
        let lang: Lang = info.lang
        let unknown = false

        switch (key) {
        case 'lang':
                if (value === 'fa' || value === 'en') {
                        lang = value
                        const updated = await updateUserSettings(
                                ctx.from.id.toString(),
                                { lang },
                                ctx.from.language_code
                        )
                        settings = updated.settings
                } else {
                        unknown = true
                }
                break
        case 'sort':
                if (value === 'date' || value === 'popular') {
                        settings = { ...settings, sort: value }
                        await updateUserSettings(ctx.from.id.toString(), { settings }, ctx.from.language_code)
                } else {
                        unknown = true
                }
                break
        case 'view':
                if (value === 'article' || value === 'photo') {
                        settings = { ...settings, view: value }
                        await updateUserSettings(ctx.from.id.toString(), { settings }, ctx.from.language_code)
                } else {
                        unknown = true
                }
                break
        case 'reset': {
                const updated = await updateUserSettings(
                        ctx.from.id.toString(),
                        { settings: { sort: 'date', view: 'article' } },
                        ctx.from.language_code
                )
                settings = updated.settings
                break
        }
        default:
                unknown = true
        }

        if (unknown) {
                await ctx.answerCallbackQuery({ text: t(lang).error_generic })
                return
        }

        await ctx.answerCallbackQuery({ text: t(lang).saved })
        await ctx.editMessageText(buildMessage(lang, settings), {
                parse_mode: 'HTML',
                reply_markup: buildKeyboard(lang, settings),
        })
}

function buildMessage(lang: Lang, settings: UserSettings): string {
        const strings = t(lang)
        return [
                strings.settings_title,
                '',
                `${strings.settings_lang}: ${lang === 'fa' ? strings.btn_lang_fa : strings.btn_lang_en}`,
                `${strings.settings_sort}: ${settings.sort === 'date' ? strings.sort_date : strings.sort_popular}`,
                `${strings.settings_view}: ${settings.view === 'article' ? strings.view_article : strings.view_photo}`,
        ].join('\n')
}

function buildKeyboard(lang: Lang, settings: UserSettings): InlineKeyboard {
        const strings = t(lang)
        const check = '✅'
        return new InlineKeyboard()
                .text((lang === 'fa' ? check + ' ' : '') + strings.btn_lang_fa, 'settings:lang:fa')
                .text((lang === 'en' ? check + ' ' : '') + strings.btn_lang_en, 'settings:lang:en')
                .row()
                .text((settings.sort === 'date' ? check + ' ' : '') + strings.sort_date, 'settings:sort:date')
                .text((settings.sort === 'popular' ? check + ' ' : '') + strings.sort_popular, 'settings:sort:popular')
                .row()
                .text((settings.view === 'article' ? check + ' ' : '') + strings.view_article, 'settings:view:article')
                .text((settings.view === 'photo' ? check + ' ' : '') + strings.view_photo, 'settings:view:photo')
                .row()
                .text(strings.btn_reset, 'settings:reset')
}
