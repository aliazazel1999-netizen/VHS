import { eq } from 'drizzle-orm'
import { ensureSchema, getDb } from '../db/client.js'
import { mangaTable } from '../db/schema.js'
import { nhentai } from '../sources/nhentai.js'
import { NotFoundError, type Doujin } from '../sources/types.js'
import { escapeHtml, type MangaRecord } from './describe.js'
import Werror from './error.js'

function databaseId(id: string): string {
	return `nhentai_${id}`
}

function recordFromRow(row: typeof mangaTable.$inferSelect): MangaRecord {
	let tags: { type: string; name: string }[] = []
	try {
		const parsed = JSON.parse(row.tags)
		if (Array.isArray(parsed)) {
			tags = parsed.filter(
				(item): item is { type: string; name: string } =>
					item !== null && typeof item === 'object' && typeof item.name === 'string'
			)
		}
	} catch {
		tags = []
	}
	return {
		id: row.id.replace(/^nhentai_/, ''),
		title: row.title,
		pages: row.pages,
		thumbnail: row.thumbnail,
		url: row.url,
		tags,
		uploadedAt: row.uploadedAt,
	}
}

function recordFromDoujin(doujin: Doujin): MangaRecord {
	return {
		id: doujin.id,
		title: doujin.title.pretty || doujin.title.english,
		pages: doujin.pages,
		thumbnail: doujin.thumbnail,
		url: doujin.url,
		tags: doujin.tags,
		uploadedAt: doujin.uploadedAt,
	}
}

async function saveToCache(doujin: Doujin): Promise<void> {
	const db = getDb()
	const now = Math.floor(Date.now() / 1000)
	const record = recordFromDoujin(doujin)
	await db
		.insert(mangaTable)
		.values({
			id: databaseId(doujin.id),
			title: record.title,
			pages: record.pages,
			thumbnail: record.thumbnail,
			url: record.url,
			tags: JSON.stringify(record.tags),
			uploadedAt: record.uploadedAt,
			createdAt: now,
			updatedAt: now,
		})
		.onConflictDoUpdate({
			target: mangaTable.id,
			set: {
				title: record.title,
				pages: record.pages,
				thumbnail: record.thumbnail,
				url: record.url,
				tags: JSON.stringify(record.tags),
				uploadedAt: record.uploadedAt,
				updatedAt: now,
			},
		})
}

/**
 * Cache-first gallery loader: reads the manga table, falls back to the live API
 * and writes the result back. Returns the raw record — callers build the
 * localized description themselves (cache is shared between fa/en users).
 */
export default async function getDoujinRecord(id: string): Promise<MangaRecord> {
	const dbId = databaseId(id)

	let cachedRecord: MangaRecord | null = null
	try {
		await ensureSchema()
		const db = getDb()
		const rows = await db.select().from(mangaTable).where(eq(mangaTable.id, dbId)).limit(1)
		if (rows[0]) cachedRecord = recordFromRow(rows[0])
	} catch (err) {
		console.error(new Werror(err, 'Reading manga cache'))
	}

	if (cachedRecord) return cachedRecord

	const doujin = await nhentai.gallery(id)
	try {
		await saveToCache(doujin)
	} catch (err) {
		console.error(new Werror(err, 'Writing manga cache'))
	}
	return recordFromDoujin(doujin)
}

export { NotFoundError }
