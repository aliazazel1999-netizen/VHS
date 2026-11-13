import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
	id: text('id').primaryKey(),
	username: text('username'),
	firstName: text('first_name'),
	lastName: text('last_name'),
	languageCode: text('language_code'),
	/** UI language: 'fa' | 'en' */
	lang: text('lang').notNull().default('en'),
	/** JSON: { sort: 'date'|'popular', view: 'article'|'photo' } */
	settings: text('settings').notNull().default('{"sort":"date","view":"article"}'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
})

export const mangaTable = sqliteTable('manga', {
	/** "nhentai_<id>" */
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	pages: integer('pages').notNull(),
	/** small thumbnail URL */
	thumbnail: text('thumbnail').notNull(),
	/** gallery URL on nhentai.net */
	url: text('url').notNull(),
	/** JSON: [{ type, name }, ...] */
	tags: text('tags').notNull().default('[]'),
	/** unix seconds */
	uploadedAt: integer('uploaded_at'),
	createdAt: integer('created_at').notNull(),
	updatedAt: integer('updated_at').notNull(),
})

export type UserRow = typeof usersTable.$inferSelect
export type MangaRow = typeof mangaTable.$inferSelect
