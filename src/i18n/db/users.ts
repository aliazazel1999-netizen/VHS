import { eq } from 'drizzle-orm'
import type { User } from 'grammy/types'
import { ensureSchema, getDb } from './client.js'
import { usersTable, type UserRow } from './schema.js'
import { detectLanguage, isLang, type Lang } from '../i18n/index.js'

export type UserSettings = {
	sort: 'date' | 'popular'
	view: 'article' | 'photo'
}

export const defaultSettings: UserSettings = {
	sort: 'date',
	view: 'article',
}

export type UserInfo = {
	row: UserRow
	lang: Lang
	settings: UserSettings
}

function parseSettings(raw: string): UserSettings {
	try {
		const parsed = JSON.parse(raw) as Partial<UserSettings>
		return {
			sort: parsed.sort === 'popular' ? 'popular' : 'date',
			view: parsed.view === 'photo' ? 'photo' : 'article',
		}
	} catch {
		return { ...defaultSettings }
	}
}

function parseLang(raw: string): Lang {
	return isLang(raw) ? raw : 'en'
}

function rowToInfo(row: UserRow): UserInfo {
	return { row, lang: parseLang(row.lang), settings: parseSettings(row.settings) }
}

/** Loads the user row, creating/updating it on the fly. Never throws for missing tables. */
export async function loadUser(user: User): Promise<UserInfo> {
	await ensureSchema()
	const db = getDb()
	const now = Math.floor(Date.now() / 1000)
	const userId = user.id.toString()

	const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)

	if (existing.length === 0) {
		const lang = detectLanguage(user.language_code)
		await db
			.insert(usersTable)
			.values({
				id: userId,
				username: user.username,
				firstName: user.first_name,
				lastName: user.last_name,
				languageCode: user.language_code,
				lang,
				settings: JSON.stringify(defaultSettings),
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing()
		const created = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
		return rowToInfo(created[0]!)
	}

	const row = existing[0]!
	await db
		.update(usersTable)
		.set({
			username: user.username,
			firstName: user.first_name,
			lastName: user.last_name,
			languageCode: user.language_code,
			updatedAt: now,
		})
		.where(eq(usersTable.id, userId))

	return rowToInfo(row)
}

export async function updateUserSettings(
	userId: string,
	patch: { lang?: Lang; settings?: UserSettings },
	languageCode?: string | null
): Promise<UserInfo> {
	await ensureSchema()
	const db = getDb()
	const now = Math.floor(Date.now() / 1000)

	const existing = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)

	if (existing.length === 0) {
		const lang = patch.lang ?? detectLanguage(languageCode)
		await db
			.insert(usersTable)
			.values({
				id: userId,
				languageCode: languageCode ?? null,
				lang,
				settings: JSON.stringify({ ...defaultSettings, ...(patch.settings ?? {}) }),
				createdAt: now,
				updatedAt: now,
			})
			.onConflictDoNothing()
		const created = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1)
		return rowToInfo(created[0]!)
	}

	const row = existing[0]!
	const nextLang = patch.lang ?? parseLang(row.lang)
	const nextSettings = patch.settings
		? { ...parseSettings(row.settings), ...patch.settings }
		: parseSettings(row.settings)

	await db
		.update(usersTable)
		.set({
			lang: nextLang,
			settings: JSON.stringify(nextSettings),
			languageCode: languageCode ?? row.languageCode,
			updatedAt: now,
		})
		.where(eq(usersTable.id, userId))

	return rowToInfo({ ...row, lang: nextLang, settings: JSON.stringify(nextSettings) })
}

/** Fallback when the database is unreachable — keep the bot usable. */
export function fallbackInfo(languageCode?: string | null): UserInfo {
	return {
		row: {
			id: '',
			username: null,
			firstName: null,
			lastName: null,
			languageCode: languageCode ?? null,
			lang: detectLanguage(languageCode),
			settings: JSON.stringify(defaultSettings),
			createdAt: 0,
			updatedAt: 0,
		},
		lang: detectLanguage(languageCode),
		settings: { ...defaultSettings },
	}
}
