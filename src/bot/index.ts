import { Bot, type BotError } from 'grammy'
import { assertConfig, config } from '../config.js'
import { handleStart, handleIdCommand, handleTextMessage, handleSearchButton } from './cmds/by-ids.js'
import { handleRand, handleHelp } from './cmds/help.js'
import { handleSettings, handleSettingsCallback } from './cmds/settings.js'
import { handleZip } from './cmds/zip.js'
import { handleOpenButton } from './buttons/open.js'
import { handleInlineQuery } from './search.js'

let botPromise: Promise<Bot> | null = null

/** Wires all commands, inline queries and callbacks. Exported for testing. */
export function registerHandlers(bot: Bot): void {
	bot.command('start', handleStart)
	bot.command('help', handleHelp)
	bot.command('id', handleIdCommand)
	bot.command('rand', handleRand)
	bot.command('zip', handleZip)
	bot.command('settings', handleSettings)

	bot.on('inline_query', handleInlineQuery)
	bot.callbackQuery(/^settings:/, handleSettingsCallback)
	bot.callbackQuery(/^open_\d+$/, handleOpenButton)
	bot.callbackQuery(/^search_inline$/, handleSearchButton)

	bot.on('message:text', handleTextMessage)
}

/**
 * Returns a fully initialized bot (singleton per serverless instance).
 * grammY requires bot.init() (getMe) before handleUpdate() in webhook mode.
 */
export function getBot(): Promise<Bot> {
	if (!botPromise) botPromise = createBot()
	return botPromise
}

async function createBot(): Promise<Bot> {
	assertConfig()
	const bot = new Bot(config.botToken)

	bot.catch((error) => {
		const err = (error as BotError).error ?? error
		console.error('Bot error:', err)
	})

	registerHandlers(bot)

	await bot.init()
	console.log(`Bot @${bot.botInfo.username} initialized`)
	return bot
}

/** Long-polling entry point for local development only (npm run dev). */
export async function startPolling(): Promise<void> {
	const bot = await getBot()
	await bot.start({
		onStart: (me) => console.log(`Polling started as @${me.username}`),
	})
}
