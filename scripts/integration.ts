/**
 * End-to-end integration test with mocked Telegram (grammY transformer)
 * and mocked nhentai HTTP endpoints (global fetch).
 *   npx tsx scripts/integration.ts
 * Verifies the full wiring: updates → handlers → API calls → assertions,
 * including the fa/en language switch through /settings.
 */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { Bot } from 'grammy'

// NOTE: environment must be configured BEFORE any *runtime* project import
// (src/config.ts reads env at module load).
process.env['TURSO_DATABASE_URL'] = 'file:/tmp/nhentai-int-test.db'
process.env['BOT_TOKEN'] = '000000:TEST_TOKEN'
process.env['NHENTAI_API_KEY'] = 'TEST_KEY'
process.env['WEBHOOK_SECRET'] = ''
process.env['DEFAULT_LANGUAGE'] = 'auto'
rmSync('/tmp/nhentai-int-test.db', { force: true })
rmSync('/tmp/nhentai-int-test.db-shm', { force: true })
rmSync('/tmp/nhentai-int-test.db-wal', { force: true })

const { registerHandlers } = await import('../src/bot/index.js')

/* ─────────────────────────── mock nhentai HTTP ──────────────────────────── */

const GALLERY_DETAIL = {
        id: 255700,
        media_id: '1325328',
        title: { english: 'Test Gallery (EN)', japanese: null, pretty: 'Test Gallery' },
        cover: { path: '/galleries/1325328/cover.jpg', width: 350, height: 500 },
        thumbnail: { path: '/galleries/1325328/thumb.jpg', width: 250, height: 350 },
        upload_date: 1700000000,
        tags: [
                { id: 1, type: 'artist', name: 'someone', slug: 'someone', url: '/tag/someone/', count: 5 },
                { id: 2, type: 'tag', name: 'test tag', slug: 'test_tag', url: '/tag/test/', count: 5 },
        ],
        num_pages: 12,
        num_favorites: 100,
}

const SEARCH_ITEM = {
        id: 300001,
        media_id: '999',
        english_title: 'Search Hit One',
        japanese_title: null,
        thumbnail: '/galleries/999/thumb.jpg',
        thumbnail_width: 250,
        thumbnail_height: 350,
        num_pages: 8,
        num_favorites: 3,
        tag_ids: [],
}

let archiveDownloaded = false

const realFetch = globalThis.fetch
globalThis.fetch = (async (input: any, init?: any): Promise<Response> => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        const json = (data: unknown, status = 200) =>
                new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

        if (url.includes('nhentai.net/api/v2/cdn')) {
                return json({ image_servers: ['https://i.example.net'], thumb_servers: ['https://t.example.net'] })
        }
        if (url.includes('/api/v2/galleries/255700/download')) {
                return json({
                        url: 'https://cdn.example.net/archives/255700.zip',
                        expires_at: Math.floor(Date.now() / 1000) + 7200,
                })
        }
        if (url.includes('/api/v2/galleries/255700')) {
                return json(GALLERY_DETAIL)
        }
        if (url.includes('/api/v2/galleries/random')) {
                return json(GALLERY_DETAIL)
        }
        if (url.includes('/api/v2/search')) {
                return json({ result: [SEARCH_ITEM], num_pages: 3, per_page: 25, total: 70 })
        }
        if (url.includes('/api/v2/galleries/777000/download')) {
        return json({
                url: 'https://cdn.example.net/huge/777000.zip',
                expires_at: Math.floor(Date.now() / 1000) + 3600,
        })
}
if (url.includes('/api/v2/galleries/777000')) {
        return json({ ...GALLERY_DETAIL, id: 777000, num_pages: 400, title: { ...GALLERY_DETAIL.title, pretty: 'Huge Gallery' } })
}
if (url.startsWith('https://cdn.example.net/huge/')) {
        return new Response(Buffer.alloc(1024, 7), {
                status: 200,
                headers: { 'content-length': String(100 * 1024 * 1024), 'content-type': 'application/zip' },
        })
}
if (url.startsWith('https://cdn.example.net/')) {
                archiveDownloaded = true
                return new Response(Buffer.alloc(1024, 7), {
                        status: 200,
                        headers: { 'content-length': '1024', 'content-type': 'application/zip' },
                })
        }
        console.error('MOCK MISS:', method, url)
        return new Response('not found', { status: 404 })
}) as typeof fetch

