export interface CanvasVersionSummary {
	id: string
	createdAt: string
}

export async function listCanvasVersions(
	fetchImplementation: typeof fetch = fetch
): Promise<CanvasVersionSummary[]> {
	const response = await fetchImplementation('/api/canvas/versions')
	if (!response.ok) throw new Error(`Canvas versions load failed (${response.status})`)

	const body = (await response.json()) as { versions?: CanvasVersionSummary[] }
	return body.versions ?? []
}

export async function restoreCanvasVersion(
	id: string,
	fetchImplementation: typeof fetch = fetch
): Promise<unknown> {
	const response = await fetchImplementation(`/api/canvas/versions/${encodeURIComponent(id)}/restore`, {
		method: 'POST',
	})
	if (!response.ok) throw new Error(`Canvas version restore failed (${response.status})`)

	const body = (await response.json()) as { document?: unknown }
	return body.document
}
