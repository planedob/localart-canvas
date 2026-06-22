import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { createDefaultRoutingConfig } from './config-schema'
import { ModelConfigStore } from './ModelConfigStore'

const directories: string[] = []

async function temporaryDirectory(): Promise<string> {
	const directory = await mkdtemp(path.join(os.tmpdir(), 'localart-model-config-'))
	directories.push(directory)
	return directory
}

afterEach(async () => {
	await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })))
})

describe('ModelConfigStore', () => {
	test('stores secrets separately and returns only a presence flag', async () => {
		const directory = await temporaryDirectory()
		const store = new ModelConfigStore({ directory, environment: {} })
		const config = createDefaultRoutingConfig({ OLLAMA_MODEL: 'gemma3:4b' })

		await store.update({
			config,
			secretUpdates: {
				primary: { action: 'retain' },
				backup: { action: 'set', value: 'test-super-secret' },
			},
		})

		const sanitized = await store.readSanitized()
		expect(sanitized.backup.hasApiKey).toBe(true)
		expect(JSON.stringify(sanitized)).not.toContain('test-super-secret')
		expect(await readFile(path.join(directory, 'model-providers.json'), 'utf8')).not.toContain(
			'test-super-secret'
		)
		expect(await readFile(path.join(directory, 'model-secrets.json'), 'utf8')).toContain(
			'test-super-secret'
		)
	})

	test('retains and explicitly clears a key across store instances', async () => {
		const directory = await temporaryDirectory()
		const config = createDefaultRoutingConfig({ OLLAMA_MODEL: 'gemma3:4b' })
		const store = new ModelConfigStore({ directory, environment: {} })

		await store.update({
			config,
			secretUpdates: {
				primary: { action: 'set', value: 'first-key' },
				backup: { action: 'retain' },
			},
		})
		await new ModelConfigStore({ directory, environment: {} }).update({
			config,
			secretUpdates: {
				primary: { action: 'retain' },
				backup: { action: 'retain' },
			},
		})
		expect((await store.readResolved()).primary.apiKey).toBe('first-key')

		await store.update({
			config,
			secretUpdates: {
				primary: { action: 'clear' },
				backup: { action: 'retain' },
			},
		})
		expect((await store.readResolved()).primary.apiKey).toBeUndefined()
	})

	test('uses environment secrets without exposing them in sanitized reads', async () => {
		const directory = await temporaryDirectory()
		const store = new ModelConfigStore({
			directory,
			environment: {
				LOCALART_BACKUP_API_KEY: 'environment-key',
				LOCALART_BACKUP_MODEL: 'cloud-model',
				LOCALART_BACKUP_ENABLED: 'true',
			},
		})

		expect((await store.readResolved()).backup.apiKey).toBe('environment-key')
		const sanitized = await store.readSanitized()
		expect(sanitized.backup.hasApiKey).toBe(true)
		expect(sanitized.backup.environmentOverrides).toContain('apiKey')
		expect(JSON.stringify(sanitized)).not.toContain('environment-key')
	})
})
