import { describe, expect, test, vi } from 'vitest'
import { OllamaChatBackend } from './OllamaChatBackend'

describe('OllamaChatBackend', () => {
	test('uses the existing Ollama client through the shared backend interface', async () => {
		const client = { chat: vi.fn().mockResolvedValue({ message: 'Local answer', model: 'gemma3' }) }
		const backend = new OllamaChatBackend(client)
		const request = { message: 'Hello', selectedShapes: [] }

		await expect(backend.chat(request)).resolves.toEqual({ message: 'Local answer', model: 'gemma3' })
		expect(client.chat).toHaveBeenCalledWith(request)
	})

	test('maps an unavailable Ollama endpoint to a retryable network error', async () => {
		const backend = new OllamaChatBackend({
			chat: vi.fn().mockRejectedValue(new Error('Could not connect to Ollama at http://localhost')),
		})

		await expect(backend.chat({ message: 'Hello', selectedShapes: [] })).rejects.toMatchObject({
			kind: 'network',
			retryable: true,
		})
	})
})
