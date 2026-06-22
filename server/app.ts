import express from 'express'
import { RuntimeConfig } from './config'
import { LocalChatRequest, LocalChatResponse, OllamaClient } from './ollama/OllamaClient'

type FetchImplementation = typeof fetch
type OllamaChatClient = {
	chat(request: LocalChatRequest): Promise<LocalChatResponse>
}

interface AppDependencies {
	ollamaClient?: OllamaChatClient
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
	app.use(express.json({ limit: '25mb' }))

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
			const result = await ollamaClient.chat({
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

	return app
}
