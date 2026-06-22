import { describe, expect, test, vi } from 'vitest'
import { OpenAICompatibleBackend } from './OpenAICompatibleBackend'

describe('OpenAICompatibleBackend', () => {
	test('sends OpenAI-compatible text and image content without leaking the key into the URL', async () => {
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({ choices: [{ message: { content: 'Use a softer light.' } }] }),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			)
		)
		const backend = new OpenAICompatibleBackend({
			baseUrl: 'https://gateway.test/v1',
			apiKey: 'sk-secret',
			model: 'vision-model',
			timeoutMs: 5_000,
			fetchImplementation,
		})

		await expect(
			backend.chat({
				message: 'Revise this',
				selectedShapes: [{ type: 'geo' }],
				screenshotDataUrl: 'data:image/jpeg;base64,abc',
			})
		).resolves.toEqual({ message: 'Use a softer light.', model: 'vision-model' })

		const [url, options] = fetchImplementation.mock.calls[0]
		expect(url).toBe('https://gateway.test/v1/chat/completions')
		expect(url).not.toContain('sk-secret')
		expect(options.headers.Authorization).toBe('Bearer sk-secret')
		const body = JSON.parse(options.body)
		expect(body).toMatchObject({ model: 'vision-model', stream: false })
		expect(body.messages[0].content).toEqual([
			expect.objectContaining({ type: 'text' }),
			{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
		])
	})

	test('rejects empty successful responses as malformed', async () => {
		const backend = new OpenAICompatibleBackend({
			baseUrl: 'https://gateway.test/v1',
			apiKey: 'key',
			model: 'model',
			timeoutMs: 5_000,
			fetchImplementation: vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ choices: [] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			),
		})

		await expect(backend.chat({ message: 'Hello', selectedShapes: [] })).rejects.toMatchObject({
			kind: 'malformed_response',
			retryable: false,
		})
	})
})
