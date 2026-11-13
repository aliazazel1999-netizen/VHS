/** Central environment-variable configuration. */

function intEnv(name: string, fallback: number): number {
	const raw = process.env[name]
	if (!raw) return fallback
	const parsed = Number.parseInt(raw, 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeFlaresolverrUrl(value?: string): string | undefined {
	if (!value) return undefined
	try {
		const parsed = new URL(value)
		if (parsed.pathname === '/' || parsed.pathname === '') parsed.pathname = '/v1'
		return parsed.toString()
	} catch {
		return value
	}
}

export const config = {
	/** Telegram bot token from @BotFather */
	botToken: process.env['BOT_TOKEN'] ?? '',

	/** nhentai API v2 key (https://nhentai.net/user/settings#apikeys) */
	nhentaiApiKey: process.env['NHENTAI_API_KEY'] ?? '',
	nhentaiApiBase: 'https://nhentai.net/api/v2',

	/** Descriptive User-Agent required by nhentai API docs */
	userAgent:
		process.env['NHENTAI_USER_AGENT'] ??
		'nhentai-telegram-bot/2.0 (+https://github.com/sleroq/nhentai-telegram-bot)',

	/** Turso / libSQL connection. Supports "file:local.db" for local development */
	tursoUrl: process.env['TURSO_DATABASE_URL'] ?? 'file:local.db',
	tursoAuthToken: process.env['TURSO_AUTH_TOKEN'] || undefined,

	/** Secret used by Telegram to sign webhook calls */
	webhookSecret: process.env['WEBHOOK_SECRET'] ?? '',

	/** Default language for new users: auto (from Telegram client) / fa / en */
	defaultLanguage: (process.env['DEFAULT_LANGUAGE'] ?? 'auto').toLowerCase(),

	/** Maximum ZIP size the bot uploads itself, in bytes */
	zipMaxBytes: intEnv('ZIP_MAX_MB', 45) * 1024 * 1024,

	/** Download timeout for the ZIP archive */
	zipTimeoutMs: intEnv('ZIP_TIMEOUT_MS', 45_000),

	/** Optional FlareSolverr endpoint to bypass Cloudflare */
	flaresolverrUrl: normalizeFlaresolverrUrl(process.env['FLARESOLVERR_URL']),
	flaresolverrMaxTimeout: intEnv('SOURCE_MAX_TIMEOUT_MS', 60_000),

	/** nhentai gallery base URL (used for links) */
	nhentaiWebBase: 'https://nhentai.net',
} as const

export function assertConfig(): void {
	const problems: string[] = []
	if (!config.botToken) problems.push('BOT_TOKEN is required')
	if (!config.nhentaiApiKey)
		problems.push(
			'NHENTAI_API_KEY is required — generate one at https://nhentai.net/user/settings#apikeys'
		)
	if (!config.tursoUrl.startsWith('file:') && !config.tursoAuthToken)
		problems.push('TURSO_AUTH_TOKEN is required unless TURSO_DATABASE_URL is a local file: URL')
	if (problems.length > 0) {
		throw new Error('Invalid configuration:\n  - ' + problems.join('\n  - '))
	}
}
