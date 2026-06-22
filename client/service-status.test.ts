import { describe, expect, test, vi } from 'vitest'
import { fetchServiceHealth, formatServiceStatus } from './service-status'

const health = {
	status: 'degraded' as const,
	services: {
		ollama: { available: true, url: 'http://127.0.0.1:11434' },
		comfyui: { available: false, url: 'http://127.0.0.1:8188' },
	},
	canvas: { directory: '/tmp/canvas' },
}

describe('fetchServiceHealth', () => {
	test('returns the local health response', async () => {
		const fetchImplementation = vi.fn(async () => Response.json(health))
		await expect(fetchServiceHealth(fetchImplementation)).resolves.toEqual(health)
		expect(fetchImplementation).toHaveBeenCalledWith('/api/health')
	})

	test('throws a readable error for a failed response', async () => {
		const fetchImplementation = vi.fn(async () => new Response(null, { status: 503 }))
		await expect(fetchServiceHealth(fetchImplementation)).rejects.toThrow(
			'Local service health failed (503)'
		)
	})
})

describe('formatServiceStatus', () => {
	test('formats a connected service', () => {
		expect(formatServiceStatus(true, 'Ollama')).toEqual({
			label: '已连接',
			tone: 'connected',
			guidance: null,
		})
	})

	test('provides Ollama startup guidance', () => {
		expect(formatServiceStatus(false, 'Ollama').guidance).toContain('ollama serve')
	})

	test('provides ComfyUI startup guidance', () => {
		expect(formatServiceStatus(false, 'ComfyUI').guidance).toContain('启动 ComfyUI')
	})
})
