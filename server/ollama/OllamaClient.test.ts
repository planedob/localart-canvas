import { describe, expect, it, vi } from 'vitest'
import { OllamaClient } from './OllamaClient'

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	})
}

describe('OllamaClient', () => {
	it('uses the first installed model when none is configured', async () => {
		const fetchImplementation = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({ models: [{ name: 'qwen3:4b' }, { name: 'gemma3:4b' }] })
			)
			.mockResolvedValueOnce(
				jsonResponse({ choices: [{ message: { content: 'Use a warmer background.' } }] })
			)
		const client = new OllamaClient({
			baseUrl: 'http://ollama.test',
			model: null,
			fetchImplementation,
		})

		const result = await client.chat({
			message: 'Improve this',
			selectedShapes: [{ id: 'shape:1', type: 'geo' }],
		})

		expect(result).toEqual({
			message: 'Use a warmer background.',
			model: 'qwen3:4b',
		})
		const request = fetchImplementation.mock.calls[1]
		expect(request[0]).toBe('http://ollama.test/v1/chat/completions')
		expect(JSON.parse(String(request[1]?.body))).toMatchObject({
			model: 'qwen3:4b',
			stream: false,
		})
	})

	it('uses an installed configured model', async () => {
		const fetchImplementation = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({ models: [{ name: 'qwen3:4b' }, { name: 'gemma3:4b' }] })
			)
			.mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: 'Done' } }] }))
		const client = new OllamaClient({
			baseUrl: 'http://ollama.test',
			model: 'gemma3:4b',
			fetchImplementation,
		})

		const result = await client.chat({ message: 'Hello', selectedShapes: [] })

		expect(result.model).toBe('gemma3:4b')
	})

	it('explains how to recover when no models are installed', async () => {
		const client = new OllamaClient({
			baseUrl: 'http://ollama.test',
			model: null,
			fetchImplementation: vi.fn().mockResolvedValue(jsonResponse({ models: [] })),
		})

		await expect(client.chat({ message: 'Hello', selectedShapes: [] })).rejects.toThrow(
			'No Ollama models are installed'
		)
	})

	it('rejects a configured model that is not installed', async () => {
		const client = new OllamaClient({
			baseUrl: 'http://ollama.test',
			model: 'missing:latest',
			fetchImplementation: vi
				.fn()
				.mockResolvedValue(jsonResponse({ models: [{ name: 'qwen3:4b' }] })),
		})

		await expect(client.chat({ message: 'Hello', selectedShapes: [] })).rejects.toThrow(
			'Configured Ollama model "missing:latest" is not installed'
		)
	})

	it('maps Ollama HTTP errors to a readable message', async () => {
		const fetchImplementation = vi
			.fn()
			.mockResolvedValueOnce(jsonResponse({ models: [{ name: 'qwen3:4b' }] }))
			.mockResolvedValueOnce(jsonResponse({ error: 'model runner crashed' }, 500))
		const client = new OllamaClient({
			baseUrl: 'http://ollama.test',
			model: null,
			fetchImplementation,
		})

		await expect(client.chat({ message: 'Hello', selectedShapes: [] })).rejects.toThrow(
			'Ollama request failed (500): model runner crashed'
		)
	})
})
