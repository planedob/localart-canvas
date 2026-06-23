import express from 'express'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { RuntimeConfig } from './config'
import { StoredGeneration } from './comfy/GenerationService'
import { createStoredZipArchive, ZipEntry } from './export/zip'
import { LocalChatRequest, LocalChatResponse, OllamaClient } from './ollama/OllamaClient'
import { CanvasStore } from './storage/CanvasStore'
import { ModelSlotName, RoutedChatResponse, RoutingConfigUpdate, SanitizedRoutingConfig } from './model/types'

type FetchImplementation = typeof fetch
type OllamaChatClient = {
	chat(request: LocalChatRequest): Promise<LocalChatResponse>
}
type ImageGenerationService = {
	generate(prompt: string): Promise<StoredGeneration>
}
type CanvasDocumentStore = {
	read(): Promise<unknown | null>
	write(document: unknown): Promise<void>
}
type ModelRoutingServiceLike = {
	chat(request: LocalChatRequest): Promise<RoutedChatResponse>
	readSanitized(): Promise<SanitizedRoutingConfig>
	update(update: RoutingConfigUpdate): Promise<void>
	testConnection(slot: ModelSlotName): Promise<LocalChatResponse>
}

interface AppDependencies {
	ollamaClient?: OllamaChatClient
	generationService?: ImageGenerationService
	canvasStore?: CanvasDocumentStore
	modelRoutingService?: ModelRoutingServiceLike
}

async function isAvailable(fetchImplementation: FetchImplementation, url: string): Promise<boolean> {
	try {
		const response = await fetchImplementation(url, {
			signal: AbortSignal.timeout(2_000),
		})
		return response.ok
	} catch {
		return false
	}
}

