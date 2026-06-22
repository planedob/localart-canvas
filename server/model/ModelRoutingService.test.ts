import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createDefaultRoutingConfig } from './config-schema'
import { ModelConfigStore } from './ModelConfigStore'
import { ModelRoutingService } from './ModelRoutingService'

const directories: string[] = []

afterEach(async () => {
	await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('ModelRoutingService', () => {
	test('builds an OpenAI-compatible primary from stored configuration', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-routing-service-'))
		directories.push(directory)
		const store = new ModelConfigStore({ directory, environment: {} })
		const config = createDefaultRoutingConfig({})
		config.primary = {
			enabled: true,
			provider: 'openai-compatible',
			preset: 'aibuff',
			baseUrl: 'https://gateway.test/v1',
			model: 'cloud-model',
			timeoutMs: 5_000,
		}
		await store.update({
			config,
			secretUpdates: {
				primary: { action: 'set', value: 'secret' },
				backup: { action: 'retain' },
			},
		})
		const fetchImplementation = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ choices: [{ message: { content: 'cloud answer' } }] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})
		)
		const service = new ModelRoutingService({ store, fetchImplementation })

		await expect(service.chat({ message: 'Hello', selectedShapes: [] })).resolves.toMatchObject({
			message: 'cloud answer',
			slot: 'primary',
			preset: 'aibuff',
		})
	})

	test('tests a slot with fixed text and no canvas data', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-routing-service-'))
		directories.push(directory)
		const store = new ModelConfigStore({ directory, environment: { OLLAMA_MODEL: 'gemma3' } })
		const fetchImplementation = vi.fn(async (input: string | URL | Request) => {
			if (String(input).endsWith('/api/tags')) {
				return new Response(JSON.stringify({ models: [{ name: 'gemma3' }] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			}
			if (String(input).endsWith('/v1/chat/completions')) {
				return new Response(JSON.stringify({ choices: [{ message: { content: 'LOCALART_CONNECTION_OK' } }] }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				})
			}
			return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
		})
		const service = new ModelRoutingService({ store, fetchImplementation })

		await expect(service.testConnection('primary')).resolves.toMatchObject({
			message: 'LOCALART_CONNECTION_OK',
			model: 'gemma3',
		})
		const chatCall = fetchImplementation.mock.calls.find(([input]) =>
			String(input).endsWith('/v1/chat/completions')
		)
		expect(chatCall).toBeDefined()
		expect(String(chatCall?.[1]?.body)).not.toContain('screenshotDataUrl')
		expect(String(chatCall?.[1]?.body)).not.toContain('shape:')
	})
})
