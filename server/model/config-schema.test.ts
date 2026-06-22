import { describe, expect, test } from 'vitest'
import {
	createDefaultRoutingConfig,
	parseRoutingConfig,
	resolveRoutingConfig,
} from './config-schema'

describe('model routing config schema', () => {
	test('creates an Ollama-first default and keeps automatic model discovery', () => {
		const config = createDefaultRoutingConfig({ OLLAMA_MODEL: ' gemma3:4b ' })

		expect(config.primary).toMatchObject({
			enabled: true,
			provider: 'ollama',
			preset: 'ollama',
			baseUrl: 'http://127.0.0.1:11434',
			model: 'gemma3:4b',
		})
		expect(config.backup).toMatchObject({
			enabled: false,
			provider: 'openai-compatible',
			preset: 'aibuff',
			baseUrl: 'https://api.aibuff.cc/v1',
		})
		expect(createDefaultRoutingConfig({}).primary.model).toBe('')
	})

	test('normalizes valid URLs and rejects credentials or unsupported protocols', () => {
		const base = createDefaultRoutingConfig({ OLLAMA_MODEL: 'gemma3:4b' })
		expect(
			parseRoutingConfig({
				...base,
				backup: { ...base.backup, baseUrl: 'https://gateway.test/v1/' },
			}).backup.baseUrl
		).toBe('https://gateway.test/v1')

		for (const baseUrl of ['ftp://gateway.test', 'https://key@gateway.test', 'https://gateway.test?v=key']) {
			expect(() =>
				parseRoutingConfig({ ...base, backup: { ...base.backup, baseUrl } })
			).toThrow()
		}
	})

	test('applies slot environment variables above saved configuration', () => {
		const saved = createDefaultRoutingConfig({ OLLAMA_MODEL: 'saved-model' })
		const resolved = resolveRoutingConfig(saved, {
			LOCALART_PRIMARY_MODEL: 'env-model',
			LOCALART_PRIMARY_BASE_URL: 'http://ollama.env:11434/',
			LOCALART_BACKUP_ENABLED: 'true',
			LOCALART_BACKUP_MODEL: 'cloud-model',
		})

		expect(resolved.config.primary.model).toBe('env-model')
		expect(resolved.config.primary.baseUrl).toBe('http://ollama.env:11434')
		expect(resolved.config.backup.enabled).toBe(true)
		expect(resolved.environmentOverrides.primary).toEqual(['baseUrl', 'model'])
	})
})
