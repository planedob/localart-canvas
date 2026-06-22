import { z } from 'zod'
import {
	EnvironmentOverrideField,
	ModelSlotConfig,
	ModelSlotName,
	RoutingConfig,
} from './types'

export type ModelEnvironment = Record<string, string | undefined>

const providerSchema = z.enum(['ollama', 'openai-compatible'])
const presetSchema = z.enum(['ollama', 'aibuff', 'openai', 'custom'])

function normalizeHttpUrl(value: string): string {
	const url = new URL(value)
	if (!['http:', 'https:'].includes(url.protocol)) {
		throw new Error('Base URL must use http or https')
	}
	if (url.username || url.password || url.search || url.hash) {
		throw new Error('Base URL must not contain credentials, query parameters, or fragments')
	}
	return value.replace(/\/+$/, '')
}

const slotSchema = z
	.object({
		enabled: z.boolean(),
		provider: providerSchema,
		preset: presetSchema,
		baseUrl: z.string().trim().min(1).transform(normalizeHttpUrl),
		model: z.string().trim(),
		timeoutMs: z.number().int().min(1_000).max(300_000),
	})
	.superRefine((slot, context) => {
		if (slot.preset === 'ollama' && slot.provider !== 'ollama') {
			context.addIssue({ code: 'custom', message: 'The Ollama preset requires the Ollama provider' })
		}
		if (slot.preset !== 'ollama' && slot.provider !== 'openai-compatible') {
			context.addIssue({
				code: 'custom',
				message: 'Cloud and custom presets require the OpenAI-compatible provider',
			})
		}
		if (slot.enabled && slot.provider === 'openai-compatible' && !slot.model) {
			context.addIssue({ code: 'custom', message: 'Enabled cloud slots require a model name' })
		}
	})

const routingSchema = z.object({ primary: slotSchema, backup: slotSchema })

function parseBoolean(value: string, name: string): boolean {
	if (value === 'true' || value === '1') return true
	if (value === 'false' || value === '0') return false
	throw new Error(`${name} must be true, false, 1, or 0`)
}

function parseTimeout(value: string, name: string): number {
	const parsed = Number(value)
	if (!Number.isInteger(parsed)) throw new Error(`${name} must be an integer`)
	return parsed
}

export function createDefaultRoutingConfig(environment: ModelEnvironment): RoutingConfig {
	return parseRoutingConfig({
		primary: {
			enabled: true,
			provider: 'ollama',
			preset: 'ollama',
			baseUrl: environment.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
			model: environment.OLLAMA_MODEL?.trim() ?? '',
			timeoutMs: 120_000,
		},
		backup: {
			enabled: false,
			provider: 'openai-compatible',
			preset: 'aibuff',
			baseUrl: 'https://api.aibuff.cc/v1',
			model: '',
			timeoutMs: 120_000,
		},
	})
}

export function parseRoutingConfig(value: unknown): RoutingConfig {
	return routingSchema.parse(value)
}

interface ResolvedConfigResult {
	config: RoutingConfig
	environmentOverrides: Record<ModelSlotName, EnvironmentOverrideField[]>
}

export function resolveRoutingConfig(
	savedConfig: RoutingConfig,
	environment: ModelEnvironment
): ResolvedConfigResult {
	const config = structuredClone(savedConfig)
	const environmentOverrides: Record<ModelSlotName, EnvironmentOverrideField[]> = {
		primary: [],
		backup: [],
	}

	for (const slotName of ['primary', 'backup'] as const) {
		const prefix = `LOCALART_${slotName.toUpperCase()}_`
		const slot = config[slotName]
		const enabledName = `${prefix}ENABLED`
		if (environment[enabledName] !== undefined) {
			slot.enabled = parseBoolean(environment[enabledName], enabledName)
			environmentOverrides[slotName].push('enabled')
		}
		const providerName = `${prefix}PROVIDER`
		if (environment[providerName] !== undefined) {
			slot.provider = environment[providerName] as ModelSlotConfig['provider']
			environmentOverrides[slotName].push('provider')
		}
		const presetName = `${prefix}PRESET`
		if (environment[presetName] !== undefined) {
			slot.preset = environment[presetName] as ModelSlotConfig['preset']
			environmentOverrides[slotName].push('preset')
		}
		const baseUrlName = `${prefix}BASE_URL`
		if (environment[baseUrlName] !== undefined) {
			slot.baseUrl = environment[baseUrlName]
			environmentOverrides[slotName].push('baseUrl')
		}
		const modelName = `${prefix}MODEL`
		if (environment[modelName] !== undefined) {
			slot.model = environment[modelName].trim()
			environmentOverrides[slotName].push('model')
		}
		const timeoutName = `${prefix}TIMEOUT_MS`
		if (environment[timeoutName] !== undefined) {
			slot.timeoutMs = parseTimeout(environment[timeoutName], timeoutName)
			environmentOverrides[slotName].push('timeoutMs')
		}
	}

	return { config: parseRoutingConfig(config), environmentOverrides }
}
