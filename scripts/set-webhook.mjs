#!/usr/bin/env node
/**
 * Registers the Telegram webhook on your Vercel deployment.
 *   npm run webhook:set
 * Needs BOT_TOKEN, APP_URL and WEBHOOK_SECRET (env or CLI flags):
 *   node scripts/set-webhook.mjs --url https://my-bot.vercel.app --secret my-secret
 */
import 'dotenv/config'

const args = process.argv.slice(2)
function flag(name) {
	const index = args.indexOf('--' + name)
	return index >= 0 ? args[index + 1] : undefined
}

const token = flag('token') ?? process.env['BOT_TOKEN']
const appUrl = (flag('url') ?? process.env['APP_URL'] ?? '').replace(/\/+$/, '')
const secret = flag('secret') ?? process.env['WEBHOOK_SECRET']

if (!token) {
	console.error('BOT_TOKEN is missing (env or --token).')
	process.exit(1)
}
if (!appUrl) {
	console.error('APP_URL is missing (env or --url). Example: https://my-bot.vercel.app')
	process.exit(1)
}

const webhookUrl = `${appUrl}/api/bot`
const body = {
	url: webhookUrl,
	allowed_updates: ['message', 'callback_query', 'inline_query'],
	drop_pending_updates: true,
}
if (secret) {
	body.secret_token = secret
} else {
	console.warn('WEBHOOK_SECRET is not set — the webhook will be registered WITHOUT a secret token.')
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(body),
})
const result = await response.json()
console.log('setWebhook →', JSON.stringify(result, null, 2))

const infoResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
console.log('getWebhookInfo →', JSON.stringify(await infoResponse.json(), null, 2))
