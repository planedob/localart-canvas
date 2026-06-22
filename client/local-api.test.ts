import { describe, expect, it, vi } from 'vitest'
import { requestLocalChat } from './local-api'

describe('requestLocalChat', () => {
	it('returns the local chat response', async () => {
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					message: 'Use a softer shadow.',
					model: 'qwen3:4b',
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