export function createApp(
	config: RuntimeConfig,
	fetchImplementation: FetchImplementation = fetch,
	dependencies: AppDependencies = {}
): express.Express {
	const app = express()
	const ollamaClient =
		dependencies.ollamaClient ??
		new OllamaClient({
			baseUrl: config.ollamaBaseUrl,
			model: config.ollamaModel,
			fetchImplementation,
		})
	const canvasStore = dependencies.canvasStore ?? new CanvasStore(config.canvasDirectory)
	app.use(express.json({ limit: '25mb' }))
	app.use('/assets', express.static(path.join(config.canvasDirectory, 'assets')))

	app.get('/api/health', async (_request, response) => {
		const [ollamaAvailable, comfyuiAvailable] = await Promise.all([
			isAvailable(fetchImplementation, `${config.ollamaBaseUrl}/api/tags`),
			isAvailable(fetchImplementation, `${config.comfyuiBaseUrl}/system_stats`),
		])

		response.json({
			status: ollamaAvailable && comfyuiAvailable ? 'ok' : 'degraded',
			services: {
				ollama: {
					available: ollamaAvailable,
					url: config.ollamaBaseUrl,
				},
				comfyui: {
					available: comfyuiAvailable,
					url: config.comfyuiBaseUrl,
				},
			},
			canvas: { directory: config.canvasDirectory },
		})
	})

	app.post('/api/chat', async (request, response) => {
		const body = request.body as Partial<LocalChatRequest>
		if (typeof body.message !== 'string' || !Array.isArray(body.selectedShapes)) {
			response.status(400).json({
				error: 'message must be a string and selectedShapes must be an array',
			})
			return
		}

		try {
			const result = await (dependencies.modelRoutingService ?? ollamaClient).chat({
				message: body.message,
				selectedShapes: body.selectedShapes,
				...(typeof body.screenshotDataUrl === 'string'
					? { screenshotDataUrl: body.screenshotDataUrl }
					: {}),
			})
			response.json(result)
		} catch (error) {
			response.status(503).json({
				error: error instanceof Error ? error.message : 'Ollama request failed',
			})
		}
	})

	app.get('/api/model-routing', async (_request, response) => {
		if (!dependencies.modelRoutingService) {
			response.status(503).json({ error: 'Model routing service is unavailable' })
			return
		}
		try {
			response.json(await dependencies.modelRoutingService.readSanitized())
		} catch (error) {
			response.status(500).json({ error: error instanceof Error ? error.message : 'Model routing could not be read' })
		}
	})

	app.put('/api/model-routing', async (request, response) => {
		if (!dependencies.modelRoutingService) {
			response.status(503).json({ error: 'Model routing service is unavailable' })
			return
		}
		try {
			await dependencies.modelRoutingService.update(request.body as RoutingConfigUpdate)
			response.status(204).end()
		} catch (error) {
			response.status(400).json({ error: error instanceof Error ? error.message : 'Model routing could not be saved' })
		}
	})

	app.post('/api/model-routing/test', async (request, response) => {
		if (!dependencies.modelRoutingService) {
			response.status(503).json({ error: 'Model routing service is unavailable' })
			return
		}
		const slot = (request.body as { slot?: unknown }).slot
		if (slot !== 'primary' && slot !== 'backup') {
			response.status(400).json({ error: 'slot must be primary or backup' })
			return
		}
		try {
			response.json(await dependencies.modelRoutingService.testConnection(slot))
		} catch (error) {
			response.status(503).json({ error: error instanceof Error ? error.message : 'Model connection test failed' })
		}
	})

	app.post('/api/generations', async (request, response) => {
		if (!dependencies.generationService) {
			response.status(503).json({
				error: `ComfyUI workflow is not configured at ${config.comfyuiWorkflowPath}`,
			})
			return
		}

		const prompt = (request.body as { prompt?: unknown }).prompt
		if (typeof prompt !== 'string' || !prompt.trim()) {
			response.status(400).json({ error: 'prompt must be a non-empty string' })
			return
		}

		try {
			response.json(await dependencies.generationService.generate(prompt.trim()))
		} catch (error) {
			response.status(503).json({
				error: error instanceof Error ? error.message : 'ComfyUI generation failed',
			})
		}
	})

	app.get('/api/canvas/state', async (_request, response) => {
		try {
			response.json({ document: await canvasStore.read() })
		} catch (error) {
			response.status(500).json({
				error: error instanceof Error ? error.message : 'Canvas state could not be read',
			})
		}
	})

	app.put('/api/canvas/state', async (request, response) => {
		try {
			await canvasStore.write(request.body)
			response.status(204).end()
		} catch (error) {
			response.status(500).json({
				error: error instanceof Error ? error.message : 'Canvas state could not be saved',
			})
		}
	})

	app.get('/api/export/canvas.json', async (_request, response) => {
		try {
			const document = await canvasStore.read()
			response
				.type('application/json')
				.attachment('localart-canvas.json')
				.send(`${JSON.stringify(document, null, 2)}\n`)
		} catch (error) {
			response.status(500).json({
				error: error instanceof Error ? error.message : 'Canvas JSON export failed',
			})
		}
	})

	app.get('/api/export/canvas.zip', async (_request, response) => {
		try {
			const document = await canvasStore.read()
			const entries: ZipEntry[] = [
				{ path: 'document.json', data: `${JSON.stringify(document, null, 2)}\n` },
				...(await readAssetEntries(path.join(config.canvasDirectory, 'assets'))),
			]
			const archive = createStoredZipArchive(entries)
			response
				.type('application/zip')
				.attachment('localart-canvas.zip')
				.set('Content-Length', String(archive.length))
				.send(archive)
		} catch (error) {
			response.status(500).json({
				error: error instanceof Error ? error.message : 'Canvas ZIP export failed',
			})
		}
	})

	return app
}

async function readAssetEntries(assetsDirectory: string): Promise<ZipEntry[]> {
	return readAssetEntriesFrom(assetsDirectory, assetsDirectory)
}

async function readAssetEntriesFrom(rootDirectory: string, currentDirectory: string): Promise<ZipEntry[]> {
	let entries: ZipEntry[] = []
	let directoryEntries
	try {
		directoryEntries = await readdir(currentDirectory, { withFileTypes: true })
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
		throw error
	}

	for (const directoryEntry of directoryEntries) {
		const absolutePath = path.join(currentDirectory, directoryEntry.name)
		if (directoryEntry.isDirectory()) {
			entries = entries.concat(await readAssetEntriesFrom(rootDirectory, absolutePath))
			continue
		}
		if (!directoryEntry.isFile()) continue
		const relativePath = path.relative(rootDirectory, absolutePath).split(path.sep).join('/')
		entries.push({
			path: `assets/${relativePath}`,
			data: await readFile(absolutePath),
		})
	}

	return entries
}
