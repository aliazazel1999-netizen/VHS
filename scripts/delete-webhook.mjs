#!/usr/bin/env node
/** Removes the webhook (bot stops receiving updates). Usage: npm run webhook:delete */
import 'dotenv/config'

const token = process.env['BOT_TOKEN']
if (!token) {
	console.error('BOT_TOKEN is missing.')
	process.exit(1)
}

const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
	method: 'POST',
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify({ drop_pending_updates: false }),
})
console.log('deleteWebhook →', JSON.stringify(await response.json(), null, 2))
