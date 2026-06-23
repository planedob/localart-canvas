import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

interface CanvasStoreOptions {
	createVersionId?: () => string
	now?: () => Date
	onWarning?: (message: string) => void
}

export interface CanvasVersionSummary {
	id: string
	createdAt: string
}

interface CanvasVersionFile extends CanvasVersionSummary {
	document: unknown
}

export class CanvasStore {
	private readonly documentPath: string
	private readonly assetsDirectory: string
	private readonly versionsDirectory: string
	private readonly createVersionId: () => string
	private readonly now: () => Date
	private readonly onWarning: (message: string) => void

	constructor(
		private readonly canvasDirectory: string,
		{
			createVersionId = randomUUID,
			now = () => new Date(),
			onWarning = console.warn,
		}: CanvasStoreOptions = {}
	) {
		this.documentPath = path.join(canvasDirectory, 'document.json')
		this.assetsDirectory = path.join(canvasDirectory, 'assets')
		this.versionsDirectory = path.join(canvasDirectory, 'versions')
		this.createVersionId = createVersionId
		this.now = now
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
		const nextContents = `${JSON.stringify(document, null, 2)}\n`
		await this.snapshotCurrentDocument(nextContents)
		const temporaryPath = path.join(
			this.canvasDirectory,
			`.document-${randomUUID()}.tmp`
		)
		try {
			await writeFile(temporaryPath, nextContents, 'utf8')
			await rename(temporaryPath, this.documentPath)
		} catch (error) {
			await unlink(temporaryPath).catch(() => undefined)
			throw error
		}
	}

	async listVersions(): Promise<CanvasVersionSummary[]> {
		let entries
		try {
			entries = await readdir(this.versionsDirectory, { withFileTypes: true })
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
			throw error
		}

		const versions: CanvasVersionSummary[] = []
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith('.json')) continue
			const version = await this.readVersionFile(entry.name).catch((error: unknown) => {
				this.onWarning(
					`Could not parse canvas version ${entry.name}: ${
						error instanceof Error ? error.message : 'invalid JSON'
					}`
				)
				return null
			})
			if (!version) continue
			versions.push({ id: version.id, createdAt: version.createdAt })
		}

		return versions.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
	}

	async readVersion(id: string): Promise<unknown> {
		const version = await this.readVersionFile(`${sanitizeVersionId(id)}.json`)
		return version.document
	}

	async restoreVersion(id: string): Promise<unknown> {
		const document = await this.readVersion(id)
		await this.write(document)
		return document
	}

	resolveAssetPath(filename: string): string {
		const resolved = path.resolve(this.assetsDirectory, filename)
		if (path.dirname(resolved) !== path.resolve(this.assetsDirectory)) {
			throw new Error(`Invalid asset path: ${filename}`)
		}
		return resolved
	}

	private async snapshotCurrentDocument(nextContents: string): Promise<void> {
		let currentContents: string
		try {
			currentContents = await readFile(this.documentPath, 'utf8')
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
			throw error
		}

		if (currentContents === nextContents) {
			return
		}

		let currentDocument: unknown
		try {
			currentDocument = JSON.parse(currentContents) as unknown
		} catch {
			this.onWarning(`Could not snapshot corrupt ${this.documentPath}`)
			return
		}

		const createdAt = this.now().toISOString()
		const id = `${createdAt.replace(/[:.]/g, '-')}-${sanitizeVersionId(this.createVersionId())}`
		const version: CanvasVersionFile = { id, createdAt, document: currentDocument }
		await mkdir(this.versionsDirectory, { recursive: true })
		const temporaryPath = path.join(this.versionsDirectory, `.${id}.tmp`)
		try {
			await writeFile(temporaryPath, `${JSON.stringify(version, null, 2)}\n`, 'utf8')
			await rename(temporaryPath, path.join(this.versionsDirectory, `${id}.json`))
		} catch (error) {
			await unlink(temporaryPath).catch(() => undefined)
			throw error
		}
	}

	private async readVersionFile(filename: string): Promise<CanvasVersionFile> {
		const resolved = path.resolve(this.versionsDirectory, filename)
		if (path.dirname(resolved) !== path.resolve(this.versionsDirectory)) {
			throw new Error(`Invalid canvas version id: ${filename}`)
		}
		return JSON.parse(await readFile(resolved, 'utf8')) as CanvasVersionFile
	}
}

function sanitizeVersionId(id: string): string {
	const sanitized = id.replace(/[^a-zA-Z0-9_-]/g, '-')
	if (!sanitized) throw new Error('Invalid canvas version id')
	return sanitized
}
