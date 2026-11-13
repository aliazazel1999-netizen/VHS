/**
 * Smoke tests — no network, no Telegram:
 *   npm run smoke
 * Verifies i18n parity, description building (fa/en), settings parsing
 * and DB schema on a local libSQL file database.
 */
import 'dotenv/config'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import type { MangaRecord } from '../src/lib/describe.js'

// NOTE: environment must be configured BEFORE any *runtime* project import
// (src/config.ts reads env at module load). Type-only imports are erased.
process.env['TURSO_DATABASE_URL'] = 'file:/tmp/nhentai-smoke-test.db'
rmSync('/tmp/nhentai-smoke-test.db', { force: true })
rmSync('/tmp/nhentai-smoke-test.db-shm', { force: true })
rmSync('/tmp/nhentai-smoke-test.db-wal', { force: true })

const { en, fa, fill, detectLanguage, isLang } = await import('../src/i18n/index.js')
const { buildDescription, instantViewUrl, truncateHtml } = await import('../src/lib/describe.js')
const { loadUser, updateUserSettings } = await import('../src/db/users.js')
const { ensureSchema, getDb } = await import('../src/db/client.js')
const { mangaTable } = await import('../src/db/schema.js')
const { eq } = await import('drizzle-orm')

function keyParity(
        a: Record<string, unknown>,
        b: Record<string, unknown>,
        path = ''
): void {
        for (const key of Object.keys(a)) {
                const p = path ? `${path}.${key}` : key
                assert.ok(key in b, `fa is missing key: ${p}`)
                const av = a[key]
                const bv = b[key]
                if (typeof av === 'object' && av !== null) {
                        assert.ok(typeof bv === 'object' && bv !== null, `fa type mismatch at: ${p}`)
                        keyParity(av as Record<string, unknown>, bv as Record<string, unknown>, p)
                }
        }
        for (const key of Object.keys(b)) {
                const p = path ? `${path}.${key}` : key
                assert.ok(key in a, `fa has extra key: ${p}`)
        }
}

// 1. i18n parity
keyParity(en, fa)
console.log('✓ i18n: fa has exactly the same keys as en')

// 2. fill()
assert.equal(fill('a {x} b {y}', { x: 1, y: 'ز' }), 'a 1 b ز')
assert.equal(fill('keep {unknown}', {}), 'keep {unknown}')
console.log('✓ i18n: fill()')

// 3. detection
assert.equal(detectLanguage('fa-IR'), 'fa')
assert.equal(detectLanguage('en-US'), 'en')
assert.equal(detectLanguage(undefined), 'en')
assert.ok(isLang('fa') && !isLang('de'))
console.log('✓ i18n: language detection')

// 4. description building (fa + en)
const record: MangaRecord = {
        id: '255700',
        title: 'Example Title',
        pages: 24,
        thumbnail: 'https://t.nhentai.net/galleries/1/cover.jpg',
        url: 'https://nhentai.net/g/255700/',
        tags: [
                { type: 'artist', name: 'someone' },
                { type: 'tag', name: 'test tag' },
                { type: 'parody', name: 'some parody' },
        ],
        uploadedAt: 1700000000,
}
const iv = instantViewUrl(record.url)
assert.ok(iv.startsWith('https://t.me/iv?'))
for (const lang of ['en', 'fa'] as const) {
        const desc = buildDescription(record, lang)
        assert.ok(desc.includes('https://nhentai.net/g/255700/'))
        assert.ok(desc.length > 50, `description too short for ${lang}`)
        assert.ok(!desc.includes('<script>'))
}
const faDesc = buildDescription(record, 'fa')
assert.ok(faDesc.includes('صفحات'), 'fa description must contain صفحات')
assert.ok(faDesc.includes('هنرمندان'), 'fa description must contain هنرمندان')
const enDesc = buildDescription(record, 'en')
assert.ok(enDesc.includes('Pages'), 'en description must contain Pages')
assert.ok(enDesc.includes('#test_tag'))
console.log('✓ describe: fa/en HTML cards')

// 5. truncateHtml
assert.ok(truncateHtml('<b>hello</b> world'.repeat(50), 40).endsWith('>'))
console.log('✓ describe: truncateHtml')

// 6. DB: schema + users + settings roundtrip on file: db
await ensureSchema()
const db = getDb()

const fakeUser = { id: 42, is_bot: false, first_name: 'Test', username: 'tester', language_code: 'fa-IR' }
const loaded = await loadUser(fakeUser as any)
assert.equal(loaded.lang, 'fa', 'fa user should be auto-detected as fa')
assert.equal(loaded.settings.sort, 'date')

const changed = await updateUserSettings('42', { lang: 'en', settings: { sort: 'popular', view: 'photo' } })
assert.equal(changed.lang, 'en')
assert.equal(changed.settings.sort, 'popular')
assert.equal(changed.settings.view, 'photo')

// manga cache row
const now = Math.floor(Date.now() / 1000)
await db.insert(mangaTable).values({
        id: 'nhentai_255700',
        title: 'Example Title',
        pages: 24,
        thumbnail: 'https://t.nhentai.net/galleries/1/cover.jpg',
        url: 'https://nhentai.net/g/255700/',
        tags: JSON.stringify(record.tags),
        uploadedAt: 1700000000,
        createdAt: now,
        updatedAt: now,
})
const rows = await db.select().from(mangaTable).where(eq(mangaTable.id, 'nhentai_255700')).limit(1)
assert.equal(rows.length, 1)
assert.ok(JSON.parse(rows[0]!.tags).length === 3)
console.log('✓ db: users + settings + manga cache (file: libSQL)')

// 7. archive module loads
await import('../src/lib/archive.js')
console.log('✓ archive module loads')

console.log('\nAll smoke tests passed.')
