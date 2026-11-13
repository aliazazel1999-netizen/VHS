/**
 * Local development entry point — long polling, no webhook needed.
 *   npm run dev
 * Requires BOT_TOKEN (+ NHENTAI_API_KEY) in .env; TURSO_DATABASE_URL can be file:local.db.
 */
import 'dotenv/config'
import { assertConfig, config } from './config.js'
import { ensureSchema } from './db/client.js'
import { startPolling } from './bot/index.js'

async function main(): Promise<void> {
	assertConfig()
	if (!config.tursoUrl.startsWith('file:')) {
		console.log(`Using remote Turso database: ${config.tursoUrl}`)
	} else {
		console.log(`Using local SQLite file: ${config.tursoUrl}`)
	}
	await ensureSchema()
	await startPolling()
}

main().catch((err) => {
	console.error('Fatal:', err)
	process.exit(1)
})
