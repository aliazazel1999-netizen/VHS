import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { config } from '../config.js'
import * as schema from './schema.js'

type Db = ReturnType<typeof drizzle<typeof schema>>

let client: Client | null = null
let db: Db | null = null
let schemaReady: Promise<void> | null = null

export function getDb(): Db {
        if (!db) {
                client = createClient({
                        url: config.tursoUrl,
                        authToken: config.tursoAuthToken,
                })
                db = drizzle(client, { schema })
        }
        return db
}

/** Creates tables once per serverless instance (cheap no-op afterwards). */
export async function ensureSchema(): Promise<void> {
        if (!schemaReady) {
                schemaReady = (async () => {
                        const c = client ?? createClient({ url: config.tursoUrl, authToken: config.tursoAuthToken })
                        await c.executeMultiple(`
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
                })()
        }
        return schemaReady
}
