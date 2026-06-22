import { describe, expect, it, vi } from 'vitest'
import { requestGeneration, requestLocalChat } from './local-api'

describe('requestLocalChat', () => {
	it('returns the local chat response', async () => {
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					message: 'Use a softer shadow.',
					model: 'qwen3:4b',
					slot: 'backup',
					provider: 'openai-compatible',
					preset: 'aibuff',
					fallback: { from: 'primary', reason: 'Primary timed out' },
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		)

		const result = await requestLocalChat(
			{
				message: 'Improve this',
				selectedShapes: [{ id: 'shape:1' }],
			},
			fetchImplementation
		)

			expect(result).toEqual({
			message: 'Use a softer shadow.',
			model: 'qwen3:4b',
			slot: 'backup',
			provider: 'openai-compatible',
			preset: 'aibuff',
			fallback: { from: 'primary', reason: 'Primary timed out' },
		})
		expect(fetchImplementation).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
			method: 'POST',
		}))
	})

	it('throws the server error message', async () => {
		const fetchImplementation = vi
			.fn()
			.mockResolvedValue(
				new Response(JSON.stringify({ error: 'No Ollama models are installed' }), {
					status: 503,
					headers: { 'Content-Type': 'application/json' },
				})
			)

		await expect(
			requestLocalChat(
				{ message: 'Hello', selectedShapes: [] },
				fetchImplementation
			)
		).rejects.toThrow('No Ollama models are installed')
	})
})

describe('requestGeneration', () => {
	it('returns the generated local asset', async () => {
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					assetId: 'asset-1',
					url: '/assets/asset-1.png',
					promptId: 'prompt-1',
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		)

		const result = await requestGeneration('make it cinematic', fetchImplementation)

		expect(result.url).toBe('/assets/asset-1.png')
		expect(fetchImplementation).toHaveBeenCalledWith('/api/generations', expect.objectContaining({
			method: 'POST',
		}))
	})
})
