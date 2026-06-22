type SnapshotReader = {
	loadSnapshot(snapshot: unknown): unknown
}

type SnapshotWriter = {
	getSnapshot(): unknown
}

type AutosaveEditor = SnapshotWriter & {
	store: {
		listen(callback: () => void, options?: { scope?: 'document' }): () => void
	}
}

export async function loadCanvasState(
	editor: SnapshotReader,
	fetchImplementation: typeof fetch = fetch
): Promise<void> {
	const response = await fetchImplementation('/api/canvas/state')
	if (!response.ok) throw new Error(`Canvas state load failed (${response.status})`)
	const body = (await response.json()) as { document?: unknown | null }
	if (body.document) editor.loadSnapshot(body.document)
}

export async function saveCanvasState(
	editor: SnapshotWriter,
	fetchImplementation: typeof fetch = fetch
): Promise<void> {
	const response = await fetchImplementation('/api/canvas/state', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(editor.getSnapshot()),
	})
	if (!response.ok) throw new Error(`Canvas state save failed (${response.status})`)
}

export function startCanvasAutosave(
	editor: AutosaveEditor,
	fetchImplementation: typeof fetch = fetch,
	debounceMs = 750
): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined
	const dispose = editor.store.listen(
		() => {
			if (timer) clearTimeout(timer)
			timer = setTimeout(() => {
				timer = undefined
				void saveCanvasState(editor, fetchImplementation).catch((error) => {
					console.warn(error)
				})
			}, debounceMs)
		},
		{ scope: 'document' }
	)

	return () => {
		if (timer) clearTimeout(timer)
		dispose()
	}
}
