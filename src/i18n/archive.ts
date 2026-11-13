import { config } from '../config.js'

export type ArchiveResult =
	| { ok: true; buffer: Buffer; sizeBytes: number }
	| { ok: false; reason: 'too_big'; sizeBytes: number }
	| { ok: false; reason: 'error'; error: unknown }

/**
 * Streams the official nhentai archive into memory with a hard size cap.
 * Aborts early (via Content-Length or accumulated bytes) when the archive is
 * bigger than the Bot API upload limit.
 */
export async function fetchArchive(url: string): Promise<ArchiveResult> {
	const maxBytes = config.zipMaxBytes

	let response: Response
	try {
		response = await fetch(url, {
			signal: AbortSignal.timeout(config.zipTimeoutMs),
			redirect: 'follow',
		})
	} catch (err) {
		return { ok: false, reason: 'error', error: err }
	}

	if (!response.ok || !response.body) {
		return { ok: false, reason: 'error', error: new Error(`archive HTTP ${response.status}`) }
	}

	const contentLength = Number(response.headers.get('content-length') ?? '0')
	if (contentLength > maxBytes) {
		try {
			await response.body.cancel()
		} catch {
			/* ignore */
		}
		return { ok: false, reason: 'too_big', sizeBytes: contentLength }
	}

	const chunks: Buffer[] = []
	let received = 0
	const reader = response.body.getReader()

	try {
		for (;;) {
			const { done, value } = await reader.read()
			if (done) break
			if (value) {
				received += value.byteLength
				if (received > maxBytes) {
					await reader.cancel().catch(() => undefined)
					return { ok: false, reason: 'too_big', sizeBytes: received }
				}
				chunks.push(Buffer.from(value))
			}
		}
	} catch (err) {
		return { ok: false, reason: 'error', error: err }
	}

	return { ok: true, buffer: Buffer.concat(chunks), sizeBytes: received }
}
