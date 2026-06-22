import express from 'express'
import { RuntimeConfig } from './config'

type FetchImplementation = typeof fetch

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
	fetchImplementation: FetchImplementation = fetch
): express.Express {
	const app = express()
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

	return app
}
