import { waitUntil } from '@vercel/functions'
import { getBot } from '../src/bot/index.js'
import { config } from '../src/config.js'

export const maxDuration = 60

/** Minimal structural types for Vercel Node-runtime functions. */
interface WebhookRequest {
	method?: string
	headers: Record<string, string | string[] | undefined>
	body: unknown
}

interface WebhookResponse {
	status(code: number): WebhookResponse
	send(body: string): void
	json(body: unknown): void
}

/** Health check / root. */
export default async function handler(req: WebhookRequest, res: WebhookResponse): Promise<void> {
	if (req.method !== 'POST') {
		res.status(200).send('nhentai-telegram-bot (vercel) — webhook endpoint is live.')
		return
	}

	// Telegram signs webhook calls with the secret set via setWebhook.
	const secret = req.headers['x-telegram-bot-api-secret-token']
	const secretValue = Array.isArray(secret) ? secret[0] : secret
	if (config.webhookSecret && secretValue !== config.webhookSecret) {
		res.status(401).send('invalid secret token')
		return
	}

	try {
		const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
		if (!body || typeof body !== 'object' || !('update_id' in body)) {
			res.status(200).json({ ok: true })
			return
		}

		const bot = await getBot()
		// Respond to Telegram immediately; process the update in the background
		// (waitUntil keeps the function alive up to maxDuration — needed for /zip).
		waitUntil(
			bot.handleUpdate(body).catch((err: unknown) => {
				console.error('handleUpdate failed:', err)
			})
		)
	} catch (err) {
		console.error('Webhook error:', err)
	}

	res.status(200).json({ ok: true })
}
