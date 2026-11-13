export interface Tag {
	type: string
	name: string
}

export interface Doujin {
	/** gallery code as string, e.g. "255700" */
	id: string
	url: string
	title: {
		english: string
		japanese: string | null
		pretty: string
	}
	/** small thumbnail URL (absolute) */
	thumbnail: string
	pages: number
	tags: Tag[]
	/** unix seconds */
	uploadedAt: number | null
}

export interface LightDoujin {
	id: string
	title: string
	thumbnail: string
	url: string
	pages: number
}

export interface SearchResult {
	results: LightDoujin[]
	numPages: number
	total: number | null
}

export class NotFoundError extends Error {
	constructor(message = 'Not found') {
		super(message)
		this.name = 'NotFoundError'
	}
}
