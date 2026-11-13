#!/usr/bin/env node
/**
 * Creates the required tables on Turso (or a local file: SQLite DB).
 *   npm run db:init
 * Needs TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) — reads .env as well.
 */
import 'dotenv/config'
import { createClient } from '@libsql/client'

const url = process.env['TURSO_DATABASE_URL']
if (!url) {
	console.error('TURSO_DATABASE_URL is missing.')
	process.exit(1)
}

const authToken = process.env['TURSO_AUTH_TOKEN'] || undefined
const client = createClient({ url, authToken })

await client.executeMultiple(`
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT,
		first_name TEXT,
		last_name TEXT,
		language_code TEXT,
		lang TEXT NOT NULL DEFAULT 'en',
		settings TEXT NOT NULL DEFAULT '{"sort":"date","view":"article"}',
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS manga (
		id TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		pages INTEGER NOT NULL,
		thumbnail TEXT NOT NULL,
		url TEXT NOT NULL,
		tags TEXT NOT NULL DEFAULT '[]',
		uploaded_at INTEGER,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL
	);
`)

console.log(`Tables created/verified on ${url}`)
