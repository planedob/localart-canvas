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
