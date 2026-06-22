import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { RuntimeConfig } from './config'
import { LocalChatRequest, LocalChatResponse } from './ollama/OllamaClient'

const config: RuntimeConfig = {
	host: '127.0.0.1',
	port: 3001,
	ollamaBaseUrl: 'http://ollama.test',
	ollamaModel: null,
	comfyuiBaseUrl: 'http://comfy.test',
	comfyuiWorkflowPath: '/tmp/workflow.json',
	comfyuiPromptNodeId: '6',
	canvasDirectory: '/tmp/canvas',
}

describe('GET /api/health', () => {
	it('reports service availability without failing the whole request', async () => {
		const fetchImplementation = vi.fn(async (input: string | URL | Request) => {
			const url = String(input)
			if (url === 'http://ollama.test/api/tags') {
				return new Response('{"models":[]}', { status: 200 })
			}
			throw new TypeError('connection refused')
		})

		const response = await request(createApp(config, fetchImplementation)).get('/api/health')

		expect(response.status).toBe(200)
		expect(response.body).toEqual({
			status: 'degraded',
			services: {
				ollama: { available: true, url: 'http://ollama.test' },
				comfyui: { available: false, url: 'http://comfy.test' },
			},
		})
	})
})

describe('POST /api/chat', () => {
	it('returns the local model response', async () => {
		const ollamaClient = {
			chat: vi.fn(
				async (_body: LocalChatRequest): Promise<LocalChatResponse> => ({
					message: 'Increase contrast around the subject.',
					model: 'qwen3:4b',
				})
			),
		}
		const response = await request(
			createApp(config, vi.fn(), { ollamaClient })
		)
			.post('/api/chat')
			.send({
				message: 'Improve this image',
				selectedShapes: [{ id: 'shape:1' }],
			})

		expect(response.status).toBe(200)
		expect(response.body).toEqual({
			message: 'Increase contrast around the subject.',
			model: 'qwen3:4b',
		})
		expect(ollamaClient.chat).toHaveBeenCalledWith({
			message: 'Improve this image',
			selectedShapes: [{ id: 'shape:1' }],
		})
	})
})

describe('POST /api/generations', () => {
	it('returns a stored ComfyUI generation', async () => {
		const generationService = {
			generate: vi.fn(async () => ({
				assetId: 'asset-1',
				url: '/assets/asset-1.png',
				promptId: 'prompt-1',
			})),
		}
		const response = await request(
			createApp(config, vi.fn(), { generationService })
		)
			.post('/api/generations')
			.send({ prompt: 'make it cinematic' })

		expect(response.status).toBe(200)
		expect(response.body).toEqual({
			assetId: 'asset-1',
			url: '/assets/asset-1.png',
			promptId: 'prompt-1',
		})
		expect(generationService.generate).toHaveBeenCalledWith('make it cinematic')
	})
})

describe('canvas state API', () => {
	it('reads and writes the local canvas document', async () => {
		const canvasStore = {
			read: vi.fn(async () => ({ store: { existing: true } })),
			write: vi.fn(async () => undefined),
		}
		const app = createApp(config, vi.fn(), { canvasStore })

		const readResponse = await request(app).get('/api/canvas/state')
		const writeResponse = await request(app)
			.put('/api/canvas/state')
			.send({ store: { next: true } })

		expect(readResponse.status).toBe(200)
		expect(readResponse.body).toEqual({ document: { store: { existing: true } } })
		expect(writeResponse.status).toBe(204)
		expect(canvasStore.write).toHaveBeenCalledWith({ store: { next: true } })
	})
})
