import { config } from '../config.js'
import { getClearance } from './flaresolverr.js'
import { NotFoundError, type Doujin, type LightDoujin, type SearchResult } from './types.js'

/* ──────────────────────────── API v2 raw shapes ─────────────────────────── */

interface GalleryTitle {
        english: string
        japanese: string | null
        pretty: string
}

interface CoverInfo {
        path: string
        width: number
        height: number
}

interface TagResponse {
        id: number
        type: string
        name: string
        url: string
        count: number
}

interface GalleryDetail {
        id: number
        media_id: string
        title: GalleryTitle
        cover: CoverInfo
        thumbnail: CoverInfo
        upload_date: number
        tags: TagResponse[]
        num_pages: number
        num_favorites: number
}

interface GalleryListItem {
        id: number
        media_id: string
        english_title: string
        japanese_title: string | null
        thumbnail: string
        thumbnail_width: number
        thumbnail_height: number
        num_pages: number
        num_favorites: number
}

interface Paginated {
        result: GalleryListItem[]
        num_pages: number
        per_page: number
        total: number | null
}

interface CdnConfig {
        image_servers: string[]
        thumb_servers: string[]
}

interface DownloadInfo {
        url: string
        expires_at: number
}

export type SortOrder = 'date' | 'popular' | 'popular-today' | 'popular-week' | 'popular-month'

/* ──────────────────────────────── CDN cache ─────────────────────────────── */

let cdnCache: { value: CdnConfig; fetchedAt: number } | null = null
const CDN_TTL_MS = 60 * 60 * 1000

/* ────────────────────────────────── client ──────────────────────────────── */

export class NHentaiClient {
        private clearanceFailed = false

        private async rawRequest<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
                const headers: Record<string, string> = {
                        'authorization': `Key ${config.nhentaiApiKey}`,
                        'user-agent': config.userAgent,
                        'accept': 'application/json',
                }

                const clearance = await getClearance()
                if (clearance) {
                        headers['cookie'] = clearance.cookie
                        headers['user-agent'] = clearance.userAgent
                }

                const response = await fetch(config.nhentaiApiBase + path, {
                        ...init,
                        headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
                        signal: AbortSignal.timeout(15_000),
                })

                // If Cloudflare blocked us and FlareSolverr is available, refresh clearance once and retry.
                if (response.status === 403 && config.flaresolverrUrl && !this.clearanceFailed) {
                        this.clearanceFailed = true
                        await getClearance(true)
                        this.clearanceFailed = false
                        return this.rawRequest<T>(path, init)
                }

                let data: unknown = null
                const text = await response.text()
                if (text) {
                        try {
                                data = JSON.parse(text)
                        } catch {
                                data = null
                        }
                }

                if (response.status === 404) throw new NotFoundError(path)
                if (response.status === 429) throw new Error('nhentai API rate limit reached (429)')
                if (response.status === 401 || response.status === 403) {
                        throw new Error(
                                `nhentai API rejected the request (${response.status}). ` +
                                        'Check NHENTAI_API_KEY — create one at https://nhentai.net/user/settings#apikeys'
                        )
                }
                if (!response.ok) throw new Error(`nhentai API error ${response.status} for ${path}`)
                if (data === null) throw new Error(`nhentai API returned invalid JSON for ${path}`)

                return { status: response.status, data: data as T }
        }

        private async getCdn(): Promise<CdnConfig> {
                if (cdnCache && Date.now() - cdnCache.fetchedAt < CDN_TTL_MS) return cdnCache.value
                // /cdn is public — sending the API key is harmless.
                const { data } = await this.rawRequest<CdnConfig>('/cdn')
                cdnCache = { value: data, fetchedAt: Date.now() }
                return data
        }

        private async thumbServer(): Promise<string> {
                try {
                        const cdn = await this.getCdn()
                        if (cdn.thumb_servers.length > 0) return cdn.thumb_servers[0]!
                } catch (err) {
                        console.error('Failed to fetch CDN config:', err)
                }
                return 'https://t.nhentai.net'
        }

        private galleryUrl(id: number): string {
                return `${config.nhentaiWebBase}/g/${id}/`
        }

        private async listItemToLight(item: GalleryListItem): Promise<LightDoujin> {
                const server = await this.thumbServer()
                return {
                        id: String(item.id),
                        title: item.english_title || item.japanese_title || `#${item.id}`,
                        thumbnail: item.thumbnail ? server + item.thumbnail : '',
                        url: this.galleryUrl(item.id),
                        pages: item.num_pages ?? 0,
                }
        }

        /* ─────────────────────────────── public API ──────────────────────────── */

        async gallery(id: string): Promise<Doujin> {
                const { data } = await this.rawRequest<GalleryDetail>(`/galleries/${id}`)
                const server = await this.thumbServer()
                return {
                        id: String(data.id),
                        url: this.galleryUrl(data.id),
                        title: {
                                english: data.title.english,
                                japanese: data.title.japanese,
                                pretty: data.title.pretty || data.title.english,
                        },
                        thumbnail: server + data.thumbnail.path,
                        pages: data.num_pages,
                        tags: data.tags.map((tag) => ({ type: tag.type, name: tag.name })),
                        uploadedAt: data.upload_date,
                }
        }

        async search(query: string, page = 1, sort: SortOrder = 'date'): Promise<SearchResult> {
                const params = new URLSearchParams({ query, page: String(page) })
                if (sort !== 'date') params.set('sort', sort)
                const { data } = await this.rawRequest<Paginated>(`/search?${params.toString()}`)

                const results: LightDoujin[] = []
                for (const item of data.result) {
                        results.push(await this.listItemToLight(item))
                }

                return { results, numPages: data.num_pages, total: data.total ?? null }
        }

        async popular(): Promise<LightDoujin[]> {
                const { data } = await this.rawRequest<GalleryListItem[]>('/galleries/popular')
                const results: LightDoujin[] = []
                for (const item of data) results.push(await this.listItemToLight(item))
                return results
        }

        async random(): Promise<Doujin> {
                const { data } = await this.rawRequest<Record<string, unknown>>('/galleries/random')
                if (data && typeof data['id'] === 'number' && typeof data['num_pages'] === 'number') {
                        const server = await this.thumbServer()
                        const detail = data as unknown as GalleryDetail
                        return {
                                id: String(detail.id),
                                url: this.galleryUrl(detail.id),
                                title: {
                                        english: detail.title.english,
                                        japanese: detail.title.japanese,
                                        pretty: detail.title.pretty || detail.title.english,
                                },
                                thumbnail: server + detail.thumbnail.path,
                                pages: detail.num_pages,
                                tags: detail.tags.map((tag) => ({ type: tag.type, name: tag.name })),
                                uploadedAt: detail.upload_date,
                        }
                }

                // Loose response shape: try to extract an id and refetch.
                const candidates = ['gallery_id', 'id', 'gid']
                for (const key of candidates) {
                        const value = data?.[key]
                        if (typeof value === 'number') return this.gallery(String(value))
                }
                throw new Error('Unexpected /galleries/random response shape')
        }

        async archiveUrl(id: string): Promise<DownloadInfo> {
                const { data } = await this.rawRequest<DownloadInfo>(`/galleries/${id}/download`, {
                        method: 'POST',
                })
                return data
        }
}

export const nhentai = new NHentaiClient()
