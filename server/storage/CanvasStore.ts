import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

interface CanvasStoreOptions {
	onWarning?: (message: string) => void
}

export class CanvasStore {
	private readonly documentPath: string
	private readonly assetsDirectory: string
	private readonly onWarning: (message: string) => void

	constructor(
		private readonly canvasDirectory: string,
		{ onWarning = console.warn }: CanvasStoreOptions = {}
	) {
		this.documentPath = path.join(canvasDirectory, 'document.json')
		this.assetsDirectory = path.join(canvasDirectory, 'assets')
		this.onWarning = onWarning
	}

	async read(): Promise<unknown | null> {
		let contents: string
		try {
			contents = await readFile(this.documentPath, 'utf8')
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
			throw error
		}

		try {
			return JSON.parse(contents) as unknown
		} catch (error) {
			this.onWarning(
				`Could not parse ${this.documentPath}: ${
					error instanceof Error ? error.message : 'invalid JSON'
				}`
			)
			return null
		}
	}

	async write(document: unknown): Promise<void> {
		await mkdir(this.canvasDirectory, { recursive: true })
		const temporaryPath = path.join(
			this.canvasDirectory,
			`.document-${randomUUID()}.tmp`
		)
		try {
			await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
			await rename(temporaryPath, this.documentPath)
		} catch (error) {
			await unlink(temporaryPath).catch(() => undefined)
			throw error
		}
	}

	resolveAssetPath(filename: string): string {
		const resolved = path.resolve(this.assetsDirectory, filename)
		if (path.dirname(resolved) !== path.resolve(this.assetsDirectory)) {
			throw new Error(`Invalid asset path: ${filename}`)
		}
		return resolved
	}
}