/* ────────────────────────── Telegram API capture ────────────────────────── */

const calls: { method: string; payload: any }[] = []

const bot = new Bot('000000:TEST_TOKEN')
bot.api.config.use((prev, method, payload) => {
        calls.push({ method, payload })
        if (method === 'getMe') {
                return { ok: true, result: { id: 1, is_bot: true, first_name: 'TestBot', username: 'test_nh_bot' } } as any
        }
        return {
                ok: true,
                result: { message_id: Math.floor(Math.random() * 10000), date: 1, chat: { id: 1, type: 'private' } },
        } as any
})

registerHandlers(bot)
await bot.init()
assert.equal(bot.botInfo.username, 'test_nh_bot')

const { ensureSchema } = await import('../src/db/client.js')
await ensureSchema()
const faUser = { id: 111, is_bot: false, first_name: 'Ali', username: 'ali', language_code: 'fa-IR' }
const baseMessage = (text: string, from = faUser) => ({
        update_id: Math.floor(Math.random() * 1e9),
        message: {
                message_id: 10,
                date: 1,
                chat: { id: from.id, type: 'private' },
                from,
                text,
                // Telegram always attaches bot_command entities for commands — grammY needs them.
                ...(text.startsWith('/')
                        ? { entities: [{ offset: 0, length: text.split(' ')[0]!.length, type: 'bot_command' }] }
                        : {}),
        },
})

// 1) /start for a Persian user → Persian welcome
await bot.handleUpdate(baseMessage('/start') as any)
const startCall = calls.find((c) => c.method === 'sendMessage')
assert.ok(startCall, 'sendMessage not called for /start')
assert.ok(startCall.payload.text.includes('سلام!'), 'start must be Persian for fa client')
assert.ok(startCall.payload.text.includes('@test_nh_bot'))
console.log('✓ /start (fa)')

// 2) bare code message → Persian gallery card with buttons
await bot.handleUpdate(baseMessage('255700') as any)
const card = calls.filter((c) => c.method === 'sendMessage').pop()!
assert.ok(card.payload.text.includes('صفحات'), 'card must use fa labels')
assert.ok(card.payload.text.includes('est Gallery'), 'title must render (split across the two title links like the original bot)')
assert.equal(card.payload.reply_markup.inline_keyboard[0][0].callback_data, 'open_255700')
console.log('✓ code message → fa card')

// 3) inline search (fa user) → article results with fa buttons
calls.length = 0
await bot.handleUpdate({
        update_id: 2,
        inline_query: { id: 'iq1', from: faUser, query: 'big', offset: '' },
} as any)
const inline = calls.find((c) => c.method === 'answerInlineQuery')
assert.ok(inline, 'inline query not answered')
const results = inline.payload.results
assert.ok(Array.isArray(results) && results.length === 1)
assert.equal(results[0].type, 'article')
assert.equal(results[0].reply_markup.inline_keyboard[0][0].callback_data, 'open_300001')
assert.equal(results[0].reply_markup.inline_keyboard[0][0].text, '📖 بارگذاری اطلاعات')
console.log('✓ inline search (fa)')

// 4) settings → switch language to English
calls.length = 0
await bot.handleUpdate({
        update_id: 3,
        message: {
                message_id: 20, date: 1, chat: { id: 111, type: 'private' }, from: faUser, text: '/settings',
                entities: [{ offset: 0, length: 9, type: 'bot_command' }],
        },
} as any)
const settingsMsg = calls.find((c) => c.method === 'sendMessage')!
assert.ok(settingsMsg.payload.text.includes('تنظیمات'), 'settings must be fa first')

