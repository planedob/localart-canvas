import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'
import { RuntimeConfig } from './config'

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
