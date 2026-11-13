import { config } from '../config.js'

export interface Clearance {
	cookie: string
	userAgent: string
}

interface FlareSolverrSolution {
	status: string
	message?: string
	solution?: {
		url: string
		status: number
		response?: string
		userAgent?: string
		cookies?: { name: string; value: string; domain?: string; path?: string }[]
	}
}

let cached: { value: Clearance; fetchedAt: number } | null = null
let inflight: Promise<Clearance | null> | null = null

const TTL_MS = 15 * 60 * 1000

/**
 * When FLARESOLVERR_URL is configured, solves the Cloudflare challenge once
 * and reuses the cf_clearance cookie + matching User-Agent for direct requests.
 */
export async function getClearance(forceRefresh = false): Promise<Clearance | null> {
	if (!config.flaresolverrUrl) return null
	if (!forceRefresh && cached && Date.now() - cached.fetchedAt < TTL_MS) return cached.value
	if (inflight) return inflight

	inflight = (async () => {
		try {
			const response = await fetch(config.flaresolverrUrl!, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					cmd: 'request.get',
					url: 'https://nhentai.net/',
					maxTimeout: config.flaresolverrMaxTimeout,
				}),
				signal: AbortSignal.timeout(config.flaresolverrMaxTimeout + 5_000),
			})
			const data = (await response.json()) as FlareSolverrSolution
			const cookies = data.solution?.cookies
			const userAgent = data.solution?.userAgent
			if (!cookies || !userAgent) {
				console.error('FlareSolverr did not return cookies/UA:', data.message ?? data.status)
				return null
			}
			const cookie = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
			const value: Clearance = { cookie, userAgent }
			cached = { value, fetchedAt: Date.now() }
			console.log('FlareSolverr clearance acquired')
			return value
		} catch (err) {
			console.error('FlareSolverr request failed:', err)
			return null
		} finally {
			inflight = null
		}
	})()

	return inflight
}