calls.length = 0
await bot.handleUpdate({
        update_id: 4,
        callback_query: {
                id: 'cb1', from: faUser, data: 'settings:lang:en', chat_instance: 'x',
                message: { message_id: 20, chat: { id: 111 } },
        },
} as any)
const cbAnswer = calls.find((c) => c.method === 'answerCallbackQuery')
assert.equal(cbAnswer?.payload.text, 'Saved ✓')
const editCall = calls.find((c) => c.method === 'editMessageText')!
assert.ok(editCall.payload.text.includes('Settings'), 'settings must switch to en')
console.log('✓ settings language switch fa → en')

// 5) same gallery again → now English (cache shared, per-user language)
calls.length = 0
await bot.handleUpdate(baseMessage('255700') as any)
const enCard = calls.filter((c) => c.method === 'sendMessage').pop()!
assert.ok(enCard.payload.text.includes('Pages:'), 'card must be English after switch')
assert.ok(enCard.payload.text.includes('#test_tag'))
console.log('✓ cache reuse with new language')

// 6) /zip small archive → sendDocument with caption
calls.length = 0
await bot.handleUpdate(baseMessage('/zip 255700') as any)
assert.ok(archiveDownloaded, 'archive bytes must be fetched')
const doc = calls.find((c) => c.method === 'sendDocument')
assert.ok(doc, 'sendDocument must be called')
assert.ok(doc.payload.caption.includes('255700'))
assert.ok(doc.payload.caption.includes('12'))
console.log('✓ /zip sends document')

// 6b) /zip with a huge archive → too-big message + direct link button
calls.length = 0
await bot.handleUpdate(baseMessage('/zip 777000') as any)
const tooBig = calls.find((c) => c.method === 'sendMessage' && c.payload?.text?.includes('MB'))
assert.ok(tooBig, 'too-big message must be sent')
assert.ok(tooBig.payload.reply_markup?.inline_keyboard?.[0]?.[0]?.url?.includes('777000.zip'), 'must offer direct link')
console.log('✓ /zip huge archive → direct link fallback')

// 7) /rand → renders gallery card
calls.length = 0
await bot.handleUpdate(baseMessage('/rand') as any)
const randMsg = calls.filter((c) => c.method === 'sendMessage').pop()
assert.ok(randMsg && randMsg.payload.text.includes('est Gallery'), 'rand must render gallery')
console.log('✓ /rand')

// 8) /help in English
calls.length = 0
await bot.handleUpdate(baseMessage('/help') as any)
const helpMsg = calls.filter((c) => c.method === 'sendMessage').pop()!
assert.ok(helpMsg.payload.text.includes('Help'), 'help must be English now')
assert.ok(helpMsg.payload.text.includes('45'), 'help must show ZIP limit')
console.log('✓ /help (en)')

// 9) open_ button callback
calls.length = 0
await bot.handleUpdate({
        update_id: 9,
        callback_query: {
                id: 'cb2', from: faUser, data: 'open_255700', chat_instance: 'x',
                message: { message_id: 30, chat: { id: 111 } },
        },
} as any)
assert.ok(calls.find((c) => c.method === 'answerCallbackQuery'), 'open must answer callback')
const openEdit = calls.find((c) => c.method === 'editMessageText')!
assert.ok(openEdit.payload.text.includes('Pages:'), 'open button must render en card')
console.log('✓ open_ button')

// 10) nhentai URL in message
calls.length = 0
await bot.handleUpdate(baseMessage('check this https://nhentai.net/g/255700/ out') as any)
const urlCard = calls.filter((c) => c.method === 'sendMessage').pop()!
assert.ok(urlCard.payload.text.includes('Pages:'))
console.log('✓ nhentai URL detection')

globalThis.fetch = realFetch
console.log('\nAll integration tests passed.')
